import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Ticket from './Ticket';

export interface TicketApprovalAttributes {
  id: string;
  ticket_id: string;
  admin_id: string;
  decision: 'pending' | 'approved' | 'rejected';
  reason?: string;
  priority_override?: 'low' | 'medium' | 'high' | 'critical';
  assigned_team_suggestion?: string;
  estimated_hours_suggestion?: number;
  notes?: string;
  created_at: Date;
  decided_at?: Date;
}

export interface TicketApprovalCreationAttributes extends Omit<TicketApprovalAttributes, 'id' | 'created_at'> {
  id?: string;
}

class TicketApproval extends Model<TicketApprovalAttributes, TicketApprovalCreationAttributes> implements TicketApprovalAttributes {
  public id!: string;
  public ticket_id!: string;
  public admin_id!: string;
  public decision!: 'pending' | 'approved' | 'rejected';
  public reason?: string;
  public priority_override?: 'low' | 'medium' | 'high' | 'critical';
  public assigned_team_suggestion?: string;
  public estimated_hours_suggestion?: number;
  public notes?: string;
  public decided_at?: Date;

  public readonly created_at!: Date;

  // Association properties
  public approvalTicket?: Ticket;
  public approvalAdmin?: User;

  // Association methods
  public getTicket!: () => Promise<Ticket>;
  public getAdmin!: () => Promise<User>;
  
  // Business logic methods
  public isPending(): boolean {
    return this.decision === 'pending';
  }
  
  public isApproved(): boolean {
    return this.decision === 'approved';
  }
  
  public isRejected(): boolean {
    return this.decision === 'rejected';
  }
  
  public approve(adminId: string, reason?: string, notes?: string): void {
    this.decision = 'approved';
    this.admin_id = adminId;
    this.reason = reason;
    this.notes = notes;
    this.decided_at = new Date();
  }
  
  public reject(adminId: string, reason: string, notes?: string): void {
    this.decision = 'rejected';
    this.admin_id = adminId;
    this.reason = reason;
    this.notes = notes;
    this.decided_at = new Date();
  }
}

TicketApproval.init(
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
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    decision: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    priority_override: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true
    },
    assigned_team_suggestion: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    estimated_hours_suggestion: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 999.99
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    decided_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'TicketApproval',
    tableName: 'ticket_approvals',
    timestamps: false, // We handle timestamps manually
    indexes: [
      {
        fields: ['ticket_id']
      },
      {
        fields: ['admin_id']
      },
      {
        fields: ['decision']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['decided_at']
      }
    ]
  }
);

// Associations are defined in models/associations.ts to avoid circular dependencies

export { TicketApproval };
export default TicketApproval;