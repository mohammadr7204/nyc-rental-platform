import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import crypto from 'crypto';
import session from 'express-session';

// Extend session interface to include csrfToken
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.round(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Slow down for brute force protection
export const createSlowDown = (windowMs: number, delayAfter: number, maxDelayMs: number) => {
  return slowDown({
    windowMs,
    delayAfter,
    maxDelayMs,
    skipFailedRequests: false,
    skipSuccessfulRequests: true
  });
};

// Input validation and sanitization
export const validateAndSanitize = {
  email: (email: string): { isValid: boolean; sanitized: string; error?: string } => {
    if (!email || typeof email !== 'string') {
      return { isValid: false, sanitized: '', error: 'Email is required' };
    }

    const sanitized = validator.escape(email.trim().toLowerCase());
    const isValid = validator.isEmail(sanitized);

    return {
      isValid,
      sanitized,
      error: isValid ? undefined : 'Invalid email format'
    };
  },

  phone: (phone: string): { isValid: boolean; sanitized: string; error?: string } => {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, sanitized: '', error: 'Phone number is required' };
    }

    const sanitized = phone.replace(/[^\d+\-\(\)\s]/g, '');
    const isValid = validator.isMobilePhone(sanitized, 'en-US');

    return {
      isValid,
      sanitized,
      error: isValid ? undefined : 'Invalid phone number format'
    };
  },

  text: (text: string, maxLength: number = 1000): { isValid: boolean; sanitized: string; error?: string } => {
    if (!text || typeof text !== 'string') {
      return { isValid: false, sanitized: '', error: 'Text is required' };
    }

    const sanitized = validator.escape(text.trim());
    const isValid = sanitized.length <= maxLength && sanitized.length > 0;

    return {
      isValid,
      sanitized,
      error: isValid ? undefined : `Text must be between 1 and ${maxLength} characters`
    };
  },

  url: (url: string): { isValid: boolean; sanitized: string; error?: string } => {
    if (!url || typeof url !== 'string') {
      return { isValid: false, sanitized: '', error: 'URL is required' };
    }

    const sanitized = validator.escape(url.trim());
    const isValid = validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true
    });

    return {
      isValid,
      sanitized,
      error: isValid ? undefined : 'Invalid URL format'
    };
  },

  currency: (amount: string | number): { isValid: boolean; sanitized: number; error?: string } => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount) || numAmount < 0) {
      return { isValid: false, sanitized: 0, error: 'Invalid currency amount' };
    }

    const sanitized = Math.round(numAmount * 100) / 100; // Round to 2 decimal places
    const isValid = sanitized >= 0 && sanitized <= 1000000; // Max $1M

    return {
      isValid,
      sanitized,
      error: isValid ? undefined : 'Currency amount must be between $0 and $1,000,000'
    };
  }
};

// SQL Injection prevention
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(\-\-)|(\;)|(\|)|(\*)|(\%27)|(\%3D)|(\%3B)|(\%22)|(\%2A)|(\%7C)/gi;

  const checkForSQLInjection = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      return sqlInjectionPattern.test(obj);
    }

    if (Array.isArray(obj)) {
      return obj.some((item, index) => checkForSQLInjection(item, `${path}[${index}]`));
    }

    if (obj && typeof obj === 'object') {
      return Object.keys(obj).some(key =>
        checkForSQLInjection(obj[key], path ? `${path}.${key}` : key)
      );
    }

    return false;
  };

  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    return res.status(400).json({
      error: 'Invalid input detected',
      code: 'INVALID_INPUT',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// XSS Protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const xssPattern = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return validator.escape(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      Object.keys(obj).forEach(key => {
        sanitized[key] = sanitizeObject(obj[key]);
      });
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  next();
};

// CSRF Protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for API endpoints that use Bearer tokens
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_INVALID',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// File upload security
export const secureFileUpload = {
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],

  maxFileSize: 10 * 1024 * 1024, // 10MB

  validateFile: (file: Express.Multer.File): { isValid: boolean; error?: string } => {
    if (!secureFileUpload.allowedMimeTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    if (file.size > secureFileUpload.maxFileSize) {
      return { isValid: false, error: 'File size exceeds limit' };
    }

    return { isValid: true };
  },

  sanitizeFileName: (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
};

// IP whitelist/blacklist
export const ipFilter = (whitelist: string[] = [], blacklist: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    if (blacklist.length > 0 && blacklist.includes(clientIP)) {
      return res.status(403).json({
        error: 'IP address blocked',
        code: 'IP_BLOCKED',
        timestamp: new Date().toISOString()
      });
    }

    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      return res.status(403).json({
        error: 'IP address not allowed',
        code: 'IP_NOT_ALLOWED',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Request ID for tracking
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
