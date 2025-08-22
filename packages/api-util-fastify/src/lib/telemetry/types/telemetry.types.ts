import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

export interface TelemetryPluginOptions {
  telemetryProvider: UnifiedTelemetryProvider;
  telemetryMiddleware?: TelemetryMiddlewareService;
  autoTracing?: boolean;
  serviceName?: string;
  skipRoutes?: string[];
  enableResourceTracking?: boolean;
  enableSystemMetrics?: boolean;
  systemMetricsInterval?: number;
}

export interface EnhancedUnifiedHttpContext extends UnifiedHttpContext {
  telemetry: UnifiedTelemetryProvider;
}

export interface TelemetryDecoratorOptions {
  provider: UnifiedTelemetryProvider;
  middlewareService?: TelemetryMiddlewareService;
  autoTracing: boolean;
  serviceName: string;
  skipRoutes: string[];
  enableResourceTracking: boolean;
  enableSystemMetrics: boolean;
  systemMetricsInterval: number;
}

export interface ResourceUsageSnapshot {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}

export interface RequestResourceMetrics {
  memoryDelta: number;
  cpuTimeMs: number;
  duration: number;
  heapUsed: number;
  heapTotal: number;
}

