import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// SQLite connection configuration
const createSequelizeInstance = () => {
  return new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './hit_ticket_system.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
};

// Initialize SQLite connection
const sequelize = createSequelizeInstance();

// SQLite database initialization
const initializeDatabase = async () => {
  try {
    console.log('🔄 Connecting to SQLite database...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ SQLite connection established successfully.');
    
    // Test basic query
    await sequelize.query('SELECT 1+1 as result');
    console.log('✅ SQLite database is responsive.');
    
    return sequelize;
  } catch (error) {
    console.error('❌ SQLite connection failed:', error.message);
    throw new Error(`SQLite connection failed. Please check your database configuration.`);
  }
};

// Initialize database connection
const dbPromise = initializeDatabase();

// Connection health check
const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    return { status: 'healthy', database: 'SQLite' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed gracefully.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

export default sequelize;
export { dbPromise, healthCheck, closeConnection };

// Test database connection
export const testConnection = async () => {
  try {
    await dbPromise;
    console.log('✅ SQLite database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to SQLite database:', error);
    return false;
  }
};

// Export database configuration for external use
export const getDatabaseConfig = () => ({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || './hit_ticket_system.db'
});