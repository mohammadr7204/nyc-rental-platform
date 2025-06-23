import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface MetricsStore {
  requests: {
    total: number;
    current: number;
    errors: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    byEndpoint: Record<string, { count: number; avgResponseTime: number; totalResponseTime: number }>;
  };
  responseTimes: {
    samples: number[];
    avg: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  errors: {
    total: number;
    recent: Array<{
      timestamp: Date;
      method: string;
      url: string;
      status: number;
      error: string;
      userAgent?: string;
      ip?: string;
    }>;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    errors: number;
  };
  activeConnections: Set<string>;
  startTime: Date;
}

// Global metrics store (in production, you'd use Redis or a proper metrics system)
const metricsStore: MetricsStore = {
  requests: {
    total: 0,
    current: 0,
    errors: 0,
    byMethod: {},
    byStatus: {},
    byEndpoint: {}
  },
  responseTimes: {
    samples: [],
    avg: 0,
    p95: 0,
    p99: 0,
    min: 0,
    max: 0
  },
  errors: {
    total: 0,
    recent: []
  },
  database: {
    connections: 0,
    queries: 0,
    slowQueries: 0,
    errors: 0
  },
  activeConnections: new Set(),
  startTime: new Date()
};

// Maximum number of response time samples to keep in memory
const MAX_SAMPLES = 1000;
const MAX_RECENT_ERRORS = 100;

export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Track active connection
  metricsStore.activeConnections.add(requestId);
  metricsStore.requests.current++;
  metricsStore.requests.total++;

  // Track by method
  const method = req.method;
  metricsStore.requests.byMethod[method] = (metricsStore.requests.byMethod[method] || 0) + 1;

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: () => void) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const endpoint = `${method} ${req.route?.path || req.path}`;

    try {
      // Update response time metrics
      updateResponseTimeMetrics(responseTime);

      // Track by status code
      metricsStore.requests.byStatus[statusCode.toString()] = 
        (metricsStore.requests.byStatus[statusCode.toString()] || 0) + 1;

      // Track by endpoint
      if (!metricsStore.requests.byEndpoint[endpoint]) {
        metricsStore.requests.byEndpoint[endpoint] = {
          count: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        };
      }
      
      const endpointStats = metricsStore.requests.byEndpoint[endpoint];
      endpointStats.count++;
      endpointStats.totalResponseTime += responseTime;
      endpointStats.avgResponseTime = endpointStats.totalResponseTime / endpointStats.count;

      // Track errors
      if (statusCode >= 400) {
        metricsStore.requests.errors++;
        metricsStore.errors.total++;

        // Store recent error details
        const errorDetail = {
          timestamp: new Date(),
          method,
          url: req.originalUrl,
          status: statusCode,
          error: res.statusMessage || 'Unknown error',
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress
        };

        metricsStore.errors.recent.unshift(errorDetail);
        if (metricsStore.errors.recent.length > MAX_RECENT_ERRORS) {
          metricsStore.errors.recent = metricsStore.errors.recent.slice(0, MAX_RECENT_ERRORS);
        }
      }

      // Log performance metrics for slow requests
      if (responseTime > 1000) { // Log requests slower than 1 second
        logger.warn('Slow request detected', {
          method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          statusCode,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
      }

      // Log error responses
      if (statusCode >= 500) {
        logger.error('Server error response', {
          method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          statusCode,
          error: res.statusMessage,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
      }

      // Clean up
      metricsStore.activeConnections.delete(requestId);
      metricsStore.requests.current--;

    } catch (error) {
      logger.error('Error in performance monitoring middleware:', error);
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

function updateResponseTimeMetrics(responseTime: number) {
  // Add to samples
  metricsStore.responseTimes.samples.push(responseTime);
  
  // Keep only recent samples
  if (metricsStore.responseTimes.samples.length > MAX_SAMPLES) {
    metricsStore.responseTimes.samples = metricsStore.responseTimes.samples.slice(-MAX_SAMPLES);
  }

  const samples = metricsStore.responseTimes.samples;
  const sortedSamples = [...samples].sort((a, b) => a - b);

  // Calculate percentiles
  metricsStore.responseTimes.avg = samples.reduce((sum, time) => sum + time, 0) / samples.length;
  metricsStore.responseTimes.p95 = calculatePercentile(sortedSamples, 0.95);
  metricsStore.responseTimes.p99 = calculatePercentile(sortedSamples, 0.99);
  metricsStore.responseTimes.min = Math.min(...samples);
  metricsStore.responseTimes.max = Math.max(...samples);
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const index = Math.ceil(sortedArray.length * percentile) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

// Database metrics tracking
export const trackDatabaseQuery = (queryType: 'query' | 'slowQuery' | 'error', duration?: number) => {
  switch (queryType) {
    case 'query':
      metricsStore.database.queries++;
      if (duration && duration > 1000) { // Slow query threshold: 1 second
        metricsStore.database.slowQueries++;
      }
      break;
    case 'slowQuery':
      metricsStore.database.slowQueries++;
      break;
    case 'error':
      metricsStore.database.errors++;
      break;
  }
};

// Connection tracking
export const trackDatabaseConnection = (action: 'connect' | 'disconnect') => {
  switch (action) {
    case 'connect':
      metricsStore.database.connections++;
      break;
    case 'disconnect':
      metricsStore.database.connections = Math.max(0, metricsStore.database.connections - 1);
      break;
  }
};

// Get current metrics
export const getMetrics = () => {
  const uptime = Math.floor((Date.now() - metricsStore.startTime.getTime()) / 1000);

  return {
    timestamp: new Date().toISOString(),
    uptime,
    requests: {
      total: metricsStore.requests.total,
      current: metricsStore.requests.current,
      errors: metricsStore.requests.errors,
      byMethod: metricsStore.requests.byMethod,
      byStatus: metricsStore.requests.byStatus
    },
    database: {
      connections: metricsStore.database.connections,
      queries: metricsStore.database.queries,
      slowQueries: metricsStore.database.slowQueries,
      errors: metricsStore.database.errors
    },
    memory: process.memoryUsage(),
    responseTimes: {
      avg: Math.round(metricsStore.responseTimes.avg * 100) / 100,
      p95: Math.round(metricsStore.responseTimes.p95 * 100) / 100,
      p99: Math.round(metricsStore.responseTimes.p99 * 100) / 100,
      min: metricsStore.responseTimes.min,
      max: metricsStore.responseTimes.max
    },
    errors: {
      total: metricsStore.errors.total,
      recent: metricsStore.errors.recent.slice(0, 10) // Return only 10 most recent errors
    },
    endpoints: Object.entries(metricsStore.requests.byEndpoint)
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgResponseTime: Math.round(stats.avgResponseTime * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20) // Top 20 most used endpoints
  };
};

// Reset metrics (useful for testing)
export const resetMetrics = () => {
  metricsStore.requests = {
    total: 0,
    current: 0,
    errors: 0,
    byMethod: {},
    byStatus: {},
    byEndpoint: {}
  };
  metricsStore.responseTimes = {
    samples: [],
    avg: 0,
    p95: 0,
    p99: 0,
    min: 0,
    max: 0
  };
  metricsStore.errors = {
    total: 0,
    recent: []
  };
  metricsStore.database = {
    connections: 0,
    queries: 0,
    slowQueries: 0,
    errors: 0
  };
  metricsStore.activeConnections.clear();
  metricsStore.startTime = new Date();
};

// Middleware to expose metrics endpoint
export const metricsEndpoint = (req: Request, res: Response) => {
  try {
    const metrics = getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).json({
      error: 'Failed to generate metrics',
      timestamp: new Date().toISOString()
    });
  }
};

export default performanceMonitoring;