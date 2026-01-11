import AuditLog from '../models/AuditLog.js';

/**
 * Centralized Error Handler Middleware
 * Provides structured JSON error logging and responses
 */

// Error code mappings
const errorCodes = {
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode || errorCodes[code] || 500;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation Error
 */
export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends ApiError {
  constructor(message, details = null) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Main error handler middleware
 */
export const errorHandler = async (err, req, res, next) => {
  // Default error values
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    correlationId: req.correlationId,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };
  
  // Handle different error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorResponse = {
      ...errorResponse,
      error: err.message,
      code: err.code,
      details: err.details
    };
  } else if (err.name === 'ValidationError' && err.errors) {
    // Mongoose validation error
    statusCode = 400;
    const details = Object.keys(err.errors).map(key => ({
      field: key,
      message: err.errors[key].message
    }));
    errorResponse = {
      ...errorResponse,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details
    };
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId, etc.)
    statusCode = 400;
    errorResponse = {
      ...errorResponse,
      error: `Invalid ${err.path}: ${err.value}`,
      code: 'INVALID_ID'
    };
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    errorResponse = {
      ...errorResponse,
      error: `Duplicate value for ${field}`,
      code: 'DUPLICATE_KEY',
      details: { field }
    };
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      ...errorResponse,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    };
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      ...errorResponse,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    };
  }
  
  // Log error (structured JSON)
  const logEntry = {
    level: statusCode >= 500 ? 'error' : 'warn',
    message: err.message,
    code: errorResponse.code,
    statusCode,
    correlationId: req.correlationId,
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.user?._id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    stack: statusCode >= 500 ? err.stack : undefined,
    timestamp: new Date().toISOString()
  };
  
  console.error(JSON.stringify(logEntry));
  
  // Log to audit if significant error
  if (statusCode >= 400) {
    try {
      await AuditLog.log({
        action: 'error_occurred',
        category: 'system',
        actor: {
          userId: req.user?._id,
          email: req.user?.email,
          role: req.user?.role,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        request: {
          method: req.method,
          path: req.path,
          correlationId: req.correlationId
        },
        response: {
          statusCode,
          success: false,
          errorCode: errorResponse.code,
          errorMessage: err.message
        },
        severity: statusCode >= 500 ? 'error' : 'warning'
      });
    } catch (auditError) {
      console.error('Failed to log error to audit:', auditError.message);
    }
  }
  
  // Don't leak stack traces in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    errorResponse.error = 'Internal server error';
    delete errorResponse.details;
  }
  
  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    correlationId: req.correlationId
  });
};

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ApiError,
  ValidationError,
  NotFoundError,
  ConflictError
};
