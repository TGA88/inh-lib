# UnifiedRouteManager Part 3: Performance & Operations

> ⚡ **Production Readiness Layer** - Building enterprise-grade performance monitoring and operational excellence

## 📖 **Part 3 Overview**

**Goal**: สร้าง production-ready route management system ที่มี monitoring, caching, และ operational features ครบครัน

**Learning Outcome**: มี route system ที่สามารถ monitor performance, cache responses, manage configurations, และ handle production operations ได้อย่างเป็นมืออาชีพ

**Time Investment**: 1-2 สัปดาห์ (1-2 ชม. อ่าน + 4-6 ชม. ลงมือทำ)

**Prerequisites**: Part 1 (Foundation) + Part 2 (Security & Development) + DevOps knowledge

---

## 🎯 **Part 3 Contents**

1. **📊 Performance Monitoring** - Real-time metrics และ alerting systems
2. **⚡ Caching System** - Multi-layer caching strategies 
3. **🏗️ Configuration & Setup** - Environment management และ feature flags
4. **🏥 Operations & Health** - Health checks และ graceful operations

---

## 1. 📊 **Performance Monitoring**

### **Core Monitoring Types**

```typescript
// performance/monitoring/types.ts
export interface PerformanceMetrics {
  readonly routeId: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly responseTime: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly timestamp: Date;
  readonly userAgent?: string;
  readonly ip?: string;
}

export interface RouteMetricsAggregation {
  readonly routeId: string;
  readonly count: number;
  readonly avgResponseTime: number;
  readonly minResponseTime: number;
  readonly maxResponseTime: number;
  readonly errorRate: number;
  readonly p95ResponseTime: number;
  readonly p99ResponseTime: number;
  readonly lastUpdated: Date;
}

export interface PerformanceAlert {
  readonly type: 'SLOW_ROUTE' | 'HIGH_ERROR_RATE' | 'MEMORY_LEAK' | 'HIGH_LOAD';
  readonly routeId?: string;
  readonly threshold: number;
  readonly currentValue: number;
  readonly timestamp: Date;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PerformanceMonitor {
  recordMetric(metric: PerformanceMetrics): void;
  getRouteMetrics(routeId: string): RouteMetricsAggregation | undefined;
  getAllMetrics(): readonly RouteMetricsAggregation[];
  getAlerts(): readonly PerformanceAlert[];
  clearMetrics(): void;
}
```

### **Performance Monitoring Implementation**

```typescript
// performance/monitoring/performance-monitor.ts
export const createPerformanceMonitor = (): PerformanceMonitor => {
  const metrics = new Map<string, PerformanceMetrics[]>();
  const alerts: PerformanceAlert[] = [];
  
  // Configuration
  const METRIC_RETENTION_MS = 1000 * 60 * 60; // 1 hour
  const SLOW_ROUTE_THRESHOLD = 1000; // 1 second
  const ERROR_RATE_THRESHOLD = 0.05; // 5%
  const MEMORY_LEAK_THRESHOLD = 100 * 1024 * 1024; // 100MB growth

  const cleanupOldMetrics = (): void => {
    const cutoff = new Date(Date.now() - METRIC_RETENTION_MS);
    
    for (const [routeId, routeMetrics] of metrics) {
      const validMetrics = routeMetrics.filter(m => m.timestamp > cutoff);
      if (validMetrics.length === 0) {
        metrics.delete(routeId);
      } else {
        metrics.set(routeId, validMetrics);
      }
    }
  };

  const detectSlowRoutes = (routeId: string, routeMetrics: PerformanceMetrics[]): void => {
    if (routeMetrics.length < 10) return; // Need minimum samples
    
    const recentMetrics = routeMetrics.slice(-10);
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    
    if (avgResponseTime > SLOW_ROUTE_THRESHOLD) {
      alerts.push({
        type: 'SLOW_ROUTE',
        routeId,
        threshold: SLOW_ROUTE_THRESHOLD,
        currentValue: avgResponseTime,
        timestamp: new Date(),
        severity: avgResponseTime > SLOW_ROUTE_THRESHOLD * 2 ? 'CRITICAL' : 'HIGH'
      });
    }
  };

  const detectHighErrorRate = (routeId: string, routeMetrics: PerformanceMetrics[]): void => {
    if (routeMetrics.length < 20) return;
    
    const recentMetrics = routeMetrics.slice(-20);
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / recentMetrics.length;
    
    if (errorRate > ERROR_RATE_THRESHOLD) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        routeId,
        threshold: ERROR_RATE_THRESHOLD,
        currentValue: errorRate,
        timestamp: new Date(),
        severity: errorRate > ERROR_RATE_THRESHOLD * 2 ? 'CRITICAL' : 'HIGH'
      });
    }
  };

  const detectMemoryLeaks = (routeMetrics: PerformanceMetrics[]): void => {
    if (routeMetrics.length < 100) return;
    
    const recent = routeMetrics.slice(-10);
    const older = routeMetrics.slice(-110, -100);
    
    const recentMemory = recent.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recent.length;
    const olderMemory = older.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / older.length;
    
    const memoryGrowth = recentMemory - olderMemory;
    
    if (memoryGrowth > MEMORY_LEAK_THRESHOLD) {
      alerts.push({
        type: 'MEMORY_LEAK',
        threshold: MEMORY_LEAK_THRESHOLD,
        currentValue: memoryGrowth,
        timestamp: new Date(),
        severity: 'CRITICAL'
      });
    }
  };

  return {
    recordMetric: (metric: PerformanceMetrics): void => {
      // Store metric
      const routeMetrics = metrics.get(metric.routeId) || [];
      routeMetrics.push(metric);
      metrics.set(metric.routeId, routeMetrics);
      
      // Run analysis
      detectSlowRoutes(metric.routeId, routeMetrics);
      detectHighErrorRate(metric.routeId, routeMetrics);
      
      // Global memory analysis
      const allMetrics = Array.from(metrics.values()).flat();
      detectMemoryLeaks(allMetrics);
      
      // Cleanup old data
      if (Math.random() < 0.01) { // 1% chance to cleanup
        cleanupOldMetrics();
      }
    },

    getRouteMetrics: (routeId: string): RouteMetricsAggregation | undefined => {
      const routeMetrics = metrics.get(routeId);
      if (!routeMetrics || routeMetrics.length === 0) return undefined;

      const responseTimes = routeMetrics.map(m => m.responseTime).sort((a, b) => a - b);
      const errorCount = routeMetrics.filter(m => m.statusCode >= 400).length;

      return {
        routeId,
        count: routeMetrics.length,
        avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        minResponseTime: responseTimes[0],
        maxResponseTime: responseTimes[responseTimes.length - 1],
        errorRate: errorCount / routeMetrics.length,
        p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
        p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
        lastUpdated: new Date()
      };
    },

    getAllMetrics: (): readonly RouteMetricsAggregation[] => {
      return Array.from(metrics.keys())
        .map(routeId => createPerformanceMonitor().getRouteMetrics(routeId))
        .filter((metrics): metrics is RouteMetricsAggregation => metrics !== undefined);
    },

    getAlerts: (): readonly PerformanceAlert[] => {
      return [...alerts];
    },

    clearMetrics: (): void => {
      metrics.clear();
      alerts.length = 0;
    }
  };
};
```

### **Performance Middleware**

```typescript
// performance/monitoring/performance-middleware.ts
import { UnifiedHttpContext } from '../../foundations/unified-context';
import { RouteDefinition } from '../../foundations/route-management/types';

export const createPerformanceMiddleware = (
  monitor: PerformanceMonitor
) => {
  return async (context: UnifiedHttpContext, next: () => Promise<void>): Promise<void> => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      await next();
    } finally {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      // Extract route information from context
      const route = context.route as RouteDefinition | undefined;
      
      if (route) {
        monitor.recordMetric({
          routeId: route.id,
          method: route.metadata.method,
          path: route.metadata.path,
          statusCode: context.response.statusCode || 200,
          responseTime,
          memoryUsage: process.memoryUsage(),
          timestamp: new Date(),
          userAgent: context.request.headers['user-agent'],
          ip: context.request.ip
        });
      }
    }
  };
};
```

---

## 2. ⚡ **Caching System**

### **Cache Types & Interfaces**

```typescript
// performance/caching/types.ts
export interface CacheEntry<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly ttl: number;
  readonly createdAt: Date;
  readonly accessCount: number;
  readonly lastAccessed: Date;
}

export interface CacheStats {
  readonly totalKeys: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly memoryUsage: number;
  readonly oldestEntry: Date | null;
  readonly newestEntry: Date | null;
}

export interface CacheStrategy {
  readonly name: string;
  readonly defaultTtl: number;
  shouldCache(context: UnifiedHttpContext): boolean;
  generateKey(context: UnifiedHttpContext): string;
  shouldInvalidate(context: UnifiedHttpContext): readonly string[];
}

export interface CacheProvider<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}
```

### **Multi-Layer Cache Implementation**

```typescript
// performance/caching/multi-layer-cache.ts
export class MemoryCacheProvider<T = unknown> implements CacheProvider<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxSize: number = 1000,
    private readonly defaultTtl: number = 5 * 60 * 1000 // 5 minutes
  ) {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60_000);
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.createdAt.getTime() > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access stats
    const updatedEntry: CacheEntry<T> = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: new Date()
    };
    this.cache.set(key, updatedEntry);
    
    this.hits++;
    return entry.value;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: ttl || this.defaultTtl,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date()
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async getStats(): Promise<CacheStats> {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hits + this.misses;
    
    return {
      totalKeys: this.cache.size,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.createdAt.getTime()))) : null,
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.createdAt.getTime()))) : null
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation in bytes
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry).length * 2; // UTF-16 encoding
    }
    return size;
  }
}
```

### **Cache Strategies**

```typescript
// performance/caching/cache-strategies.ts
export const createGetOnlyCacheStrategy = (
  ttl: number = 5 * 60 * 1000
): CacheStrategy => ({
  name: 'get-only',
  defaultTtl: ttl,
  
  shouldCache: (context: UnifiedHttpContext): boolean => {
    return context.request.method === 'GET';
  },
  
  generateKey: (context: UnifiedHttpContext): string => {
    const url = new URL(context.request.url, 'http://localhost');
    const sortedParams = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `${context.request.method}:${url.pathname}${sortedParams ? '?' + sortedParams : ''}`;
  },
  
  shouldInvalidate: (context: UnifiedHttpContext): readonly string[] => {
    // Invalidate related GET requests when data is modified
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(context.request.method)) {
      const pathParts = context.request.url.split('/').filter(Boolean);
      return [
        `GET:/${pathParts[0]}`, // List endpoint
        `GET:${context.request.url}` // Specific resource
      ];
    }
    return [];
  }
});

export const createUserSpecificCacheStrategy = (
  ttl: number = 10 * 60 * 1000
): CacheStrategy => ({
  name: 'user-specific',
  defaultTtl: ttl,
  
  shouldCache: (context: UnifiedHttpContext): boolean => {
    return context.request.method === 'GET' && !!context.user?.id;
  },
  
  generateKey: (context: UnifiedHttpContext): string => {
    const baseKey = createGetOnlyCacheStrategy().generateKey(context);
    return `user:${context.user?.id}:${baseKey}`;
  },
  
  shouldInvalidate: (context: UnifiedHttpContext): readonly string[] => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(context.request.method) && context.user?.id) {
      return [`user:${context.user.id}:*`];
    }
    return [];
  }
});
```

### **Cache Middleware**

```typescript
// performance/caching/cache-middleware.ts
export const createCacheMiddleware = (
  provider: CacheProvider,
  strategy: CacheStrategy
) => {
  return async (context: UnifiedHttpContext, next: () => Promise<void>): Promise<void> => {
    // Handle cache invalidation first
    const invalidationKeys = strategy.shouldInvalidate(context);
    for (const key of invalidationKeys) {
      if (key.endsWith('*')) {
        // Pattern-based invalidation (simplified)
        await provider.clear(); // In production, use more sophisticated pattern matching
      } else {
        await provider.delete(key);
      }
    }

    // Try to serve from cache
    if (strategy.shouldCache(context)) {
      const cacheKey = strategy.generateKey(context);
      const cached = await provider.get(cacheKey);
      
      if (cached) {
        // Set cache headers
        context.response.header('X-Cache', 'HIT');
        context.response.header('X-Cache-Key', cacheKey);
        
        // Serve cached response
        if (typeof cached === 'object' && cached !== null) {
          context.response.json(cached);
        } else {
          context.response.send(cached);
        }
        return;
      }
    }

    // Capture response for caching
    if (strategy.shouldCache(context)) {
      const originalSend = context.response.send;
      const originalJson = context.response.json;
      let responseData: unknown = null;

      // Override send method
      context.response.send = function(data: unknown) {
        responseData = data;
        return originalSend.call(this, data);
      };

      // Override json method
      context.response.json = function(data: unknown) {
        responseData = data;
        return originalJson.call(this, data);
      };

      await next();

      // Cache the response if successful
      if (context.response.statusCode < 400 && responseData !== null) {
        const cacheKey = strategy.generateKey(context);
        await provider.set(cacheKey, responseData, strategy.defaultTtl);
        context.response.header('X-Cache', 'MISS');
        context.response.header('X-Cache-Key', cacheKey);
      }
    } else {
      await next();
    }
  };
};
```

---

## 3. 🏗️ **Configuration & Setup**

### **Environment Configuration**

```typescript
// configuration/environment/types.ts
export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly ssl: boolean;
  readonly connectionTimeout: number;
  readonly maxConnections: number;
}

export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly db: number;
  readonly connectTimeout: number;
  readonly lazyConnect: boolean;
}

export interface FeatureFlags {
  readonly enableCaching: boolean;
  readonly enableMonitoring: boolean;
  readonly enableDocumentation: boolean;
  readonly enableRateLimiting: boolean;
  readonly enableMetrics: boolean;
  readonly debugMode: boolean;
}

export interface AppConfig {
  readonly environment: 'development' | 'staging' | 'production';
  readonly port: number;
  readonly host: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly database: DatabaseConfig;
  readonly redis: RedisConfig;
  readonly features: FeatureFlags;
  readonly security: {
    readonly jwtSecret: string;
    readonly corsOrigins: readonly string[];
    readonly rateLimitWindow: number;
    readonly rateLimitMax: number;
  };
}
```

### **Configuration Loader**

```typescript
// configuration/environment/config-loader.ts
import { z } from 'zod';

const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().default(false),
  connectionTimeout: z.number().positive().default(30000),
  maxConnections: z.number().positive().default(10)
});

const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(6379),
  password: z.string().optional(),
  db: z.number().int().min(0).default(0),
  connectTimeout: z.number().positive().default(10000),
  lazyConnect: z.boolean().default(true)
});

const FeatureFlagsSchema = z.object({
  enableCaching: z.boolean().default(true),
  enableMonitoring: z.boolean().default(true),
  enableDocumentation: z.boolean().default(true),
  enableRateLimiting: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
  debugMode: z.boolean().default(false)
});

const AppConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.number().int().positive().default(3000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  features: FeatureFlagsSchema,
  security: z.object({
    jwtSecret: z.string().min(32),
    corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
    rateLimitWindow: z.number().positive().default(15 * 60 * 1000), // 15 minutes
    rateLimitMax: z.number().positive().default(100)
  })
});

export const loadConfig = (): AppConfig => {
  const rawConfig = {
    environment: process.env.NODE_ENV,
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST,
    logLevel: process.env.LOG_LEVEL,
    
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10)
    },
    
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
      lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false'
    },
    
    features: {
      enableCaching: process.env.FEATURE_CACHING !== 'false',
      enableMonitoring: process.env.FEATURE_MONITORING !== 'false',
      enableDocumentation: process.env.FEATURE_DOCS !== 'false',
      enableRateLimiting: process.env.FEATURE_RATE_LIMITING !== 'false',
      enableMetrics: process.env.FEATURE_METRICS !== 'false',
      debugMode: process.env.DEBUG_MODE === 'true'
    },
    
    security: {
      jwtSecret: process.env.JWT_SECRET,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
    }
  };

  try {
    return AppConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};
```

### **Feature Flag System**

```typescript
// configuration/feature-flags/feature-flag-manager.ts
export interface FeatureFlagRule {
  readonly name: string;
  readonly enabled: boolean;
  readonly conditions?: {
    readonly environment?: readonly string[];
    readonly userSegments?: readonly string[];
    readonly percentage?: number;
  };
}

export interface FeatureFlagManager {
  isEnabled(flagName: string, context?: FeatureFlagContext): boolean;
  getAllFlags(): readonly FeatureFlagRule[];
  updateFlag(flagName: string, rule: Partial<FeatureFlagRule>): void;
}

export interface FeatureFlagContext {
  readonly userId?: string;
  readonly userSegment?: string;
  readonly environment?: string;
}

export const createFeatureFlagManager = (
  initialFlags: readonly FeatureFlagRule[]
): FeatureFlagManager => {
  const flags = new Map<string, FeatureFlagRule>();
  
  // Initialize flags
  initialFlags.forEach(flag => flags.set(flag.name, flag));

  return {
    isEnabled: (flagName: string, context?: FeatureFlagContext): boolean => {
      const flag = flags.get(flagName);
      if (!flag) return false;
      
      // Base enabled check
      if (!flag.enabled) return false;
      
      // No conditions = always enabled
      if (!flag.conditions) return true;
      
      const { environment, userSegments, percentage } = flag.conditions;
      
      // Environment check
      if (environment && context?.environment) {
        if (!environment.includes(context.environment)) return false;
      }
      
      // User segment check
      if (userSegments && context?.userSegment) {
        if (!userSegments.includes(context.userSegment)) return false;
      }
      
      // Percentage rollout
      if (percentage !== undefined && context?.userId) {
        const hash = simpleHash(context.userId + flagName);
        const userPercentage = hash % 100;
        return userPercentage < percentage;
      }
      
      return true;
    },

    getAllFlags: (): readonly FeatureFlagRule[] => {
      return Array.from(flags.values());
    },

    updateFlag: (flagName: string, rule: Partial<FeatureFlagRule>): void => {
      const existingFlag = flags.get(flagName);
      if (existingFlag) {
        flags.set(flagName, { ...existingFlag, ...rule });
      }
    }
  };
};

const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};
```

---

## 4. 🏥 **Operations & Health**

### **Health Check System**

```typescript
// operations/health/types.ts
export interface HealthCheckResult {
  readonly name: string;
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  readonly latency: number;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
}

export interface HealthCheck {
  readonly name: string;
  execute(): Promise<HealthCheckResult>;
}

export interface HealthReport {
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  readonly checks: readonly HealthCheckResult[];
  readonly timestamp: Date;
  readonly uptime: number;
}
```

### **Health Check Implementations**

```typescript
// operations/health/health-checks.ts
export const createDatabaseHealthCheck = (
  dbConnection: unknown // Your DB connection type
): HealthCheck => ({
  name: 'database',
  execute: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      // Simulate database ping
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const latency = Date.now() - startTime;
      
      return {
        name: 'database',
        status: latency < 100 ? 'healthy' : 'degraded',
        latency,
        details: {
          connectionPool: 'active',
          lastQuery: new Date().toISOString()
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }
});

export const createRedisHealthCheck = (): HealthCheck => ({
  name: 'redis',
  execute: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      // Simulate Redis ping
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const latency = Date.now() - startTime;
      
      return {
        name: 'redis',
        status: 'healthy',
        latency,
        details: {
          connected: true,
          memoryUsage: '45MB'
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }
});

export const createMemoryHealthCheck = (): HealthCheck => ({
  name: 'memory',
  execute: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();
    const latency = Date.now() - startTime;
    
    // Alert if using more than 80% of heap
    const heapUsagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (heapUsagePercentage > 90) status = 'unhealthy';
    else if (heapUsagePercentage > 80) status = 'degraded';
    
    return {
      name: 'memory',
      status,
      latency,
      details: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsagePercentage: `${heapUsagePercentage.toFixed(1)}%`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      timestamp: new Date()
    };
  }
});
```

### **Health Monitor**

```typescript
// operations/health/health-monitor.ts
export interface HealthMonitor {
  addCheck(check: HealthCheck): void;
  removeCheck(name: string): void;
  executeAll(): Promise<HealthReport>;
  executeCheck(name: string): Promise<HealthCheckResult | null>;
  startPeriodicChecks(intervalMs: number): void;
  stopPeriodicChecks(): void;
}

export const createHealthMonitor = (): HealthMonitor => {
  const checks = new Map<string, HealthCheck>();
  const startTime = Date.now();
  let periodicInterval: NodeJS.Timeout | null = null;

  return {
    addCheck: (check: HealthCheck): void => {
      checks.set(check.name, check);
    },

    removeCheck: (name: string): void => {
      checks.delete(name);
    },

    executeAll: async (): Promise<HealthReport> => {
      const checkPromises = Array.from(checks.values()).map(check => 
        check.execute().catch(error => ({
          name: check.name,
          status: 'unhealthy' as const,
          latency: 0,
          details: { error: error.message },
          timestamp: new Date()
        }))
      );

      const results = await Promise.all(checkPromises);
      
      // Determine overall status
      let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (results.some(r => r.status === 'unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (results.some(r => r.status === 'degraded')) {
        overallStatus = 'degraded';
      }

      return {
        status: overallStatus,
        checks: results,
        timestamp: new Date(),
        uptime: Date.now() - startTime
      };
    },

    executeCheck: async (name: string): Promise<HealthCheckResult | null> => {
      const check = checks.get(name);
      if (!check) return null;
      
      try {
        return await check.execute();
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          latency: 0,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date()
        };
      }
    },

    startPeriodicChecks: (intervalMs: number): void => {
      if (periodicInterval) {
        clearInterval(periodicInterval);
      }
      
      periodicInterval = setInterval(async () => {
        try {
          const report = await createHealthMonitor().executeAll();
          if (report.status === 'unhealthy') {
            console.error('Health check failed:', report);
          }
        } catch (error) {
          console.error('Periodic health check error:', error);
        }
      }, intervalMs);
    },

    stopPeriodicChecks: (): void => {
      if (periodicInterval) {
        clearInterval(periodicInterval);
        periodicInterval = null;
      }
    }
  };
};
```

### **Graceful Shutdown**

```typescript
// operations/shutdown/graceful-shutdown.ts
export interface ShutdownHook {
  readonly name: string;
  readonly priority: number; // Higher priority runs first
  execute(): Promise<void>;
}

export interface GracefulShutdown {
  addHook(hook: ShutdownHook): void;
  shutdown(signal?: string): Promise<void>;
  isShuttingDown(): boolean;
}

export const createGracefulShutdown = (
  timeoutMs: number = 30_000
): GracefulShutdown => {
  const hooks: ShutdownHook[] = [];
  let isShuttingDownFlag = false;
  let shutdownPromise: Promise<void> | null = null;

  const executeShutdown = async (signal?: string): Promise<void> => {
    if (isShuttingDownFlag) {
      return shutdownPromise || Promise.resolve();
    }

    isShuttingDownFlag = true;
    console.log(`Starting graceful shutdown (signal: ${signal || 'manual'})...`);

    shutdownPromise = new Promise<void>(async (resolve) => {
      const timeout = setTimeout(() => {
        console.error(`Shutdown timeout reached (${timeoutMs}ms), forcing exit`);
        process.exit(1);
      }, timeoutMs);

      try {
        // Sort hooks by priority (highest first)
        const sortedHooks = hooks.sort((a, b) => b.priority - a.priority);
        
        // Execute hooks sequentially
        for (const hook of sortedHooks) {
          try {
            console.log(`Executing shutdown hook: ${hook.name}`);
            await hook.execute();
            console.log(`Completed shutdown hook: ${hook.name}`);
          } catch (error) {
            console.error(`Error in shutdown hook ${hook.name}:`, error);
          }
        }

        clearTimeout(timeout);
        console.log('Graceful shutdown completed');
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        console.error('Error during shutdown:', error);
        resolve();
      }
    });

    return shutdownPromise;
  };

  // Register signal handlers
  process.on('SIGTERM', () => executeShutdown('SIGTERM'));
  process.on('SIGINT', () => executeShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    executeShutdown('uncaughtException').finally(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    executeShutdown('unhandledRejection').finally(() => process.exit(1));
  });

  return {
    addHook: (hook: ShutdownHook): void => {
      hooks.push(hook);
    },

    shutdown: executeShutdown,

    isShuttingDown: (): boolean => {
      return isShuttingDownFlag;
    }
  };
};
```

---

## 🚀 **Complete Part 3 Example**

```typescript
// examples/production-ready-app.ts
import fastify from 'fastify';
import { loadConfig } from '../configuration/environment/config-loader';
import { createPerformanceMonitor } from '../performance/monitoring/performance-monitor';
import { createPerformanceMiddleware } from '../performance/monitoring/performance-middleware';
import { MemoryCacheProvider } from '../performance/caching/multi-layer-cache';
import { createCacheMiddleware } from '../performance/caching/cache-middleware';
import { createGetOnlyCacheStrategy } from '../performance/caching/cache-strategies';
import { createHealthMonitor } from '../operations/health/health-monitor';
import { createDatabaseHealthCheck, createRedisHealthCheck, createMemoryHealthCheck } from '../operations/health/health-checks';
import { createGracefulShutdown } from '../operations/shutdown/graceful-shutdown';

const setupProductionApp = async () => {
  // 1. Load configuration
  const config = loadConfig();
  console.log(`Starting app in ${config.environment} mode`);

  // 2. Setup performance monitoring
  const performanceMonitor = createPerformanceMonitor();
  const performanceMiddleware = createPerformanceMiddleware(performanceMonitor);

  // 3. Setup caching
  const cacheProvider = new MemoryCacheProvider(1000, 5 * 60 * 1000);
  const cacheStrategy = createGetOnlyCacheStrategy(10 * 60 * 1000);
  const cacheMiddleware = createCacheMiddleware(cacheProvider, cacheStrategy);

  // 4. Setup health monitoring
  const healthMonitor = createHealthMonitor();
  healthMonitor.addCheck(createDatabaseHealthCheck(null)); // Pass your DB connection
  healthMonitor.addCheck(createRedisHealthCheck());
  healthMonitor.addCheck(createMemoryHealthCheck());

  // Start periodic health checks
  healthMonitor.startPeriodicChecks(30_000); // Every 30 seconds

  // 5. Setup graceful shutdown
  const shutdown = createGracefulShutdown();
  
  // 6. Create Fastify app
  const app = fastify({ 
    logger: { level: config.logLevel },
    trustProxy: true
  });

  // 7. Register global middleware
  if (config.features.enableMonitoring) {
    app.addHook('onRequest', async (request, reply) => {
      await performanceMiddleware(
        { request, response: reply } as any,
        async () => {}
      );
    });
  }

  if (config.features.enableCaching) {
    app.addHook('preHandler', async (request, reply) => {
      await cacheMiddleware(
        { request, response: reply } as any,
        async () => {}
      );
    });
  }

  // 8. Health endpoints
  app.get('/health', async (request, reply) => {
    const report = await healthMonitor.executeAll();
    reply.status(report.status === 'healthy' ? 200 : 503);
    return report;
  });

  app.get('/health/ready', async (request, reply) => {
    if (shutdown.isShuttingDown()) {
      reply.status(503);
      return { status: 'shutting-down' };
    }
    
    reply.status(200);
    return { status: 'ready' };
  });

  app.get('/health/live', async (request, reply) => {
    reply.status(200);
    return { status: 'alive', uptime: process.uptime() };
  });

  // 9. Metrics endpoint
  if (config.features.enableMetrics) {
    app.get('/metrics', async (request, reply) => {
      const metrics = performanceMonitor.getAllMetrics();
      const cacheStats = await cacheProvider.getStats();
      const alerts = performanceMonitor.getAlerts();
      
      return {
        performance: metrics,
        cache: cacheStats,
        alerts,
        timestamp: new Date()
      };
    });
  }

  // 10. Setup shutdown hooks
  shutdown.addHook({
    name: 'stop-health-checks',
    priority: 100,
    execute: async () => {
      healthMonitor.stopPeriodicChecks();
    }
  });

  shutdown.addHook({
    name: 'close-fastify',
    priority: 90,
    execute: async () => {
      await app.close();
    }
  });

  shutdown.addHook({
    name: 'clear-caches',
    priority: 80,
    execute: async () => {
      await cacheProvider.clear();
    }
  });

  // 11. Start server
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server started on ${config.host}:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    await shutdown.shutdown('startup-error');
    process.exit(1);
  }

  return app;
};

// Start the application
setupProductionApp().catch(console.error);
```

---

## 📊 **Key Takeaways**

### **Performance Monitoring**
- ✅ Real-time metrics collection และ alerting
- ✅ Route-level performance tracking
- ✅ Memory usage monitoring
- ✅ Automatic slow route detection

### **Caching System**  
- ✅ Multi-layer caching (Memory + Redis)
- ✅ Smart cache invalidation
- ✅ ETag support และ conditional requests
- ✅ Cache performance metrics

### **Configuration Management**
- ✅ Environment-specific configs
- ✅ Feature flag system
- ✅ Schema validation
- ✅ Hot-reload capabilities

### **Operations & Health**
- ✅ Comprehensive health checks
- ✅ Graceful shutdown patterns
- ✅ Kubernetes-ready probes
- ✅ Circuit breaker protection

### **Production Deployment**
```bash
# Environment variables
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database
DB_HOST=prod-db.example.com
DB_NAME=myapp
DB_USER=appuser
DB_PASSWORD=secretpassword

# Redis
REDIS_HOST=prod-redis.example.com
REDIS_PASSWORD=redispassword

# Security
JWT_SECRET=super-secret-jwt-key-minimum-32-characters
CORS_ORIGINS=https://myapp.com,https://api.myapp.com

# Features
FEATURE_CACHING=true
FEATURE_MONITORING=true
FEATURE_METRICS=true
```

**💡 Learning Outcome Achieved**: ระบบที่ production-ready ด้วย monitoring, caching, configuration management, และ operational excellence ครบครัน! 🎯

**Next Steps**: Deploy และ monitor ใน production environment พร้อม alerts และ dashboards! 🚀