import User from './User';
import Factory from './Factory';
import Ticket from './Ticket';
import TicketHistory from './TicketHistory';
import TicketApproval from './TicketApproval';
import TicketAssignment from './TicketAssignment';
import Notification from './Notification';

// Define all model associations
export function defineAssociations() {
  // User associations
  User.hasMany(Ticket, {
    foreignKey: 'requester_id',
    as: 'requestedTickets',
  });

  User.hasMany(Ticket, {
    foreignKey: 'assigned_to',
    as: 'assignedTickets',
  });

  User.hasMany(TicketHistory, {
    foreignKey: 'user_id',
    as: 'ticketHistory',
  });

  User.hasMany(TicketApproval, {
    foreignKey: 'admin_id',
    as: 'ticketApprovals',
  });

  User.hasMany(TicketAssignment, {
    foreignKey: 'assigned_to',
    as: 'ticketAssignments',
  });

  User.hasMany(TicketAssignment, {
    foreignKey: 'assigned_by',
    as: 'assignmentsMade',
  });

  User.hasMany(Notification, {
    foreignKey: 'user_id',
    as: 'userNotifications',
  });

  User.belongsTo(Factory, {
    foreignKey: 'factory_id',
    as: 'factory',
  });

  // Factory associations
  Factory.hasMany(Ticket, {
    foreignKey: 'factory_id',
    as: 'tickets',
  });

  Factory.hasMany(User, {
    foreignKey: 'factory_id',
    as: 'users',
  });

  // Ticket associations
  Ticket.belongsTo(User, {
    foreignKey: 'requester_id',
    as: 'requester',
  });

  Ticket.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignedUser',
  });

  Ticket.belongsTo(Factory, {
    foreignKey: 'factory_id',
    as: 'factory',
  });

  Ticket.hasMany(TicketHistory, {
    foreignKey: 'ticket_id',
    as: 'history',
  });

  Ticket.hasOne(TicketApproval, {
    foreignKey: 'ticket_id',
    as: 'approval',
  });

  Ticket.hasMany(TicketAssignment, {
    foreignKey: 'ticket_id',
    as: 'assignments',
  });

  Ticket.hasMany(Notification, {
    foreignKey: 'ticket_id',
    as: 'ticketNotifications',
  });

  // TicketHistory associations
  TicketHistory.belongsTo(Ticket, {
    foreignKey: 'ticket_id',
    as: 'historyTicket',
  });

  TicketHistory.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'historyUser',
  });

  // TicketApproval associations
  TicketApproval.belongsTo(Ticket, {
    foreignKey: 'ticket_id',
    as: 'approvalTicket',
  });

  TicketApproval.belongsTo(User, {
    foreignKey: 'admin_id',
    as: 'approvalAdmin',
  });

  // TicketAssignment associations
  TicketAssignment.belongsTo(Ticket, {
    foreignKey: 'ticket_id',
    as: 'assignmentTicket',
  });

  TicketAssignment.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignmentUser',
  });

  TicketAssignment.belongsTo(User, {
    foreignKey: 'assigned_by',
    as: 'assignmentCreator',
  });

  // Notification associations
  Notification.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'notificationUser',
  });

  Notification.belongsTo(Ticket, {
    foreignKey: 'ticket_id',
    as: 'notificationTicket',
  });
}

// Export all models for easy importing
export {
  User,
  Factory,
  Ticket,
  TicketHistory,
  TicketApproval,
  TicketAssignment,
  Notification,
};