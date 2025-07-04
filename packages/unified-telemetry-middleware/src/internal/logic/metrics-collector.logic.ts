// src/internal/logic/metric-collector.logic.ts
/**
 * Metrics collection logic for telemetry data
 */

import type { 
  UnifiedTelemetryMetrics, 
  UnifiedTelemetryCounter, 
  UnifiedTelemetryHistogram, 
  UnifiedTelemetryGauge 
} from '@inh-lib/unified-telemetry-core';
import type { InternalMetricsLabels, InternalTelemetryMetricsConfig } from '../types/middleware.types';
import { INTERNAL_METRICS_NAMES, INTERNAL_METRICS_DESCRIPTIONS } from '../constants/telemetry.const';

/**
 * Metrics collector for telemetry middleware
 */
export function createMetricsCollector(
  metricsProvider: UnifiedTelemetryMetrics,
  config: InternalTelemetryMetricsConfig
) {
  const metrics = initializeMetrics(metricsProvider, config);
  
  return {
    recordHttpRequest,
    recordHttpDuration,
    recordHttpMemoryUsage,
    recordHttpCpuUsage,
    recordSystemMetrics,
    getMetrics: () => metrics,
  };

  /**
   * Record HTTP request counter
   */
  function recordHttpRequest(labels: InternalMetricsLabels['http_requests']): void {
    if (!config.enableRequestCounter || !metrics.httpRequestsTotal) return;
    
    metrics.httpRequestsTotal.add(1, {
      method: labels.method,
      route: labels.route,
      status_code: labels.status_code,
    });
  }

  /**
   * Record HTTP request duration
   */
  function recordHttpDuration(
    durationSeconds: number,
    labels: InternalMetricsLabels['http_duration']
  ): void {
    if (!config.enableDurationHistogram || !metrics.httpRequestDuration) return;
    
    metrics.httpRequestDuration.record(durationSeconds, {
      method: labels.method,
      route: labels.route,
      status_code: labels.status_code,
    });
  }

  /**
   * Record HTTP request memory usage
   */
  function recordHttpMemoryUsage(
    memoryBytes: number,
    labels: InternalMetricsLabels['http_memory']
  ): void {
    if (!config.enableMemoryHistogram || !metrics.httpRequestMemory) return;
    
    metrics.httpRequestMemory.record(memoryBytes, {
      method: labels.method,
      route: labels.route,
      status_code: labels.status_code,
    });
  }

  /**
   * Record HTTP request CPU usage
   */
  function recordHttpCpuUsage(
    cpuSeconds: number,
    labels: InternalMetricsLabels['http_cpu']
  ): void {
    if (!config.enableCpuHistogram || !metrics.httpRequestCpu) return;
    
    metrics.httpRequestCpu.record(cpuSeconds, {
      method: labels.method,
      route: labels.route,
      status_code: labels.status_code,
    });
  }

  /**
   * Record system metrics
   */
  function recordSystemMetrics(
    memoryPercent: number,
    cpuPercent: number,
    labels: InternalMetricsLabels['system']
  ): void {
    if (!config.enableSystemMetrics) return;
    
    if (metrics.systemMemoryUsage) {
      metrics.systemMemoryUsage.set(memoryPercent, {
        service: labels.service,
        instance: labels.instance,
      });
    }
    
    if (metrics.systemCpuUsage) {
      metrics.systemCpuUsage.set(cpuPercent, {
        service: labels.service,
        instance: labels.instance,
      });
    }
  }
}

/**
 * Initialize all metrics based on configuration
 */
export function initializeMetrics(
  metricsProvider: UnifiedTelemetryMetrics,
  config: InternalTelemetryMetricsConfig
): {
  httpRequestsTotal?: UnifiedTelemetryCounter;
  httpRequestDuration?: UnifiedTelemetryHistogram;
  httpRequestMemory?: UnifiedTelemetryHistogram;
  httpRequestCpu?: UnifiedTelemetryHistogram;
  systemMemoryUsage?: UnifiedTelemetryGauge;
  systemCpuUsage?: UnifiedTelemetryGauge;
} {
  const metrics: ReturnType<typeof initializeMetrics> = {};

  if (config.enableRequestCounter) {
    metrics.httpRequestsTotal = metricsProvider.createCounter(
      INTERNAL_METRICS_NAMES.HTTP_REQUESTS_TOTAL,
      INTERNAL_METRICS_DESCRIPTIONS[INTERNAL_METRICS_NAMES.HTTP_REQUESTS_TOTAL]
    );
  }

  if (config.enableDurationHistogram) {
    metrics.httpRequestDuration = metricsProvider.createHistogram(
      INTERNAL_METRICS_NAMES.HTTP_REQUEST_DURATION_SECONDS,
      INTERNAL_METRICS_DESCRIPTIONS[INTERNAL_METRICS_NAMES.HTTP_REQUEST_DURATION_SECONDS]
    );
  }

  if (config.enableMemoryHistogram) {
    metrics.httpRequestMemory = metricsProvider.createHistogram(
      INTERNAL_METRICS_NAMES.HTTP_REQUEST_MEMORY_USAGE_BYTES,
      INTERNAL_METRICS_DESCRIPTIONS[INTERNAL_METRICS_NAMES.HTTP_REQUEST_MEMORY_USAGE_BYTES]
    );
  }

  if (config.enableCpuHistogram) {
    metrics.httpRequestCpu = metricsProvider.createHistogram(
      INTERNAL_METRICS_NAMES.HTTP_REQUEST_CPU_TIME_SECONDS,
      INTERNAL_METRICS_DESCRIPTIONS[INTERNAL_METRICS_NAMES.HTTP_REQUEST_CPU_TIME_SECONDS]
    );
  }

  if (config.enableSystemMetrics) {
    metrics.systemMemoryUsage = metricsProvider.createGauge(
      INTERNAL_METRICS_NAMES.MEMORY_USAGE_PERCENT,
      INTERNAL_METRICS_DESCRIPTIONS[INTERNAL_METRICS_NAMES.MEMORY_USAGE_PERCENT]
    );

    metrics.systemCpuUsage = metricsProvider.createGauge(
      INTERNAL_METRICS_NAMES.CPU_USAGE_PERCENT,
      INTERNAL_METRICS_DESCRIPTIONS[INTERNAL_METRICS_NAMES.CPU_USAGE_PERCENT]
    );
  }

  return metrics;
}

/**
 * Create metrics labels from request context
 */
export function createHttpMetricsLabels(
  method: string,
  route: string,
  statusCode: number
): InternalMetricsLabels['http_requests'] {
  return {
    method: normalizeHttpMethod(method),
    route: normalizeRoute(route),
    status_code: statusCode.toString(),
  };
}

/**
 * Create system metrics labels
 */
export function createSystemMetricsLabels(
  serviceName: string,
  instanceId?: string
): InternalMetricsLabels['system'] {
  return {
    service: serviceName,
    instance: instanceId || getDefaultInstanceId(),
  };
}

/**
 * Normalize HTTP method for metrics
 */
export function normalizeHttpMethod(method: string): string {
  const normalized = method.toUpperCase();
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  return validMethods.includes(normalized) ? normalized : 'OTHER';
}

/**
 * Normalize route for metrics (remove sensitive data)
 */
export function normalizeRoute(route: string): string {
  if (!route || route === '') return 'unknown';
  
  // Limit length and remove query parameters
  let normalized = route.split('?')[0];
  
  // Truncate very long routes
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100) + '...';
  }
  
  return normalized;
}

/**
 * Get default instance ID
 */
export function getDefaultInstanceId(hostName?:string): string {
  return hostName|| 
         `instance_${process.pid}`;
}

/**
 * Validate metrics configuration
 */
export function validateMetricsConfig(config: InternalTelemetryMetricsConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof config.enableRequestCounter !== 'boolean') {
    errors.push('enableRequestCounter must be a boolean');
  }

  if (typeof config.enableDurationHistogram !== 'boolean') {
    errors.push('enableDurationHistogram must be a boolean');
  }

  if (typeof config.enableMemoryHistogram !== 'boolean') {
    errors.push('enableMemoryHistogram must be a boolean');
  }

  if (typeof config.enableCpuHistogram !== 'boolean') {
    errors.push('enableCpuHistogram must be a boolean');
  }

  if (typeof config.enableSystemMetrics !== 'boolean') {
    errors.push('enableSystemMetrics must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default metrics configuration
 */
export function getDefaultMetricsConfig(): InternalTelemetryMetricsConfig {
  return {
    enableRequestCounter: true,
    enableDurationHistogram: true,
    enableMemoryHistogram: true,
    enableCpuHistogram: true,
    enableSystemMetrics: true,
  };
}