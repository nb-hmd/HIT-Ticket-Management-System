import Joi from 'joi';

// Common validation patterns
const uuidPattern = Joi.string().uuid({ version: 'uuidv4' });
const emailPattern = Joi.string().email();
const passwordPattern = Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);
const phonePattern = Joi.string().pattern(/^[+]?[1-9]?[0-9]{7,15}$/);

// Enums
const ticketStatus = ['pending', 'admin_review', 'approved', 'rejected', 'in_progress', 'completed', 'closed'];
const ticketPriority = ['low', 'medium', 'high', 'critical'];
const userRoles = ['employee', 'support_staff', 'manager', 'admin'];
const approvalDecisions = ['approved', 'rejected'];

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    user_id: Joi.string().alphanum().min(3).max(50).required(),
    email: emailPattern.required(),
    password: passwordPattern.required().messages({
      'string.pattern.base': 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character'
    }),
    full_name: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid(...userRoles).required(),
    department: Joi.string().max(100).optional(),
    factory_id: Joi.string().min(1).max(50).optional(), // Accept string factory IDs
    phone: phonePattern.optional(),
    is_active: Joi.boolean().default(true)
  }),

  login: Joi.object({
    user_id: Joi.string().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    full_name: Joi.string().min(2).max(100).optional(),
    email: emailPattern.optional(),
    phone: phonePattern.optional(),
    department: Joi.string().max(100).optional()
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: passwordPattern.required().messages({
      'string.pattern.base': 'New password must contain at least 8 characters with uppercase, lowercase, number, and special character'
    })
  })
};

// Ticket validation schemas
export const ticketSchemas = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    priority: Joi.string().valid(...ticketPriority).default('medium'),
    factory_id: Joi.string().min(1).max(50).required(), // Accept string factory IDs like 'ASRC', 'HRF', etc.
    category: Joi.string().max(100).optional(),
    urgency_level: Joi.number().integer().min(1).max(5).default(3),
    business_impact: Joi.string().max(500).optional(),
    attachments: Joi.array().items(Joi.object({
      filename: Joi.string().required(),
      content_type: Joi.string().required(),
      size: Joi.number().integer().max(10 * 1024 * 1024) // 10MB max
    })).max(5).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    priority: Joi.string().valid(...ticketPriority).optional(),
    category: Joi.string().max(100).optional(),
    business_impact: Joi.string().max(500).optional()
  }),

  statusUpdate: Joi.object({
    status: Joi.string().valid(...ticketStatus).required(),
    comment: Joi.string().max(500).optional()
  }),

  approval: Joi.object({
    decision: Joi.string().valid(...approvalDecisions).required(),
    reason: Joi.string().max(500).optional(),
    priority_override: Joi.string().valid(...ticketPriority).optional(),
    assigned_team_suggestion: Joi.string().max(100).optional(),
    estimated_hours_suggestion: Joi.number().positive().max(1000).optional(),
    notes: Joi.string().max(1000).optional()
  }),

  assignment: Joi.object({
    assigned_to: uuidPattern.required(),
    notes: Joi.string().max(500).optional()
  }),

  bulkApproval: Joi.object({
    ticket_ids: Joi.array().items(uuidPattern).min(1).max(50).required(),
    decision: Joi.string().valid(...approvalDecisions).required(),
    reason: Joi.string().max(500).optional()
  }),

  comment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    is_internal: Joi.boolean().default(false)
  })
};

// Query parameter validation schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  ticketFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid(...ticketStatus).optional(),
    priority: Joi.string().valid(...ticketPriority).optional(),
    factory_id: Joi.string().min(1).max(50).optional(), // Accept string factory IDs
    assigned_to: uuidPattern.optional(),
    search: Joi.string().max(100).optional(),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'priority', 'status', 'title').default('created_at'),
    sort_order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
  }),

  reportFilters: Joi.object({
    period: Joi.number().integer().min(1).max(365).default(30),
    factory_id: Joi.string().min(1).max(50).optional(), // Accept string factory IDs
    user_id: uuidPattern.optional(),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
  }),

  auditFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    action: Joi.string().optional(),
    user_id: uuidPattern.optional(),
    ticket_id: uuidPattern.optional(),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
  })
};

// Factory validation schemas
export const factorySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    location: Joi.string().max(200).optional(),
    contact_email: emailPattern.optional(),
    contact_phone: phonePattern.optional(),
    is_active: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    location: Joi.string().max(200).optional(),
    contact_email: emailPattern.optional(),
    contact_phone: phonePattern.optional(),
    is_active: Joi.boolean().optional()
  })
};

// Assignment validation schemas
export const assignmentSchemas = {
  selfAssign: Joi.object({
    notes: Joi.string().max(500).optional()
  }),

  reassign: Joi.object({
    assigned_to: uuidPattern.required(),
    reason: Joi.string().max(500).required()
  }),

  unassign: Joi.object({
    reason: Joi.string().max(500).required()
  }),

  autoAssign: Joi.object({
    factory_id: Joi.string().min(1).max(50).required(), // Accept string factory IDs
    max_assignments: Joi.number().integer().min(1).max(20).default(5)
  })
};

// Notification validation schemas
export const notificationSchemas = {
  create: Joi.object({
    user_id: uuidPattern.required(),
    ticket_id: uuidPattern.optional(),
    type: Joi.string().max(50).required(),
    title: Joi.string().max(200).required(),
    message: Joi.string().max(1000).required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
  }),

  markAsRead: Joi.object({
    notification_ids: Joi.array().items(uuidPattern).min(1).max(100).required()
  })
};

// File upload validation
export const uploadSchemas = {
  fileUpload: Joi.object({
    ticket_id: uuidPattern.required(),
    description: Joi.string().max(200).optional()
  })
};

// Custom validation functions
export const customValidators = {
  // Validate that end date is after start date
  dateRange: (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end > start;
  },

  // Validate file type
  allowedFileTypes: (filename: string, allowedTypes: string[]) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension && allowedTypes.includes(extension);
  },

  // Validate business hours
  businessHours: (date: Date) => {
    const hour = date.getHours();
    const day = date.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17; // Monday-Friday, 9AM-5PM
  },

  // Validate SLA deadline
  slaDeadline: (priority: string, createdAt: Date) => {
    const now = new Date();
    const hoursMap = { low: 72, medium: 48, high: 24, critical: 4 };
    const maxHours = hoursMap[priority as keyof typeof hoursMap] || 48;
    const deadline = new Date(createdAt.getTime() + maxHours * 60 * 60 * 1000);
    return now <= deadline;
  }
};

// Sanitization functions
export const sanitizers = {
  // Remove HTML tags and dangerous characters
  sanitizeText: (text: string) => {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>"'&]/g, '') // Remove dangerous characters
      .trim();
  },

  // Sanitize search query
  sanitizeSearch: (query: string) => {
    return query
      .replace(/[^a-zA-Z0-9\s-_.]/g, '') // Allow only alphanumeric, spaces, hyphens, underscores, dots
      .trim()
      .substring(0, 100); // Limit length
  },

  // Sanitize filename
  sanitizeFilename: (filename: string) => {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 255); // Limit length
  }
};

// Validation middleware factory
export const createValidationMiddleware = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          validation: details
        }
      });
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Export commonly used validation middleware
export const validateTicketCreation = createValidationMiddleware(ticketSchemas.create, 'body');
export const validateTicketUpdate = createValidationMiddleware(ticketSchemas.update, 'body');
export const validateTicketFilters = createValidationMiddleware(querySchemas.ticketFilters, 'query');
export const validateUserRegistration = createValidationMiddleware(userSchemas.register, 'body');
export const validateUserLogin = createValidationMiddleware(userSchemas.login, 'body');
export const validatePagination = createValidationMiddleware(querySchemas.pagination, 'query');