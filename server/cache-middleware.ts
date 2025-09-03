import { Request, Response, NextFunction } from 'express';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute for frequently changing data
const STATIC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for static data

// List of routes that should be cached
const CACHEABLE_ROUTES = {
  '/api/user/level': CACHE_DURATION,
  '/api/daily-spin/status': CACHE_DURATION,
  '/api/games/history': CACHE_DURATION,
  '/api/withdrawals/history': CACHE_DURATION,
  '/api/transactions': CACHE_DURATION,
};

export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const key = `${req.user?.id || 'anonymous'}-${req.path}`;
  const cacheDuration = CACHEABLE_ROUTES[req.path as keyof typeof CACHEABLE_ROUTES];

  if (!cacheDuration) {
    return next();
  }

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.data);
  }

  // Store original json method
  const originalJson = res.json;
  
  // Override json method to cache response
  res.json = function(data: any) {
    cache.set(key, { data, timestamp: Date.now() });
    res.setHeader('X-Cache', 'MISS');
    return originalJson.call(this, data);
  };

  next();
}

// Clear cache for a specific user
export function clearUserCache(userId: number) {
  const keysToDelete: string[] = [];
  
  cache.forEach((_, key) => {
    if (key.startsWith(`${userId}-`)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => cache.delete(key));
}

// Clear all cache
export function clearAllCache() {
  cache.clear();
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  cache.forEach((value, key) => {
    const route = key.split('-').slice(1).join('-');
    const maxAge = CACHEABLE_ROUTES[route as keyof typeof CACHEABLE_ROUTES] || CACHE_DURATION;
    
    if (now - value.timestamp > maxAge) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => cache.delete(key));
}, 60 * 1000); // Run every minute