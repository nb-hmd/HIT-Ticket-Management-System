import sequelize, { dbPromise, testConnection as dbTestConnection } from '../config/database';
import { Op } from 'sequelize';
import Factory from './Factory';
import User from './User';
import Ticket from './Ticket';
import TicketComment from './TicketComment';
import TicketAttachment from './TicketAttachment';
import TicketHistory from './TicketHistory';
import TicketApproval from './TicketApproval';
import TicketAssignment from './TicketAssignment';
import Notification from './Notification';
import { defineAssociations } from './associations';
import bcrypt from 'bcryptjs';

// Initialize all model associations
defineAssociations();

// Export all models
export {
  sequelize,
  Factory,
  User,
  Ticket,
  TicketComment,
  TicketAttachment,
  TicketHistory,
  TicketApproval,
  TicketAssignment,
  Notification
};

// Test database connection
export const testConnection = async () => {
  try {
    const isConnected = await dbTestConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Initialize database and seed data
export const initializeDatabase = async () => {
  try {
    // Wait for database connection to be established
    await dbPromise;
    
    // Sync database tables without dropping existing data
    console.log('🔄 Synchronizing database tables...');
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized successfully.');

    // Seed initial data
    await seedInitialData();
    console.log('✅ Initial data seeded successfully.');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Clean and re-seed users with invalid password hashes
const cleanInvalidUsers = async () => {
  try {
    // Find users with null or empty password_hash
    const invalidUsers = await User.findAll({
      where: {
        user_id: ['HIT000001', 'HIT000002', 'HIT000003']
      }
    });

    for (const user of invalidUsers) {
      if (!user.password_hash || user.password_hash.trim() === '') {
        console.log(`🔧 Fixing user ${user.user_id} with invalid password_hash`);
        await user.destroy();
      }
    }
  } catch (error) {
    console.warn('Warning: Could not clean invalid users:', error.message);
  }
};

// Seed initial data
const seedInitialData = async () => {
  try {
    // Clean invalid users first (skip if tables don't exist)
    try {
      await cleanInvalidUsers();
    } catch (error) {
      console.log('⚠️ Skipping user cleanup (tables may not exist yet)');
    }

    // Check if factories already exist (or create them if table is empty)
    let factoryCount = 0;
    try {
      factoryCount = await Factory.count();
    } catch (error) {
      console.log('⚠️ Factory table not found, will create initial data');
    }
    if (factoryCount === 0) {
      // Insert initial factory data
      await Factory.bulkCreate([
        {
          id: 'ARDIC',
          name: 'Armament Research & Development and Integration Center',
          description: 'Research and development facility',
          is_active: true
        },
        {
          id: 'GUNFACTORY',
          name: 'Gun Factory',
          description: 'Artillery and weapons manufacturing',
          is_active: true
        },
        {
          id: 'ASRC',
          name: 'Ammunition Storage and Refurbishment Center',
          description: 'Ammunition storage and maintenance',
          is_active: true
        },
        {
          id: 'HRF',
          name: 'Heavy Rebuild Factory',
          description: 'Tank and vehicle rebuild operations',
          is_active: true
        },
        {
          id: 'MVF',
          name: 'Military Vehicle Factory',
          description: 'Military vehicle manufacturing',
          is_active: true
        },
        {
          id: 'HITEC',
          name: 'HIT Engineering Complex',
          description: 'Engineering and technical services',
          is_active: true
        }
      ]);
      console.log('✅ Factory data seeded.');
    }

    // Check if admin user already exists
    const adminUser = await User.findOne({ where: { user_id: 'HIT000001' } });
    if (!adminUser) {
      // Create initial admin user with specific UUID from migration
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        id: '550e8400-e29b-41d4-a716-446655440001', // Use specific UUID from migration
        user_id: 'HIT000001',
        password_hash: hashedPassword,
        full_name: 'Aneeb Ahmed',
        role: 'admin',
        factory_id: 'HRF',
        is_active: true
      });
      console.log('✅ Admin user created (HIT000001 / admin123).');
    }

    // Create sample support staff
    const supportUser = await User.findOne({ where: { user_id: 'HIT000002' } });
    if (!supportUser) {
      const hashedPassword = await bcrypt.hash('support123', 10);
      await User.create({
        id: '550e8400-e29b-41d4-a716-446655440002', // Use specific UUID from migration
        user_id: 'HIT000002',
        password_hash: hashedPassword,
        full_name: 'Shanzay Aneeb',
        role: 'support_staff',
        factory_id: 'ARDIC',
        is_active: true
      });
      console.log('✅ Support staff user created (HIT000002 / support123).');
    }

    // Create sample employee
    const employeeUser = await User.findOne({ where: { user_id: 'HIT000003' } });
    if (!employeeUser) {
      const hashedPassword = await bcrypt.hash('employee123', 10);
      await User.create({
        id: '550e8400-e29b-41d4-a716-446655440003', // Use specific UUID from migration
        user_id: 'HIT000003',
        password_hash: hashedPassword,
        full_name: 'Ahmed Ali',
        role: 'employee',
        factory_id: 'GUNFACTORY',
        is_active: true
      });
      console.log('✅ Employee user created (HIT000003 / employee123).');
    }

  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
    throw error;
  }
};

// Generate ticket number
export const generateTicketNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  const datePrefix = `HIT${year}${month}${day}`;
  
  // Find the last ticket number for today
  const lastTicket = await Ticket.findOne({
    where: {
      ticket_number: {
        [Op.like]: `${datePrefix}%`
      }
    },
    order: [['ticket_number', 'DESC']]
  });
  
  let sequence = 1;
  if (lastTicket) {
    const lastSequence = parseInt(lastTicket.ticket_number.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${datePrefix}${sequence.toString().padStart(4, '0')}`;
};

// Calculate SLA deadline based on priority
export const calculateSLADeadline = (priority: string, createdAt: Date = new Date()): Date => {
  const deadline = new Date(createdAt);
  
  switch (priority) {
    case 'critical':
      deadline.setHours(deadline.getHours() + 2);
      break;
    case 'high':
      deadline.setHours(deadline.getHours() + 8);
      break;
    case 'medium':
      deadline.setHours(deadline.getHours() + 24);
      break;
    case 'low':
      deadline.setHours(deadline.getHours() + 72);
      break;
    default:
      deadline.setHours(deadline.getHours() + 24);
  }
  
  return deadline;
};