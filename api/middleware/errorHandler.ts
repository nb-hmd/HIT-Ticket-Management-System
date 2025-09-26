import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { AuthRequest } from './auth';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Error logging utility
const logError = (error: Error, req?: Request) => {
  const timestamp = new Date().toISOString();
  const requestInfo = req ? {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: (req as AuthRequest).user?.id
  } : {};

  console.error('🚨 Error occurred:', {
    timestamp,
    message: error.message,
    stack: error.stack,
    request: requestInfo,
    ...(error instanceof AppError && {
      statusCode: error.statusCode,
      code: error.code,
      details: error.details
    })
  });

  // In production, you might want to send this to a logging service
  // like Winston, Sentry, or CloudWatch
};

// Database error handler
const handleDatabaseError = (error: any): AppError => {
  if (error instanceof ValidationError) {
    const details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    return new ValidationAppError('Validation failed', details);
  }

  // Sequelize specific errors
  switch (error.name) {
    case 'SequelizeUniqueConstraintError':
      return new ConflictError('Resource already exists');
    
    case 'SequelizeForeignKeyConstraintError':
      return new ValidationAppError('Invalid reference to related resource');
    
    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
    case 'SequelizeHostNotFoundError':
      return new AppError('Database connection failed', 503, 'DATABASE_ERROR');
    
    case 'SequelizeTimeoutError':
      return new AppError('Database operation timed out', 504, 'DATABASE_TIMEOUT');
    
    case 'SequelizeDatabaseError':
      // Check for specific database errors
      if (error.message.includes('does not exist')) {
        return new NotFoundError('Database resource');
      }
      if (error.message.includes('permission denied')) {
        return new AppError('Database permission denied', 403, 'DATABASE_PERMISSION_ERROR');
      }
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    
    default:
      return new AppError('Database error occurred', 500, 'DATABASE_ERROR');
  }
};

// JWT error handler
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }
  return new AuthenticationError('Token verification failed');
};

// Main error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  let appError: AppError;

  // Handle different types of errors
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name?.includes('Sequelize')) {
    appError = handleDatabaseError(error);
  } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
    appError = handleJWTError(error);
  } else {
    // Generic error
    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Log the error
  logError(error, req);

  // Send error response
  const errorResponse: any = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode
    }
  };

  // Include additional details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = appError.details;
    errorResponse.error.stack = error.stack;
  }

  // Include validation details if present
  if (appError.details && appError.code === 'VALIDATION_ERROR') {
    errorResponse.error.validation = appError.details;
  }

  res.status(appError.statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Request validation middleware
export const validateRequest = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return next(new ValidationAppError('Request validation failed', details));
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Rate limiting error handler
export const rateLimitHandler = (req: Request, res: Response) => {
  const error = new RateLimitError('Too many requests, please try again later');
  
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      retryAfter: res.get('Retry-After')
    }
  });
};

// Health check for error handling
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Test database connection
    const { testConnection } = await import('../models/index');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      throw new AppError('Database health check failed', 503, 'DATABASE_UNHEALTHY');
    }

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Graceful shutdown handler
export const gracefulShutdown = (server: any) => {
  const shutdown = (signal: string) => {
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
    
    server.close((err: any) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed successfully');
      
      // Close database connections
      import('../models/index').then(({ sequelize }) => {
        sequelize.close().then(() => {
          console.log('✅ Database connections closed');
          process.exit(0);
        }).catch((dbErr: any) => {
          console.error('❌ Error closing database connections:', dbErr);
          process.exit(1);
        });
      });
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
};