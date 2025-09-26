import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Ticket, 
  User, 
  Factory, 
  TicketHistory,
  TicketApproval,
  TicketAssignment,
  TicketComment,
  sequelize
} from '../models/index';
import { 
  authenticateToken, 
  AuthRequest, 
  adminOnly,
  managerOrAdmin,
  supportStaffOrAdmin
} from '../middleware/auth';

const router = Router();

// Get comprehensive audit trail for a specific ticket
router.get('/ticket/:ticketId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { include_system_events = 'true' } = req.query;

    // Check if user has access to this ticket
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check permissions
    const canAccess = 
      req.user!.role === 'admin' ||
      req.user!.role === 'manager' ||
      ticket.assigned_to === req.user!.id ||
      ticket.requester_id === req.user!.id;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get ticket history
    const history = await TicketHistory.findAll({
      where: { ticket_id: ticketId },
      include: [{
        model: User,
        as: 'historyUser',
        attributes: ['id', 'user_id', 'full_name', 'role']
      }],
      order: [['created_at', 'DESC']]
    });

    // Get approvals
    const approvals = await TicketApproval.findAll({
      where: { ticket_id: ticketId },
      include: [{
        model: User,
        as: 'approvalAdmin',
        attributes: ['id', 'user_id', 'full_name']
      }],
      order: [['created_at', 'DESC']]
    });

    // Get assignments
    const assignments = await TicketAssignment.findAll({
      where: { ticket_id: ticketId },
      include: [
        {
          model: User,
          as: 'assignmentUser',
          attributes: ['id', 'user_id', 'full_name']
        },
        {
          model: User,
          as: 'assignmentCreator',
          attributes: ['id', 'user_id', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Get comments (if user has permission)
    let comments = [];
    if (['admin', 'manager', 'support_staff'].includes(req.user!.role) || 
        ticket.requester_id === req.user!.id || 
        ticket.assigned_to === req.user!.id) {
      comments = await TicketComment.findAll({
        where: { 
          ticket_id: ticketId,
          // Hide internal comments from regular users
          ...(req.user!.role === 'employee' ? { is_internal: false } : {})
        },
        include: [{
          model: User,
          as: 'commentUser',
          attributes: ['id', 'user_id', 'full_name', 'role']
        }],
        order: [['created_at', 'DESC']]
      });
    }

    // Combine and sort all events chronologically
    const allEvents = [];

    // Add history events
    history.forEach(h => {
      allEvents.push({
        type: 'history',
        id: h.id,
        timestamp: h.created_at,
        action: h.action,
        description: h.getFormattedChange(),
        user: h.historyUser,
        details: {
          field_name: h.field_name,
          old_value: h.old_value,
          new_value: h.new_value,
          comment: h.comment,
          metadata: h.metadata
        }
      });
    });

    // Add approval events
    approvals.forEach(a => {
      allEvents.push({
        type: 'approval',
        id: a.id,
        timestamp: a.decided_at || a.created_at,
        action: a.decision,
        description: `Ticket ${a.decision}${a.reason ? `: ${a.reason}` : ''}`,
        user: a.approvalAdmin,
        details: {
          decision: a.decision,
          reason: a.reason,
          priority_override: a.priority_override,
          notes: a.notes
        }
      });
    });

    // Add assignment events
    assignments.forEach(a => {
      allEvents.push({
        type: 'assignment',
        id: a.id,
        timestamp: a.created_at,
        action: 'assigned',
        description: `Assigned to ${a.assignmentUser?.full_name || 'Unknown User'}`,
        user: a.assignmentCreator,
        details: {
          assigned_to: a.assignmentUser,
          notes: a.assignment_reason,
          is_active: a.is_active
        }
      });
    });

    // Add comment events
    comments.forEach(c => {
      allEvents.push({
        type: 'comment',
        id: c.id,
        timestamp: c.created_at,
        action: c.is_internal ? 'internal_comment' : 'comment',
        description: `${c.is_internal ? 'Internal comment' : 'Comment'} added`,
        user: c.commentUser,
        details: {
          content: c.content,
          is_internal: c.is_internal
        }
      });
    });

    // Sort by timestamp (newest first)
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          status: ticket.status
        },
        events: allEvents,
        summary: {
          total_events: allEvents.length,
          history_events: history.length,
          approval_events: approvals.length,
          assignment_events: assignments.length,
          comment_events: comments.length
        }
      }
    });

  } catch (error) {
    console.error('Get ticket audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get system-wide audit trail (admin only)
router.get('/system', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      user_id, 
      date_from, 
      date_to,
      ticket_id 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    if (action) {
      whereClause.action = action;
    }
    if (user_id) {
      whereClause.user_id = user_id;
    }
    if (ticket_id) {
      whereClause.ticket_id = ticket_id;
    }
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        whereClause.created_at[Op.gte] = new Date(date_from as string);
      }
      if (date_to) {
        whereClause.created_at[Op.lte] = new Date(date_to as string);
      }
    }

    const result = await TicketHistory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'historyUser',
          attributes: ['id', 'user_id', 'full_name', 'role', 'department']
        },
        {
          model: Ticket,
          as: 'historyTicket',
          attributes: ['id', 'ticket_number', 'title', 'status', 'priority'],
          include: [{
            model: Factory,
            as: 'factory',
            attributes: ['id', 'name']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: {
        events: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.count,
          pages: Math.ceil(result.count / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get system audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get audit statistics and analytics
router.get('/analytics', authenticateToken, managerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30', factory_id } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    let baseWhere: any = {
      created_at: { [Op.gte]: startDate }
    };

    // Filter by factory for managers
    if (req.user!.role === 'manager') {
      baseWhere = {
        ...baseWhere,
        '$historyTicket.factory_id$': req.user!.factory_id
      };
    } else if (factory_id) {
      baseWhere = {
        ...baseWhere,
        '$historyTicket.factory_id$': factory_id
      };
    }

    // Activity by action type
    const activityByAction = await TicketHistory.findAll({
      where: baseWhere,
      include: [{
        model: Ticket,
        as: 'historyTicket',
        attributes: []
      }],
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Activity by user
    const activityByUser = await TicketHistory.findAll({
      where: baseWhere,
      include: [
        {
          model: Ticket,
          as: 'ticket',
          attributes: []
        },
        {
          model: User,
          as: 'historyUser',
          attributes: ['id', 'full_name', 'role']
        }
      ],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'count']
      ],
      group: ['historyUser.id', 'historyUser.full_name', 'historyUser.role'],
      order: [[sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'DESC']],
      limit: 10,
      raw: false
    });

    // Daily activity trend
    const dailyActivity = await TicketHistory.findAll({
      where: baseWhere,
      include: [{
        model: Ticket,
        as: 'ticket',
        attributes: []
      }],
      attributes: [
        [sequelize.fn('DATE', sequelize.col('TicketHistory.created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('TicketHistory.created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('TicketHistory.created_at')), 'ASC']],
      raw: true
    });

    // Most active tickets (by history count)
    const mostActiveTickets = await TicketHistory.findAll({
      where: baseWhere,
      include: [{
        model: Ticket,
        as: 'ticket',
        attributes: ['id', 'ticket_number', 'title', 'status'],
        include: [{
          model: Factory,
          as: 'factory',
          attributes: ['name']
        }]
      }],
      attributes: [
        'ticket_id',
        [sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'activity_count']
      ],
      group: ['ticket_id', 'ticket.id', 'ticket.ticket_number', 'ticket.title', 'ticket.status', 'ticket->factory.id', 'ticket->factory.name'],
      order: [[sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'DESC']],
      limit: 10,
      raw: false
    });

    // Status change frequency
    const statusChanges = await TicketHistory.findAll({
      where: {
        ...baseWhere,
        action: 'status_changed'
      },
      include: [{
        model: Ticket,
        as: 'ticket',
        attributes: []
      }],
      attributes: [
        'old_value',
        'new_value',
        [sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'count']
      ],
      group: ['old_value', 'new_value'],
      order: [[sequelize.fn('COUNT', sequelize.col('TicketHistory.id')), 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period: Number(period),
        analytics: {
          activityByAction: activityByAction.map((item: any) => ({
            action: item.action,
            count: Number(item.count)
          })),
          activityByUser: activityByUser.map((item: any) => ({
            user: item.historyUser,
            count: Number(item.get('count'))
          })),
          dailyActivity: dailyActivity.map((item: any) => ({
            date: item.date,
            count: Number(item.count)
          })),
          mostActiveTickets: mostActiveTickets.map((item: any) => ({
            ticket: item.ticket,
            activity_count: Number(item.get('activity_count'))
          })),
          statusChanges: statusChanges.map((item: any) => ({
            from: item.old_value,
            to: item.new_value,
            count: Number(item.count)
          }))
        }
      }
    });

  } catch (error) {
    console.error('Get audit analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user activity report
router.get('/user/:userId', authenticateToken, supportStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { period = '30' } = req.query;

    // Check if user can access this data
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager' && req.user!.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const user = await User.findByPk(userId, {
      attributes: ['id', 'user_id', 'full_name', 'role', 'department']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's activity history
    const activities = await TicketHistory.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: startDate }
      },
      include: [{
        model: Ticket,
        as: 'ticket',
        attributes: ['id', 'ticket_number', 'title', 'status'],
        include: [{
          model: Factory,
          as: 'factory',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    // Activity summary by action
    const activitySummary = await TicketHistory.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Daily activity
    const dailyActivity = await TicketHistory.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        user,
        period: Number(period),
        activities,
        summary: {
          total_activities: activities.length,
          by_action: activitySummary.map((item: any) => ({
            action: item.action,
            count: Number(item.count)
          })),
          daily_activity: dailyActivity.map((item: any) => ({
            date: item.date,
            count: Number(item.count)
          }))
        }
      }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Export audit data (admin only)
router.get('/export', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { format = 'json', date_from, date_to, ticket_id } = req.query;

    const whereClause: any = {};
    if (ticket_id) {
      whereClause.ticket_id = ticket_id;
    }
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) {
        whereClause.created_at[Op.gte] = new Date(date_from as string);
      }
      if (date_to) {
        whereClause.created_at[Op.lte] = new Date(date_to as string);
      }
    }

    const auditData = await TicketHistory.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'historyUser',
          attributes: ['id', 'user_id', 'full_name', 'role', 'department']
        },
        {
          model: Ticket,
          as: 'ticket',
          attributes: ['id', 'ticket_number', 'title', 'status', 'priority'],
          include: [{
            model: Factory,
            as: 'factory',
            attributes: ['id', 'name']
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (format === 'csv') {
      // Generate CSV format
      const csvHeader = 'Timestamp,Ticket Number,Action,User,Role,Old Value,New Value,Field,Comment\n';
      const csvData = auditData.map(item => {
        return [
          item.created_at.toISOString(),
          item.ticket?.ticket_number || '',
          item.action,
          item.historyUser?.full_name || '',
          item.historyUser?.role || '',
          item.old_value || '',
          item.new_value || '',
          item.field_name || '',
          (item.comment || '').replace(/"/g, '""') // Escape quotes
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      // JSON format
      res.json({
        success: true,
        data: {
          export_date: new Date().toISOString(),
          total_records: auditData.length,
          filters: { date_from, date_to, ticket_id },
          records: auditData
        }
      });
    }

  } catch (error) {
    console.error('Export audit data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;