import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Ticket, 
  User, 
  Factory, 
  TicketApproval,
  TicketAssignment,
  TicketHistory,
  Notification 
} from '../models/index';
import { 
  authenticateToken, 
  AuthRequest, 
  adminOnly,
  canApproveTickets,
  canAssignTickets,
  hasPermission
} from '../middleware/auth';

const router = Router();

// Get admin dashboard statistics
router.get('/dashboard/stats', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    // Get ticket counts by status
    const ticketStats = await Ticket.findAll({
      attributes: [
        'status',
        [Ticket.sequelize!.fn('COUNT', Ticket.sequelize!.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get tickets requiring admin review
    const pendingReviewCount = await Ticket.count({
      where: { status: 'admin_review' }
    });

    // Get overdue tickets (past SLA deadline)
    const overdueCount = await Ticket.count({
      where: {
        sla_deadline: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['completed', 'closed', 'rejected'] }
      }
    });

    // Get recent ticket activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTickets = await Ticket.count({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo }
      }
    });

    // Get user activity stats
    const userStats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'count']
      ],
      where: { is_active: true },
      group: ['role'],
      raw: true
    });

    // Get factory stats
    const factoryStats = await Factory.findAll({
      attributes: [
        'id',
        'name',
        [Factory.sequelize!.fn('COUNT', Factory.sequelize!.col('tickets.id')), 'ticket_count']
      ],
      include: [{
        model: Ticket,
        as: 'tickets',
        attributes: [],
        where: {
          status: { [Op.notIn]: ['completed', 'closed'] }
        },
        required: false
      }],
      group: ['Factory.id', 'Factory.name'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        tickets: {
          byStatus: ticketStats,
          pendingReview: pendingReviewCount,
          overdue: overdueCount,
          recentWeek: recentTickets
        },
        users: {
          byRole: userStats
        },
        factories: factoryStats
      }
    });

  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get tickets pending admin review
router.get('/tickets/pending-review', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, priority, factory_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const whereClause: any = {
      status: 'admin_review'
    };

    if (priority) {
      whereClause.priority = priority;
    }
    if (factory_id) {
      whereClause.factory_id = factory_id;
    }

    const result = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'user_id', 'full_name', 'email', 'department']
        },
        {
          model: Factory,
          as: 'factory',
          attributes: ['id', 'name', 'description']
        },
        {
          model: TicketHistory,
          as: 'history',
          limit: 3,
          order: [['created_at', 'DESC']],
          include: [{
            model: User,
            as: 'historyUser',
            attributes: ['id', 'user_id', 'full_name']
          }]
        }
      ],
      order: [['created_at', 'ASC']], // Oldest first for review queue
      limit: Number(limit),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: {
        tickets: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.count,
          pages: Math.ceil(result.count / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get pending review tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk approve/reject tickets
router.post('/tickets/bulk-approve', authenticateToken, canApproveTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { ticket_ids, decision, reason } = req.body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ticket IDs array is required'
      });
    }

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Valid decision (approved/rejected) is required'
      });
    }

    const results = [];
    const errors = [];

    for (const ticketId of ticket_ids) {
      try {
        const ticket = await Ticket.findByPk(ticketId);
        
        if (!ticket) {
          errors.push({ ticketId, error: 'Ticket not found' });
          continue;
        }

        if (ticket.status !== 'admin_review') {
          errors.push({ ticketId, error: 'Ticket is not in admin review status' });
          continue;
        }

        // Update ticket status
        await ticket.update({ status: decision });

        // Create approval record
        await TicketApproval.create({
          ticket_id: ticketId,
          admin_id: req.user!.id,
          decision,
          reason,
          decided_at: new Date()
        });

        // Create history entry
        await TicketHistory.create({
          ticket_id: ticketId,
          user_id: req.user!.id,
          action: decision === 'approved' ? 'approved' : 'rejected',
          old_value: 'admin_review',
          new_value: decision,
          field_name: 'status',
          comment: reason
        });

        // Notify requester
        await Notification.create({
          user_id: ticket.requester_id,
          type: `ticket_${decision}`,
          title: `Ticket ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your ticket #${ticket.ticket_number} has been ${decision}${reason ? ': ' + reason : ''}`
        });

        results.push({ ticketId, status: decision });

      } catch (error: any) {
        console.error(`Error processing ticket ${ticketId}:`, error);
        errors.push({ ticketId, error: 'Processing failed' });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${decision} completed`,
      data: {
        processed: results,
        errors: errors,
        summary: {
          total: ticket_ids.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error: any) {
    console.error('Bulk approve tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get available support staff for assignment
router.get('/users/support-staff', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { factory_id } = req.query;
    
    const whereClause: any = {
      role: ['support_staff', 'manager'],
      is_active: true
    };

    if (factory_id) {
      whereClause.factory_id = factory_id;
    }

    const supportStaff = await User.findAll({
      where: whereClause,
      attributes: ['id', 'user_id', 'full_name', 'email', 'department', 'factory_id'],
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name']
      }],
      order: [['full_name', 'ASC']]
    });

    // Get current workload for each support staff member
    const staffWithWorkload = await Promise.all(
      supportStaff.map(async (staff) => {
        const activeTickets = await Ticket.count({
          where: {
            assigned_to: staff.id,
            status: ['in_progress', 'approved']
          }
        });

        return {
          ...staff.toJSON(),
          activeTickets
        };
      })
    );

    res.json({
      success: true,
      data: staffWithWorkload
    });

  } catch (error: any) {
    console.error('Get support staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get approval history and analytics
router.get('/approvals/history', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, admin_id, decision, date_from, date_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const whereClause: any = {};

    if (admin_id) {
      whereClause.admin_id = admin_id;
    }
    if (decision) {
      whereClause.decision = decision;
    }
    if (date_from || date_to) {
      whereClause.decided_at = {};
      if (date_from) {
        whereClause.decided_at[Op.gte] = new Date(date_from as string);
      }
      if (date_to) {
        whereClause.decided_at[Op.lte] = new Date(date_to as string);
      }
    }

    const result = await TicketApproval.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Ticket,
          as: 'ticket',
          attributes: ['id', 'ticket_number', 'title', 'priority', 'status'],
          include: [{
            model: User,
            as: 'requester',
            attributes: ['id', 'user_id', 'full_name']
          }]
        },
        {
          model: User,
          as: 'approvalAdmin',
          attributes: ['id', 'user_id', 'full_name']
        }
      ],
      order: [['decided_at', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: {
        approvals: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.count,
          pages: Math.ceil(result.count / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get system health and performance metrics
router.get('/system/health', authenticateToken, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    // Average ticket resolution time
    const avgResolutionTime = await Ticket.findOne({
      attributes: [
        [Ticket.sequelize!.fn('AVG', 
          Ticket.sequelize!.literal('EXTRACT(EPOCH FROM (resolved_at - created_at))')
        ), 'avg_resolution_seconds']
      ],
      where: {
        status: 'completed',
        resolved_at: { [Op.not]: null }
      },
      raw: true
    });

    // SLA compliance rate
    const totalCompleted = await Ticket.count({
      where: { status: 'completed' }
    });
    
    const slaCompliant = await Ticket.count({
      where: {
        status: 'completed',
        resolved_at: { [Op.lte]: Ticket.sequelize!.col('sla_deadline') }
      }
    });

    const slaComplianceRate = totalCompleted > 0 ? (slaCompliant / totalCompleted) * 100 : 0;

    // Ticket volume trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyVolume = await Ticket.findAll({
      attributes: [
        [Ticket.sequelize!.fn('DATE', Ticket.sequelize!.col('created_at')), 'date'],
        [Ticket.sequelize!.fn('COUNT', Ticket.sequelize!.col('id')), 'count']
      ],
      where: {
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      group: [Ticket.sequelize!.fn('DATE', Ticket.sequelize!.col('created_at'))],
      order: [[Ticket.sequelize!.fn('DATE', Ticket.sequelize!.col('created_at')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        performance: {
          avgResolutionTimeHours: (avgResolutionTime as any)?.avg_resolution_seconds ? 
            Math.round((avgResolutionTime as any).avg_resolution_seconds / 3600 * 100) / 100 : 0,
          slaComplianceRate: Math.round(slaComplianceRate * 100) / 100,
          totalCompletedTickets: totalCompleted
        },
        trends: {
          dailyVolume: dailyVolume
        }
      }
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;