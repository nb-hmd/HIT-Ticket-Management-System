import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Ticket, 
  User, 
  Factory, 
  TicketAssignment,
  TicketHistory,
  Notification 
} from '../models/index';
import { 
  authenticateToken, 
  AuthRequest, 
  canAssignTickets,
  supportStaffOrAdmin,
  hasPermission
} from '../middleware/auth';

const router = Router();

// Get assignment dashboard for support staff
router.get('/dashboard', authenticateToken, supportStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Get assigned tickets for current user
    const assignedTickets = await Ticket.findAll({
      where: {
        assigned_to: userId,
        status: ['in_progress', 'approved']
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'user_id', 'full_name', 'department']
        },
        {
          model: Factory,
          as: 'factory',
          attributes: ['id', 'name']
        }
      ],
      order: [['priority', 'DESC'], ['created_at', 'ASC']]
    });

    // Get available tickets for assignment (approved but unassigned)
    let availableTickets = [];
    if (userRole === 'support_staff') {
      availableTickets = await Ticket.findAll({
        where: {
          status: 'approved',
          assigned_to: null,
          factory_id: req.user!.factory_id // Only tickets from same factory
        },
        include: [
          {
            model: User,
            as: 'requester',
            attributes: ['id', 'user_id', 'full_name', 'department']
          },
          {
            model: Factory,
            as: 'factory',
            attributes: ['id', 'name']
          }
        ],
        order: [['priority', 'DESC'], ['created_at', 'ASC']],
        limit: 10
      });
    } else if (['admin', 'manager'].includes(userRole)) {
      // Admins and managers can see all available tickets
      availableTickets = await Ticket.findAll({
        where: {
          status: 'approved',
          assigned_to: null
        },
        include: [
          {
            model: User,
            as: 'requester',
            attributes: ['id', 'user_id', 'full_name', 'department']
          },
          {
            model: Factory,
            as: 'factory',
            attributes: ['id', 'name']
          }
        ],
        order: [['priority', 'DESC'], ['created_at', 'ASC']],
        limit: 20
      });
    }

    // Get workload statistics
    const workloadStats = {
      active: assignedTickets.length,
      high_priority: assignedTickets.filter(t => t.priority === 'high' || t.priority === 'critical').length,
      overdue: assignedTickets.filter(t => new Date() > new Date(t.sla_deadline)).length
    };

    res.json({
      success: true,
      data: {
        assignedTickets,
        availableTickets,
        workloadStats
      }
    });

  } catch (error) {
    console.error('Assignment dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Self-assign a ticket (for support staff)
router.post('/self-assign/:ticketId', authenticateToken, supportStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { notes } = req.body;
    const userId = req.user!.id;

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved tickets can be self-assigned'
      });
    }

    if (ticket.assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already assigned'
      });
    }

    // Check if support staff can only assign tickets from their factory
    if (req.user!.role === 'support_staff' && ticket.factory_id !== req.user!.factory_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign tickets from your factory'
      });
    }

    // Check current workload (optional limit)
    const currentWorkload = await Ticket.count({
      where: {
        assigned_to: userId,
        status: ['in_progress', 'approved']
      }
    });

    const maxWorkload = 10; // Configurable limit
    if (currentWorkload >= maxWorkload) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum workload limit (${maxWorkload} active tickets)`
      });
    }

    // Create assignment record
    await TicketAssignment.create({
      ticket_id: ticketId,
      assigned_to: userId,
      assigned_by: userId, // Self-assigned
      assignment_reason: notes || 'Self-assigned',
      is_active: true
    });

    // Update ticket
    await ticket.update({
      assigned_to: userId,
      status: 'in_progress'
    });

    // Create history entry
    await TicketHistory.create({
      ticket_id: ticketId,
      user_id: userId,
      action: 'assigned',
      old_value: null,
      new_value: userId,
      field_name: 'assigned_to',
      comment: notes || 'Self-assigned'
    });

    // Notify requester
    await Notification.create({
      user_id: ticket.requester_id,
      type: 'ticket_assigned',
      title: 'Ticket Assigned',
      message: `Your ticket #${ticket.ticket_number} has been assigned and is now in progress`
    });

    res.json({
      success: true,
      message: 'Ticket self-assigned successfully',
      data: { ticketId, assigned_to: userId, status: 'in_progress' }
    });

  } catch (error) {
    console.error('Self-assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reassign ticket to another support staff member
router.post('/reassign/:ticketId', authenticateToken, canAssignTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { assigned_to, reason } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user ID is required'
      });
    }

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (!ticket.assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Ticket is not currently assigned'
      });
    }

    // Validate new assignee
    const newAssignee = await User.findByPk(assigned_to);
    if (!newAssignee || !['support_staff', 'manager'].includes(newAssignee.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user or user does not have support permissions'
      });
    }

    const oldAssignedTo = ticket.assigned_to;

    // Deactivate current assignment
    await TicketAssignment.update(
      { is_active: false },
      { where: { ticket_id: ticketId, is_active: true } }
    );

    // Create new assignment
    await TicketAssignment.create({
      ticket_id: ticketId,
      assigned_to: assigned_to,
      assigned_by: req.user!.id,
      assignment_reason: reason,
      is_active: true
    });

    // Update ticket
    await ticket.update({ assigned_to });

    // Create history entry
    await TicketHistory.create({
      ticket_id: ticketId,
      user_id: req.user!.id,
      action: 'assigned',
      old_value: oldAssignedTo,
      new_value: assigned_to,
      field_name: 'assigned_to',
      comment: reason
    });

    // Notify old assignee
    if (oldAssignedTo) {
      await Notification.create({
        user_id: oldAssignedTo,
        type: 'ticket_reassigned',
        title: 'Ticket Reassigned',
        message: `Ticket #${ticket.ticket_number} has been reassigned to another team member`
      });
    }

    // Notify new assignee
    await Notification.create({
      user_id: assigned_to,
      type: 'ticket_assigned',
      title: 'Ticket Assigned',
      message: `You have been assigned ticket #${ticket.ticket_number}`
    });

    res.json({
      success: true,
      message: 'Ticket reassigned successfully',
      data: { ticketId, old_assigned_to: oldAssignedTo, new_assigned_to: assigned_to }
    });

  } catch (error) {
    console.error('Reassign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Unassign ticket (return to available pool)
router.post('/unassign/:ticketId', authenticateToken, canAssignTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (!ticket.assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Ticket is not currently assigned'
      });
    }

    const oldAssignedTo = ticket.assigned_to;

    // Deactivate current assignment
    await TicketAssignment.update(
      { is_active: false },
      { where: { ticket_id: ticketId, is_active: true } }
    );

    // Update ticket status back to approved
    await ticket.update({
      assigned_to: null,
      status: 'approved'
    });

    // Create history entry
    await TicketHistory.create({
      ticket_id: ticketId,
      user_id: req.user!.id,
      action: 'assigned',
      old_value: oldAssignedTo,
      new_value: null,
      field_name: 'assigned_to',
      comment: reason
    });

    // Notify old assignee
    await Notification.create({
      user_id: oldAssignedTo,
      type: 'ticket_unassigned',
      title: 'Ticket Unassigned',
      message: `Ticket #${ticket.ticket_number} has been unassigned and returned to the available pool`
    });

    res.json({
      success: true,
      message: 'Ticket unassigned successfully',
      data: { ticketId, status: 'approved' }
    });

  } catch (error) {
    console.error('Unassign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get assignment history for a ticket
router.get('/history/:ticketId', authenticateToken, supportStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check access permissions
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

    const assignments = await TicketAssignment.findAll({
      where: { ticket_id: ticketId },
      include: [
        {
          model: User,
          as: 'assignmentUser',
          attributes: ['id', 'user_id', 'full_name', 'department']
        },
        {
          model: User,
          as: 'assignmentCreator',
          attributes: ['id', 'user_id', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Get assignment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get team workload statistics
router.get('/team/workload', authenticateToken, canAssignTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { factory_id } = req.query;
    
    let whereClause: any = {
      role: ['support_staff', 'manager'],
      is_active: true
    };

    if (factory_id) {
      whereClause.factory_id = factory_id;
    } else if (req.user!.role === 'manager') {
      // Managers can only see their factory
      whereClause.factory_id = req.user!.factory_id;
    }

    const supportStaff = await User.findAll({
      where: whereClause,
      attributes: ['id', 'user_id', 'full_name', 'department', 'factory_id'],
      include: [{
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name']
      }]
    });

    // Get workload for each support staff member
    const workloadData = await Promise.all(
      supportStaff.map(async (staff) => {
        const activeTickets = await Ticket.findAll({
          where: {
            assigned_to: staff.id,
            status: ['in_progress', 'approved']
          },
          attributes: ['id', 'priority', 'status', 'sla_deadline']
        });

        const workload = {
          total: activeTickets.length,
          high_priority: activeTickets.filter(t => ['high', 'critical'].includes(t.priority)).length,
          overdue: activeTickets.filter(t => new Date() > new Date(t.sla_deadline)).length,
          in_progress: activeTickets.filter(t => t.status === 'in_progress').length
        };

        return {
          ...staff.toJSON(),
          workload
        };
      })
    );

    // Sort by workload (least busy first)
    workloadData.sort((a, b) => a.workload.total - b.workload.total);

    res.json({
      success: true,
      data: workloadData
    });

  } catch (error) {
    console.error('Get team workload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Auto-assign tickets based on workload balancing
router.post('/auto-assign', authenticateToken, canAssignTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { factory_id, max_assignments = 5 } = req.body;

    if (!factory_id) {
      return res.status(400).json({
        success: false,
        message: 'Factory ID is required'
      });
    }

    // Get unassigned approved tickets for the factory
    const unassignedTickets = await Ticket.findAll({
      where: {
        factory_id,
        status: 'approved',
        assigned_to: null
      },
      order: [['priority', 'DESC'], ['created_at', 'ASC']],
      limit: max_assignments
    });

    if (unassignedTickets.length === 0) {
      return res.json({
        success: true,
        message: 'No unassigned tickets found',
        data: { assigned: [] }
      });
    }

    // Get available support staff for the factory
    const supportStaff = await User.findAll({
      where: {
        factory_id,
        role: ['support_staff', 'manager'],
        is_active: true
      }
    });

    if (supportStaff.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No available support staff found for this factory'
      });
    }

    // Get current workload for each support staff member
    const staffWorkload = await Promise.all(
      supportStaff.map(async (staff) => {
        const activeCount = await Ticket.count({
          where: {
            assigned_to: staff.id,
            status: ['in_progress', 'approved']
          }
        });
        return { staff, activeCount };
      })
    );

    // Sort by workload (least busy first)
    staffWorkload.sort((a, b) => a.activeCount - b.activeCount);

    const assignments = [];
    let staffIndex = 0;

    // Assign tickets using round-robin with workload balancing
    for (const ticket of unassignedTickets) {
      const assignedStaff = staffWorkload[staffIndex % staffWorkload.length].staff;
      
      try {
        // Create assignment
        await TicketAssignment.create({
          ticket_id: ticket.id,
          assigned_to: assignedStaff.id,
          assigned_by: req.user!.id,
          assignment_reason: 'Auto-assigned based on workload balancing',
          is_active: true
        });

        // Update ticket
        await ticket.update({
          assigned_to: assignedStaff.id,
          status: 'in_progress'
        });

        // Create history entry
        await TicketHistory.create({
          ticket_id: ticket.id,
          user_id: req.user!.id,
          action: 'assigned',
          old_value: null,
          new_value: assignedStaff.id,
          field_name: 'assigned_to',
          comment: 'Auto-assigned based on workload balancing'
        });

        // Notify assigned user
        await Notification.create({
          user_id: assignedStaff.id,
          type: 'ticket_assigned',
          title: 'Ticket Auto-Assigned',
          message: `You have been automatically assigned ticket #${ticket.ticket_number}`
        });

        assignments.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          assignedTo: assignedStaff.id,
          assignedToName: assignedStaff.full_name
        });

        // Update workload count for next assignment
        staffWorkload[staffIndex % staffWorkload.length].activeCount++;
        staffIndex++;

      } catch (error) {
        console.error(`Failed to auto-assign ticket ${ticket.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Auto-assigned ${assignments.length} tickets`,
      data: { assigned: assignments }
    });

  } catch (error) {
    console.error('Auto-assign tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;