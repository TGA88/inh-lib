import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext 
} from '../../interfaces';

/**
 * No-op implementation of UnifiedTelemetryLogger
 * 
 * This implementation does nothing and is used when telemetry is disabled
 * or for testing purposes where telemetry output is not desired.
 * 
 * ✅ No private methods - uses utils functions instead
 * ✅ No 'any' types - fully typed
 * ✅ All methods are no-op implementations
 */
export class NoOpUnifiedTelemetryLogger implements UnifiedTelemetryLogger {
  constructor(private readonly context?: UnifiedLoggerContext) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    // No-op
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    // No-op
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    // No-op
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    // No-op
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    // No-op
  }

  finishSpan(): void {
    // No-op
  }
}