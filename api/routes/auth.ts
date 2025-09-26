import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, Factory, TicketHistory, sequelize } from '../models/index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

// Rate limiting for login attempts (temporarily increased for testing)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Temporarily increased to 100 requests per windowMs for testing
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost during development
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip?.includes('localhost');
  }
});

// Password complexity validation
const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Log authentication attempts
const logAuthAttempt = async (userId: string, success: boolean, ip: string, userAgent: string) => {
  try {
    console.log(`🔐 Auth attempt: ${userId} - ${success ? 'SUCCESS' : 'FAILED'} from ${ip}`);
    // You could also log to database or external service here
  } catch (error) {
    console.error('Failed to log auth attempt:', error);
  }
};

const router = Router();

// Login endpoint with rate limiting
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  try {
    const { userId, password } = req.body;

    // Validate input
    if (!userId || !password) {
      await logAuthAttempt(userId || 'unknown', false, clientIp, userAgent);
      return res.status(400).json({
        success: false,
        message: 'User ID and password are required'
      });
    }

    // Find user in database using Sequelize
    console.log('Looking for user_id:', userId.trim().toUpperCase());
    
    const user = await User.findOne({
      where: {
        user_id: userId.trim().toUpperCase(),
        is_active: true
      }
    });
    
    console.log('User found:', user ? {
      id: user.id,
      user_id: user.user_id,
      has_password_hash: !!user.password_hash,
      factory_id: user.factory_id
    } : 'null');
    
    // If user found, get factory separately
    let factory = null;
    if (user && user.factory_id) {
      factory = await Factory.findByPk(user.factory_id, {
        attributes: ['id', 'name', 'description']
      });
    }

    if (!user) {
      await logAuthAttempt(userId, false, clientIp, userAgent);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      await logAuthAttempt(userId, false, clientIp, userAgent);
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Debug: Check user data
    console.log('User found:', {
      id: user.id,
      user_id: user.user_id,
      has_password_hash: !!user.password_hash,
      password_hash_length: user.password_hash ? user.password_hash.length : 0
    });

    // Check if password_hash exists
    if (!user.password_hash) {
      console.error('User password_hash is null or undefined');
      await logAuthAttempt(userId, false, clientIp, userAgent);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failed_login_attempts += 1;
      
      // Lock account if too many failed attempts
      if (user.shouldLockAccount()) {
        user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        console.log(`🔒 Account locked for user ${userId} due to multiple failed attempts`);
      }
      
      await user.save();
      await logAuthAttempt(userId, false, clientIp, userAgent);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Successful login - reset failed attempts and update last login
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login = new Date();
    await user.save();

    await logAuthAttempt(userId, true, clientIp, userAgent);

    // Generate JWT token with enhanced payload
    const jwtOptions: SignOptions = {
      expiresIn: '24h',
      issuer: 'HIT-Ticket-System',
      audience: 'HIT-Users'
    };
    
    const tokenPayload = {
      id: user.id,
      user_id: user.user_id,
      role: user.role,
      factory_id: user.factory_id,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, jwtOptions);

    // Return user data and token
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        factory: factory ? {
          id: factory.id,
          name: factory.name,
          description: factory.description
        } : null,
        last_login: user.last_login
      }
    });

  } catch (error: any) {
    console.error('Login error for user:', req.body.userId);
    console.error('Error details:', error?.message || error);
    await logAuthAttempt(req.body.userId || 'unknown', false, clientIp, userAgent);
    
    res.status(500).json({
      success: false,
      message: 'Authentication service temporarily unavailable. Please try again later.'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name', 'description']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role,
        factory: (user as any).factory,
        created_at: user.created_at
      }
    });

  } catch (error: any) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Get user from database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password_hash = hashedNewPassword;
    user.password_changed_at = new Date();
    user.failed_login_attempts = 0; // Reset failed attempts
    user.locked_until = null; // Unlock account if locked
    await user.save();

    console.log(`🔐 Password changed for user ${user.user_id}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new user endpoint (admin only)
router.post('/register', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { user_id, full_name, email, role, factory_id, department, phone, password } = req.body;

    // Validate required fields
    if (!user_id || !full_name || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID, full name, role, and password are required'
      });
    }

    // Validate password complexity
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { user_id: user_id.trim().toUpperCase() } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User ID already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await User.create({
      user_id: user_id.trim().toUpperCase(),
      password_hash: hashedPassword,
      full_name: full_name.trim(),
      email: email ? email.toLowerCase().trim() : null,
      role,
      factory_id,
      department: department?.trim(),
      phone: phone?.trim(),
      is_active: true,
      failed_login_attempts: 0,
      password_changed_at: new Date()
    });

    console.log(`👤 New user created: ${newUser.user_id} by admin ${req.user!.user_id}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        user_id: newUser.user_id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        factory_id: newUser.factory_id,
        department: newUser.department,
        phone: newUser.phone,
        is_active: newUser.is_active,
        created_at: newUser.created_at
      }
    });

  } catch (error: any) {
    console.error('User registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Log the logout event
    console.log(`🚪 User ${req.user!.user_id} logged out`);
    
    res.json({ 
      success: true,
      message: 'Logout successful. Please remove token from client.' 
    });
  } catch (error) {
    res.json({ 
      success: true,
      message: 'Logout successful.' 
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});

// Get user permissions based on role
router.get('/permissions', authenticateToken, (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  
  const permissions = {
    employee: {
      tickets: { create: true, read: 'own', update: 'own', delete: false },
      users: { create: false, read: false, update: false, delete: false },
      reports: { create: false, read: false, update: false, delete: false }
    },
    support_staff: {
      tickets: { create: true, read: 'assigned', update: 'assigned', delete: false },
      users: { create: false, read: 'basic', update: false, delete: false },
      reports: { create: false, read: 'basic', update: false, delete: false }
    },
    manager: {
      tickets: { create: true, read: 'department', update: 'department', delete: false },
      users: { create: false, read: 'department', update: false, delete: false },
      reports: { create: true, read: 'department', update: true, delete: false }
    },
    admin: {
      tickets: { create: true, read: 'all', update: 'all', delete: true },
      users: { create: true, read: 'all', update: 'all', delete: true },
      reports: { create: true, read: 'all', update: true, delete: true }
    }
  };

  res.json({
    success: true,
    permissions: permissions[role] || permissions.employee
  });
});

export default router;