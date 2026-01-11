/**
 * In-memory Rate Limiter with Sliding Window
 * Provides request rate limiting without external dependencies
 */

// Store for rate limit data
const rateLimitStore = new Map();

// Cleanup interval (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove entries older than the window
    if (data.windowStart + data.windowMs < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limiter options
 */
export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Max requests per window
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    skip = () => false,
    onLimitReached = null
  } = options;
  
  return (req, res, next) => {
    // Skip if function returns true
    if (skip(req)) {
      return next();
    }
    
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || record.windowStart + windowMs < now) {
      // Create new window
      record = {
        count: 0,
        windowStart: now,
        windowMs
      };
      rateLimitStore.set(key, record);
    }
    
    record.count++;
    
    // Set rate limit headers
    const remaining = Math.max(0, max - record.count);
    const resetTime = record.windowStart + windowMs;
    
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000),
      'X-RateLimit-Policy': `${max};w=${Math.ceil(windowMs / 1000)}`
    });
    
    if (record.count > max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      
      if (onLimitReached) {
        onLimitReached(req, res);
      }
      
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        limit: max,
        windowMs
      });
    }
    
    next();
  };
};

/**
 * Default rate limiter for general API endpoints
 */
export const generalLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req) => {
    // Use email + IP for auth endpoints
    const email = req.body?.email || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    return `auth:${email}:${ip}`;
  }
});

/**
 * Rate limiter for payment creation
 */
export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.MAX_TRANSACTIONS_PER_HOUR) || 50,
  message: 'Transaction limit exceeded, please try again later',
  keyGenerator: (req) => {
    // Use merchant ID for payment limits
    const merchantId = req.user?.merchantId || req.ip;
    return `payment:${merchantId}`;
  }
});

/**
 * Very strict limiter for admin operations
 */
export const adminLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Admin operation limit reached',
  keyGenerator: (req) => `admin:${req.user?.id || req.ip}`
});

export default {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  adminLimiter
};
