import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request, Response, NextFunction } from 'express';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, requestId, userId, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      requestId,
      userId,
      environment: process.env.NODE_ENV,
      service: 'nyc-rental-platform',
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, requestId, userId, ...meta } = info;
    let logString = `${timestamp} [${level}]: ${message}`;
    
    if (requestId) logString += ` [Request: ${requestId}]`;
    if (userId) logString += ` [User: ${userId}]`;
    
    if (Object.keys(meta).length > 0) {
      logString += ` ${JSON.stringify(meta)}`;
    }
    
    return logString;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
} else {
  // File transports for production
  transports.push(
    // Error logs
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Combined logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // HTTP logs
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  );
}

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// Specific loggers for different concerns
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d', // Keep audit logs longer
      zippedArchive: true
    })
  ]
});

export const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      zippedArchive: true
    })
  ]
});

export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    })
  ]
});

// HTTP request logging middleware
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    const contentLength = res.get('Content-Length') || 0;
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';
    
    logger.http('HTTP Request', {
      method,
      url: originalUrl,
      statusCode,
      duration,
      contentLength: parseInt(contentLength.toString()),
      ip,
      userAgent,
      referer,
      requestId: req.id,
      userId: (req as any).user?.userId
    });
    
    // Log slow requests
    if (duration > 1000) {
      performanceLogger.warn('Slow request detected', {
        method,
        url: originalUrl,
        duration,
        requestId: req.id,
        userId: (req as any).user?.userId
      });
    }
    
    // Log errors
    if (statusCode >= 400) {
      const logLevel = statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]('HTTP Error', {
        method,
        url: originalUrl,
        statusCode,
        duration,
        requestId: req.id,
        userId: (req as any).user?.userId
      });
    }
  });
  
  next();
};

// Security event logging
export const logSecurityEvent = (
  event: string,
  details: any,
  req?: Request,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  securityLogger.warn(`Security Event: ${event}`, {
    event,
    severity,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    requestId: req?.id,
    userId: (req as any)?.user?.userId,
    timestamp: new Date().toISOString()
  });
  
  // For critical events, also log to main logger
  if (severity === 'critical') {
    logger.error(`Critical Security Event: ${event}`, {
      event,
      severity,
      details,
      ip: req?.ip,
      requestId: req?.id,
      userId: (req as any)?.user?.userId
    });
  }
};

// Audit logging for business events
export const logAuditEvent = (
  action: string,
  resource: string,
  resourceId: string,
  userId: string,
  details?: any,
  req?: Request
) => {
  auditLogger.info(`Audit: ${action}`, {
    action,
    resource,
    resourceId,
    userId,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    requestId: req?.id,
    timestamp: new Date().toISOString()
  });
};

// Performance monitoring
export const logPerformanceMetric = (
  metric: string,
  value: number,
  unit: string,
  tags?: Record<string, string>
) => {
  performanceLogger.info(`Performance Metric: ${metric}`, {
    metric,
    value,
    unit,
    tags,
    timestamp: new Date().toISOString()
  });
};

// Database query logging
export const logDatabaseQuery = (
  query: string,
  duration: number,
  rows?: number,
  error?: string
) => {
  const level = error ? 'error' : duration > 1000 ? 'warn' : 'debug';
  
  logger[level]('Database Query', {
    query: query.substring(0, 500), // Truncate long queries
    duration,
    rows,
    error,
    timestamp: new Date().toISOString()
  });
};

// External service call logging
export const logExternalService = (
  service: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: string
) => {
  const level = error || statusCode >= 400 ? 'error' : 'info';
  
  logger[level](`External Service: ${service}`, {
    service,
    endpoint,
    method,
    statusCode,
    duration,
    error,
    timestamp: new Date().toISOString()
  });
};

// Business metrics logging
export const logBusinessMetric = (
  metric: string,
  value: number,
  dimension?: Record<string, string>
) => {
  logger.info(`Business Metric: ${metric}`, {
    type: 'business_metric',
    metric,
    value,
    dimension,
    timestamp: new Date().toISOString()
  });
};

// Error correlation middleware
export const errorCorrelation = (
  error: Error,
  req: Request,
  context?: Record<string, any>
) => {
  const errorId = require('crypto').randomUUID();
  
  logger.error('Error occurred', {
    errorId,
    message: error.message,
    stack: error.stack,
    name: error.name,
    requestId: req.id,
    userId: (req as any).user?.userId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    context,
    timestamp: new Date().toISOString()
  });
  
  return errorId;
};

// Health check logging
export const logHealthCheck = (
  service: string,
  status: 'healthy' | 'unhealthy',
  responseTime?: number,
  details?: any
) => {
  const level = status === 'healthy' ? 'info' : 'error';
  
  logger[level](`Health Check: ${service}`, {
    service,
    status,
    responseTime,
    details,
    timestamp: new Date().toISOString()
  });
};

// Rate limiting logging
export const logRateLimit = (
  ip: string,
  endpoint: string,
  limit: number,
  windowMs: number,
  req?: Request
) => {
  logSecurityEvent('Rate limit exceeded', {
    ip,
    endpoint,
    limit,
    windowMs,
    userAgent: req?.get('User-Agent')
  }, req, 'medium');
};

// Login attempt logging
export const logLoginAttempt = (
  email: string,
  success: boolean,
  reason?: string,
  req?: Request
) => {
  const event = success ? 'Login successful' : 'Login failed';
  const level = success ? 'info' : 'warn';
  
  logger[level](event, {
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email
    success,
    reason,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    requestId: req?.id,
    timestamp: new Date().toISOString()
  });
  
  if (!success) {
    logSecurityEvent('Failed login attempt', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      reason,
      ip: req?.ip
    }, req, 'low');
  }
};

// Structured logging helpers
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

// Log sanitization for sensitive data
export const sanitizeLogData = (data: any): any => {
  const sensitiveFields = ['password', 'ssn', 'creditCard', 'token', 'secret', 'key'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export default logger;
