import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    user_id: string;
    role: 'employee' | 'support_staff' | 'admin' | 'manager';
    factory_id?: string;
    full_name: string;
    email?: string;
  };
}

// Permission definitions for each role
export const PERMISSIONS = {
  employee: {
    tickets: {
      create: true,
      read: ['own'], // Can only read own tickets
      update: ['own'], // Can only update own tickets
      delete: false,
      approve: false,
      assign: false
    },
    users: {
      create: false,
      read: ['self'], // Can only read own profile
      update: ['self'], // Can only update own profile
      delete: false
    },
    reports: {
      create: false,
      read: false,
      update: false,
      delete: false
    }
  },
  support_staff: {
    tickets: {
      create: true,
      read: ['assigned', 'own'], // Can read assigned and own tickets
      update: ['assigned', 'own'], // Can update assigned and own tickets
      delete: false,
      approve: false,
      assign: false
    },
    users: {
      create: false,
      read: ['self', 'basic'], // Can read own profile and basic user info
      update: ['self'], // Can only update own profile
      delete: false
    },
    reports: {
      create: false,
      read: ['assigned'], // Can read reports for assigned tickets
      update: false,
      delete: false
    }
  },
  manager: {
    tickets: {
      create: true,
      read: ['department', 'own'], // Can read department and own tickets
      update: ['department', 'own'], // Can update department and own tickets
      delete: false,
      approve: ['department'], // Can approve department tickets
      assign: ['department'] // Can assign department tickets
    },
    users: {
      create: false,
      read: ['department', 'self'], // Can read department users and own profile
      update: ['self'], // Can only update own profile
      delete: false
    },
    reports: {
      create: true,
      read: ['department'], // Can read department reports
      update: true,
      delete: false
    }
  },
  admin: {
    tickets: {
      create: true,
      read: ['all'], // Can read all tickets
      update: ['all'], // Can update all tickets
      delete: true,
      approve: ['all'], // Can approve all tickets
      assign: ['all'] // Can assign all tickets
    },
    users: {
      create: true,
      read: ['all'], // Can read all users
      update: ['all'], // Can update all users
      delete: true
    },
    reports: {
      create: true,
      read: ['all'], // Can read all reports
      update: true,
      delete: true
    }
  }
};

// Helper function to check if user has specific permission
export const hasPermission = (userRole: string, resource: string, action: string, context?: string): boolean => {
  const rolePermissions = PERMISSIONS[userRole as keyof typeof PERMISSIONS];
  if (!rolePermissions) return false;
  
  const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions];
  if (!resourcePermissions) return false;
  
  const actionPermission = resourcePermissions[action as keyof typeof resourcePermissions];
  
  if (typeof actionPermission === 'boolean') {
    return actionPermission;
  }
  
  if (Array.isArray(actionPermission)) {
    if (context) {
      return actionPermission.includes(context);
    }
    return actionPermission.length > 0;
  }
  
  return false;
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Validate token structure
    if (!decoded.id || !decoded.user_id || !decoded.role) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token structure' 
      });
    }
    
    // Get user from database
    const user = await User.findOne({
      where: { 
        id: decoded.id,
        is_active: true 
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ 
        success: false, 
        message: 'Account is temporarily locked' 
      });
    }

    // Verify token data matches database user
    if (user.user_id !== decoded.user_id || user.role !== decoded.role) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token data mismatch. Please login again.' 
      });
    }

    // Set user data in request
    req.user = {
      id: user.id,
      user_id: user.user_id,
      role: user.role,
      factory_id: user.factory_id,
      full_name: user.full_name,
      email: user.email
    };

    next();
  } catch (error: any) {
    console.error('❌ Authentication error:', error?.message || error);
    
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    if (error?.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication service error' 
    });
  }
};

// Role-based authorization middleware
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (resource: string, action: string, context?: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const hasAccess = hasPermission(req.user.role, resource, action, context);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Insufficient permissions for ${action} on ${resource}` 
      });
    }

    next();
  };
};

// Resource ownership check middleware
export const checkResourceOwnership = (resourceIdParam: string = 'id', userIdField: string = 'requester_id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resource ID required' 
      });
    }

    try {
      // This would need to be customized based on the specific resource
      // For now, we'll add the ownership check logic to the route handlers
      req.resourceId = resourceId;
      req.userIdField = userIdField;
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking resource ownership' 
      });
    }
  };
};

// Factory-based access control
export const requireSameFactory = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Admin can access all factories
    if (req.user.role === 'admin') {
      return next();
    }

    // Add factory check logic to route handlers
    next();
  };
};

// Predefined role combinations
export const adminOnly = authorizeRoles('admin');
export const managerOrAdmin = authorizeRoles('manager', 'admin');
export const supportStaffOrAdmin = authorizeRoles('support_staff', 'admin', 'manager');
export const allRoles = authorizeRoles('employee', 'support_staff', 'manager', 'admin');

// Permission-based middleware shortcuts
export const canCreateTickets = requirePermission('tickets', 'create');
export const canReadAllTickets = requirePermission('tickets', 'read', 'all');
export const canUpdateAllTickets = requirePermission('tickets', 'update', 'all');
export const canDeleteTickets = requirePermission('tickets', 'delete');
export const canApproveTickets = requirePermission('tickets', 'approve');
export const canAssignTickets = requirePermission('tickets', 'assign');

export const canCreateUsers = requirePermission('users', 'create');
export const canReadAllUsers = requirePermission('users', 'read', 'all');
export const canUpdateAllUsers = requirePermission('users', 'update', 'all');
export const canDeleteUsers = requirePermission('users', 'delete');

export const canCreateReports = requirePermission('reports', 'create');
export const canReadAllReports = requirePermission('reports', 'read', 'all');
export const canUpdateReports = requirePermission('reports', 'update');
export const canDeleteReports = requirePermission('reports', 'delete');

// All authenticated users
export const authenticatedUser = authenticateToken;

// Extend AuthRequest interface to include additional fields
declare global {
  namespace Express {
    interface Request {
      resourceId?: string;
      userIdField?: string;
    }
  }
}