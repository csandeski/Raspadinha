import { Request, Response, NextFunction } from 'express';

// Performance monitoring middleware
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Add performance headers before response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`[Performance Warning] ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  // Set headers early, before response is sent
  const originalSend = res.send;
  res.send = function(...args: any[]) {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Server-Timing', `total;dur=${duration}`);
    }
    return originalSend.apply(res, args);
  };
  
  next();
}