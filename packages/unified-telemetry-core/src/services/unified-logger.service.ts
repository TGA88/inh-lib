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
 * Default console-based logger implementation
 * 
 * @remarks
 * Simple logger that outputs to console. This is the default base logger
 * used when no custom base logger is provided to the service.
 */
class ConsoleBaseTelemetryLogger implements UnifiedBaseTelemetryLogger {
  debug(message: string, attributes?: Record<string, unknown>): void {
    console.debug('[DEBUG]', message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    console.info('[INFO]', message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    console.warn('[WARN]', message, attributes);
  }

  error(message: string, attributes?: Record<string, unknown>): void {
    console.error('[ERROR]', message, attributes);
  }
}