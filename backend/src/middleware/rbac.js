/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements policy-based permission guards
 */

// Define role hierarchy and permissions
const roleHierarchy = {
  admin: 3,
  manager: 2,
  merchant: 1
};

// Permission definitions by role
const rolePermissions = {
  admin: [
    'system:config',
    'system:fx-source',
    'system:fee-rules',
    'users:*',
    'merchants:*',
    'payments:*',
    'settlements:*',
    'audit:*',
    'reports:*'
  ],
  manager: [
    'merchants:approve',
    'merchants:view',
    'merchants:update',
    'payments:view',
    'payments:refund',
    'settlements:*',
    'disputes:*',
    'audit:view',
    'reports:view'
  ],
  merchant: [
    'merchants:own',
    'payments:create',
    'payments:own',
    'settlements:own',
    'reports:own'
  ]
};

/**
 * Check if role has permission
 */
const hasPermission = (role, requiredPermission) => {
  const permissions = rolePermissions[role] || [];
  
  // Check for exact match
  if (permissions.includes(requiredPermission)) return true;
  
  // Check for wildcard match (e.g., 'payments:*')
  const [resource, action] = requiredPermission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;
  
  // Check for own resource access
  if (permissions.includes(`${resource}:own`)) {
    return 'own'; // Signal that ownership check is needed
  }
  
  return false;
};

/**
 * Check if user role meets minimum level
 */
const meetsRoleLevel = (userRole, requiredRole) => {
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Require specific role(s)
 * @param {string|string[]} roles - Required role(s)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const flatRoles = roles.flat();
    
    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: flatRoles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Require minimum role level
 * @param {string} minimumRole - Minimum required role
 */
export const requireMinRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    if (!meetsRoleLevel(req.user.role, minimumRole)) {
      return res.status(403).json({
        error: 'Insufficient role level',
        code: 'FORBIDDEN',
        requiredMinimum: minimumRole,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Require specific permission
 * @param {string} permission - Required permission (e.g., 'payments:create')
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const permResult = hasPermission(req.user.role, permission);
    
    if (permResult === false) {
      return res.status(403).json({
        error: 'Permission denied',
        code: 'FORBIDDEN',
        requiredPermission: permission
      });
    }
    
    // If 'own' is returned, signal that ownership check is needed
    if (permResult === 'own') {
      req.requiresOwnershipCheck = true;
    }
    
    next();
  };
};

/**
 * Ownership check middleware
 * Verifies user owns the resource they're accessing
 */
export const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.requiresOwnershipCheck && !req.forceOwnershipCheck) {
      return next();
    }
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const resourceId = req.params.id || req.params.merchantId;
    
    let isOwner = false;
    
    switch (resourceType) {
      case 'merchant':
        isOwner = req.user.merchantId?.toString() === resourceId;
        break;
      case 'payment':
        // Will be checked in the controller with the actual payment
        req.ownershipResourceType = 'payment';
        isOwner = true; // Defer to controller
        break;
      case 'settlement':
        req.ownershipResourceType = 'settlement';
        isOwner = true; // Defer to controller
        break;
      default:
        isOwner = false;
    }
    
    if (!isOwner && req.user.role === 'merchant') {
      return res.status(403).json({
        error: 'You can only access your own resources',
        code: 'OWNERSHIP_REQUIRED'
      });
    }
    
    next();
  };
};

/**
 * Combined middleware: require role OR be owner
 * Useful for manager/admin OR merchant accessing own resource
 */
export const requireRoleOrOwner = (roles, resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const flatRoles = Array.isArray(roles) ? roles : [roles];
    
    // If user has required role, allow access
    if (flatRoles.includes(req.user.role)) {
      return next();
    }
    
    // Otherwise, check ownership
    req.forceOwnershipCheck = true;
    return checkOwnership(resourceType)(req, res, next);
  };
};

/**
 * Admin only shorthand
 */
export const adminOnly = requireRole('admin');

/**
 * Manager or Admin shorthand
 */
export const managerOrAdmin = requireRole('admin', 'manager');

export default {
  requireRole,
  requireMinRole,
  requirePermission,
  checkOwnership,
  requireRoleOrOwner,
  adminOnly,
  managerOrAdmin
};
