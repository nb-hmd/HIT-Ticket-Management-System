import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Ticket from './Ticket';

export interface TicketHistoryAttributes {
  id: string;
  ticket_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'approved' | 'rejected' | 'commented' | 'closed';
  old_value?: string;
  new_value?: string;
  field_name?: string;
  comment?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface TicketHistoryCreationAttributes extends Optional<TicketHistoryAttributes, 'id' | 'created_at'> {}

class TicketHistory extends Model<TicketHistoryAttributes, TicketHistoryCreationAttributes> implements TicketHistoryAttributes {
  public id!: string;
  public ticket_id!: string;
  public user_id!: string;
  public action!: 'created' | 'updated' | 'status_changed' | 'assigned' | 'approved' | 'rejected' | 'commented' | 'closed';
  public old_value?: string;
  public new_value?: string;
  public field_name?: string;
  public comment?: string;
  public metadata?: Record<string, any>;
  public readonly created_at!: Date;

  // Association properties
  public historyUser?: User;
  public ticket?: Ticket;

  // Association methods
  public getUser!: () => Promise<User>;
  public getTicket!: () => Promise<Ticket>;

  // Business logic methods
  public isStatusChange(): boolean {
    return this.action === 'status_changed';
  }

  public isAssignment(): boolean {
    return this.action === 'assigned';
  }

  public isApproval(): boolean {
    return this.action === 'approved' || this.action === 'rejected';
  }

  public getFormattedChange(): string {
    if (this.action === 'status_changed') {
      return `Status changed from ${this.old_value} to ${this.new_value}`;
    }
    if (this.action === 'assigned') {
      return `Ticket assigned to ${this.new_value}`;
    }
    if (this.action === 'approved') {
      return `Ticket approved${this.comment ? `: ${this.comment}` : ''}`;
    }
    if (this.action === 'rejected') {
      return `Ticket rejected${this.comment ? `: ${this.comment}` : ''}`;
    }
    if (this.field_name && this.old_value && this.new_value) {
      return `${this.field_name} changed from ${this.old_value} to ${this.new_value}`;
    }
    return this.comment || `${this.action} action performed`;
  }
}

TicketHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tickets',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.ENUM('created', 'updated', 'status_changed', 'assigned', 'approved', 'rejected', 'commented', 'closed'),
      allowNull: false,
    },
    old_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    field_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'TicketHistory',
    tableName: 'ticket_history',
    timestamps: true,
    updatedAt: false, // Only track creation time
    underscored: true,
    indexes: [
      {
        fields: ['ticket_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['ticket_id', 'created_at'],
        name: 'idx_ticket_history_ticket_time',
      },
      {
        fields: ['ticket_id', 'action'],
        name: 'idx_ticket_history_ticket_action',
      },
    ],
  }
);

// Associations are defined in models/associations.ts to avoid circular dependencies

export { TicketHistory };
export default TicketHistory;