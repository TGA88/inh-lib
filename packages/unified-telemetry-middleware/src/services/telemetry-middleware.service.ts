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
import { createMetricsCollector } from '../internal/logic/metrics-collector.logic';
import { createResourceTracker, createSystemMetricsMonitor } from '../internal/logic/resource-tracker.logic';
import { 
  storePerformanceData,
  getPerformanceData,
  updateRequestContextWithRouteInfo,
} from '../internal/utils/context.utils';

import { 
  pushSpanToStack, 
  popSpanFromStack, 
  getCurrentSpan,
  getCurrentSpanLevel 
} from '../internal/utils/span-context.utils';
import { 
  executeSpanExtractionStrategy,
  createChildSpanWithoutContext
} from '../internal/logic/span-extraction.logic';
import {
  createInternalTelemetryConfig,
  extractTelemetryStatusCode,
  createHttpMetricsLabels,
  getOperationMetadataFromSpan
} from '../internal/utils/service-config.utils';
import {
  finalizeTelemetryForRequest,
  startSystemMetricsMonitoring
} from '../internal/utils/telemetry-finalization.utils';
import type { GetActiveSpanOptions } from '../internal/types/span-extraction.types';
import { INTERNAL_REGISTRY_KEYS } from '../internal/constants/telemetry.const';

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
 * it must be singleton and initialized once per application
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
    this.config = createInternalTelemetryConfig(config);
    this.dependencies = {
      provider,
      config: this.config,
    };

    this.extractor = createTelemetryExtractorAdapter(this.dependencies);
    this.metricsCollector = createMetricsCollector(provider.metrics, this.config.metrics);
    this.resourceTracker = createResourceTracker();
    this.systemMetricsMonitor = createSystemMetricsMonitor(config.systemMetricsInterval);

    if (this.config.enableSystemMetrics) {
      // Initialize system metrics monitoring
        startSystemMetricsMonitoring(
          this.config,
          config.serviceName,
          this.systemMetricsMonitor,
          this.metricsCollector
        );
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
      performanceData.logger.info('Unified Request started', {
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
        // Execute middleware chain
        await next();

        // Extract final status code
        statusCode = extractTelemetryStatusCode(context);

        // Finalize telemetry data
        await finalizeTelemetryForRequest(
          context,
          statusCode,
          this.config,
          this.resourceTracker,
          this.metricsCollector
        );
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        statusCode = 500;
        
        // Record exception in span and log
        performanceData.span.recordException(error);
        performanceData.span.setStatus({ 
          code: 'error', 
          message: error.message 
        });
        
        performanceData.logger.error('Unified Request failed with exception', error, {
          errorType: error.constructor.name,
          errorMessage: error.message,
        });
        
        throw error;
      } finally {
        // Finalize telemetry at request end
        await finalizeTelemetryForRequest(
          context,
          statusCode,
          this.config,
          this.resourceTracker,
          this.metricsCollector
        );
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
      start: () => startSystemMetricsMonitoring(
        this.config,
        serviceName,
        this.systemMetricsMonitor,
        this.metricsCollector
      ),
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
    const metadata = getOperationMetadataFromSpan();
    
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
   * Get active span without requiring UnifiedHttpContext
   * Useful for framework-specific hooks and standalone operations
   * 
   * Strategy: Active Span → Extract from Headers → Create Fallback
   */

  /**
   * Get active span without requiring UnifiedHttpContext
   * Useful for framework-specific hooks and standalone operations
   * 
   * Strategy: Active Span → Extract from Headers → Create Fallback
   */
  getActiveSpanWithoutUnifiedContext(
    headers?: Record<string, string>,
    fallbackOptions?: GetActiveSpanOptions
  ): UnifiedTelemetrySpan | null {
    
    const extractionResult = executeSpanExtractionStrategy(
      headers,
      this.dependencies.provider,
      this.config,
      fallbackOptions
    );

    return extractionResult ? extractionResult.span : null;
  }

  /**
   * Create child span without requiring UnifiedHttpContext
   * Useful for framework-specific hooks where UnifiedHttpContext is not available
   */
  createChildSpanWithoutUnifiedContext(
    parentSpanOrHeaders: UnifiedTelemetrySpan | { headers: Record<string, string> },
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
    
    return createChildSpanWithoutContext(
      parentSpanOrHeaders,
      operationName,
      this.dependencies.provider,
      this.config,
      options
    );
  }



  /**
   * create TraceContext and Usage Request snapshot and keep it's in UnifiedHttpContext
   * Extract TraceContext format W3C and then B3 then if not found create new span W3C format and store it in UnifiedHttpContext
   * 
   */
  createRootSpan(context: UnifiedHttpContext) : UnifiedHttpContext {
    // Setup telemetry at request start
    const performanceData = this.extractor.extractAndSetupTelemetry(context);
    storePerformanceData(context, performanceData);

      // Log request start
      performanceData.logger.info('Root Span is Created', {
        method: performanceData.requestContext.method,
        route: performanceData.requestContext.route,
        url: performanceData.requestContext.url,
        traceId: performanceData.traceContext.traceId,
        spanId: performanceData.traceContext.spanId,
        requestId: performanceData.requestContext.requestId,
        correlationId: performanceData.requestContext.correlationId,
      });
    return context; 
    };

  /**
   * 
   * cleanup UnifiedHttpContext after request end and record performance data metrics
   * 
   */
  async finalizeRootSpan(context: UnifiedHttpContext,statusCode?: number): Promise<void> {
    await finalizeTelemetryForRequest(
      context,
      statusCode ?? extractTelemetryStatusCode(context),
      this.config,
      this.resourceTracker,
      this.metricsCollector
    );
  };

  /**
   * 
   * update Route info in UnifiedHttpContext for Lifecycle that routeInfo is available
   * like Fastify hooks route path is available at preHandler hook
   * 
   */
  async updateRouteInfo(context: UnifiedHttpContext,method:string,route:string,url:string): Promise<UnifiedHttpContext> {
    updateRequestContextWithRouteInfo(context,method,route,url)
    return context;
  };
  
}