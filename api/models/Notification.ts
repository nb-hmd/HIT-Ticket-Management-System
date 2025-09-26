import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface NotificationAttributes {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export interface NotificationCreationAttributes extends Omit<NotificationAttributes, 'id' | 'created_at'> {
  id?: string;
}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public user_id!: string;
  public type!: string;
  public title!: string;
  public message!: string;
  public is_read!: boolean;
  public created_at!: Date;
  public read_at?: Date;
  
  // Association methods
  public getUser!: () => Promise<User>;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_read']
      },
      {
        fields: ['created_at']
      }
    ]
  }
);

// Define associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

export default Notification;