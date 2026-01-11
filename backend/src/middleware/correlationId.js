import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 * Adds unique correlation ID to each request for distributed tracing
 */

const CORRELATION_ID_HEADER = 'X-Correlation-ID';
const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Generate correlation ID middleware
 */
export const correlationIdMiddleware = (req, res, next) => {
  // Check for existing correlation ID from upstream services
  let correlationId = req.headers[CORRELATION_ID_HEADER.toLowerCase()] ||
                      req.headers['x-request-id'] ||
                      req.headers['x-trace-id'];
  
  // Generate new if not present
  if (!correlationId) {
    correlationId = uuidv4();
  }
  
  // Generate unique request ID for this specific request
  const requestId = uuidv4();
  
  // Attach to request object
  req.correlationId = correlationId;
  req.requestId = requestId;
  
  // Set response headers
  res.set(CORRELATION_ID_HEADER, correlationId);
  res.set(REQUEST_ID_HEADER, requestId);
  
  // Add to locals for use in templates/logging
  res.locals.correlationId = correlationId;
  res.locals.requestId = requestId;
  
  next();
};

/**
 * Create a child correlation context
 * Useful for background jobs spawned from a request
 */
export const createChildContext = (parentCorrelationId) => {
  return {
    correlationId: parentCorrelationId,
    requestId: uuidv4(),
    parentRequestId: parentCorrelationId
  };
};

/**
 * Get correlation ID from request
 */
export const getCorrelationId = (req) => {
  return req.correlationId || req.headers[CORRELATION_ID_HEADER.toLowerCase()] || null;
};

export default {
  correlationIdMiddleware,
  createChildContext,
  getCorrelationId,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER
};
