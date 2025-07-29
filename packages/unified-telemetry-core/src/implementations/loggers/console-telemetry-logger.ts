import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext, 
  UnifiedTelemetrySpan 
} from '../../interfaces';
import {
  createChildLoggerContext,
  extractErrorInfo
} from '../../utils/logger-helpers';

/**
 * Console implementation of UnifiedTelemetryLogger
 * 
 * This implementation outputs telemetry data to the console,
 * useful for development and debugging purposes.
 * 
 * ✅ No private methods - uses utils functions instead
 * ✅ No 'any' types - fully typed
 */
export class ConsoleUnifiedTelemetryLogger implements UnifiedTelemetryLogger {
  constructor(
    private readonly context: UnifiedLoggerContext,
    private span?: UnifiedTelemetrySpan
  ) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.logToConsole('DEBUG', message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.logToConsole('INFO', message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.logToConsole('WARN', message, attributes);
    
    if (this.span) {
      console.debug(`[SPAN-EVENT] warning: ${message}`, attributes);
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? extractErrorInfo(error) : {};
    const combinedAttrs = { ...errorAttrs, ...attributes };

    this.logToConsole('ERROR', message, combinedAttrs);
    
    if (this.span) {
      if (error) {
        console.debug(`[SPAN-EXCEPTION] ${error.message}`, { stack: error.stack });
      }
      console.debug(`[SPAN-EVENT] error: ${message}`, combinedAttrs);
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    console.debug(`[SPAN-EVENT] ${name}`, attributes);
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    console.debug(`[SPAN-ATTR] ${key}=${value}`);
  }

  attachSpan(span: UnifiedTelemetrySpan): void {
    this.span = span;
    console.debug(`[SPAN-ATTACH] ${this.context.operationName} (${span.getSpanId()})`);
  }

  finishSpan(): void {
    if (this.span) {
      console.debug(`[SPAN-FINISH] ${this.context.operationName} (${this.span.getSpanId()})`);
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
    return new ConsoleUnifiedTelemetryLogger(childContext);
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    // ✅ Using utils function instead of private method
    return createChildLoggerContext(this.context, operationName);
  }

  /**
   * Log to console with structured format
   * ✅ Not a private method - could be used by subclasses if needed
   */
  logToConsole(level: string, message: string, attributes?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context.layer}:${this.context.operationType}]`;
    
    const contextInfo = {
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      operation: this.context.operationName,
      layer: this.context.layer,
    };

    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, { ...contextInfo, ...attributes });
        break;
      case 'INFO':
        console.info(prefix, message, { ...contextInfo, ...attributes });
        break;
      case 'WARN':
        console.warn(prefix, message, { ...contextInfo, ...attributes });
        break;
      case 'ERROR':
        console.error(prefix, message, { ...contextInfo, ...attributes });
        break;
    }
  }
}