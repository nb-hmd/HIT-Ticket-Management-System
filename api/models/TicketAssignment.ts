import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Ticket from './Ticket';

export interface TicketAssignmentAttributes {
  id: string;
  ticket_id: string;
  assigned_to: string;
  assigned_by: string;
  team_name?: string;
  assignment_reason?: string;
  expected_completion?: Date;
  is_active: boolean;
  created_at: Date;
  completed_at?: Date;
}

export interface TicketAssignmentCreationAttributes extends Omit<TicketAssignmentAttributes, 'id' | 'created_at' | 'is_active'> {
  id?: string;
  is_active?: boolean;
}

class TicketAssignment extends Model<TicketAssignmentAttributes, TicketAssignmentCreationAttributes> implements TicketAssignmentAttributes {
  public id!: string;
  public ticket_id!: string;
  public assigned_to!: string;
  public assigned_by!: string;
  public team_name?: string;
  public assignment_reason?: string;
  public expected_completion?: Date;
  public is_active!: boolean;
  public completed_at?: Date;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Association properties
  public assignmentTicket?: Ticket;
  public assignmentUser?: User;
  public assignmentCreator?: User;

  // Association methods
  public getTicket!: () => Promise<Ticket>;
  public getAssignedUser!: () => Promise<User>;
  public getAssignedByUser!: () => Promise<User>;
  
  // Business logic methods
  public isOverdue(): boolean {
    if (!this.expected_completion || this.completed_at) {
      return false;
    }
    return new Date() > this.expected_completion;
  }
  
  public getDaysUntilDue(): number | null {
    if (!this.expected_completion || this.completed_at) {
      return null;
    }
    const now = new Date();
    const diffTime = this.expected_completion.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  public complete(): void {
    this.is_active = false;
    this.completed_at = new Date();
  }
  
  public reassign(newAssigneeId: string, assignedById: string, reason?: string): void {
    this.assigned_to = newAssigneeId;
    this.assigned_by = assignedById;
    this.assignment_reason = reason;
    // Note: created_at should not be modified as it's a readonly timestamp
  }
}

TicketAssignment.init(
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
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    team_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    assignment_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expected_completion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'TicketAssignment',
    tableName: 'ticket_assignments',
    timestamps: false, // We handle timestamps manually
    indexes: [
      {
        fields: ['ticket_id']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['assigned_by']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['expected_completion']
      },
      {
        fields: ['team_name']
      }
    ]
  }
);

// Associations are defined in models/associations.ts to avoid circular dependencies

export { TicketAssignment };
export default TicketAssignment;