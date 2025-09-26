import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Ticket from './Ticket';

export interface TicketAttachmentAttributes {
  id: string;
  ticket_id: string;
  filename: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
  uploaded_at: Date;
}

export interface TicketAttachmentCreationAttributes extends Omit<TicketAttachmentAttributes, 'id' | 'uploaded_at'> {
  id?: string;
}

class TicketAttachment extends Model<TicketAttachmentAttributes, TicketAttachmentCreationAttributes> implements TicketAttachmentAttributes {
  public id!: string;
  public ticket_id!: string;
  public filename!: string;
  public file_path!: string;
  public mime_type?: string;
  public file_size?: number;
  public uploaded_at!: Date;
  
  // Association methods
  public getTicket!: () => Promise<Ticket>;
}

TicketAttachment.init(
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
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'TicketAttachment',
    tableName: 'ticket_attachments',
    timestamps: false,
    indexes: [
      {
        fields: ['ticket_id']
      }
    ]
  }
);

// Define associations
TicketAttachment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
Ticket.hasMany(TicketAttachment, { foreignKey: 'ticket_id', as: 'attachments' });

export default TicketAttachment;