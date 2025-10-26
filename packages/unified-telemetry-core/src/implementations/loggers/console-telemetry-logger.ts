import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext 
} from '../../interfaces';
import {
  createChildLoggerWithSameSpan,
  enrichLogAttributes,
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
    private readonly context: UnifiedLoggerContext
  ) {}
  createChildLogger(operationName: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetryLogger {
   const childContext = createChildLoggerWithSameSpan(this.context, operationName, attributes);

    return new ConsoleUnifiedTelemetryLogger(childContext);
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    const enrichedAttributes = enrichLogAttributes(this.context, attributes);
    this.logToConsole('DEBUG', message, enrichedAttributes);

    if (this.context.options.autoAddSpanEvents) {
      this.addSpanEvent('debug', { message, ...this.filterSpanAttributes(attributes) });
    }
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    const enrichedAttributes = enrichLogAttributes(this.context, attributes);
    this.logToConsole('INFO', message, enrichedAttributes);

    if (this.context.options.autoAddSpanEvents) {
      this.addSpanEvent('info', { message, ...this.filterSpanAttributes(attributes) });
    }
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    const enrichedAttributes = enrichLogAttributes(this.context, attributes);
    this.logToConsole('WARN', message, enrichedAttributes);
    
    if (this.context.options.autoAddSpanEvents) {
      this.addSpanEvent('warn', { message, ...this.filterSpanAttributes(attributes) });
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? extractErrorInfo(error) : {};
    const enrichedAttributes = enrichLogAttributes(this.context, { ...errorAttrs, ...attributes });

    this.logToConsole('ERROR', message, enrichedAttributes);
    
    // Record exception on span if error is provided
    if (error) {
      this.context.span.recordException(error);
    }

    if (this.context.options.autoAddSpanEvents) {
      this.addSpanEvent('error', { message, ...this.filterSpanAttributes({ ...errorAttrs, ...attributes }) });
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    console.debug(`[SPAN-EVENT] ${name}`, attributes);
    this.context.span.addEvent(name, attributes);
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    console.debug(`[SPAN-ATTR] ${key}=${value}`);
    this.context.span.setTag(key, value);
  }

  finishSpan(): void {
    console.debug(`[SPAN-FINISH] ${this.context.options.operationName}`);
    this.context.span.finish();
  }

  /**
   * Log to console with structured format
   * ✅ Not a private method - could be used by subclasses if needed
   */
  logToConsole(level: string, message: string, attributes?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context.options.layer}:${this.context.options.operationType}]`;
    
    const contextInfo = {
      operation: this.context.options.operationName,
      layer: this.context.options.layer,
      operationType: this.context.options.operationType,
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

  /**
   * Filter attributes to only include span-compatible types
   * 
   * @param attributes - The attributes to filter
   * @returns Filtered attributes with only string, number, or boolean values
   * 
   * @remarks
   * Spans only accept primitive types as attributes, so we filter out
   * complex objects to prevent serialization issues.
   */
  filterSpanAttributes(attributes?: Record<string, unknown>): Record<string, string | number | boolean> {
    if (!attributes) return {};

    const filtered: Record<string, string | number | boolean> = {};
    
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}