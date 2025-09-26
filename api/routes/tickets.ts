import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Ticket, 
  User, 
  Factory, 
  TicketComment, 
  TicketAttachment, 
  TicketHistory, 
  TicketApproval,
  TicketAssignment,
  Notification, 
  generateTicketNumber, 
  calculateSLADeadline 
} from '../models/index';
import { 
  authenticateToken, 
  AuthRequest, 
  adminOnly,
  managerOrAdmin,
  supportStaffOrAdmin,
  canCreateTickets,
  canReadAllTickets,
  canUpdateAllTickets,
  canApproveTickets,
  canAssignTickets,
  hasPermission
} from '../middleware/auth';
import { 
  validateTicketCreation, 
  validateTicketFilters, 
  createValidationMiddleware,
  ticketSchemas
} from '../utils/validation';
import { NotFoundError, ValidationAppError, AuthorizationError, asyncHandler } from '../middleware/errorHandler';

// Ticket status workflow: pending → admin_review → approved/rejected → in_progress → completed → closed
const VALID_STATUS_TRANSITIONS = {
  pending: ['admin_review'],
  admin_review: ['approved', 'rejected'],
  approved: ['in_progress'],
  rejected: [], // Terminal state
  in_progress: ['completed'],
  completed: ['closed'],
  closed: [] // Terminal state
};

// Helper function to validate status transition
const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus as keyof typeof VALID_STATUS_TRANSITIONS];
  return validTransitions ? validTransitions.includes(newStatus) : false;
};

// Helper function to create ticket history entry with enhanced metadata
const createTicketHistory = async (
  ticketId: string, 
  userId: string, 
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'approved' | 'rejected' | 'commented' | 'closed', 
  oldValue?: string, 
  newValue?: string, 
  fieldName?: string, 
  comment?: string,
  metadata?: Record<string, any>
) => {
  try {
    await TicketHistory.create({
      ticket_id: ticketId,
      user_id: userId,
      action,
      old_value: oldValue,
      new_value: newValue,
      field_name: fieldName,
      comment,
      metadata: {
        timestamp: new Date().toISOString(),
        user_agent: metadata?.user_agent,
        ip_address: metadata?.ip_address,
        session_id: metadata?.session_id,
        ...metadata
      }
    });
  } catch (error: any) {
    console.error('Error creating ticket history:', error);
  }
};

// Helper function to create notifications
const createNotification = async (
  userId: string, 
  type: string, 
  title: string, 
  message: string, 
  ticketId?: string
) => {
  try {
    await Notification.create({
      user_id: userId,
      type,
      title,
      message
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to check ticket access permissions
const checkTicketAccess = (ticket: any, user: any, action: 'read' | 'update' | 'delete' = 'read'): boolean => {
  // Admin can access all tickets
  if (user.role === 'admin') return true;
  
  // Manager can access department tickets
  if (user.role === 'manager') {
    return ticket.factory_id === user.factory_id;
  }
  
  // Support staff can access assigned tickets
  if (user.role === 'support_staff') {
    return ticket.assigned_to === user.id || ticket.factory_id === user.factory_id;
  }
  
  // Employee can only access own tickets
  if (user.role === 'employee') {
    return ticket.requester_id === user.id;
  }
  
  return false;
};

const router = Router();

// Get all tickets with filtering and pagination
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      factory_id, 
      assigned_to, 
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // Role-based filtering
    switch (req.user!.role) {
      case 'employee':
        // Employees can only see their own tickets
        whereClause.requester_id = req.user!.id;
        break;
        
      case 'support_staff':
        // Support staff can see assigned tickets and unassigned tickets in their factory
        whereClause[Op.or] = [
          { assigned_to: req.user!.id },
          { 
            factory_id: req.user!.factory_id,
            assigned_to: null,
            status: ['approved', 'in_progress']
          }
        ];
        break;
        
      case 'manager':
        // Managers can see tickets in their factory
        whereClause.factory_id = req.user!.factory_id;
        break;
        
      case 'admin':
        // Admins can see all tickets
        break;
    }

    // Additional filters
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (factory_id && req.user!.role === 'admin') {
      whereClause.factory_id = factory_id;
    }
    if (assigned_to && hasPermission(req.user!.role, 'tickets', 'read', 'all')) {
      whereClause.assigned_to = assigned_to;
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { ticket_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const result = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'user_id', 'full_name', 'department']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'user_id', 'full_name', 'department']
        },
        {
          model: Factory,
          as: 'factory',
          attributes: ['id', 'name', 'description']
        },
        {
          model: TicketApproval,
          as: 'approval',
          include: [{
            model: User,
            as: 'approvalAdmin',
            attributes: ['id', 'user_id', 'full_name']
          }]
        },
        {
          model: TicketAssignment,
          as: 'assignments',
          where: { is_active: true },
          required: false,
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
          ]
        }
      ],
      order: [[sort_by as string, sort_order as string]],
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
        },
        filters: {
          status,
          priority,
          factory_id,
          assigned_to,
          search
        }
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single ticket by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'user_id', 'full_name', 'email', 'department']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'user_id', 'full_name', 'email', 'department']
        },
        {
          model: Factory,
          as: 'factory',
          attributes: ['id', 'name', 'description']
        },
        {
          model: TicketApproval,
          as: 'approval',
          include: [{
            model: User,
            as: 'approvalAdmin',
            attributes: ['id', 'user_id', 'full_name']
          }]
        },
        {
          model: TicketAssignment,
          as: 'assignments',
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
        },
        {
          model: TicketComment,
          as: 'comments',
          include: [{
            model: User,
            as: 'commentUser',
            attributes: ['id', 'user_id', 'full_name']
          }],
          order: [['created_at', 'ASC']]
        },
        {
          model: TicketAttachment,
          as: 'attachments'
        },
        {
          model: TicketHistory,
          as: 'history',
          include: [{
            model: User,
            as: 'historyUser',
            attributes: ['id', 'user_id', 'full_name']
          }],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check access permissions
    if (!checkTicketAccess(ticket, req.user!, 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this ticket.'
      });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new ticket
router.post('/', authenticateToken, canCreateTickets, validateTicketCreation, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { 
    title, 
    description, 
    priority = 'medium', 
    factory_id, 
    category,
    urgency_level = 3,
    business_impact 
  } = req.body;

  // Validate required fields
  if (!title || !description || !factory_id) {
    throw new ValidationAppError('Title, description, and factory are required');
  }

  // Validate factory exists
  const factory = await Factory.findByPk(factory_id);
  if (!factory) {
    throw new NotFoundError('Factory');
  }

  // Generate ticket number and calculate SLA
  const ticketNumber = await generateTicketNumber();
  const slaDeadline = calculateSLADeadline(priority, urgency_level);

  // Create ticket
  const ticket = await Ticket.create({
    ticket_number: ticketNumber,
    title,
    description,
    priority,
    status: 'pending',
    factory_id,
    requester_id: req.user!.id,
    category,
    urgency_level,
    business_impact,
    sla_deadline: slaDeadline
  });

  // Create initial history entry with request metadata
  await createTicketHistory(
    ticket.id,
    req.user!.id,
    'created',
    undefined,
    'pending',
    'status',
    'Ticket created',
    {
      user_agent: req.get('User-Agent'),
      ip_address: req.ip || req.connection.remoteAddress,
      request_body: {
        title: ticket.title,
        priority: ticket.priority,
        factory_id: ticket.factory_id,
        category: ticket.category
      }
    }
  );

  // Notify admins about new ticket
  const admins = await User.findAll({ where: { role: 'admin' } });
  for (const admin of admins) {
    await createNotification(
      admin.id,
      'ticket_created',
      'New Ticket Created',
      `New ticket #${ticketNumber} requires review`,
      ticket.id
    );
  }

  // Fetch the created ticket with includes
  const createdTicket = await Ticket.findByPk(ticket.id, {
    include: [
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'user_id', 'full_name', 'email']
      },
      {
        model: Factory,
        as: 'factory',
        attributes: ['id', 'name', 'description']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: createdTicket
  });
}));

// Update ticket status (with workflow validation)
router.put('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check access permissions
    if (!checkTicketAccess(ticket, req.user!, 'update')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this ticket.'
      });
    }

    // Validate status transition
    if (!isValidStatusTransition(ticket.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${ticket.status} to ${status}`
      });
    }

    // Update ticket status
    await ticket.update({ status });

    // Create history entry with enhanced metadata
    await createTicketHistory(
      ticket.id,
      req.user!.id,
      'status_changed',
      ticket.status,
      status,
      'status',
      comment,
      {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection.remoteAddress,
        previous_status: ticket.status,
        workflow_step: `${ticket.status} → ${status}`,
        user_role: req.user!.role
      }
    );

    // Send notifications based on status change
    if (status === 'admin_review') {
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await createNotification(
          admin.id,
          'ticket_review_required',
          'Ticket Review Required',
          `Ticket #${ticket.ticket_number} requires admin review`,
          ticket.id
        );
      }
    } else if (status === 'completed') {
      await createNotification(
        ticket.requester_id,
        'ticket_completed',
        'Ticket Completed',
        `Your ticket #${ticket.ticket_number} has been completed`,
        ticket.id
      );
    }

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: { id: ticket.id, status }
    });

  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin approve/reject ticket
router.post('/:id/approve', authenticateToken, canApproveTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Valid decision (approved/rejected) is required'
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status !== 'admin_review') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is not in admin review status'
      });
    }

    // Update ticket status
    await ticket.update({ status: decision });

    // Create approval record
    await TicketApproval.create({
      ticket_id: id,
      admin_id: req.user!.id,
      decision,
      reason,
      decided_at: new Date()
    });

    // Create history entry
    await createTicketHistory(
      ticket.id,
      req.user!.id,
      decision === 'approved' ? 'approved' : 'rejected',
      'admin_review',
      decision,
      'status',
      reason
    );

    // Notify requester
    await createNotification(
      ticket.requester_id,
      `ticket_${decision}`,
      `Ticket ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your ticket #${ticket.ticket_number} has been ${decision}${reason ? ': ' + reason : ''}`,
      ticket.id
    );

    res.json({
      success: true,
      message: `Ticket ${decision} successfully`,
      data: { id: ticket.id, status: decision }
    });

  } catch (error) {
    console.error('Approve ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Assign ticket to support staff
router.post('/:id/assign', authenticateToken, canAssignTickets, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assigned_to, notes } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user ID is required'
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved tickets can be assigned'
      });
    }

    // Validate assigned user exists and has support role
    const assignedUser = await User.findByPk(assigned_to);
    if (!assignedUser || !['support_staff', 'manager'].includes(assignedUser.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user or user does not have support permissions'
      });
    }

    // Deactivate previous assignments
    await TicketAssignment.update(
      { is_active: false },
      { where: { ticket_id: id, is_active: true } }
    );

    // Create new assignment
    await TicketAssignment.create({
      ticket_id: id,
      assigned_to: assigned_to,
      assigned_by: req.user!.id,
      assignment_reason: notes,
      is_active: true
    });

    // Update ticket
    await ticket.update({ 
      assigned_to,
      status: 'in_progress'
    });

    // Create history entry
    await createTicketHistory(
      ticket.id,
      req.user!.id,
      'assigned',
      ticket.assigned_to?.toString(),
      assigned_to,
      'assigned_to',
      notes
    );

    // Notify assigned user
    await createNotification(
      assigned_to,
      'ticket_assigned',
      'Ticket Assigned',
      `You have been assigned ticket #${ticket.ticket_number}`,
      ticket.id
    );

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: { id: ticket.id, assigned_to, status: 'in_progress' }
    });

  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add comment to ticket
router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, is_internal = false } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check access permissions
    if (!checkTicketAccess(ticket, req.user!, 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to comment on this ticket.'
      });
    }

    // Only support staff and admin can create internal comments
    const isInternalComment = is_internal && ['support_staff', 'admin', 'manager'].includes(req.user!.role);

    const comment = await TicketComment.create({
      ticket_id: id,
      user_id: req.user!.id,
      content,
      is_internal: isInternalComment
    });

    // Create history entry
    await createTicketHistory(
      ticket.id,
      req.user!.id,
      'commented',
      undefined,
      content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      'comment'
    );

    // Send notification to other party (if not internal comment)
    if (!isInternalComment) {
      const notifyUserId = ticket.requester_id === req.user!.id ? ticket.assigned_to : ticket.requester_id;
      if (notifyUserId) {
        await createNotification(
          notifyUserId,
          'new_comment',
          'New Comment Added',
          `A new comment has been added to ticket #${ticket.ticket_number}`,
          ticket.id
        );
      }
    }

    // Get comment with user info
    const createdComment = await TicketComment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'commentUser',
        attributes: ['id', 'user_id', 'full_name']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: createdComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;