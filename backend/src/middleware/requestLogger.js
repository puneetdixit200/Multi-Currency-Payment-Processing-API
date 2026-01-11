/**
 * Request Logger Middleware
 * Provides structured JSON logging for all requests
 */

/**
 * Request logger middleware
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  const requestLog = {
    type: 'request',
    correlationId: req.correlationId,
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    timestamp: new Date().toISOString()
  };
  
  // Log after response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const responseLog = {
      type: 'response',
      correlationId: req.correlationId,
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id,
      userRole: req.user?.role,
      timestamp: new Date().toISOString()
    };
    
    // Color coding for console
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : // Red for 5xx
                        res.statusCode >= 400 ? '\x1b[33m' : // Yellow for 4xx
                        res.statusCode >= 300 ? '\x1b[36m' : // Cyan for 3xx
                        '\x1b[32m'; // Green for 2xx
    const reset = '\x1b[0m';
    
    // Console log with colors in dev, JSON in production
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(responseLog));
    } else {
      console.log(
        `${statusColor}${req.method}${reset} ${req.path} ${statusColor}${res.statusCode}${reset} - ${duration}ms`
      );
    }
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(JSON.stringify({
        type: 'slow_request',
        ...responseLog,
        warning: 'Request took longer than 1000ms'
      }));
    }
  });
  
  next();
};

export default { requestLogger };
