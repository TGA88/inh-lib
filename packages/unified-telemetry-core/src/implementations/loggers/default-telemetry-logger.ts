import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext, 
  UnifiedBaseTelemetryLogger,
  UnifiedTelemetrySpan 
} from '../../interfaces';
import {
  enrichLogAttributes,
  createChildLoggerContext,
  extractErrorInfo
} from '../../utils/logger-helpers';

/**
 * Default implementation of UnifiedTelemetryLogger
 * 
 * This implementation combines structured logging with distributed tracing,
 * providing correlation between logs and spans.
 * 
 * ✅ No private methods - uses utils functions instead
 * ✅ No 'any' types - fully typed
 */
export class DefaultUnifiedTelemetryLogger implements UnifiedTelemetryLogger {
  constructor(
    private readonly baseLogger: UnifiedBaseTelemetryLogger,
    private readonly context: UnifiedLoggerContext,
    private span?: UnifiedTelemetrySpan
  ) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('debug', message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('info', message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('warn', message, attributes);
    
    if (this.span) {
      this.span.addEvent('warning', { message, ...attributes });
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? extractErrorInfo(error) : {};
    const combinedAttrs = { ...errorAttrs, ...attributes };

    this.logWithSpan('error', message, combinedAttrs);
    
    if (this.span) {
      if (error) {
        this.span.recordException(error);
      }
      this.span.addEvent('error', { message, ...combinedAttrs });
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    if (this.span) {
      this.span.addEvent(name, attributes);
    }
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    if (this.span) {
      this.span.setTag(key, value);
    }
  }

  attachSpan(span: UnifiedTelemetrySpan): void {
    this.span = span;
  }

  finishSpan(): void {
    if (this.span) {
      this.span.finish();
    }
  }

  getSpanId(): string {
    return this.context.spanId;
  }

  getTraceId(): string {
    return this.context.traceId;
  }

  createChildLogger(
    operationName: string, 
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    // ✅ Using utils function instead of private method
    const childContext = createChildLoggerContext(this.context, operationName, attributes);
    return new DefaultUnifiedTelemetryLogger(this.baseLogger, childContext);
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    // ✅ Using utils function instead of private method
    return createChildLoggerContext(this.context, operationName);
  }

  /**
   * Log with span integration
   * ✅ Not a private method - could be used by subclasses if needed
   */
  logWithSpan(level: string, message: string, attributes?: Record<string, unknown>): void {
    // ✅ Using utils function for enriching attributes
    const enrichedAttrs = enrichLogAttributes(this.context, attributes);
    
    switch (level) {
      case 'debug':
        this.baseLogger.debug(message, enrichedAttrs);
        break;
      case 'info':
        this.baseLogger.info(message, enrichedAttrs);
        break;
      case 'warn':
        this.baseLogger.warn(message, enrichedAttrs);
        break;
      case 'error':
        this.baseLogger.error(message, enrichedAttrs);
        break;
    }

    // Add log event to span if available
    if (this.span) {
      this.span.addEvent(`log.${level}`, {
        message,
        ...(attributes as Record<string, string | number | boolean>),
      });
    }
  }
}