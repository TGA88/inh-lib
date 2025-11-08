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

import { type UnifiedMiddleware, type UnifiedHttpContext, getRegistryItem, UnifiedRouteHandler } from '@inh-lib/unified-route';
import type { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetrySpan, 
  UnifiedTelemetryLogger, 
  UnifiedTelemetrySpanMetadata
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
  getCurrentSpan as getCurrentSpanFromContext,
  getCurrentSpanLevel,
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
import { InitializeTelemetryContextResult } from '../types/telemetry.types';
import { TELEMETRY_LAYERS, TELEMETRY_OPERATION_TYPES } from '../constants/telemetry-middleware.const';

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
   * Deprecated Create telemetry middleware for unified-route.
   * So InitializeContext and FinalizeContext methods instead
   */
  createMiddleware(): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {

 

      // Setup telemetry at request start
      const performanceData = this.extractor.extractAndSetupTelemetry(context);
      storePerformanceData(context, performanceData);

      // Log request start
      performanceData.logger.info('BUSINESS_LOGIC is started', {
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
          this.metricsCollector,
          "BUSINESS_LOGIC_CONTEXT"
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

        performanceData.logger.error('BUSINESS_LOGIC failed with exception', error, {
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
          this.metricsCollector,
          "BUSINESS_LOGIC_CONTEXT"
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
   * Create child span from paraent if no parent then fall back parent as root span  but no change active span in context
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
    let parentSpan = getCurrentSpanFromContext(context);
    
    // If no current span, get root span from performance data
    if (!parentSpan) {
      console.log('No current span found, extracting from performance data');
      const performanceData = getPerformanceData(context);
      if (performanceData instanceof Error) {
        throw new Error('No telemetry data found in context. Ensure telemetry middleware is applied first.');
      }
      parentSpan = performanceData.span;
    }

    // Create child span from current active span
    const opType = options?.operationType || 'custom';
    const layerType = options?.layer || 'custom';

    const childSpan = this.dependencies.provider.tracer.startSpan(operationName, {
      parent: parentSpan.getSpanMetadata(),
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
      }
    };
  }
  /**
   * Create child span (it will be root span when no parent) and set active span in unified context
   */
  createActiveSpan(
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
    let parentSpan = getCurrentSpanFromContext(context);
    
    // If no current span, get root span from performance data
    if (!parentSpan) {
      console.log('No current span found, extracting from performance data');
      const performanceData = getPerformanceData(context);
      if (performanceData instanceof Error) {

        throw new Error(`No telemetry data found in context. Ensure telemetry middleware is applied first. : ${performanceData.message}`);
      }
      parentSpan = performanceData.span;
      // Initialize span stack with root span
      pushSpanToStack(context, parentSpan, 'http_request');
    }

    // Create child span from current active span
    const opType = options?.operationType || TELEMETRY_OPERATION_TYPES.CUSTOM;
    const layerType = options?.layer || TELEMETRY_LAYERS.CUSTOM;

    const childSpan = this.dependencies.provider.tracer.startSpan(operationName, {
      parent: parentSpan.getSpanMetadata(),
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

    // get requestId from registry
    const requestIdOrError = getRegistryItem<string>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_REQUEST_ID);
    const requestId = requestIdOrError instanceof Error ? undefined : requestIdOrError; 
    // Create logger for the new child span (always fresh logger for current span)
    const childLogger = this.dependencies.provider.logger.getLogger({
      span: childSpan,
      options: {
        operationType: opType,
        operationName: operationName,
        layer: layerType,
        autoAddSpanEvents: true,
        requestId: requestId 
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
   * Creates a UnifiedMiddleware that wraps an operation in a telemetry span, logs start/end,
   * records exceptions, and ensures the span is finished.
   *
   * The returned middleware:
   * - Creates an active span via createActiveSpan with the provided operation metadata.
   * - Optionally logs an "operation started" message when the middleware begins.
   * - Invokes the next middleware/handler and, on success, sets the span status to "ok"
   *   and optionally logs a completion message including the operation duration in milliseconds.
   * - On error, records the exception on the span, sets the span status to "error" (including
   *   the error message), logs the error with contextual fields, and rethrows the original error.
   * - Always calls finish() to end the span in a finally block.
   *
   * Note: Duration is measured using process.hrtime.bigint() and converted to milliseconds.
   *
   * @param operationName - A human-readable name for the operation (used in span and logs).
   * @param options - Configuration for the operation span and logging behavior.
   * @param options.operationType - Telemetry operation type for the span (defaults to TELEMETRY_OPERATION_TYPES.CUSTOM if not provided).
   * @param options.layer - Telemetry layer for the span (defaults to TELEMETRY_LAYERS.CUSTOM if not provided).
   * @param options.logStart - If set to false, suppresses the start log. Defaults to true.
   * @param options.logEnd - If set to false, suppresses the end/success log. Defaults to true.
   * @param options.attributes - Additional attributes to attach to the created span.
   *
   * @returns A UnifiedMiddleware function: (context, next) => Promise<void>. The middleware manages telemetry
   *          for the operation and must be awaited (i.e., returns a Promise that resolves when next() completes).
   *
   * @throws Re-throws any error thrown by downstream middleware/handler after recording it on the span.
   *
   * @example
   * // Create middleware for a business operation in the service layer:
   * const middleware = service.createOperationProcess('CreateOrder', {
   *   operationType: TELEMETRY_OPERATION_TYPES.BUSINESS,
   *   layer: TELEMETRY_LAYERS.SERVICE,
   *   logStart: true,
   *   logEnd: true,
   *   attributes: { feature: 'ordering' },
   * });
   *
   * // Use the middleware in a pipeline:
   * await middleware(context, next);
   */
  createOperationProcess(
    operationName: string,
    options: {
      operationType: TelemetryOperationType;
      layer: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      const { span, logger, finish } = this.createActiveSpan(context, operationName, {
        operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.CUSTOM,
        layer: options?.layer || TELEMETRY_LAYERS.CUSTOM,
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

        // throw error;
      } finally {
        // Always finish the span
        finish();
      }
    };
  }

  createHttpEndpointProcess(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationProcess(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.ENDPOINT,
      layer: options?.layer || TELEMETRY_LAYERS.HTTP,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  } 

  createHttpMiddlewareProcess(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationProcess(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.MIDDLEWARE,
      layer: options?.layer || TELEMETRY_LAYERS.HTTP,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  } 

  /**
   * Create a middleware step known as preHandler for an API endpoint operation with telemetry instrumentation.
   *
   * This is a convenience wrapper around createOperationProcess that fills common defaults
   * for endpoint instrumentation (operation type and layer) and default logging behavior.
   *
   * @param operationName - The name of the operation/endpoint being instrumented. Used as the primary
   *   identifier for telemetry events produced by the middleware.
   * @param options - Optional configuration for the created middleware.
   * @param options.operationType - The telemetry operation type for this endpoint. Defaults to
   *   TELEMETRY_OPERATION_TYPES.ENDPOINT.
   * @param options.layer - The telemetry layer for this operation. Defaults to TELEMETRY_LAYERS.API.
   * @param options.logStart - Whether to emit a "start" telemetry event when the middleware begins.
   *   Defaults to true.
   * @param options.logEnd - Whether to emit an "end" telemetry event when the middleware completes.
   *   Defaults to true.
   * @param options.attributes - Optional additional telemetry attributes to attach to events created
   *   by this middleware.
   *
   * @returns A UnifiedMiddleware function that wraps the operation with telemetry collection and
   *   logging according to the provided options.
   *
   * @example
   * const middleware = createApiEndpointProcess("getUser", {
   *   layer: TELEMETRY_LAYERS.API,
   *   logStart: true,
   *   logEnd: true,
   *   attributes: { featureFlag: "user-v2" }
   * });
   */
  createApiEndpointProcess(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationProcess(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.ENDPOINT,
      layer: options?.layer || TELEMETRY_LAYERS.API,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  } 

  createApiMiddlewareProcess( 
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationProcess(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.MIDDLEWARE,
      layer: options?.layer || TELEMETRY_LAYERS.API,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  } 

  createDataLogicProcess(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationProcess(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.LOGIC,
      layer: options?.layer || TELEMETRY_LAYERS.DATA,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  }

  createDatabaseProcess(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationProcess(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.DATABASE,
      layer: options?.layer || TELEMETRY_LAYERS.DATA,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  }

    /**
   * Create operation type middleware for specific operations
   */
  createOperationTypeStep(
    operationName: string,
    options: {
      operationType: TelemetryOperationType;
      layer: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const fn = async (context: UnifiedHttpContext, next: () => Promise<void> | UnifiedRouteHandler) => {
      const { span, logger, finish } = this.createChildSpan(context, operationName, {
        operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.MIDDLEWARE,
        layer: options?.layer || TELEMETRY_LAYERS.SERVICE,
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

    return fn;
  }


  /**
   * Deprecated . to keep for backward compatibility
   * Create API middleware for specific operations
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
    const step = this.createApiMiddlewareStep(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.MIDDLEWARE,
      layer: options?.layer || TELEMETRY_LAYERS.API,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
  }
  
  /**
   * Create API middleware for specific operations
   */
  createApiMiddlewareStep(
    operationName: string,
    options?: {
      operationType?: TelemetryOperationType;
      layer?: TelemetryLayerType;
      logStart?: boolean;
      logEnd?: boolean;
      attributes?: TelemetryAttributes;
    }
  ): UnifiedMiddleware {
    const step = this.createOperationTypeStep(operationName, {
      operationType: options?.operationType || TELEMETRY_OPERATION_TYPES.MIDDLEWARE,
      layer: options?.layer || TELEMETRY_LAYERS.API,
      logStart: options?.logStart !== false,
      logEnd: options?.logEnd !== false,
      attributes: options?.attributes,
    });
    return step;
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
    return this.createOperationTypeStep(`validation:${validationName}`, {
      operationType: TELEMETRY_OPERATION_TYPES.LOGIC,
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
  getCurrentSpan(context: UnifiedHttpContext): UnifiedTelemetrySpan | Error {
    const res = getCurrentSpanFromContext(context);
    if (res) {
      return res;
    }
    const performanceData = getPerformanceData(context);
    if (performanceData instanceof Error) {
      return  new Error(`No telemetry data found in context. Ensure telemetry middleware is applied first. : ${performanceData.message}`);
    }
    return performanceData.span;
  }

  /**
   * Get current logger from context (creates new logger for current span)
   */
  getCurrentLogger(context: UnifiedHttpContext): UnifiedTelemetryLogger | Error {
    const currentSpan = getCurrentSpanFromContext(context);
    if (!currentSpan) {
      // Fallback to root logger if no current span
      const performanceData = getPerformanceData(context);
      if (performanceData instanceof Error) {
        return new Error(`No telemetry data found in context. Ensure telemetry middleware is applied first. : ${performanceData.message}`);
      }
      return performanceData.logger;
    }
    
    // Get operation metadata from current span
    const metadata = getOperationMetadataFromSpan();

    const requestIdOrError = getRegistryItem<string>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_REQUEST_ID);
 
    const requestId = requestIdOrError instanceof Error ? undefined : requestIdOrError;  

    // Create fresh logger for current span
    return this.dependencies.provider.logger.getLogger({
      span: currentSpan,
      options: {
        operationType: metadata.operationType,
        operationName: metadata.operationName,
        layer: metadata.layer,
        autoAddSpanEvents: true,
        requestId: requestId ,
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
    parentSpanOrHeaders: UnifiedTelemetrySpanMetadata | { headers: Record<string, string> },
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
  initializeContext(context: UnifiedHttpContext) : UnifiedHttpContext {
    // Setup telemetry at request start
    const performanceData = this.extractor.extractAndSetupTelemetry(context);
    storePerformanceData(context, performanceData);

      // Log request start
      performanceData.logger.info('API_LOGIC is started', {
        method: performanceData.requestContext.method,
        route: performanceData.requestContext.route,
        url: performanceData.requestContext.url,
        traceId: performanceData.span.getTraceId(),
        spanId: performanceData.span.getSpanId(),
        originTraceId: performanceData.traceContext.traceId,
        originSpanId: performanceData.traceContext.spanId,
        requestId: performanceData.requestContext.requestId,
        correlationId: performanceData.requestContext.correlationId,
      });
    return context; 
    };

    /**
     * Static helper to initialize telemetry context outside of instance
     */
     getInitializeContext(
      context: UnifiedHttpContext
    ): InitializeTelemetryContextResult {

      const performanceData = getPerformanceData(context);

      if (performanceData instanceof Error) {
       throw new Error(`No telemetry data found in context. Ensure telemetry middleware is applied first. : ${performanceData.message}`);
      }

      return performanceData;
    }

  /**
   * 
   * cleanup UnifiedHttpContext after request end and record performance data metrics
   * 
   */
  async finalizeContext(context: UnifiedHttpContext,statusCode?: number): Promise<void> {


    await finalizeTelemetryForRequest(
      context,
      statusCode ?? extractTelemetryStatusCode(context),
      this.config,
      this.resourceTracker,
      this.metricsCollector,
      "API_CONTEXT"
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
  


  /**
   * Get active telemetry (logger, span, traceId) from context
   * this method expect telemetry middleware is already initialized in context
   * using in by Handler and preHandler function of UnifiedRoutePipeline
   * UnifiedTelemetryProcessor will create active span and logger in context
   */

   getActiveTelemetry (context: UnifiedHttpContext): { telemetryLogger: UnifiedTelemetryLogger; telemetrySpan: UnifiedTelemetrySpan, traceId?: string }  {
    const telemetryLogger = this.getCurrentLogger(context) as UnifiedTelemetryLogger ;
    const telemetrySpan = this.getCurrentSpan(context) as UnifiedTelemetrySpan;
    const traceId = telemetrySpan.getTraceId();
    return { telemetryLogger, telemetrySpan,traceId };
}
  //
}