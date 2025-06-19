import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
  requestId?: string;
  userId?: string;
  timestamp?: Date;
}

export class CustomError extends Error implements AppError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: any;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any,
    requestId?: string,
    userId?: string
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.userId = userId;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends CustomError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, 400, 'VALIDATION_ERROR', true, details, requestId);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required', requestId?: string) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, undefined, requestId);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions', requestId?: string, userId?: string) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, undefined, requestId, userId);
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource', requestId?: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, undefined, requestId);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, 409, 'CONFLICT_ERROR', true, details, requestId);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded', requestId?: string) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, undefined, requestId);
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string, details?: any, requestId?: string) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, details, requestId);
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, 500, 'DATABASE_ERROR', true, details, requestId);
  }
}

// Error handling utilities
export const createError = (
  message: string,
  statusCode: number,
  code: string,
  details?: any,
  req?: Request
): CustomError => {
  return new CustomError(
    message,
    statusCode,
    code,
    true,
    details,
    req?.id,
    (req as any)?.user?.userId
  );
};

// Handle different types of errors
export const handlePrismaError = (error: PrismaClientKnownRequestError, req?: Request): CustomError => {
  const requestId = req?.id;

  switch (error.code) {
    case 'P2000':
      return new ValidationError('Input value too long', { field: error.meta?.target }, requestId);
    case 'P2001':
      return new NotFoundError('Record', requestId);
    case 'P2002':
      return new ConflictError('Unique constraint violation', { field: error.meta?.target }, requestId);
    case 'P2003':
      return new ValidationError('Foreign key constraint violation', { field: error.meta?.field_name }, requestId);
    case 'P2004':
      return new ValidationError('Constraint violation', { constraint: error.meta?.constraint }, requestId);
    case 'P2025':
      return new NotFoundError('Record', requestId);
    default:
      return new DatabaseError('Database operation failed', { code: error.code, meta: error.meta }, requestId);
  }
};

export const handleZodError = (error: ZodError, req?: Request): ValidationError => {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  return new ValidationError('Validation failed', details, req?.id);
};

export const handleJWTError = (error: Error, req?: Request): CustomError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token', req?.id);
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired', req?.id);
  }
  return new AuthenticationError('Token verification failed', req?.id);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Development error response
const sendErrorDev = (err: AppError, req: Request, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: 'error',
    error: {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
      details: err.details,
      requestId: err.requestId || req.id,
      timestamp: err.timestamp || new Date(),
      path: req.originalUrl,
      method: req.method
    }
  });
};

// Production error response
const sendErrorProd = (err: AppError, req: Request, res: Response) => {
  // Only send operational errors to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.message,
      code: err.code,
      requestId: err.requestId || req.id,
      timestamp: err.timestamp || new Date()
    });
  } else {
    // Programming or system errors - don't leak details
    console.error('Non-operational error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
      timestamp: new Date()
    });
  }
};

// Main error handling middleware
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: AppError = err as AppError;

  // Set default properties
  error.statusCode = error.statusCode || 500;
  error.isOperational = error.isOperational !== undefined ? error.isOperational : false;
  error.requestId = error.requestId || req.id;
  error.timestamp = error.timestamp || new Date();

  // Handle specific error types
  if (err instanceof PrismaClientKnownRequestError) {
    error = handlePrismaError(err, req);
  } else if (err instanceof ZodError) {
    error = handleZodError(err, req);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err, req);
  } else if (err.name === 'CastError') {
    error = new ValidationError('Invalid ID format', { value: (err as any).value }, req.id);
  } else if (err.name === 'ValidationError') {
    const details = Object.values((err as any).errors).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    error = new ValidationError('Validation failed', details, req.id);
  } else if (err.name === 'MongoError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    error = new ConflictError(`Duplicate value for ${field}`, { field }, req.id);
  }

  // Log error
  const logLevel = (error.statusCode || 500) >= 500 ? 'error' : 'warn';
  console[logLevel]('Error occurred:', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    requestId: error.requestId,
    userId: error.userId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: error.timestamp,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Send response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`, req.id);
  next(error);
};

// Graceful shutdown handler
export const gracefulShutdown = (server: any) => {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
};

// Health check error
export class HealthCheckError extends CustomError {
  constructor(service: string, details?: any) {
    super(`Health check failed for ${service}`, 503, 'HEALTH_CHECK_FAILED', true, details);
  }
}

// Circuit breaker error
export class CircuitBreakerError extends CustomError {
  constructor(service: string) {
    super(`Circuit breaker open for ${service}`, 503, 'CIRCUIT_BREAKER_OPEN', true);
  }
}

// Validation helpers
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
};

export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
};

export const validatePassword = (password: string): void => {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
};

export const validateObjectId = (id: string, fieldName: string = 'ID'): void => {
  // For MongoDB ObjectId validation - adjust for your ID format
  if (!id || typeof id !== 'string' || id.length < 10) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
};
