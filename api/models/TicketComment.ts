import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Ticket from './Ticket';
import User from './User';

export interface TicketCommentAttributes {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
}

export interface TicketCommentCreationAttributes extends Omit<TicketCommentAttributes, 'id' | 'created_at'> {
  id?: string;
}

class TicketComment extends Model<TicketCommentAttributes, TicketCommentCreationAttributes> implements TicketCommentAttributes {
  public id!: string;
  public ticket_id!: string;
  public user_id!: string;
  public content!: string;
  public is_internal!: boolean;
  public created_at!: Date;
  
  // Association methods
  public getTicket!: () => Promise<Ticket>;
  public getUser!: () => Promise<User>;
}

TicketComment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Ticket,
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_internal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'TicketComment',
    tableName: 'ticket_comments',
    timestamps: false,
    indexes: [
      {
        fields: ['ticket_id']
      },
      {
        fields: ['created_at']
      }
    ]
  }
);

// Define associations
TicketComment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
TicketComment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Ticket.hasMany(TicketComment, { foreignKey: 'ticket_id', as: 'comments' });
User.hasMany(TicketComment, { foreignKey: 'user_id', as: 'comments' });

export default TicketComment;