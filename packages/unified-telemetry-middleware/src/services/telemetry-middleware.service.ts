/**
 * Main telemetry middleware service
 * This is the primary service class for creating unified telemetry middleware
 * 
 * NOTE: TypeScript errors have been mostly resolved by:
 * - Removing conflicting local type aliases
 * - Using inline union types matching the core package
 * - Proper variable type inference with const assertions
 * 
 * Remaining TypeScript warnings are related to strict type inference
 * and do not affect functionality.
 */

import type { UnifiedMiddleware, UnifiedHttpContext } from '@inh-lib/unified-route';
import type { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetrySpan, 
  UnifiedTelemetryLogger 
} from '@inh-lib/unified-telemetry-core';
import type { 
  InternalTelemetryMiddlewareConfig,
  InternalTelemetryDependencies,
} from '../internal/types/middleware.types';
import type { 
  TelemetryOperationType,
  TelemetryLayerType,
  TelemetryAttributes
} from '../internal/types/telemetry.types';
import { createTelemetryExtractorAdapter } from '../internal/adapters/telemetry-extractor.adapter';
import { createMetricsCollector, createHttpMetricsLabels, createSystemMetricsLabels } from '../internal/logic/metrics-collector.logic';
import { createResourceTracker, createSystemMetricsMonitor } from '../internal/logic/resource-tracker.logic';
import { 
  storePerformanceData,
  getPerformanceData,
  updateRequestContextWithResponse,
  getStatusCodeFromContext,
  cleanupTelemetryData,
} from '../internal/utils/context.utils';
import { calculateDurationSeconds } from '../internal/utils/performance.utils';
import { 
  pushSpanToStack, 
  popSpanFromStack, 
  getCurrentSpan,
  getCurrentSpanLevel 
} from '../internal/utils/span-context.utils';

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
  customAttributes?: TelemetryAttributes;
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

      let statusCode = 200; // Initialize with default status code
      let error: Error | null = null;

      try {
        // Execute next middleware/handler
        await next();
        
        // Extract status code from context (with fallback to 200)
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

  /**
   * Create child span for business logic steps
   */
  createChildSpan(
    context: UnifiedHttpContext,
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      attributes?: TelemetryAttributes;
    }
  ): { 
    span: UnifiedTelemetrySpan; 
    logger: UnifiedTelemetryLogger; 
    finish: () => void 
  } {
    // Get current active span (could be root or another child span)
    let parentSpan = getCurrentSpan(context);
    
    // If no current span, get root span from performance data
    if (!parentSpan) {
      const performanceData = getPerformanceData(context);
      if (performanceData instanceof Error) {
        throw new Error('No telemetry data found in context. Ensure telemetry middleware is applied first.');
      }
      parentSpan = performanceData.span;
      // Initialize span stack with root span
      pushSpanToStack(context, parentSpan, 'http_request');
    }

    // Create child span from current active span
    const opType = options?.operationType || 'business';
    const layerType = options?.layer || 'service';
    
    const childSpan = this.dependencies.provider.tracer.startSpan(operationName, {
      parent: parentSpan,
      kind: 'internal',
      attributes: {
        'operation.type': opType,
        'operation.layer': layerType,
        'operation.name': operationName,
        'span.level': getCurrentSpanLevel(context), // Track nesting level
        // Store metadata for logger creation
        'telemetry.operationType': opType,
        'telemetry.layer': layerType,
        ...options?.attributes,
        ...this.config.customAttributes,
      }
    });

    // Push new span to stack (becomes current active span)
    pushSpanToStack(context, childSpan, operationName);

    // Create logger for the new child span (always fresh logger for current span)
    const childLogger = this.dependencies.provider.logger.getLogger({
      span: childSpan,
      options: {
        operationType: opType,
        operationName: operationName,
        layer: layerType,
        autoAddSpanEvents: true,
      }
    });

    return {
      span: childSpan,
      logger: childLogger,
      finish: () => {
        // Finish the span and remove from stack
        childLogger.finishSpan();
        popSpanFromStack(context);
      }
    };
  }

  /**
   * Create business logic middleware for specific operations
   */
  createBusinessLogicMiddleware(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      const { span, logger, finish } = this.createChildSpan(context, operationName, {
        operationType: options?.operationType || 'business',
        layer: options?.layer || 'service',
        attributes: options?.attributes,
      });

      const startTime = process.hrtime.bigint();

      // Log operation start
      if (options?.logStart !== false) {
        logger.info(`${operationName} started`, {
          operationName,
          operationType: options?.operationType || 'business',
          layer: options?.layer || 'service',
        });
      }

      try {
        // Execute next middleware/handler
        await next();

        // Set success status
        span.setStatus({ code: 'ok' });

        // Log operation success
        if (options?.logEnd !== false) {
          const durationMs = Number(process.hrtime.bigint() - startTime) / 1000000;
          logger.info(`${operationName} completed successfully`, {
            durationMs: durationMs.toFixed(2),
          });
        }

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Record exception and set error status
        span.recordException(err);
        span.setStatus({ 
          code: 'error', 
          message: err.message 
        });

        // Log error
        logger.error(`${operationName} failed`, err, {
          errorType: err.constructor.name,
          errorMessage: err.message,
          operationName,
        });

        throw error;
      } finally {
        // Always finish the span
        finish();
      }
    };
  }

  /**
   * Create validation middleware with specific validation context
   */
  createValidationMiddleware(
    validationName: string,
    options?: {
      layer?: TelemetryLayerType;
      logValidationDetails?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    return this.createBusinessLogicMiddleware(`validation:${validationName}`, {
      operationType: 'utility',
      layer: options?.layer || 'service',
      logStart: options?.logValidationDetails !== false,
      logEnd: options?.logValidationDetails !== false,
      attributes: {
        'validation.name': validationName,
        'validation.type': 'middleware',
        ...options?.attributes,
      },
    });
  }

  /**
   * Get current span from context (for manual span operations)
   */
  getCurrentSpan(context: UnifiedHttpContext): UnifiedTelemetrySpan | null {
    const performanceData = getPerformanceData(context);
    if (performanceData instanceof Error) {
      return null;
    }
    return performanceData.span;
  }

  /**
   * Get current logger from context (creates new logger for current span)
   */
  getCurrentLogger(context: UnifiedHttpContext): UnifiedTelemetryLogger | null {
    const currentSpan = getCurrentSpan(context);
    if (!currentSpan) {
      // Fallback to root logger if no current span
      const performanceData = getPerformanceData(context);
      if (performanceData instanceof Error) {
        return null;
      }
      return performanceData.logger;
    }
    
    // Get operation metadata from current span
    const metadata = this.getOperationMetadataFromSpan(currentSpan);
    
    // Create fresh logger for current span
    return this.dependencies.provider.logger.getLogger({
      span: currentSpan,
      options: {
        operationType: metadata.operationType,
        operationName: metadata.operationName,
        layer: metadata.layer,
        autoAddSpanEvents: true,
      }
    });
  }

  /**
   * Get operation metadata from span attributes
   */
  private getOperationMetadataFromSpan(_span: UnifiedTelemetrySpan): {
    operationType: TelemetryOperationType;
    layer: TelemetryLayerType;
    operationName: string;
  } {
    // In a real implementation, you'd extract these from span attributes
    // For now, return defaults (could be enhanced based on span implementation)
    return {
      operationType: 'business',
      layer: 'service', 
      operationName: 'operation'
    };
  }
}