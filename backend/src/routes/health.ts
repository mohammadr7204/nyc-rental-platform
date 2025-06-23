import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../config/logger';
import os from 'os';
import fs from 'fs/promises';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    storage: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    disk: {
      free: number;
      total: number;
      percentage: number;
    };
  };
}

// Basic health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'healthy' },
        redis: { status: 'healthy' },
        storage: { status: 'healthy' }
      },
      system: {
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        },
        cpu: {
          usage: 0
        },
        disk: {
          free: 0,
          total: 0,
          percentage: 0
        }
      }
    };

    // Check database connection
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      result.services.database.responseTime = Date.now() - dbStart;
    } catch (error) {
      result.services.database.status = 'unhealthy';
      result.services.database.error = error instanceof Error ? error.message : 'Unknown error';
      result.status = 'degraded';
    }

    // Check Redis connection
    try {
      const redisStart = Date.now();
      await redis.ping();
      result.services.redis.responseTime = Date.now() - redisStart;
    } catch (error) {
      result.services.redis.status = 'unhealthy';
      result.services.redis.error = error instanceof Error ? error.message : 'Unknown error';
      result.status = 'degraded';
    }

    // Check storage (AWS S3 would be checked here in production)
    try {
      // For now, just check if we can write to the logs directory
      await fs.access('./logs', fs.constants.W_OK);
    } catch (error) {
      result.services.storage.status = 'unhealthy';
      result.services.storage.error = 'Cannot access logs directory';
      result.status = 'degraded';
    }

    // System metrics
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    result.system.memory = {
      used: memUsage.heapUsed,
      total: totalMem,
      percentage: ((totalMem - freeMem) / totalMem) * 100
    };

    // CPU usage (simplified - in production you'd want more sophisticated monitoring)
    const cpus = os.cpus();
    result.system.cpu.usage = cpus.length;

    // Disk usage (simplified)
    try {
      const stats = await fs.stat('./');
      result.system.disk = {
        free: freeMem, // Simplified - you'd want actual disk stats
        total: totalMem,
        percentage: 0
      };
    } catch (error) {
      // Disk stats failed, but not critical
    }

    // Determine overall status
    if (result.services.database.status === 'unhealthy' || 
        result.services.redis.status === 'unhealthy') {
      result.status = 'unhealthy';
    }

    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness probe - simple endpoint for container orchestration
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe - checks if app is ready to serve traffic
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed system information endpoint
router.get('/health/system', async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        pid: process.pid
      },
      os: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        }
      },
      process: {
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV,
        versions: process.versions
      }
    };

    res.json(systemInfo);
  } catch (error) {
    logger.error('System info check failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Application metrics endpoint
router.get('/health/metrics', async (req: Request, res: Response) => {
  try {
    // In a production environment, you'd collect these metrics over time
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: {
        total: 0, // Would be tracked in middleware
        current: 0,
        errors: 0
      },
      database: {
        connections: 0, // Would be from connection pool
        queries: 0,
        slowQueries: 0
      },
      memory: process.memoryUsage(),
      response_times: {
        avg: 0,
        p95: 0,
        p99: 0
      }
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics check failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;