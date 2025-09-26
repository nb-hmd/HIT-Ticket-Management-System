import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Factory from './Factory';

export interface UserAttributes {
  id: string;
  user_id: string;
  password_hash: string;
  full_name: string;
  email?: string;
  role: 'employee' | 'support_staff' | 'admin' | 'manager';
  factory_id?: string;
  department?: string;
  phone?: string;
  is_active: boolean;
  last_login?: Date;
  password_changed_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> {
  id?: string;
  failed_login_attempts?: number;
}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  // Remove public class fields to avoid shadowing Sequelize getters/setters
  declare id: string;
  declare user_id: string;
  declare password_hash: string;
  declare full_name: string;
  declare email?: string;
  declare role: 'employee' | 'support_staff' | 'admin' | 'manager';
  declare factory_id?: string;
  declare department?: string;
  declare phone?: string;
  declare is_active: boolean;
  declare last_login?: Date;
  declare password_changed_at?: Date;
  declare failed_login_attempts: number;
  declare locked_until?: Date;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Association methods
  public getFactory!: () => Promise<Factory>;
  
  // Security methods
  public isLocked(): boolean {
    return this.locked_until ? new Date() < this.locked_until : false;
  }
  
  public shouldLockAccount(): boolean {
    return this.failed_login_attempts >= 5;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    role: {
      type: DataTypes.ENUM('employee', 'support_staff', 'admin', 'manager'),
      allowNull: false
    },
    factory_id: {
      type: DataTypes.STRING(10),
      allowNull: true,
      references: {
        model: Factory,
        key: 'id'
      }
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    password_changed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['factory_id']
      },
      {
        fields: ['role']
      }
    ]
  }
);

// Associations are defined in models/index.ts to avoid circular dependencies

export { User };
export default User;