//
/**
 * Telemetry extraction adapter for unified middleware
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import type { 
  UnifiedTelemetryProvider,
  UnifiedTelemetrySpan,
  UnifiedTelemetryLogger,
} from '@inh-lib/unified-telemetry-core';
import type { 
  InternalTelemetryDependencies,
  InternalTraceContext,
  InternalHttpRequestContext,
  InternalPerformanceTrackingData,
  InternalResourceMeasurement,
} from '../types/middleware.types';
import { TELEMETRY_LAYERS, TELEMETRY_OPERATION_TYPES, TELEMETRY_SPAN_KINDS } from '../../constants/telemetry-middleware.const';
import { INTERNAL_DEFAULTS } from '../constants/telemetry.const';
import { 
  extractTraceContextFromHeaders,
  generateW3CTraceparent,
  generateB3Headers,
} from '../logic/trace-extractor.logic';
import { 
  extractHttpRequestContext,
  generateRequestId,
  generateCorrelationId,
} from '../utils/context.utils';
import { startTracking } from '../logic/resource-tracker.logic';

/**
 * Adapter for extracting and setting up telemetry context
 */
export function createTelemetryExtractorAdapter(dependencies: InternalTelemetryDependencies) {
  const { provider, config } = dependencies;

  return {
    extractAndSetupTelemetry,
    injectTraceHeaders,
    createSpanFromContext,
    createLoggerFromSpan,
  };

  /**
   * Extract trace context and setup telemetry for a request
   */
  function extractAndSetupTelemetry(context: UnifiedHttpContext): InternalPerformanceTrackingData {
    try {
      // Extract trace context from headers
      const traceContext = config.enableTraceExtraction 
        ? extractTraceContextFromHeaders(context)
        : { traceId: '', spanId: '', sampled: false, format: 'none' as const };

      // Extract HTTP request context
      const requestContext = extractHttpRequestContext(context);

      // Generate IDs if missing
      if (!requestContext.requestId) {
        requestContext.requestId = generateRequestId();
      }
      if (!requestContext.correlationId && config.enableCorrelationId) {
        requestContext.correlationId = generateCorrelationId();
      }

      // Create span
      const span = createSpanFromContext(requestContext, traceContext);

      // Create logger
      const logger = createLoggerFromSpan(span, requestContext);

      // Start resource tracking
      const startMemory = config.enableResourceTracking 
        ? startTracking()
        : createEmptyResourceMeasurement();

      const performanceData: InternalPerformanceTrackingData = {
        span,
        logger,
        startTime: Date.now(),
        startMemory,
        traceContext,
        requestContext,
      };

      return performanceData;
    } catch (error) {
      // If telemetry setup fails, create minimal working data to prevent middleware breaking
      console.warn('Failed to setup telemetry:', error);
      
      const fallbackRequestContext = extractHttpRequestContext(context);
      if (!fallbackRequestContext.requestId) {
        fallbackRequestContext.requestId = generateRequestId();
      }
      
      return {
        span: createNoOpSpan(),
        logger: createNoOpLogger(),
        startTime: Date.now(),
        startMemory: createEmptyResourceMeasurement(),
        traceContext: { traceId: '', spanId: '', sampled: false, format: 'none' as const },
        requestContext: fallbackRequestContext,
      };
    }
  }

  /**
   * Inject trace headers into outgoing requests
   */
  function injectTraceHeaders(traceContext: InternalTraceContext): Record<string, string> {
    const headers: Record<string, string> = {};

    if (traceContext.format === 'w3c' && traceContext.traceId) {
      headers['traceparent'] = generateW3CTraceparent(traceContext);
      if (traceContext.traceState) {
        headers['tracestate'] = traceContext.traceState;
      }
    } else if (traceContext.format === 'b3' && traceContext.traceId) {
      Object.assign(headers, generateB3Headers(traceContext));
    }

    return headers;
  }

  /**
   * Create telemetry span from request context
   */
  function createSpanFromContext(
    requestContext: InternalHttpRequestContext,
    traceContext: InternalTraceContext
  ): UnifiedTelemetrySpan {
    if (!config.spans.enableTracing) {
      return createNoOpSpan();
    }

    try {
      const spanName = createSpanName(requestContext);
      const spanAttributes = createSpanAttributes(requestContext, traceContext);

      const span = provider.tracer.startSpan(spanName, {
        kind: TELEMETRY_SPAN_KINDS.SERVER,
        attributes: spanAttributes,
      });

      // Set trace context attributes
      if (traceContext.traceId) {
        span.setTag('trace.id', traceContext.traceId);
      }
      if (traceContext.spanId) {
        span.setTag('span.id', traceContext.spanId);
      }
      if (traceContext.parentSpanId) {
        span.setTag('span.parent_id', traceContext.parentSpanId);
      }

      return span;
    } catch (error) {
      // If span creation fails, return no-op span to prevent middleware from breaking
      console.warn('Failed to create telemetry span:', error);
      return createNoOpSpan();
    }
  }

  /**
   * Create telemetry logger from span
   */
  function createLoggerFromSpan(
    span: UnifiedTelemetrySpan,
    requestContext: InternalHttpRequestContext
  ): UnifiedTelemetryLogger {
    const operationName = createOperationName(requestContext);

    return provider.logger.getLogger({
      span,
      options: {
        operationType: TELEMETRY_OPERATION_TYPES.HTTP,
        operationName,
        layer: TELEMETRY_LAYERS.HTTP,
        autoAddSpanEvents: config.spans.enableAutoSpanEvents,
        attributes: config.customAttributes || {},
      },
    });
  }
}

/**
 * Create span name from request context
 */
export function createSpanName(requestContext: InternalHttpRequestContext): string {
  const prefix = INTERNAL_DEFAULTS.SPAN_NAME_PREFIX;
  const method = requestContext.method || INTERNAL_DEFAULTS.DEFAULT_METHOD;
  const route = requestContext.route || INTERNAL_DEFAULTS.DEFAULT_ROUTE;
  
  return `${prefix} ${method} ${route}`;
}

/**
 * Create operation name from request context
 */
export function createOperationName(requestContext: InternalHttpRequestContext): string {
  const prefix = INTERNAL_DEFAULTS.OPERATION_NAME_PREFIX;
  const method = requestContext.method || INTERNAL_DEFAULTS.DEFAULT_METHOD;
  const route = requestContext.route || INTERNAL_DEFAULTS.DEFAULT_ROUTE;
  
  return `${prefix}_${method.toLowerCase()}_${route.replace(/[/:]/g, '_')}`;
}

/**
 * Create span attributes from request context
 */
export function createSpanAttributes(
  requestContext: InternalHttpRequestContext,
  traceContext: InternalTraceContext
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    'http.method': requestContext.method,
    'http.url': requestContext.url,
    'http.route': requestContext.route,
  };

  if (requestContext.userAgent) {
    attributes['http.user_agent'] = requestContext.userAgent;
  }

  if (requestContext.ip) {
    attributes['http.client_ip'] = requestContext.ip;
  }

  if (requestContext.userId) {
    attributes['user.id'] = requestContext.userId;
  }

  if (requestContext.requestId) {
    attributes['request.id'] = requestContext.requestId;
  }

  if (requestContext.correlationId) {
    attributes['request.correlation_id'] = requestContext.correlationId;
  }

  if (traceContext.format !== 'none') {
    attributes['trace.format'] = traceContext.format;
    attributes['trace.sampled'] = traceContext.sampled;
  }

  return attributes;
}

/**
 * Create a no-op span when tracing is disabled
 */
export function createNoOpSpan(): UnifiedTelemetrySpan {
  return {
    setTag: () => ({ setTag: () => createNoOpSpan(), setStatus: () => createNoOpSpan(), recordException: () => createNoOpSpan(), addEvent: () => createNoOpSpan(), finish: () => { /* no-op */ }, getTraceId: () => '', getSpanId: () => '', getStartTime: () => new Date() }),
    setStatus: () => createNoOpSpan(),
    recordException: () => createNoOpSpan(),
    addEvent: () => createNoOpSpan(),
    finish: () => {
      // No-op implementation for disabled tracing
    },
    getTraceId: () => '',
    getSpanId: () => '',
    getStartTime: () => new Date(),
  };
}

/**
 * Create a no-op logger when logging is disabled
 */
export function createNoOpLogger(): UnifiedTelemetryLogger {
  const noopFunction = () => {
    // No-op implementation
  };
  return {
    debug: noopFunction,
    info: noopFunction,
    warn: noopFunction,
    error: noopFunction,
    addSpanEvent: noopFunction,
    setSpanAttribute: noopFunction,
    finishSpan: noopFunction,
  };
}

/**
 * Create empty resource measurement when tracking is disabled
 */
export function createEmptyResourceMeasurement(): InternalResourceMeasurement {
  return {
    timestamp: 0,
    memory: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    },
    cpu: {
      user: 0,
      system: 0,
    },
  };
}