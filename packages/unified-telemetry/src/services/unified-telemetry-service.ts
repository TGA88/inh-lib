// services/unified-telemetry-service.ts
import {
  UnifiedTelemetryProvider,
  UnifiedTelemetryConfig,
  UnifiedSpanKind,
  UnifiedSpanStatusCode,
  UnifiedLogLevel,
  UnifiedRequestTelemetryData,
  UnifiedResponseTelemetryData,
  UnifiedTelemetryContext,
} from '../types/unified-telemetry';
import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { UnifiedTelemetryMiddlewareOptions } from '../types/unified-telemetry-context';
import {
  extractRequestTelemetryData,
  extractResponseTelemetryData,
  getSpanStatusFromHttpStatus,
  generateSpanName,
  shouldSkipTelemetry,
  maskSensitiveData,
  getLogLevelFromStatusCode,
  createRequestLogMessage,
  createResponseLogMessage,
  createErrorLogMessage,
} from '../utils/telemetry.utils';

export class UnifiedTelemetryService {
  private readonly provider: UnifiedTelemetryProvider;
  private readonly config: UnifiedTelemetryConfig;

  constructor(provider: UnifiedTelemetryProvider, config: UnifiedTelemetryConfig) {
    this.provider = provider;
    this.config = config;
  }

  startRequestTelemetry(
    context: UnifiedHttpContext,
    options?: UnifiedTelemetryMiddlewareOptions
  ): UnifiedTelemetryContext | null {
    if (!this.config.tracing?.enabled || shouldSkipTelemetry(context, options)) {
      return null;
    }

    const spanName = generateSpanName(context.request.method, context.request.url);
    const span = this.provider.tracer.startSpan(spanName, {
      kind: UnifiedSpanKind.SERVER,
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion || 'unknown',
        'service.environment': this.config.environment || 'unknown',
      },
    });

    const traceId = this.extractTraceId(span);
    const spanId = this.extractSpanId(span);

    const requestData = extractRequestTelemetryData(context, traceId, spanId, options);
    
    // Set span attributes
    Object.entries(requestData.attributes).forEach(([key, value]) => {
      span.setTag(key, value);
    });

    // Log request start
    if (this.config.logging?.enabled) {
      this.provider.logger.info(
        createRequestLogMessage(requestData),
        this.createLogAttributes(requestData, options)
      );
    }

    // Record request metrics
    if (this.config.metrics?.enabled) {
      this.recordRequestMetrics(requestData);
    }

    return {
      request: requestData,
      span,
      logger: this.provider.logger,
      metrics: this.provider.metrics,
    };
  }

  finishRequestTelemetry(
    telemetryContext: UnifiedTelemetryContext,
    statusCode: number,
    options?: UnifiedTelemetryMiddlewareOptions
  ): void {
    const responseData = extractResponseTelemetryData(
      statusCode,
      telemetryContext.request.startTime,
      options
    );

    telemetryContext.response = responseData;

    // Update span with response data
    Object.entries(responseData.attributes).forEach(([key, value]) => {
      telemetryContext.span.setTag(key, value);
    });

    const spanStatus = getSpanStatusFromHttpStatus(statusCode);
    telemetryContext.span.setStatus({ code: spanStatus });

    // Log response completion
    if (this.config.logging?.enabled) {
      const logLevel = getLogLevelFromStatusCode(statusCode);
      const logMessage = createResponseLogMessage(telemetryContext.request, responseData);
      const logAttributes = this.createLogAttributes(telemetryContext.request, options, responseData);

      switch (logLevel) {
        case UnifiedLogLevel.ERROR:
          this.provider.logger.error(logMessage, logAttributes);
          break;
        case UnifiedLogLevel.WARN:
          this.provider.logger.warn(logMessage, logAttributes);
          break;
        default:
          this.provider.logger.info(logMessage, logAttributes);
      }
    }

    // Record response metrics
    if (this.config.metrics?.enabled) {
      this.recordResponseMetrics(telemetryContext.request, responseData);
    }

    telemetryContext.span.finish();
  }

  recordException(
    telemetryContext: UnifiedTelemetryContext,
    error: Error,
    options?: UnifiedTelemetryMiddlewareOptions
  ): void {
    // Record exception in span
    telemetryContext.span.recordException(error);
    telemetryContext.span.setStatus({
      code: UnifiedSpanStatusCode.ERROR,
      message: error.message,
    });

    // Log error
    if (this.config.logging?.enabled) {
      const logMessage = createErrorLogMessage(telemetryContext.request, error);
      const logAttributes = this.createLogAttributes(telemetryContext.request, options);
      logAttributes['error'] = error.message;
      logAttributes['stack'] = error.stack || '';

      this.provider.logger.error(logMessage, logAttributes);
    }

    // Record error metrics
    if (this.config.metrics?.enabled) {
      this.recordErrorMetrics(telemetryContext.request, error);
    }
  }

  addSpanEvent(
    telemetryContext: UnifiedTelemetryContext,
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    telemetryContext.span.addEvent(name, attributes);
  }

  setSpanAttribute(
    telemetryContext: UnifiedTelemetryContext,
    key: string,
    value: string | number | boolean
  ): void {
    telemetryContext.span.setTag(key, value);
  }

  async shutdown(): Promise<void> {
    await this.provider.shutdown();
  }

  // Utility methods that use the utils functions
  private extractTraceId(span: unknown): string {
    // This would be implementation specific
    // For now, generate a simple trace ID
    return this.generateId();
  }

  private extractSpanId(span: unknown): string {
    // This would be implementation specific
    // For now, generate a simple span ID
    return this.generateId();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  private createLogAttributes(
    requestData: UnifiedRequestTelemetryData,
    options?: UnifiedTelemetryMiddlewareOptions,
    responseData?: UnifiedResponseTelemetryData
  ): Record<string, unknown> {
    const attributes: Record<string, unknown> = {
      traceId: requestData.traceId,
      spanId: requestData.spanId,
      method: requestData.method,
      url: requestData.url,
      ip: requestData.ip,
      userAgent: requestData.userAgent,
    };

    if (responseData) {
      attributes['statusCode'] = responseData.statusCode;
      attributes['responseTime'] = responseData.responseTime;
    }

    // Mask sensitive data if needed
    if (options?.sensitiveDataMask) {
      return maskSensitiveData(attributes, options.sensitiveDataMask);
    }

    return attributes;
  }

  private recordRequestMetrics(requestData: UnifiedRequestTelemetryData): void {
    const requestCounter = this.provider.metrics.createCounter(
      'http_requests_total',
      'Total number of HTTP requests'
    );

    requestCounter.add(1, {
      method: requestData.method,
      service: this.config.serviceName,
    });
  }

  private recordResponseMetrics(
    requestData: UnifiedRequestTelemetryData,
    responseData: UnifiedResponseTelemetryData
  ): void {
    const responseCounter = this.provider.metrics.createCounter(
      'http_responses_total',
      'Total number of HTTP responses'
    );

    const durationHistogram = this.provider.metrics.createHistogram(
      'http_request_duration_ms',
      'HTTP request duration in milliseconds'
    );

    const commonAttributes = {
      method: requestData.method,
      status_code: responseData.statusCode.toString(),
      service: this.config.serviceName,
    };

    responseCounter.add(1, commonAttributes);
    durationHistogram.record(responseData.responseTime, commonAttributes);
  }

  private recordErrorMetrics(requestData: UnifiedRequestTelemetryData, error: Error): void {
    const errorCounter = this.provider.metrics.createCounter(
      'http_errors_total',
      'Total number of HTTP errors'
    );

    errorCounter.add(1, {
      method: requestData.method,
      error_type: error.constructor.name,
      service: this.config.serviceName,
    });
  }
}