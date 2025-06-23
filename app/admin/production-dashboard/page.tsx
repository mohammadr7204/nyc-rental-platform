'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Globe
} from 'lucide-react';

interface HealthMetrics {
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

interface SystemInfo {
  timestamp: string;
  node: {
    version: string;
    platform: string;
    arch: string;
    uptime: number;
    pid: number;
  };
  os: {
    type: string;
    platform: string;
    arch: string;
    release: string;
    uptime: number;
    hostname: string;
    cpus: number;
    memory: {
      total: number;
      free: number;
      used: number;
    };
  };
  process: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    env: string;
    versions: Record<string, string>;
  };
}

interface AppMetrics {
  timestamp: string;
  uptime: number;
  requests: {
    total: number;
    current: number;
    errors: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  response_times: {
    avg: number;
    p95: number;
    p99: number;
  };
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const StatusIndicator: React.FC<{ 
  status: 'healthy' | 'unhealthy' | 'degraded'; 
  label: string;
  responseTime?: number;
}> = ({ status, label, responseTime }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        {responseTime && (
          <span className="text-sm text-gray-500">{responseTime}ms</span>
        )}
        <Badge className={getStatusColor()}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>
    </div>
  );
};

export default function ProductionDashboard() {
  const [healthData, setHealthData] = useState<HealthMetrics | null>(null);
  const [systemData, setSystemData] = useState<SystemInfo | null>(null);
  const [metricsData, setMetricsData] = useState<AppMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthResponse, systemResponse, metricsResponse] = await Promise.all([
        fetch('/health'),
        fetch('/health/system'),
        fetch('/health/metrics')
      ]);

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setHealthData(health);
      }

      if (systemResponse.ok) {
        const system = await systemResponse.json();
        setSystemData(system);
      }

      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        setMetricsData(metrics);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading production metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-full ${
                healthData?.status === 'healthy' ? 'bg-green-100' :
                healthData?.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Activity className={`w-4 h-4 ${
                  healthData?.status === 'healthy' ? 'text-green-600' :
                  healthData?.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className="text-lg font-bold">
                  {healthData?.status?.charAt(0).toUpperCase() + healthData?.status?.slice(1) || 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-blue-100">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                <p className="text-lg font-bold">
                  {healthData?.uptime ? formatUptime(healthData.uptime) : '0m'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-purple-100">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Environment</p>
                <p className="text-lg font-bold">
                  {healthData?.environment?.charAt(0).toUpperCase() + healthData?.environment?.slice(1) || 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-green-100">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Version</p>
                <p className="text-lg font-bold">
                  {healthData?.version || '1.0.0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="w-5 h-5" />
                <span>Service Health</span>
              </CardTitle>
              <CardDescription>
                Status of critical application services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthData && (
                <>
                  <StatusIndicator
                    status={healthData.services.database.status}
                    label="PostgreSQL Database"
                    responseTime={healthData.services.database.responseTime}
                  />
                  <StatusIndicator
                    status={healthData.services.redis.status}
                    label="Redis Cache"
                    responseTime={healthData.services.redis.responseTime}
                  />
                  <StatusIndicator
                    status={healthData.services.storage.status}
                    label="File Storage"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Memory Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MemoryStick className="w-5 h-5" />
                  <span>Memory Usage</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthData && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">System Memory</span>
                      <span className="text-sm font-medium">
                        {formatBytes(healthData.system.memory.used)} / {formatBytes(healthData.system.memory.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          healthData.system.memory.percentage > 80 ? 'bg-red-500' :
                          healthData.system.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(healthData.system.memory.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {healthData.system.memory.percentage.toFixed(1)}% used
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CPU Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5" />
                  <span>CPU Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {systemData && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CPU Cores</span>
                      <span className="text-sm font-medium">{systemData.os.cpus}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Architecture</span>
                      <span className="text-sm font-medium">{systemData.os.arch}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Platform</span>
                      <span className="text-sm font-medium">{systemData.os.platform}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Application Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Application Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsData && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Requests</span>
                      <span className="text-sm font-medium">{metricsData.requests.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Requests</span>
                      <span className="text-sm font-medium">{metricsData.requests.current}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Error Count</span>
                      <span className="text-sm font-medium text-red-600">{metricsData.requests.errors}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Response Time</span>
                      <span className="text-sm font-medium">{metricsData.response_times.avg}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">P95 Response Time</span>
                      <span className="text-sm font-medium">{metricsData.response_times.p95}ms</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Database Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsData && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active Connections</span>
                      <span className="text-sm font-medium">{metricsData.database.connections}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Queries</span>
                      <span className="text-sm font-medium">{metricsData.database.queries.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Slow Queries</span>
                      <span className="text-sm font-medium text-yellow-600">{metricsData.database.slowQueries}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Details</CardTitle>
              <CardDescription>
                Detailed system and runtime information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Node.js Runtime</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">{systemData.node.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform</span>
                        <span className="font-medium">{systemData.node.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Architecture</span>
                        <span className="font-medium">{systemData.node.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Process ID</span>
                        <span className="font-medium">{systemData.node.pid}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Operating System</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium">{systemData.os.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Release</span>
                        <span className="font-medium">{systemData.os.release}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hostname</span>
                        <span className="font-medium">{systemData.os.hostname}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">OS Uptime</span>
                        <span className="font-medium">{formatUptime(systemData.os.uptime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}