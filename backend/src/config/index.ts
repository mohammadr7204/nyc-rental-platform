import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Basic configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('8000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // External Services
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Background Checks
  CHECKR_API_KEY: z.string().optional(),
  EXPERIAN_API_KEY: z.string().optional(),
  EXPERIAN_CLIENT_ID: z.string().optional(),
  EXPERIAN_CLIENT_SECRET: z.string().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // Performance
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  REQUEST_TIMEOUT: z.string().transform(Number).default('30000'), // 30 seconds

  // Security Headers
  TRUSTED_DOMAINS: z.string().default(''),
  CORS_ORIGINS: z.string().default(''),

  // Session
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_MAX_AGE: z.string().transform(Number).default('86400000'), // 24 hours
});

// Validate environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Invalid environment variables:', error.message);
    } else {
      console.error('❌ Invalid environment variables:', error);
    }
    process.exit(1);
  }
};

export const env = validateEnv();

// Configuration based on environment
export const config = {
  // Environment
  isDevelopment: env.NODE_ENV === 'development',
  isStaging: env.NODE_ENV === 'staging',
  isProduction: env.NODE_ENV === 'production',

  // Server
  server: {
    port: env.PORT,
    host: env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost',
    timeout: env.REQUEST_TIMEOUT,
    maxRequestSize: env.MAX_REQUEST_SIZE,
  },

  // Database
  database: {
    url: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production',
    connectionPoolSize: env.NODE_ENV === 'production' ? 20 : 5,
    logQueries: env.NODE_ENV === 'development',
  },

  // Security
  security: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    bcryptRounds: env.BCRYPT_ROUNDS,
    sessionSecret: env.SESSION_SECRET,
    sessionMaxAge: env.SESSION_MAX_AGE,
    trustedDomains: env.TRUSTED_DOMAINS.split(',').filter(Boolean),
    corsOrigins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').filter(Boolean) : [env.FRONTEND_URL],
  },

  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,

    // Different limits for different endpoints
    auth: {
      windowMs: 900000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
    },

    api: {
      windowMs: 900000, // 15 minutes
      maxRequests: env.NODE_ENV === 'production' ? 100 : 1000,
    },

    upload: {
      windowMs: 900000, // 15 minutes
      maxRequests: 10,
    },
  },

  // External services
  services: {
    frontend: {
      url: env.FRONTEND_URL,
    },

    aws: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
      s3Bucket: env.AWS_S3_BUCKET,
    },

    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },

    email: {
      sendgridApiKey: env.SENDGRID_API_KEY,
      fromEmail: env.SENDGRID_FROM_EMAIL,
    },

    sms: {
      twilioAccountSid: env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: env.TWILIO_PHONE_NUMBER,
    },

    backgroundCheck: {
      checkrApiKey: env.CHECKR_API_KEY,
      experianApiKey: env.EXPERIAN_API_KEY,
      experianClientId: env.EXPERIAN_CLIENT_ID,
      experianClientSecret: env.EXPERIAN_CLIENT_SECRET,
    },

    redis: {
      url: env.REDIS_URL,
      retryAttempts: 3,
    },

    monitoring: {
      sentryDsn: env.SENTRY_DSN,
      datadogApiKey: env.DATADOG_API_KEY,
    },
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    enableFileLogging: env.NODE_ENV !== 'development',
    enableConsoleLogging: true,
    enableAuditLogging: env.NODE_ENV === 'production',
    logDirectory: 'logs',
    maxFileSize: '20m',
    maxFiles: env.NODE_ENV === 'production' ? '30d' : '7d',
  },

  // File uploads
  uploads: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    uploadDirectory: env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads',
  },

  // Performance
  performance: {
    enableCompression: true,
    compressionLevel: env.NODE_ENV === 'production' ? 6 : 1,
    enableCaching: env.NODE_ENV === 'production',
    cacheMaxAge: 3600, // 1 hour
    slowQueryThreshold: 1000, // 1 second
    slowRequestThreshold: 2000, // 2 seconds
  },

  // Health checks
  health: {
    enableHealthCheck: true,
    checkInterval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    services: [
      'database',
      'redis',
      'email',
      ...(env.STRIPE_SECRET_KEY ? ['stripe'] : []),
      ...(env.AWS_ACCESS_KEY_ID ? ['aws'] : []),
    ],
  },

  // Circuit breaker
  circuitBreaker: {
    timeout: 10000, // 10 seconds
    errorThreshold: 50, // 50% error rate
    resetTimeout: 30000, // 30 seconds
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Validation
  validation: {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
  },
};

// Environment-specific overrides
if (config.isDevelopment) {
  // Development specific configurations
  config.logging.level = 'debug';
  config.security.bcryptRounds = 4; // Faster for development
  config.rateLimit.maxRequests = 1000; // More lenient
}

if (config.isStaging) {
  // Staging specific configurations
  config.logging.level = 'info';
  config.performance.enableCaching = false; // Disable caching for testing
}

if (config.isProduction) {
  // Production specific configurations
  config.logging.level = 'warn';
  config.security.bcryptRounds = 12; // More secure
  config.performance.enableCompression = true;
  config.health.enableHealthCheck = true;

  // Validate required production environment variables
  const requiredProdVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'SENDGRID_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'STRIPE_SECRET_KEY',
  ];

  const missingVars = requiredProdVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`❌ Missing required production environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
}

// Feature flags
export const features = {
  backgroundChecks: !!env.CHECKR_API_KEY,
  creditChecks: !!env.EXPERIAN_API_KEY,
  emailNotifications: !!env.SENDGRID_API_KEY,
  smsNotifications: !!env.TWILIO_ACCOUNT_SID,
  fileUploads: !!env.AWS_ACCESS_KEY_ID,
  payments: !!env.STRIPE_SECRET_KEY,
  monitoring: !!env.SENTRY_DSN || !!env.DATADOG_API_KEY,
  rateLimit: config.isProduction || config.isStaging,
  apiDocs: config.isDevelopment,
  debugRoutes: config.isDevelopment,
};

// Validate configuration integrity
export const validateConfig = () => {
  const errors: string[] = [];

  // Check for conflicting configurations
  if (config.isProduction && config.logging.level === 'debug') {
    errors.push('Debug logging should not be enabled in production');
  }

  if (!config.isProduction && !config.security.sessionSecret) {
    console.warn('⚠️  SESSION_SECRET not set, using default (not suitable for production)');
  }

  // Check service dependencies
  if (features.fileUploads && !config.services.aws.s3Bucket) {
    errors.push('AWS S3 bucket must be configured when file uploads are enabled');
  }

  if (features.payments && !config.services.stripe.webhookSecret) {
    console.warn('⚠️  Stripe webhook secret not configured');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✅ Configuration validated successfully');
  console.log(`🚀 Starting in ${env.NODE_ENV} mode`);
  console.log(`📡 Features enabled: ${Object.entries(features).filter(([, enabled]) => enabled).map(([name]) => name).join(', ')}`);
};

export default config;
