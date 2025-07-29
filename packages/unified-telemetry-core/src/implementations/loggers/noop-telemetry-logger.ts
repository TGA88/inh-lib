import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext, 
   
} from '../../interfaces';
import { generateSpanId } from '../../utils/id-generators';

/**
 * No-op implementation of UnifiedTelemetryLogger
 * 
 * This implementation does nothing and is used when telemetry is disabled
 * or for testing purposes where telemetry output is not desired.
 * 
 * ✅ No private methods - uses utils functions instead
 * ✅ No 'any' types - fully typed
 */
export class NoOpUnifiedTelemetryLogger implements UnifiedTelemetryLogger {
  constructor(private readonly context?: UnifiedLoggerContext) {}

  debug(): void {
    // No-op
  }

  info(): void {
    // No-op
  }

  warn(): void {
    // No-op
  }

  error(): void {
    // No-op
  }

  addSpanEvent(): void {
    // No-op
  }

  setSpanAttribute(): void {
    // No-op
  }

  attachSpan(): void {
    // No-op
  }

  finishSpan(): void {
    // No-op
  }

  getSpanId(): string {
    return this.context?.spanId || 'noop';
  }

  getTraceId(): string {
    return this.context?.traceId || 'noop';
  }

  createChildLogger(operationName: string): UnifiedTelemetryLogger {
    // Create minimal context for child logger
    const childContext: UnifiedLoggerContext = {
      traceId: this.context?.traceId || 'noop',
      spanId: generateSpanId(),
      parentSpanId: this.context?.spanId,
      operationType: 'utility',
      operationName,
      layer: 'core',
      attributes: {},
      startTime: new Date(),
    };
    
    return new NoOpUnifiedTelemetryLogger(childContext);
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    return {
      traceId: this.context?.traceId || 'noop',
      spanId: generateSpanId(),
      parentSpanId: this.context?.spanId,
      operationType: 'utility',
      operationName,
      layer: 'core',
      attributes: {},
      startTime: new Date(),
    };
  }
}