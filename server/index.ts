import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performanceMiddleware } from "./performance-middleware";
import { initializeCronJobs } from "./cron-jobs";

const app = express();

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS header for HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Prevent information leakage
  res.removeHeader('X-Powered-By');
  
  // Content Security Policy - Permitir recursos externos necessários
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.facebook.com https://cdn.utmify.com.br https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob: http:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.orinpay.com.br https://www.facebook.com https://region1.google-analytics.com https://www.google-analytics.com wss: ws: http://localhost:*; " +
    "frame-src 'self' https://www.facebook.com"
  );
  
  next();
});

// Enable performance monitoring
app.use(performanceMiddleware);

// Enable compression for all responses
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Add cache headers for static assets
app.use((req: Request, res: Response, next: NextFunction) => {
  // Cache static assets for 1 year
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache HTML for 1 hour
  else if (req.url.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  // API responses - short cache
  else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  }
  next();
});

// Body parsing with size limits for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize cron jobs after server starts
    // Disabled to avoid crashes - needs fixing
    // initializeCronJobs();
  });
})();
