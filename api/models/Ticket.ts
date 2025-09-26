import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Factory from './Factory';
import TicketHistory from './TicketHistory';
import TicketAssignment from './TicketAssignment';

export interface TicketAttributes {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'admin_review' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'closed';
  factory_id: string;
  requester_id: string;
  assigned_to?: string;
  assigned_team?: string;
  category?: string;
  urgency_level: number;
  business_impact?: string;
  sla_deadline?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  resolution_summary?: string;
  created_at: Date;
  updated_at: Date;
  approved_at?: Date;
  assigned_at?: Date;
  started_at?: Date;
  resolved_at?: Date;
  closed_at?: Date;
}

export interface TicketCreationAttributes extends Omit<TicketAttributes, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'urgency_level'> {
  id?: string;
  ticket_number?: string;
  urgency_level?: number;
}

class Ticket extends Model<TicketAttributes, TicketCreationAttributes> implements TicketAttributes {
  public id!: string;
  public ticket_number!: string;
  public title!: string;
  public description!: string;
  public priority!: 'low' | 'medium' | 'high' | 'critical';
  public status!: 'pending' | 'admin_review' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'closed';
  public factory_id!: string;
  public requester_id!: string;
  public assigned_to?: string;
  public assigned_team?: string;
  public category?: string;
  public urgency_level!: number;
  public business_impact?: string;
  public sla_deadline?: Date;
  public estimated_hours?: number;
  public actual_hours?: number;
  public resolution_summary?: string;
  public approved_at?: Date;
  public assigned_at?: Date;
  public started_at?: Date;
  public resolved_at?: Date;
  public closed_at?: Date;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association properties
  public requester?: User;
  public assignedUser?: User;
  public factory?: Factory;
  public history?: TicketHistory[];
  public approval?: any;
  public assignments?: TicketAssignment[];

  // Association methods
  public getRequester!: () => Promise<User>;
  public getAssignedUser!: () => Promise<User>;
  public getFactory!: () => Promise<Factory>;
  
  // Business logic methods
  public isPending(): boolean {
    return this.status === 'pending';
  }
  
  public isAwaitingApproval(): boolean {
    return this.status === 'admin_review';
  }
  
  public isApproved(): boolean {
    return this.status === 'approved';
  }
  
  public isRejected(): boolean {
    return this.status === 'rejected';
  }
  
  public isInProgress(): boolean {
    return this.status === 'in_progress';
  }
  
  public isCompleted(): boolean {
    return this.status === 'completed';
  }
  
  public isClosed(): boolean {
    return this.status === 'closed';
  }
  
  public isOverdue(): boolean {
    if (!this.sla_deadline || this.isCompleted() || this.isClosed()) {
      return false;
    }
    return new Date() > this.sla_deadline;
  }
  
  public getTimeRemaining(): number | null {
    if (!this.sla_deadline || this.isCompleted() || this.isClosed()) {
      return null;
    }
    const now = new Date();
    return this.sla_deadline.getTime() - now.getTime();
  }
}

Ticket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 5000],
      },
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('pending', 'admin_review', 'approved', 'rejected', 'in_progress', 'completed', 'closed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    factory_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'factories',
        key: 'id',
      },
    },
    requester_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assigned_team: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    urgency_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 5,
      },
    },
    business_impact: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sla_deadline: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimated_hours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    actual_hours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    resolution_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Ticket',
    tableName: 'tickets',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['ticket_number'],
        unique: true,
      },
      {
        fields: ['status'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['urgency_level'],
      },
      {
        fields: ['factory_id'],
      },
      {
        fields: ['requester_id'],
      },
      {
        fields: ['assigned_to'],
      },
      {
        fields: ['assigned_team'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['sla_deadline'],
      },
      {
        fields: ['status', 'priority'],
        name: 'idx_tickets_status_priority',
      },
      {
        fields: ['requester_id', 'status'],
        name: 'idx_tickets_requester_status',
      },
      {
        fields: ['assigned_to', 'status'],
        name: 'idx_tickets_assigned_status',
      },
    ],
  }
);

// Associations are defined in models/index.ts to avoid circular dependencies

export { Ticket };
export default Ticket;