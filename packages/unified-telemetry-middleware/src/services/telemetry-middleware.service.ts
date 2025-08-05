/**
 * Main telemetry middleware service
 * This is the primary service class for creating unified telemetry middleware
 */

import type { UnifiedMiddleware, UnifiedHttpContext } from '@inh-lib/unified-route';
import type { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import type { 
  InternalTelemetryMiddlewareConfig,
  InternalTelemetryDependencies,
} from '../internal/types/middleware.types';
import { createTelemetryExtractorAdapter } from '../internal/adapters/telemetry-extractor.adapter';
import { createMetricsCollector, getDefaultMetricsConfig, createHttpMetricsLabels, createSystemMetricsLabels } from '../internal/logic/metrics-collector.logic';
import { createResourceTracker, createSystemMetricsMonitor } from '../internal/logic/resource-tracker.logic';
import { 
  storePerformanceData,
  getPerformanceData,
  updateRequestContextWithResponse,
  getStatusCodeFromContext,
  cleanupTelemetryData,
  extractHttpRequestContext,
} from '../internal/utils/context.utils';
import { calculateDurationSeconds } from '../internal/utils/performance.utils';

/**
 * Configuration for telemetry middleware
 */
export interface TelemetryMiddlewareConfig {
  /** Service name for telemetry */
  serviceName: string;
  /** Service version for telemetry */
  serviceVersion?: string;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Enable distributed tracing */
  enableTracing?: boolean;
  /** Enable resource tracking (CPU/Memory) */
  enableResourceTracking?: boolean;
  /** Enable trace extraction from headers */
  enableTraceExtraction?: boolean;
  /** Enable correlation ID generation */
  enableCorrelationId?: boolean;
  /** Enable system metrics monitoring */
  enableSystemMetrics?: boolean;
  /** System metrics update interval in milliseconds */
  systemMetricsInterval?: number;
  /** Enable cleanup of registry after request (default: true) */
  enableRegistryCleanup?: boolean;
  /** Custom attributes to add to all spans */
  customAttributes?: Record<string, string | number | boolean>;
}

/**
 * Main service class for creating telemetry middleware
 */
export class TelemetryMiddlewareService {
  private readonly config: InternalTelemetryMiddlewareConfig;
  private readonly dependencies: InternalTelemetryDependencies;
  private readonly extractor: ReturnType<typeof createTelemetryExtractorAdapter>;
  private readonly metricsCollector: ReturnType<typeof createMetricsCollector>;
  private readonly resourceTracker: ReturnType<typeof createResourceTracker>;
  private readonly systemMetricsMonitor: ReturnType<typeof createSystemMetricsMonitor>;

  constructor(
    provider: UnifiedTelemetryProvider,
    config: TelemetryMiddlewareConfig
  ) {
    this.config = this.createInternalConfig(config);
    this.dependencies = {
      provider,
      config: this.config,
    };

    this.extractor = createTelemetryExtractorAdapter(this.dependencies);
    this.metricsCollector = createMetricsCollector(provider.metrics, this.config.metrics);
    this.resourceTracker = createResourceTracker();
    this.systemMetricsMonitor = createSystemMetricsMonitor(config.systemMetricsInterval);

    if (this.config.enableSystemMetrics) {
      this.startSystemMetricsMonitoring(config.serviceName);
    }
  }

  /**
   * Create telemetry middleware for unified-route
   */
  createMiddleware(): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      // Setup telemetry at request start
      const performanceData = this.extractor.extractAndSetupTelemetry(context);
      storePerformanceData(context, performanceData);

      // Log request start
      performanceData.logger.info('HTTP request started', {
        method: performanceData.requestContext.method,
        route: performanceData.requestContext.route,
        url: performanceData.requestContext.url,
        traceId: performanceData.traceContext.traceId,
        spanId: performanceData.traceContext.spanId,
        requestId: performanceData.requestContext.requestId,
        correlationId: performanceData.requestContext.correlationId,
      });

      let statusCode = 200;
      let error: Error | null = null;

      try {
        // Execute next middleware/handler
        await next();
        
        // Try to extract status code from context
        statusCode = this.extractStatusCodeFromContext(context);
        
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        statusCode = 500;
        
        // Record exception in span and log
        performanceData.span.recordException(error);
        performanceData.span.setStatus({ 
          code: 'error', 
          message: error.message 
        });
        
        performanceData.logger.error('Request failed with exception', error, {
          errorType: error.constructor.name,
          errorMessage: error.message,
        });
        
        throw error;
      } finally {
        // Finalize telemetry at request end
        await this.finalizeTelemetry(context, statusCode);
      }
    };
  }

  /**
   * Create system telemetry that runs independently
   */
  createSystemTelemetry(serviceName: string): {
    start: () => void;
    stop: () => void;
  } {
    return {
      start: () => this.startSystemMetricsMonitoring(serviceName),
      stop: () => this.systemMetricsMonitor.stop(),
    };
  }

  /**
   * Get trace headers for outgoing requests
   */
  getTraceHeaders(context: UnifiedHttpContext): Record<string, string> {
    const performanceData = getPerformanceData(context);
    if (performanceData instanceof Error) {
      return {};
    }

    return this.extractor.injectTraceHeaders(performanceData.traceContext);
  }

  /**
   * Manual telemetry recording for custom operations
   */
  recordCustomMetrics(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
    memoryBytes?: number,
    cpuSeconds?: number
  ): void {
    const labels = createHttpMetricsLabels(method, route, statusCode);
    
    this.metricsCollector.recordHttpRequest(labels);
    this.metricsCollector.recordHttpDuration(durationSeconds, labels);
    
    if (memoryBytes !== undefined) {
      this.metricsCollector.recordHttpMemoryUsage(memoryBytes, labels);
    }
    
    if (cpuSeconds !== undefined) {
      this.metricsCollector.recordHttpCpuUsage(cpuSeconds, labels);
    }
  }

  /**
   * Shutdown telemetry service
   */
  async shutdown(): Promise<void> {
    this.systemMetricsMonitor.stop();
    await this.dependencies.provider.shutdown();
  }

  // Private methods implemented as utility functions

  private createInternalConfig(config: TelemetryMiddlewareConfig): InternalTelemetryMiddlewareConfig {
    return {
      metrics: {
        enableRequestCounter: config.enableMetrics ?? true,
        enableDurationHistogram: config.enableMetrics ?? true,
        enableMemoryHistogram: config.enableResourceTracking ?? true,
        enableCpuHistogram: config.enableResourceTracking ?? true,
        enableSystemMetrics: config.enableSystemMetrics ?? true,
      },
      spans: {
        enableTracing: config.enableTracing ?? true,
        enableAutoSpanEvents: true,
        spanNamePrefix: 'http',
        operationNamePrefix: 'http_request',
      },
      enableResourceTracking: config.enableResourceTracking ?? true,
      enableTraceExtraction: config.enableTraceExtraction ?? true,
      enableCorrelationId: config.enableCorrelationId ?? true,
      enableSystemMetrics: config.enableSystemMetrics ?? true,
      enableRegistryCleanup: config.enableRegistryCleanup ?? true,
      customAttributes: config.customAttributes,
    };
  }

  private extractStatusCodeFromContext(context: UnifiedHttpContext): number {
    // Try to get status code from response context
    // This is a simplified implementation - in production you might need
    // to integrate more deeply with your HTTP framework
    return getStatusCodeFromContext(context) || 200;
  }

  private async finalizeTelemetry(context: UnifiedHttpContext, statusCode: number): Promise<void> {
    const performanceData = getPerformanceData(context);
    if (performanceData instanceof Error) {
      return;
    }

    // Update request context with final status
    updateRequestContextWithResponse(context, statusCode);
    performanceData.requestContext.statusCode = statusCode;

    // Calculate final metrics
    const durationSeconds = calculateDurationSeconds(performanceData.startTime);
    let memoryUsageBytes = 0;
    let cpuTimeSeconds = 0;

    if (this.config.enableResourceTracking) {
      const resourceResult = this.resourceTracker.stopTracking(performanceData.startMemory);
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

    this.metricsCollector.recordHttpRequest(labels);
    this.metricsCollector.recordHttpDuration(durationSeconds, labels);

    if (this.config.enableResourceTracking) {
      this.metricsCollector.recordHttpMemoryUsage(memoryUsageBytes, labels);
      this.metricsCollector.recordHttpCpuUsage(cpuTimeSeconds, labels);
    }

    // Log request completion
    performanceData.logger.info('HTTP request completed', {
      statusCode,
      durationSeconds: durationSeconds.toFixed(3),
      memoryUsageBytes,
      cpuTimeMs: (cpuTimeSeconds * 1000).toFixed(2),
    });

    // Finish span and cleanup
    performanceData.logger.finishSpan();
    if (this.config.enableRegistryCleanup) {
      cleanupTelemetryData(context);
    }
  }

  private startSystemMetricsMonitoring(serviceName: string): void {
    if (!this.config.enableSystemMetrics) return;

    this.systemMetricsMonitor.start();

    // Update system metrics periodically
    const updateSystemMetrics = () => {
      const systemMetrics = this.systemMetricsMonitor.getCurrentMetrics();
      const labels = createSystemMetricsLabels(serviceName);
      
      this.metricsCollector.recordSystemMetrics(
        systemMetrics.memoryUsagePercent,
        systemMetrics.cpuUsagePercent,
        labels
      );
    };

    // Initial update
    updateSystemMetrics();
  }
}