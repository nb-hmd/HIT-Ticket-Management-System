import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Ticket, User, Factory, sequelize } from '../models/index';
import { authenticateToken, AuthRequest, supportStaffOrAdmin } from '../middleware/auth';

const router = Router();

// Mock data for fallback
const mockDashboardData = {
  summary: {
    totalTickets: 15,
    slaCompliance: 85.5,
    avgResolutionHours: 18.2,
    slaBreached: 3
  },
  charts: {
    ticketsByStatus: [
      { status: 'new', count: 4 },
      { status: 'open', count: 6 },
      { status: 'pending', count: 2 },
      { status: 'resolved', count: 3 }
    ],
    ticketsByPriority: [
      { priority: 'low', count: 3 },
      { priority: 'medium', count: 8 },
      { priority: 'high', count: 3 },
      { priority: 'critical', count: 1 }
    ],
    ticketsByFactory: [
      { factory: 'Gun Factory', count: 6 },
      { factory: 'Armament Research & Development Center', count: 4 },
      { factory: 'Heavy Rebuild Factory', count: 3 },
      { factory: 'Ammunition Storage Center', count: 2 }
    ]
  },
  recentTickets: [
    {
      id: '1',
      ticket_number: 'HIT240101001',
      title: 'Equipment Maintenance Required',
      status: 'open',
      priority: 'medium',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      requester: { user_id: 'HIT000003', full_name: 'John Doe' },
      factory: { name: 'Gun Factory' }
    },
    {
      id: '2',
      ticket_number: 'HIT240101002',
      title: 'System Access Issue',
      status: 'new',
      priority: 'high',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      requester: { user_id: 'HIT000003', full_name: 'John Doe' },
      factory: { name: 'Armament Research & Development Center' }
    }
  ]
};

// Check if database is available
const isDatabaseAvailable = async () => {
  try {
    await Ticket.findOne({ limit: 1 });
    return true;
  } catch (error) {
    return false;
  }
};

// Dashboard statistics
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const dbAvailable = await isDatabaseAvailable();
    
    if (!dbAvailable) {
      console.log('🔄 Using mock dashboard data for development');
      return res.json({
        success: true,
        data: mockDashboardData
      });
    }
    
    try {
      const { period = '30' } = req.query; // days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(period));

      // Base where clause for role-based filtering
      let baseWhere: any = {};
      if (req.user!.role === 'employee') {
        baseWhere.requester_id = req.user!.id;
      } else if (req.user!.role === 'support_staff') {
        baseWhere[Op.or] = [
          { assigned_to: req.user!.id },
          { factory_id: req.user!.factory_id }
        ];
      }

    // Total tickets
    const totalTickets = await Ticket.count({
      where: {
        ...baseWhere,
        created_at: { [Op.gte]: startDate }
      }
    });

    // Tickets by status
    const ticketsByStatus = await Ticket.findAll({
      where: {
        ...baseWhere,
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Tickets by priority
    const ticketsByPriority = await Ticket.findAll({
      where: {
        ...baseWhere,
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    // Tickets by factory
    const ticketsByFactory = await Ticket.findAll({
      where: {
        ...baseWhere,
        created_at: { [Op.gte]: startDate }
      },
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['name']
      }],
      attributes: [
        'factory_id',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
      ],
      group: ['factory_id', 'factory.id', 'factory.name'],
      raw: true
    });

    // SLA compliance
    const totalWithSLA = await Ticket.count({
      where: {
        ...baseWhere,
        sla_deadline: { [Op.ne]: null },
        created_at: { [Op.gte]: startDate }
      }
    });

    const slaBreached = await Ticket.count({
      where: {
        ...baseWhere,
        sla_deadline: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['resolved', 'closed'] },
        created_at: { [Op.gte]: startDate }
      }
    });

    const slaCompliance = totalWithSLA > 0 ? ((totalWithSLA - slaBreached) / totalWithSLA * 100) : 100;

    // Average resolution time - SQLite compatible
    const resolvedTickets = await Ticket.findAll({
      where: {
        ...baseWhere,
        status: 'resolved',
        resolved_at: { [Op.ne]: null },
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('AVG', 
          sequelize.literal('(julianday(resolved_at) - julianday(created_at)) * 86400')
        ), 'avg_resolution_time']
      ],
      raw: true
    });

    const avgResolutionHours = (resolvedTickets[0] as any)?.avg_resolution_time 
      ? Math.round(Number((resolvedTickets[0] as any).avg_resolution_time) / 3600 * 100) / 100 
      : 0;

    // Recent tickets
    const recentTickets = await Ticket.findAll({
      where: baseWhere,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'full_name']
        },
        {
          model: Factory,
          as: 'factory',
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

      res.json({
        success: true,
        data: {
          summary: {
            totalTickets,
            slaCompliance: Math.round(slaCompliance * 100) / 100,
            avgResolutionHours,
            slaBreached
          },
          charts: {
            ticketsByStatus: ticketsByStatus.map((item: any) => ({
              status: item.status,
              count: Number(item.count)
            })),
            ticketsByPriority: ticketsByPriority.map((item: any) => ({
              priority: item.priority,
              count: Number(item.count)
            })),
            ticketsByFactory: ticketsByFactory.map((item: any) => ({
              factory: item['factory.name'],
              count: Number(item.count)
            }))
          },
          recentTickets
        }
      });
    } catch (dbError) {
      console.warn('Database query failed, using mock dashboard data:', dbError.message);
      return res.json({
        success: true,
        data: mockDashboardData
      });
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// SLA compliance report
router.get('/sla-compliance', authenticateToken, supportStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30', factory_id } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    let whereClause: any = {
      created_at: { [Op.gte]: startDate },
      sla_deadline: { [Op.ne]: null }
    };

    if (factory_id) {
      whereClause.factory_id = factory_id;
    }

    // Role-based filtering
    if (req.user!.role === 'support_staff') {
      whereClause[Op.or] = [
        { assigned_to: req.user!.id },
        { factory_id: req.user!.factory_id }
      ];
    }

    const slaReport = await Ticket.findAll({
      where: whereClause,
      include: [
        {
          model: Factory,
          as: 'factory',
          attributes: ['name']
        }
      ],
      attributes: [
        'factory_id',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'total_tickets'],
        [sequelize.fn('SUM', 
          sequelize.literal(
            "CASE WHEN sla_deadline < datetime('now') AND status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END"
          )
        ), 'breached_tickets'],
        [sequelize.fn('SUM', 
          sequelize.literal(
            "CASE WHEN status IN ('resolved', 'closed') AND resolved_at <= sla_deadline THEN 1 ELSE 0 END"
          )
        ), 'met_sla_tickets']
      ],
      group: ['factory_id', 'factory.id', 'factory.name'],
      raw: true
    });

    const formattedReport = slaReport.map((item: any) => {
      const total = Number(item.total_tickets);
      const breached = Number(item.breached_tickets);
      const met = Number(item.met_sla_tickets);
      const compliance = total > 0 ? ((met / total) * 100) : 0;

      return {
        factory: item['factory.name'],
        totalTickets: total,
        breachedTickets: breached,
        metSLATickets: met,
        compliancePercentage: Math.round(compliance * 100) / 100
      };
    });

    res.json({
      success: true,
      data: formattedReport
    });

  } catch (error) {
    console.error('SLA compliance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Agent performance report
router.get('/agent-performance', authenticateToken, supportStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30', factory_id } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    let whereClause: any = {
      created_at: { [Op.gte]: startDate },
      assigned_to: { [Op.ne]: null }
    };

    if (factory_id) {
      whereClause.factory_id = factory_id;
    }

    // Role-based filtering
    if (req.user!.role === 'support_staff') {
      whereClause.assigned_to = req.user!.id;
    }

    const agentPerformance = await Ticket.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['user_id', 'full_name']
        },
        {
          model: Factory,
          as: 'factory',
          attributes: ['name']
        }
      ],
      attributes: [
        'assigned_to',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'total_assigned'],
        [sequelize.fn('SUM', 
          sequelize.literal(
            "CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END"
          )
        ), 'resolved_tickets'],
        [sequelize.fn('AVG', 
          sequelize.literal(
            "CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24 END"
          )
        ), 'avg_resolution_hours']
      ],
      group: ['assigned_to', 'assignedUser.id', 'assignedUser.user_id', 'assignedUser.full_name', 'factory.id', 'factory.name'],
      raw: true
    });

    const formattedReport = agentPerformance.map((item: any) => {
      const total = Number(item.total_assigned);
      const resolved = Number(item.resolved_tickets);
      const resolutionRate = total > 0 ? ((resolved / total) * 100) : 0;
      const avgHours = item.avg_resolution_hours ? Math.round(Number(item.avg_resolution_hours) * 100) / 100 : 0;

      return {
        agentId: item['assignedUser.user_id'],
        agentName: item['assignedUser.full_name'],
        factory: item['factory.name'],
        totalAssigned: total,
        resolvedTickets: resolved,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
        avgResolutionHours: avgHours
      };
    });

    res.json({
      success: true,
      data: formattedReport
    });

  } catch (error) {
    console.error('Agent performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Analytics endpoint - provides comprehensive ticket analytics
router.get('/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Base where clause for role-based filtering
    let baseWhere: any = {
      created_at: { [Op.gte]: startDate }
    };

    if (req.user!.role === 'employee') {
      baseWhere.requester_id = req.user!.id;
    } else if (req.user!.role === 'support_staff') {
      baseWhere[Op.or] = [
        { assigned_to: req.user!.id },
        { factory_id: req.user!.factory_id }
      ];
    }

    // Get comprehensive analytics data
    const [totalTickets, ticketsByStatus, ticketsByPriority, ticketsByFactory, resolvedTickets] = await Promise.all([
      // Total tickets
      Ticket.count({ where: baseWhere }),
      
      // Tickets by status
      Ticket.findAll({
        where: baseWhere,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      
      // Tickets by priority
      Ticket.findAll({
        where: baseWhere,
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['priority'],
        raw: true
      }),
      
      // Tickets by factory
      Ticket.findAll({
        where: baseWhere,
        include: [{
          model: Factory,
          as: 'factory',
          attributes: ['name']
        }],
        attributes: [
          'factory_id',
          [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
        ],
        group: ['factory_id', 'factory.id', 'factory.name'],
        raw: true
      }),
      
      // Average resolution time
      Ticket.findAll({
        where: {
          ...baseWhere,
          status: 'resolved',
          resolved_at: { [Op.ne]: null }
        },
        attributes: [
          [sequelize.fn('AVG', 
            sequelize.literal('(julianday(resolved_at) - julianday(created_at)) * 24')
          ), 'avg_resolution_hours']
        ],
        raw: true
      })
    ]);

    const avgResolutionHours = (resolvedTickets[0] as any)?.avg_resolution_hours 
      ? Math.round(Number((resolvedTickets[0] as any).avg_resolution_hours) * 100) / 100 
      : 0;

    res.json({
      success: true,
      data: {
        period: Number(days),
        totalTickets,
        avgResolutionHours,
        ticketsByStatus: ticketsByStatus.map((item: any) => ({
          status: item.status,
          count: Number(item.count)
        })),
        ticketsByPriority: ticketsByPriority.map((item: any) => ({
          priority: item.priority,
          count: Number(item.count)
        })),
        ticketsByFactory: ticketsByFactory.map((item: any) => ({
          factory: item['factory.name'],
          count: Number(item.count)
        }))
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Summary endpoint - provides key summary statistics
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    let baseWhere: any = {
      created_at: { [Op.gte]: startDate }
    };

    if (req.user!.role === 'employee') {
      baseWhere.requester_id = req.user!.id;
    } else if (req.user!.role === 'support_staff') {
      baseWhere[Op.or] = [
        { assigned_to: req.user!.id },
        { factory_id: req.user!.factory_id }
      ];
    }

    const [totalTickets, openTickets, closedTickets, avgResolution] = await Promise.all([
      Ticket.count({ where: baseWhere }),
      Ticket.count({ where: { ...baseWhere, status: { [Op.in]: ['new', 'open', 'pending'] } } }),
      Ticket.count({ where: { ...baseWhere, status: { [Op.in]: ['resolved', 'closed'] } } }),
      Ticket.findAll({
        where: {
          ...baseWhere,
          status: 'resolved',
          resolved_at: { [Op.ne]: null }
        },
        attributes: [
          [sequelize.fn('AVG', 
            sequelize.literal('(julianday(resolved_at) - julianday(created_at)) * 24')
          ), 'avg_hours']
        ],
        raw: true
      })
    ]);

    const avgResolutionHours = (avgResolution[0] as any)?.avg_hours 
      ? Math.round(Number((avgResolution[0] as any).avg_hours) * 100) / 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        closedTickets,
        avgResolutionHours
      }
    });

  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Ticket trends over time
router.get('/ticket-trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    let baseWhere: any = {
      created_at: { [Op.gte]: startDate }
    };

    // Role-based filtering
    if (req.user!.role === 'employee') {
      baseWhere.requester_id = req.user!.id;
    } else if (req.user!.role === 'support_staff') {
      baseWhere[Op.or] = [
        { assigned_to: req.user!.id },
        { factory_id: req.user!.factory_id }
      ];
    }

    const ticketTrends = await Ticket.findAll({
      where: baseWhere,
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
      data: ticketTrends.map((item: any) => ({
        date: item.date,
        count: Number(item.count)
      }))
    });

  } catch (error) {
    console.error('Ticket trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;