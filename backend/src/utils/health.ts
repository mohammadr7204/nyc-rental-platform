import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';
import { config } from '../config';
import { logger, logHealthCheck } from '../utils/logger';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  lastCheck: Date;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: Date;
  checks: HealthCheck[];
  metrics: {
    memory: NodeJS.MemoryUsage;
    cpu: any;
    eventLoop: number;
  };
}

class HealthCheckService {
  private prisma: PrismaClient;
  private redis: Redis;
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(config.services.redis.url);
    
    if (config.health.enableHealthCheck) {
      this.startPeriodicHealthChecks();
    }
  }

  private startPeriodicHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Periodic health check failed:', error);
      }
    }, config.health.checkInterval);
  }

  public stopPeriodicHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Math.round(performance.now() - start);
      
      logHealthCheck('database', 'healthy', responseTime);
      
      return {
        service: 'database',
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        details: { connected: true }
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logHealthCheck('database', 'unhealthy', responseTime, { error: errorMessage });
      
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: errorMessage,
        details: { connected: false }
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = performance.now();
    try {
      await this.redis.ping();
      const responseTime = Math.round(performance.now() - start);
      
      logHealthCheck('redis', 'healthy', responseTime);
      
      return {
        service: 'redis',
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        details: { connected: true }
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logHealthCheck('redis', 'unhealthy', responseTime, { error: errorMessage });
      
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: errorMessage,
        details: { connected: false }
      };
    }
  }

  private async checkEmail(): Promise<HealthCheck> {
    const start = performance.now();
    try {
      // Simple check - just verify configuration exists
      if (!config.services.email.sendgridApiKey) {
        throw new Error('SendGrid API key not configured');
      }
      
      // In a real implementation, you might send a test email or check SendGrid API status
      const responseTime = Math.round(performance.now() - start);
      
      logHealthCheck('email', 'healthy', responseTime);
      
      return {
        service: 'email',
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        details: { configured: true }
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logHealthCheck('email', 'unhealthy', responseTime, { error: errorMessage });
      
      return {
        service: 'email',
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: errorMessage,
        details: { configured: false }
      };
    }
  }

  private async checkStripe(): Promise<HealthCheck> {
    const start = performance.now();
    try {
      if (!config.services.stripe.secretKey) {
        throw new Error('Stripe secret key not configured');
      }
      
      // In production, you might make an actual API call to Stripe
      const responseTime = Math.round(performance.now() - start);
      
      logHealthCheck('stripe', 'healthy', responseTime);
      
      return {
        service: 'stripe',
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        details: { configured: true }
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logHealthCheck('stripe', 'unhealthy', responseTime, { error: errorMessage });
      
      return {
        service: 'stripe',
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: errorMessage,
        details: { configured: false }
      };
    }
  }

  private async checkAWS(): Promise<HealthCheck> {
    const start = performance.now();
    try {
      if (!config.services.aws.accessKeyId || !config.services.aws.s3Bucket) {
        throw new Error('AWS credentials or S3 bucket not configured');
      }
      
      // In production, you might make an actual API call to AWS
      const responseTime = Math.round(performance.now() - start);
      
      logHealthCheck('aws', 'healthy', responseTime);
      
      return {
        service: 'aws',
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        details: { configured: true }
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logHealthCheck('aws', 'unhealthy', responseTime, { error: errorMessage });
      
      return {
        service: 'aws',
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: errorMessage,
        details: { configured: false }
      };
    }
  }

  private getSystemMetrics() {
    const memory = process.memoryUsage();
    
    // Get event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
    });
    
    return {
      memory,
      cpu: process.cpuUsage(),
      eventLoop: 0, // This would need a more sophisticated implementation
    };
  }

  public async performHealthCheck(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];
    
    // Run all health checks in parallel
    const healthChecks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      ...(config.health.services.includes('email') ? [this.checkEmail()] : []),
      ...(config.health.services.includes('stripe') ? [this.checkStripe()] : []),
      ...(config.health.services.includes('aws') ? [this.checkAWS()] : []),
    ]);
    
    // Process results
    healthChecks.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        checks.push(result.value);
      } else {
        const serviceName = config.health.services[index] || 'unknown';
        checks.push({
          service: serviceName,
          status: 'unhealthy',
          responseTime: 0,
          lastCheck: new Date(),
          error: result.reason?.message || 'Health check failed'
        });
      }
    });
    
    // Determine overall system status
    const unhealthyServices = checks.filter(check => check.status === 'unhealthy');
    const degradedServices = checks.filter(check => check.status === 'degraded');
    
    let systemStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (unhealthyServices.length > 0) {
      // If any critical service is down, system is unhealthy
      const criticalServices = ['database'];
      const criticalDown = unhealthyServices.some(service => 
        criticalServices.includes(service.service)
      );
      systemStatus = criticalDown ? 'unhealthy' : 'degraded';
    } else if (degradedServices.length > 0) {
      systemStatus = 'degraded';
    } else {
      systemStatus = 'healthy';
    }
    
    const health: SystemHealth = {
      status: systemStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date(),
      checks,
      metrics: this.getSystemMetrics()
    };
    
    this.lastHealthCheck = health;
    
    // Log system health
    logger.info('System health check completed', {
      status: systemStatus,
      unhealthyServices: unhealthyServices.length,
      degradedServices: degradedServices.length,
      totalChecks: checks.length
    });
    
    return health;
  }

  public getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  public async getDetailedHealth(): Promise<SystemHealth> {
    return await this.performHealthCheck();
  }
}

// Singleton instance
const healthCheckService = new HealthCheckService();

// Health check middleware
export const healthCheckHandler = async (req: Request, res: Response) => {
  try {
    const detailed = req.query.detailed === 'true';
    
    let health: SystemHealth;
    if (detailed) {
      health = await healthCheckService.getDetailedHealth();
    } else {
      health = healthCheckService.getLastHealthCheck() || await healthCheckService.performHealthCheck();
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
};

// Readiness check (for Kubernetes)
export const readinessHandler = async (req: Request, res: Response) => {
  try {
    const dbCheck = await healthCheckService['checkDatabase']();
    
    if (dbCheck.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database connection failed',
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: 'Readiness check failed',
      timestamp: new Date()
    });
  }
};

// Liveness check (for Kubernetes)
export const livenessHandler = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date()
  });
};

// Application metrics endpoint
export const metricsHandler = (req: Request, res: Response) => {
  const metrics = {
    system: {
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    application: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date(),
    },
    lastHealthCheck: healthCheckService.getLastHealthCheck()
  };
  
  res.json(metrics);
};

// Performance monitoring middleware
export const performanceMonitoring = (req: Request, res: Response, next: Function) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
    
    // Log slow requests
    if (duration > config.performance.slowRequestThreshold) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
        requestId: req.id
      });
    }
    
    // You could send this to monitoring services like DataDog, New Relic, etc.
    if (config.services.monitoring.datadogApiKey) {
      // Send metrics to DataDog
      // This would be implemented with the DataDog client
    }
  });
  
  next();
};

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private name: string,
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.warn(`Circuit breaker opened for ${this.name}`, {
        failures: this.failures,
        threshold: this.threshold
      });
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      nextAttempt: new Date(this.nextAttempt)
    };
  }
}

export const circuitBreakers = {
  database: new CircuitBreaker('database', 5, 30000),
  redis: new CircuitBreaker('redis', 3, 15000),
  email: new CircuitBreaker('email', 5, 60000),
  stripe: new CircuitBreaker('stripe', 3, 30000),
};

// Graceful shutdown handling
export const setupGracefulShutdown = (server: any) => {
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connections
      healthCheckService.stopPeriodicHealthChecks();
      
      // Close other connections
      process.exit(0);
    });
    
    // Force close after timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

export default healthCheckService;
