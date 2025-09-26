import fs from 'fs';
import path from 'path';
import { getDatabaseConfig } from '../config/database';
import sequelize from '../config/database';

interface MigrationFile {
  filename: string;
  version: string;
  description: string;
  sql: string;
}

class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    const config = getDatabaseConfig();
    // For SQLite, we don't need a PostgreSQL client
    // This will be handled by Sequelize instead
    this.migrationsPath = path.join(process.cwd(), 'migrations');
  }

  async connect(): Promise<void> {
    try {
      await sequelize.authenticate();
      console.log('✅ Connected to SQLite for migration');
    } catch (error) {
      console.error('❌ Failed to connect to SQLite:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await sequelize.close();
      console.log('✅ Disconnected from SQLite');
    } catch (error) {
      console.error('❌ Error disconnecting from SQLite:', error);
    }
  }

  async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(64)
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
      ON schema_migrations(version);
    `;

    try {
      await sequelize.query(createTableSQL);
      console.log('✅ Schema migrations table ready');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error);
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const [results] = await sequelize.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      return (results as any[]).map(row => row.version);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      return [];
    }
  }

  async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        console.warn('⚠️ Migrations directory not found:', this.migrationsPath);
        return [];
      }

      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: MigrationFile[] = [];

      for (const filename of files) {
        const filePath = path.join(this.migrationsPath, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Extract version and description from filename or SQL comments
        const version = filename.replace('.sql', '');
        const descriptionMatch = sql.match(/-- Description: (.+)/i);
        const description = descriptionMatch ? descriptionMatch[1] : 'No description';

        migrations.push({
          filename,
          version,
          description,
          sql
        });
      }

      return migrations;
    } catch (error) {
      console.error('❌ Failed to read migration files:', error);
      throw error;
    }
  }

  async executeMigration(migration: MigrationFile): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Executing migration: ${migration.filename}`);
      console.log(`📝 Description: ${migration.description}`);

      // Begin transaction
      const transaction = await sequelize.transaction();

      try {
        // Execute the migration SQL
      await sequelize.query(migration.sql, { transaction });

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Generate checksum
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(migration.sql).digest('hex');

      // Record the migration
      await sequelize.query(
        `INSERT INTO schema_migrations (version, filename, description, execution_time_ms, checksum) 
         VALUES (?, ?, ?, ?, ?)`,
        {
          replacements: [migration.version, migration.filename, migration.description, executionTime, checksum],
          transaction
        }
      );

      // Commit transaction
      await transaction.commit();
      
      console.log(`✅ Migration ${migration.filename} executed successfully (${executionTime}ms)`);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error(`❌ Migration ${migration.filename} failed:`, error);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migration process...');

      await this.connect();
      await this.createMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      console.log(`📊 Found ${migrationFiles.length} migration files`);
      console.log(`📊 ${executedMigrations.length} migrations already executed`);

      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations. Database is up to date.');
        return;
      }

      console.log(`🔄 Executing ${pendingMigrations.length} pending migrations...`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 All migrations executed successfully!');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async rollbackMigration(version: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back migration: ${version}`);
      
      await this.connect();
      
      // Check if migration exists
      const [results] = await sequelize.query(
        'SELECT * FROM schema_migrations WHERE version = ?',
        { replacements: [version] }
      );

      if ((results as any[]).length === 0) {
        console.log(`⚠️ Migration ${version} not found in executed migrations`);
        return;
      }

      // Begin transaction
      const transaction = await sequelize.transaction();

      try {
        // Remove migration record
        await sequelize.query(
          'DELETE FROM schema_migrations WHERE version = ?',
          { replacements: [version], transaction }
        );

        // Commit transaction
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      console.log(`✅ Migration ${version} rolled back successfully`);
      console.log('⚠️ Note: This only removes the migration record. Manual cleanup may be required.');
    } catch (error) {
      console.error(`❌ Rollback failed for migration ${version}:`, error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async getMigrationStatus(): Promise<void> {
    try {
      await this.connect();
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      console.log('\n📊 Migration Status:');
      console.log('==================');
      
      for (const migration of migrationFiles) {
        const isExecuted = executedMigrations.includes(migration.version);
        const status = isExecuted ? '✅ Executed' : '⏳ Pending';
        console.log(`${status} - ${migration.filename}: ${migration.description}`);
      }

      const pendingCount = migrationFiles.length - executedMigrations.length;
      console.log(`\n📈 Summary: ${executedMigrations.length} executed, ${pendingCount} pending`);
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  const version = process.argv[3];

  async function runCommand() {
    try {
      switch (command) {
        case 'up':
        case 'migrate':
          await migrator.runMigrations();
          break;
        case 'status':
          await migrator.getMigrationStatus();
          break;
        case 'rollback':
          if (!version) {
            console.error('❌ Please specify a migration version to rollback');
            process.exit(1);
          }
          await migrator.rollbackMigration(version);
          break;
        default:
          console.log('Usage:');
          console.log('  npm run migrate up     - Run pending migrations');
          console.log('  npm run migrate status  - Show migration status');
          console.log('  npm run migrate rollback <version> - Rollback specific migration');
          break;
      }
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  }

  runCommand();
}

export default DatabaseMigrator;