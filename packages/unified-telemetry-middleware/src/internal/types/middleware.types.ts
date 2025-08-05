/**
 * Internal type definitions for telemetry middleware
 */

import type { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetrySpan, 
  UnifiedTelemetryLogger 
} from '@inh-lib/unified-telemetry-core';

/**
 * Trace context extracted from headers
 */
export interface InternalTraceContext {
  traceId: string;
  spanId: string;
  sampled: boolean;
  parentSpanId?: string;
  traceState?: string;
  format: 'w3c' | 'b3' | 'custom' | 'none';
}

/**
 * Resource measurement for performance tracking
 */
export interface InternalResourceMeasurement {
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
}

/**
 * Telemetry metrics configuration
 */
export interface InternalTelemetryMetricsConfig {
  enableRequestCounter: boolean;
  enableDurationHistogram: boolean;
  enableMemoryHistogram: boolean;
  enableCpuHistogram: boolean;
  enableSystemMetrics: boolean;
}

/**
 * Telemetry span configuration
 */
export interface InternalTelemetrySpanConfig {
  enableTracing: boolean;
  enableAutoSpanEvents: boolean;
  spanNamePrefix: string;
  operationNamePrefix: string;
}

/**
 * Telemetry middleware configuration
 */
export interface InternalTelemetryMiddlewareConfig {
  metrics: InternalTelemetryMetricsConfig;
  spans: InternalTelemetrySpanConfig;
  enableResourceTracking: boolean;
  enableTraceExtraction: boolean;
  enableCorrelationId: boolean;
  enableSystemMetrics: boolean;
  enableRegistryCleanup: boolean;
  customAttributes?: Record<string, string | number | boolean>;
}

/**
 * HTTP request context for telemetry
 */
export interface InternalHttpRequestContext {
  method: string;
  route: string;
  url: string;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  correlationId?: string;
  requestId?: string;
}

/**
 * Performance tracking data stored in registry
 */
export interface InternalPerformanceTrackingData {
  span: UnifiedTelemetrySpan;
  logger: UnifiedTelemetryLogger;
  startTime: number;
  startMemory: InternalResourceMeasurement;
  traceContext: InternalTraceContext;
  requestContext: InternalHttpRequestContext;
}

/**
 * Metrics labels for different metric types
 */
export interface InternalMetricsLabels {
  http_requests: {
    method: string;
    route: string;
    status_code: string;
  };
  http_duration: {
    method: string;
    route: string;
    status_code: string;
  };
  http_memory: {
    method: string;
    route: string;
    status_code: string;
  };
  http_cpu: {
    method: string;
    route: string;
    status_code: string;
  };
  system: {
    service: string;
    instance: string;
  };
}

/**
 * Telemetry provider dependencies
 */
export interface InternalTelemetryDependencies {
  provider: UnifiedTelemetryProvider;
  config: InternalTelemetryMiddlewareConfig;
}