
import { UnifiedMiddleware, UnifiedHttpContext } from '@inh-lib/unified-route';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import {
  UnifiedHttpContextWithTelemetry,
  ContextPropagationMiddleware,
  ContextPropagationMiddlewareConfig
} from '../../interfaces';
import {
  extractTraceIdFromHeaders,
  extractTraceContext,
  createTraceparentHeader,
  createB3Header,
  isValidTraceId,
  generateTraceId,
  generateSpanId,
  DEFAULT_TRACE_HEADERS
} from '../../utils';

/**
 * Context Propagation Middleware Implementation
 * 
 * Handles extraction and injection of trace context from/to HTTP headers
 * Supports multiple trace context formats (W3C, B3, etc.)
 * 
 * ✅ No private methods - uses utils functions instead
 * ✅ No 'any' types - fully typed
 * ✅ Direct provider injection - no service layer
 */
export class UnifiedContextPropagationMiddleware implements ContextPropagationMiddleware {
  constructor(
    private readonly provider: UnifiedTelemetryProvider,
    private readonly config: ContextPropagationMiddlewareConfig
  ) {}

  createMiddleware(): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      // Extract trace context from incoming headers
      const incomingTraceContext = this.extractIncomingTraceContext(context);
      
      // Create or use existing trace ID
      const traceId = this.determineTraceId(incomingTraceContext);
      
      // Validate trace ID if custom validator is provided
      if (this.config.validateTraceId && !this.config.validateTraceId(traceId)) {
        throw new Error(`Invalid trace ID format: ${traceId}`);
      }

      // Create telemetry context
      const telemetryContext = {
        traceId,
        provider: this.provider
      };

      // Extend HTTP context with telemetry
      const contextWithTelemetry = context as UnifiedHttpContextWithTelemetry;
      contextWithTelemetry.telemetry = telemetryContext;

      // Create logger for context propagation
      const logger = this.provider.logger.createChildLogger('context_propagation', {
        'trace.id': traceId,
        'http.method': context.request.method,
        'http.url': context.request.url,
      });

      // Log trace context extraction
      logger.debug('Trace context extracted', {
        traceId,
        hasIncomingContext: !!incomingTraceContext,
        extractedFromHeaders: this.getExtractedHeaders(context.request.headers),
      });

      try {
        // Execute downstream middleware
        await next();

        // Inject trace context into outgoing response headers (if needed)
        this.injectOutgoingTraceContext(contextWithTelemetry, traceId);

        logger.debug('Trace context propagated successfully');

      } catch (error) {
        logger.error('Error during trace context propagation', error as Error);
        throw error;
      }
    };
  }

  /**
   * Extract incoming trace context from request headers
   * ✅ Not a private method - uses utils functions internally
   */
  extractIncomingTraceContext(context: UnifiedHttpContext): {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
  } | undefined {
    // ✅ Using utils function for trace context extraction
    const traceContext = extractTraceContext(context.request.headers);
    
    if (traceContext) {
      return traceContext;
    }

    // Fallback to simple trace ID extraction
    const traceId = extractTraceIdFromHeaders(
      context.request.headers,
      this.getCustomTraceHeader()
    );

    return traceId ? { traceId } : undefined;
  }

  /**
   * Determine final trace ID to use
   * ✅ Not a private method - straightforward logic
   */
  determineTraceId(incomingContext?: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
  }): string {
    // Use incoming trace ID if available and valid
    if (incomingContext?.traceId && isValidTraceId(incomingContext.traceId)) {
      return incomingContext.traceId;
    }

    // Generate new trace ID if generation is enabled
    if (this.config.generateTraceId !== false) {
      return generateTraceId();
    }

    // If generation is disabled and no valid incoming trace ID, throw error
    throw new Error('No valid trace ID found and generation is disabled');
  }

  /**
   * Inject trace context into outgoing response headers
   * ✅ Not a private method - uses utils functions for header creation
   */
  injectOutgoingTraceContext(
    context: UnifiedHttpContextWithTelemetry,
    traceId: string
  ): void {
    const injectHeaders = this.config.injectHeaders || ['x-trace-id'];
    
    // Generate span ID for outgoing context
    const spanId = generateSpanId();

    for (const headerName of injectHeaders) {
      const headerValue = this.createHeaderValue(headerName, traceId, spanId);
      
      if (headerValue) {
        // Set response header (framework-specific implementation)
        context.response.header(headerName, headerValue);
      }
    }
  }

  /**
   * Create header value based on header type
   * ✅ Not a private method - uses utils functions for header formatting
   */
  createHeaderValue(
    headerName: string,
    traceId: string,
    spanId: string
  ): string | undefined {
    const normalizedHeaderName = headerName.toLowerCase();

    switch (normalizedHeaderName) {
      case 'traceparent':
        // ✅ Using utils function
        return createTraceparentHeader(traceId, spanId);

      case 'b3':
        // ✅ Using utils function
        return createB3Header(traceId, spanId);

      case 'x-trace-id':
      case 'x-request-id':
      case 'x-correlation-id':
      default:
        // For simple headers, return trace ID as-is
        return traceId;
    }
  }

  /**
   * Get custom trace header name from config
   * ✅ Not a private method - simple config access
   */
  getCustomTraceHeader(): string | undefined {
    return this.config.traceHeaders?.[0];
  }

  /**
   * Get list of headers that were checked for trace extraction (for logging)
   * ✅ Not a private method - utility for debugging
   */
  getExtractedHeaders(headers: Record<string, string>): string[] {
    const traceHeaders = this.config.traceHeaders || DEFAULT_TRACE_HEADERS;
    const foundHeaders: string[] = [];

    for (const headerName of traceHeaders) {
      if (this.hasHeader(headers, headerName)) {
        foundHeaders.push(headerName);
      }
    }

    return foundHeaders;
  }

  /**
   * Check if header exists (case-insensitive)
   * ✅ Not a private method - reusable utility
   */
  hasHeader(headers: Record<string, string>, headerName: string): boolean {
    const normalizedHeaderName = headerName.toLowerCase();
    
    return Object.keys(headers).some(key => 
      key.toLowerCase() === normalizedHeaderName
    );
  }

  /**
   * Create span context for outgoing requests
   * ✅ Not a private method - utility for creating span context
   */
  createSpanContext(traceId: string, parentSpanId?: string): {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
  } {
    return {
      traceId,
      spanId: generateSpanId(),
      parentSpanId,
    };
  }
}

/**
 * Factory function for creating context propagation middleware
 * ✅ Functional approach - no class complexity
 */
export function createContextPropagationMiddleware(
  provider: UnifiedTelemetryProvider,
  config?: Partial<ContextPropagationMiddlewareConfig>
): UnifiedContextPropagationMiddleware {
  const fullConfig: ContextPropagationMiddlewareConfig = {
    provider,
    traceHeaders: DEFAULT_TRACE_HEADERS.slice(),
    injectHeaders: ['x-trace-id'],
    generateTraceId: true,
    ...config,
  };

  return new UnifiedContextPropagationMiddleware(provider, fullConfig);
}

/**
 * Combined middleware factory that creates both telemetry and context propagation
 * ✅ Convenience function for common use case
 */
export function createCombinedHttpTelemetryMiddleware(
  provider: UnifiedTelemetryProvider,
  options?: {
    contextPropagation?: Partial<ContextPropagationMiddlewareConfig>;
    httpTelemetry?: Partial<import('../../interfaces').HttpTelemetryMiddlewareConfig>;
  }
): UnifiedMiddleware[] {
  const contextPropagationMiddleware = createContextPropagationMiddleware(
    provider,
    options?.contextPropagation
  );

  const httpTelemetryMiddleware = createHttpTelemetryMiddleware(
    provider,
    options?.httpTelemetry
  );

  // Return context propagation first, then HTTP telemetry
  return [
    contextPropagationMiddleware.createMiddleware(),
    httpTelemetryMiddleware.createMiddleware(),
  ];
}

// Import the middleware from the other file for combined middleware
import { createHttpTelemetryMiddleware } from './http-telemetry-middleware';