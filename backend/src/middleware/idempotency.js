/**
 * Idempotency Middleware
 * Ensures idempotent transaction handling using idempotency keys
 * with expiry and replay protection
 */

// In-memory store for idempotency keys
const idempotencyStore = new Map();

// Default expiry: 24 hours
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Cleanup expired keys every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of idempotencyStore.entries()) {
    if (data.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate idempotency key hash
 */
const generateKeyHash = (key, userId, endpoint) => {
  return `${userId || 'anon'}:${endpoint}:${key}`;
};

/**
 * Idempotency middleware
 */
export const idempotencyMiddleware = (options = {}) => {
  const {
    headerName = 'Idempotency-Key',
    expiryMs = DEFAULT_EXPIRY_MS,
    required = false
  } = options;
  
  return async (req, res, next) => {
    const idempotencyKey = req.headers[headerName.toLowerCase()];
    
    // If no key provided
    if (!idempotencyKey) {
      if (required) {
        return res.status(400).json({
          error: 'Idempotency key required',
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          header: headerName
        });
      }
      return next();
    }
    
    // Validate key format (alphanumeric, dashes, underscores, max 255 chars)
    if (!/^[a-zA-Z0-9_-]{1,255}$/.test(idempotencyKey)) {
      return res.status(400).json({
        error: 'Invalid idempotency key format',
        code: 'INVALID_IDEMPOTENCY_KEY',
        requirements: 'Alphanumeric, dashes, underscores only. Max 255 characters.'
      });
    }
    
    const userId = req.user?._id?.toString();
    const endpoint = `${req.method}:${req.baseUrl}${req.path}`;
    const keyHash = generateKeyHash(idempotencyKey, userId, endpoint);
    
    // Check for existing key
    const existing = idempotencyStore.get(keyHash);
    
    if (existing) {
      // Key exists - check if still processing or completed
      if (existing.status === 'processing') {
        return res.status(409).json({
          error: 'Request with this idempotency key is still processing',
          code: 'IDEMPOTENCY_CONFLICT',
          idempotencyKey
        });
      }
      
      if (existing.status === 'completed') {
        // Return cached response
        res.set('Idempotency-Replayed', 'true');
        res.set('Idempotency-Key', idempotencyKey);
        return res.status(existing.response.status).json(existing.response.body);
      }
      
      if (existing.status === 'error') {
        // Previous request failed - allow retry if error was transient
        if (!existing.retryable) {
          res.set('Idempotency-Replayed', 'true');
          res.set('Idempotency-Key', idempotencyKey);
          return res.status(existing.response.status).json(existing.response.body);
        }
        // Allow retry for transient errors
      }
    }
    
    // Store the key as processing
    const entry = {
      key: idempotencyKey,
      keyHash,
      status: 'processing',
      createdAt: Date.now(),
      expiresAt: Date.now() + expiryMs,
      endpoint,
      userId,
      requestBody: JSON.stringify(req.body).substring(0, 1000), // Store truncated body for debugging
      response: null,
      retryable: false
    };
    
    idempotencyStore.set(keyHash, entry);
    
    // Attach helper to request for storing response
    req.idempotency = {
      key: idempotencyKey,
      keyHash,
      
      // Call this to mark request as complete
      complete: (status, body, retryable = false) => {
        const entry = idempotencyStore.get(keyHash);
        if (entry) {
          entry.status = status >= 400 ? 'error' : 'completed';
          entry.response = { status, body };
          entry.retryable = retryable;
          entry.completedAt = Date.now();
        }
      }
    };
    
    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      if (req.idempotency) {
        const isError = res.statusCode >= 400;
        const isRetryable = res.statusCode >= 500 || res.statusCode === 429;
        req.idempotency.complete(res.statusCode, body, isRetryable);
      }
      res.set('Idempotency-Key', idempotencyKey);
      return originalJson(body);
    };
    
    next();
  };
};

/**
 * Require idempotency key middleware
 */
export const requireIdempotencyKey = idempotencyMiddleware({ required: true });

/**
 * Optional idempotency key middleware
 */
export const optionalIdempotencyKey = idempotencyMiddleware({ required: false });

/**
 * Get idempotency key status (for debugging)
 */
export const getIdempotencyKeyStatus = (key, userId, endpoint) => {
  const keyHash = generateKeyHash(key, userId, endpoint);
  return idempotencyStore.get(keyHash) || null;
};

/**
 * Clear expired keys (manual trigger)
 */
export const clearExpiredKeys = () => {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, data] of idempotencyStore.entries()) {
    if (data.expiresAt < now) {
      idempotencyStore.delete(key);
      cleared++;
    }
  }
  
  return cleared;
};

export default {
  idempotencyMiddleware,
  requireIdempotencyKey,
  optionalIdempotencyKey,
  getIdempotencyKeyStatus,
  clearExpiredKeys
};
