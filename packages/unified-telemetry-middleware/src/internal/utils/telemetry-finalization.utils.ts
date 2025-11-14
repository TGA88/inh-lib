/**
 * Telemetry finalization utilities
 * ✅ Utility functions for finalizing telemetry data and cleanup
 * ✅ Replaces private methods in service classes
 */

import { getRegistryItem, type UnifiedHttpContext } from '@inh-lib/unified-route';
import { 
  getPerformanceData,
  updateRequestContextWithResponse,
  cleanupTelemetryData
} from './context.utils';
import { calculateDurationSeconds } from './performance.utils';
import { createHttpMetricsLabels } from './service-config.utils';
import type { 
  InternalTelemetryMiddlewareConfig
} from '../types/middleware.types';
import { INTERNAL_REGISTRY_KEYS } from '../constants/telemetry.const';

/**
 * Resource tracker interface (replaces any type)
 */
interface InternalResourceTracker {
  stopTracking(startMemory: unknown): {
    memoryUsageBytes: number;
    cpuTimeSeconds: number;
    durationMs: number;
  };
}

/**
 * Metrics collector interface (replaces any type) 
 */
interface InternalMetricsCollector {
  recordHttpRequest(labels: Record<string, string | number>): void;
  recordHttpDuration(durationSeconds: number, labels: Record<string, string | number>): void;
  recordHttpMemoryUsage(memoryUsageBytes: number, labels: Record<string, string | number>): void;
  recordHttpCpuUsage(cpuTimeSeconds: number, labels: Record<string, string | number>): void;
  recordSystemMetrics(memoryPercent: number, cpuPercent: number, labels: Record<string, string>): void;
}

/**
 * System metrics monitor interface (replaces any type)
 */
interface InternalSystemMetricsMonitor {
  start(): void;
  getCurrentMetrics(): {
    memoryUsagePercent: number;
    cpuUsagePercent: number;
  };
}

/**
 * Finalize telemetry data and cleanup
 * ✅ Utility function (not private method)
 */
export async function finalizeTelemetryForRequest(
  context: UnifiedHttpContext,
  statusCode: number,
  config: InternalTelemetryMiddlewareConfig,
  resourceTracker: InternalResourceTracker,
  metricsCollector: InternalMetricsCollector,
  contextScope: "API_CONTEXT" | "BUSINESS_LOGIC_CONTEXT"
): Promise<void> {
  const performanceData = getPerformanceData(context);
  if (performanceData instanceof Error) {
    return;
  }

  // Update request context with final status
  updateRequestContextWithResponse(context, statusCode);
  performanceData.requestContext.statusCode = statusCode;

  // set root span Status based on Http statusCode
  performanceData.span.setStatus({
    code: statusCode >= 400 ? 'error' : 'ok', 
    message: `HTTP ${statusCode}`
  });

//   get Route info from context
  const routeInfo = getRegistryItem<{method: string; route: string; url: string}>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_ROUTE_INFO);

if (!routeInfo || routeInfo instanceof Error) {
    performanceData.logger.warn('Route info not found in context registry, using default values');
} else {
    performanceData.requestContext.route = routeInfo.route;
    performanceData.requestContext.method = routeInfo.method;
    performanceData.requestContext.url = routeInfo.url;
}

  // Calculate final metrics
  const durationSeconds = calculateDurationSeconds(performanceData.startTime);
  let memoryUsageBytes = 0;
  let cpuTimeSeconds = 0;

  if (config.enableResourceTracking) {
    const resourceResult = resourceTracker.stopTracking(performanceData.startMemory);
    memoryUsageBytes = resourceResult.memoryUsageBytes;
    cpuTimeSeconds = resourceResult.cpuTimeSeconds;

    // Add resource metrics to span
    performanceData.span.setTag('request.duration_ms', resourceResult.durationMs);
    performanceData.span.setTag('request.memory_usage_bytes', memoryUsageBytes);
    performanceData.span.setTag('request.cpu_time_ms', cpuTimeSeconds * 1000);
  }

  // Set final span attributes
  performanceData.span.setTag('http.status_code', statusCode);
  performanceData.span.setTag('request.duration_seconds', durationSeconds);

  // Record metrics
  const labels = createHttpMetricsLabels(
    performanceData.requestContext.method,
    performanceData.requestContext.route,
    statusCode
  );

  if (contextScope === "API_CONTEXT") {
    metricsCollector.recordHttpRequest(labels);
    metricsCollector.recordHttpDuration(durationSeconds, labels);
    if (config.enableResourceTracking) {
      metricsCollector.recordHttpMemoryUsage(memoryUsageBytes, labels);
      metricsCollector.recordHttpCpuUsage(cpuTimeSeconds, labels);
    }
      // Log request completion
  performanceData.logger.info('API_LOGIC is completed', {
    statusCode,
    durationSeconds: durationSeconds.toFixed(3),
    memoryUsageBytes,
    cpuTimeMs: (cpuTimeSeconds * 1000).toFixed(2),
  });
  }
  else {
    // Log business logic completion
    performanceData.logger.info('BUSINESS_LOGIC is completed', {
      statusCode,
      durationSeconds: durationSeconds.toFixed(3),
      memoryUsageBytes,
      cpuTimeMs: (cpuTimeSeconds * 1000).toFixed(2),
    });
  }




  // Finish span and cleanup
  performanceData.logger.finishSpan();
  if (config.enableRegistryCleanup) {
    cleanupTelemetryData(context);
  }
}

/**
 * Start system metrics monitoring
 * ✅ Utility function (not private method)
 */
export function startSystemMetricsMonitoring(
  config: InternalTelemetryMiddlewareConfig,
  serviceName: string,
  systemMetricsMonitor: InternalSystemMetricsMonitor,
  metricsCollector: InternalMetricsCollector
): void {
  if (!config.enableSystemMetrics) return;

  systemMetricsMonitor.start();

  // Update system metrics periodically
  const updateSystemMetrics = () => {
    const systemMetrics = systemMetricsMonitor.getCurrentMetrics();
    const labels = { service: serviceName, type: 'system' as const };
    
    metricsCollector.recordSystemMetrics(
      systemMetrics.memoryUsagePercent,
      systemMetrics.cpuUsagePercent,
      labels
    );
  };

  // Start periodic updates (every 30 seconds)
  setInterval(updateSystemMetrics, 30000);
}
