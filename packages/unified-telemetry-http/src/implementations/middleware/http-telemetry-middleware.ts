
import { UnifiedMiddleware, UnifiedHttpContext } from '@inh-lib/unified-route';
import { UnifiedTelemetryProvider, UnifiedTelemetrySpan } from '@inh-lib/unified-telemetry-core';
import {
  UnifiedHttpContextWithTelemetry,
  HttpTelemetryMiddleware,
  HttpTelemetryMiddlewareConfig,
  HttpTelemetryMetadata,
  HTTP_OPERATION_TYPE,
  MIDDLEWARE_PHASE
} from '../../interfaces';
import {
  createHttpTelemetryContext,
  createHttpTelemetryLogger,
  createHttpSpan,
  extractHttpTelemetryMetadata,
  updateHttpTelemetryMetadataWithResponse,
  createHttpSpanAttributes,
  shouldExcludeUrl,
  isHttpRequestSuccessful,
  getHttpStatusCategory
} from '../../utils';

/**
 * Fixed HTTP Telemetry Middleware Implementation
 * 
 * ✅ ใช้ telemetry context ที่มีอยู่แล้วจาก context propagation middleware
 * ✅ สร้าง telemetry context ใหม่ถ้าไม่มี (standalone usage)
 * ✅ เพิ่ม HTTP-specific telemetry บน context ที่มีอยู่
 * ✅ ส่งต่อ enriched context ให้ business handlers
 */
export class UnifiedHttpTelemetryMiddleware implements HttpTelemetryMiddleware {
  constructor(
    private readonly provider: UnifiedTelemetryProvider,
    private readonly config: HttpTelemetryMiddlewareConfig
  ) {}

  createMiddleware(): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      // Check if URL should be excluded from telemetry
      if (shouldExcludeUrl(context.request.url, this.config.options?.excludeUrls)) {
        await next();
        return;
      }

      // ✅ Check if telemetry context already exists (from context propagation middleware)
      const contextWithTelemetry = context as UnifiedHttpContextWithTelemetry;
      const existingTelemetry = contextWithTelemetry.telemetry;

      let telemetryContext: { traceId: string; provider: UnifiedTelemetryProvider };

      if (existingTelemetry) {
        // ✅ Use existing telemetry context from context propagation middleware
        telemetryContext = existingTelemetry;
        console.log('🔗 Using existing telemetry context from context propagation:', {
          traceId: existingTelemetry.traceId
        });
      } else {
        // ✅ Create new telemetry context (standalone usage)
        telemetryContext = createHttpTelemetryContext(
          this.provider,
          context,
          this.config.options
        );
        
        // Attach to context for downstream usage
        contextWithTelemetry.telemetry = telemetryContext;
        
        console.log('🆕 Created new telemetry context for HTTP middleware:', {
          traceId: telemetryContext.traceId
        });
      }

      // ✅ Create HTTP-specific logger using existing or new telemetry context
      const httpLogger = createHttpTelemetryLogger(
        telemetryContext.provider,
        telemetryContext.traceId,
        context
      );

      // ✅ Create root span if enabled
      let rootSpan: UnifiedTelemetrySpan | undefined;
      if (this.config.createRootSpan !== false) {
        const spanName = this.generateSpanName(context);
        rootSpan = createHttpSpan(
          telemetryContext.provider,
          telemetryContext.traceId,
          context,
          spanName
        );

        // Attach span to logger for correlation
        httpLogger.attachSpan(rootSpan);
      }

      // ✅ Extract HTTP metadata
      const startTime = new Date();
      const metadata = extractHttpTelemetryMetadata(context, startTime);

      // ✅ Log request start
      httpLogger.info('HTTP request started', {
        phase: MIDDLEWARE_PHASE.BEFORE,
        operation: HTTP_OPERATION_TYPE.REQUEST,
        method: metadata.method,
        url: metadata.url,
        userAgent: metadata.userAgent,
        clientIp: metadata.ip,
        contentLength: metadata.contentLength,
        usingExistingTelemetry: !!existingTelemetry,
      });

      // ✅ Record request metrics
      this.recordRequestMetrics(telemetryContext.provider, metadata);

      try {
        // ✅ Execute downstream middleware and handlers with enriched context
        await next();

        // ✅ Extract response information
        const responseMetadata = this.extractResponseInfo(contextWithTelemetry, metadata);

        // ✅ Update metadata with response info
        const updatedMetadata = updateHttpTelemetryMetadataWithResponse(
          metadata,
          responseMetadata.statusCode,
          responseMetadata.responseSize
        );

        // ✅ Update span with response attributes
        if (rootSpan) {
          const responseAttributes = createHttpSpanAttributes(updatedMetadata);
          
          Object.entries(responseAttributes).forEach(([key, value]) => {
            rootSpan.setTag(key, value);
          });

          // Set span status based on HTTP status
          if (isHttpRequestSuccessful(responseMetadata.statusCode)) {
            rootSpan.setStatus({ code: 'ok' });
          } else {
            rootSpan.setStatus({ 
              code: 'error', 
              message: `HTTP ${responseMetadata.statusCode}` 
            });
          }
        }

        // ✅ Log successful completion
        httpLogger.info('HTTP request completed successfully', {
          phase: MIDDLEWARE_PHASE.AFTER,
          operation: HTTP_OPERATION_TYPE.RESPONSE,
          statusCode: responseMetadata.statusCode,
          duration: updatedMetadata.duration,
          responseSize: responseMetadata.responseSize,
          statusCategory: getHttpStatusCategory(responseMetadata.statusCode),
        });

        // ✅ Record success metrics
        this.recordResponseMetrics(telemetryContext.provider, updatedMetadata, true);

      } catch (error) {
        const httpError = error as Error;

        // ✅ Update span with error
        if (rootSpan) {
          rootSpan.recordException(httpError);
          rootSpan.setStatus({ 
            code: 'error', 
            message: httpError.message 
          });
        }

        // ✅ Log error
        httpLogger.error('HTTP request failed', httpError, {
          phase: MIDDLEWARE_PHASE.ERROR,
          operation: HTTP_OPERATION_TYPE.ERROR,
          errorType: httpError.constructor.name,
          duration: Date.now() - startTime.getTime(),
        });

        // ✅ Record error metrics
        this.recordErrorMetrics(telemetryContext.provider, metadata, httpError);

        // Re-throw error to maintain middleware chain behavior
        throw error;

      } finally {
        // ✅ Finish span and logger
        if (rootSpan) {
          rootSpan.finish();
          httpLogger.finishSpan();
        }
      }
    };
  }

  /**
   * Generate span name for HTTP request
   * ✅ Not a private method - could be overridden by subclasses
   */
  generateSpanName(context: UnifiedHttpContext): string {
    if (this.config.spanNameGenerator) {
      return this.config.spanNameGenerator(context);
    }

    const method = context.request.method.toLowerCase();
    return `http.${method}`;
  }

  /**
   * Extract response information from context
   * ✅ Not a private method - uses utils functions internally
   */
  extractResponseInfo(
    context: UnifiedHttpContextWithTelemetry,
    metadata: HttpTelemetryMetadata
  ): { statusCode: number; responseSize?: number } {
    // Default status code - this would be set by the response handler
    const statusCode = 200;
    const responseSize = metadata.contentLength;

    // Try to extract from response if available
    // This is framework-specific implementation detail
    
    return { statusCode, responseSize };
  }

  /**
   * Record request metrics using provided telemetry provider
   * ✅ Not a private method - straightforward metrics recording
   */
  recordRequestMetrics(
    provider: UnifiedTelemetryProvider,
    metadata: HttpTelemetryMetadata
  ): void {
    const requestCounter = provider.metrics.createCounter(
      'http_requests_total',
      'Total number of HTTP requests'
    );

    requestCounter.add(1, {
      method: metadata.method,
      url: metadata.url,
    });

    if (metadata.contentLength !== undefined) {
      const requestSizeHistogram = provider.metrics.createHistogram(
        'http_request_size_bytes',
        'Size of HTTP requests in bytes'
      );

      requestSizeHistogram.record(metadata.contentLength, {
        method: metadata.method,
      });
    }
  }

  /**
   * Record response metrics using provided telemetry provider
   * ✅ Not a private method - straightforward metrics recording
   */
  recordResponseMetrics(
    provider: UnifiedTelemetryProvider,
    metadata: HttpTelemetryMetadata,
    success: boolean
  ): void {
    if (metadata.statusCode !== undefined) {
      const responseCounter = provider.metrics.createCounter(
        'http_responses_total',
        'Total number of HTTP responses'
      );

      responseCounter.add(1, {
        method: metadata.method,
        status_code: metadata.statusCode.toString(),
        status_category: getHttpStatusCategory(metadata.statusCode),
      });
    }

    if (metadata.duration !== undefined) {
      const durationHistogram = provider.metrics.createHistogram(
        'http_request_duration_ms',
        'Duration of HTTP requests in milliseconds'
      );

      durationHistogram.record(metadata.duration, {
        method: metadata.method,
        success: success.toString(),
      });
    }

    if (metadata.responseSize !== undefined) {
      const responseSizeHistogram = provider.metrics.createHistogram(
        'http_response_size_bytes',
        'Size of HTTP responses in bytes'
      );

      responseSizeHistogram.record(metadata.responseSize, {
        method: metadata.method,
      });
    }
  }

  /**
   * Record error metrics using provided telemetry provider
   * ✅ Not a private method - straightforward error metrics recording
   */
  recordErrorMetrics(
    provider: UnifiedTelemetryProvider,
    metadata: HttpTelemetryMetadata, 
    error: Error
  ): void {
    const errorCounter = provider.metrics.createCounter(
      'http_request_errors_total',
      'Total number of HTTP request errors'
    );

    errorCounter.add(1, {
      method: metadata.method,
      error_type: error.constructor.name,
    });
  }
}

/**
 * ✅ Factory function for creating HTTP telemetry middleware
 */
export function createHttpTelemetryMiddleware(
  provider: UnifiedTelemetryProvider,
  config?: Partial<HttpTelemetryMiddlewareConfig>
): UnifiedHttpTelemetryMiddleware {
  const fullConfig: HttpTelemetryMiddlewareConfig = {
    provider,
    createRootSpan: true,
    ...config,
  };

  return new UnifiedHttpTelemetryMiddleware(provider, fullConfig);
}
