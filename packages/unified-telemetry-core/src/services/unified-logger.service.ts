 import { DefaultUnifiedTelemetryLogger } from '../implementations';
import {  
  UnifiedTelemetryLogger, 
  UnifiedBaseTelemetryLogger, 
  UnifiedLoggerContext, 
  UnifiedTelemetryLoggerService
} from '../interfaces/logger';

/**
 * Unified telemetry logger service implementation
 * 
 * @remarks
 * This service creates logger instances that integrate with telemetry spans
 * and provides both full telemetry loggers and simple base loggers.
 */
export class UnifiedLoggerService implements UnifiedTelemetryLoggerService {
  private readonly baseLogger: UnifiedBaseTelemetryLogger;

  constructor(baseLogger?: UnifiedBaseTelemetryLogger) {
    this.baseLogger = baseLogger || new ConsoleBaseTelemetryLogger();
  }

  /**
   * Creates a telemetry-enabled logger with span integration
   * 
   * @param context - The logger context containing span and options
   * @returns A UnifiedTelemetryLogger instance
   * 
   * @remarks
   * 1. Creates a logger that automatically enriches log entries with trace context
   * 2. Integrates with the provided span for event tracking
   * 3. Supports automatic span event creation based on context options
   */
  getLogger(context: UnifiedLoggerContext): UnifiedTelemetryLogger {
    return new DefaultUnifiedTelemetryLogger(this.baseLogger, context);
  }

  /**
   * Gets a simple base logger without telemetry features
   * 
   * @returns A UnifiedBaseTelemetryLogger instance
   * 
   * @remarks
   * This logger provides basic logging functionality without span integration
   * or trace correlation. Useful for scenarios where telemetry is not needed.
   */
  getBaseLogger(): UnifiedBaseTelemetryLogger {
    return this.baseLogger;
  }
}

/**
 * Simple console-based base logger.
 * Keeps an optional scope and base attributes and produces child loggers by composing scope/attributes.
 */
class ConsoleBaseTelemetryLogger implements UnifiedBaseTelemetryLogger {
  constructor(
    private readonly scope?: string,
    private readonly baseAttributes?: Record<string, unknown>
  ) {}

  private merge(attrs?: Record<string, unknown>) {
    return {
      ...(this.baseAttributes ?? {}),
      ...(attrs ?? {}),
      ...(this.scope ? { scope: this.scope } : {})
    };
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    console.debug('[DEBUG]', message, this.merge(attributes));
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    console.info('[INFO]', message, this.merge(attributes));
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    console.warn('[WARN]', message, this.merge(attributes));
  }

  error(message: string, attributes?: Record<string, unknown>): void {
    console.error('[ERROR]', message, this.merge(attributes));
  }

  createChildLogger(scope: string, attributes?: Record<string, unknown>): UnifiedBaseTelemetryLogger {
    const composedScope = this.scope ? `${this.scope}.${scope}` : scope;
    const composedAttrs = { ...(this.baseAttributes ?? {}), ...(attributes ?? {}) };
    return new ConsoleBaseTelemetryLogger(composedScope, composedAttrs);
  }
}
