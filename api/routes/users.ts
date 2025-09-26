import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { User, Factory } from '../models/index';
import { authenticateToken, AuthRequest, adminOnly } from '../middleware/auth';

const router = Router();

// Mock factories for fallback
const mockFactories = [
  { id: 'ARDIC', name: 'Armament Research & Development Center', description: 'Research and development facility', is_active: true },
  { id: 'GUNFACTORY', name: 'Gun Factory', description: 'Artillery and weapons manufacturing', is_active: true },
  { id: 'ASRC', name: 'Ammunition Storage and Refurbishment Center', description: 'Ammunition storage and maintenance', is_active: true },
  { id: 'HRF', name: 'Heavy Rebuild Factory', description: 'Tank and vehicle rebuild operations', is_active: true },
  { id: 'MVF', name: 'Military Vehicle Factory', description: 'Military vehicle manufacturing', is_active: true },
  { id: 'HITEC', name: 'HIT Engineering Complex', description: 'Engineering and technical services', is_active: true }
];

// Check if database is available
const isDatabaseAvailable = async () => {
  try {
    await Factory.findOne({ limit: 1 });
    return true;
  } catch (error) {
    return false;
  }
};

// Get all factories (for dropdown lists)
router.get('/factories/list', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let factories = [];
    const dbAvailable = await isDatabaseAvailable();
    
    if (dbAvailable) {
      try {
        factories = await Factory.findAll({
          where: { is_active: true },
          attributes: ['id', 'name', 'description'],
          order: [['name', 'ASC']]
        });
      } catch (dbError) {
        console.warn('Database query failed, using mock factories:', dbError.message);
      }
    }
    
    // Use mock data if database is unavailable or no factories found
    if (!dbAvailable || factories.length === 0) {
      console.log('🔄 Using mock factory data for development');
      factories = mockFactories.filter(f => f.is_active);
    }

    res.json({
      success: true,
      data: factories
    });

  } catch (error) {
    console.error('Get factories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all users (Admin only)
router.get('/', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, role, factory_id, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};

    if (role) whereClause.role = role;
    if (factory_id) whereClause.factory_id = factory_id;
    if (search) {
      whereClause[Op.or] = [
        { user_id: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name']
      }],
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          pages: Math.ceil(count / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single user by ID (Admin only)
router.get('/:id', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
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
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, password, full_name, role, factory_id } = req.body;

    // Validate input
    if (!user_id || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID, password, full name, and role are required'
      });
    }

    // Validate role
    const validRoles = ['employee', 'support_staff', 'admin', 'manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if user_id already exists
    const existingUser = await User.findOne({ where: { user_id } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User ID already exists'
      });
    }

    // Validate factory if provided
    if (factory_id) {
      const factory = await Factory.findByPk(factory_id);
      if (!factory) {
        return res.status(400).json({
          success: false,
          message: 'Invalid factory'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      user_id,
      password_hash: hashedPassword,
      full_name,
      role,
      factory_id: factory_id || null,
      is_active: true
    });

    // Get created user with factory info
    const createdUser = await User.findByPk(user.id, {
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: createdUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, role, factory_id, is_active, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updates: any = {};

    if (full_name) updates.full_name = full_name;
    if (role) {
      const validRoles = ['employee', 'support_staff', 'admin', 'manager'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
      updates.role = role;
    }
    if (factory_id !== undefined) {
      if (factory_id) {
        const factory = await Factory.findByPk(factory_id);
        if (!factory) {
          return res.status(400).json({
            success: false,
            message: 'Invalid factory'
          });
        }
      }
      updates.factory_id = factory_id;
    }
    if (is_active !== undefined) updates.is_active = is_active;
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    await user.update(updates);

    // Get updated user with factory info
    const updatedUser = await User.findByPk(id, {
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name']
      }],
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting the current admin user
    if (user.id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete by deactivating instead of hard delete
    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all factories (for user creation/editing)
router.get('/factories/list', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const factories = await Factory.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: factories
    });

  } catch (error) {
    console.error('Get factories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get support staff for assignment
router.get('/support-staff/:factoryId?', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { factoryId } = req.params;
    
    const whereClause: any = {
      role: 'support_staff',
      is_active: true
    };

    if (factoryId) {
      whereClause.factory_id = factoryId;
    }

    const supportStaff = await User.findAll({
      where: whereClause,
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name']
      }],
      attributes: ['id', 'user_id', 'full_name', 'factory_id'],
      order: [['full_name', 'ASC']]
    });

    res.json({
      success: true,
      data: supportStaff
    });

  } catch (error) {
    console.error('Get support staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Temporary endpoint to list all users (for debugging)
router.get('/debug/list-all', async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'user_id', 'full_name', 'role', 'factory_id', 'is_active']
    });

    res.json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing users',
      error: error.message
    });
  }
});

// Temporary endpoint to create admin user (for debugging)
router.post('/create-admin', async (req: Request, res: Response) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { user_id: 'HIT000001' } });
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        data: {
          user_id: existingAdmin.user_id,
          full_name: existingAdmin.full_name,
          role: existingAdmin.role,
          factory_id: existingAdmin.factory_id
        }
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      user_id: 'HIT000001',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      role: 'admin',
      factory_id: 'HRF',
      is_active: true
    });

    res.json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user_id: adminUser.user_id,
        full_name: adminUser.full_name,
        role: adminUser.role,
        factory_id: adminUser.factory_id
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    });
  }
});

export default router;