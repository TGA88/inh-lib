
import { UnifiedTelemetrySpan } from './tracer';

/**
 * Main telemetry logger interface with tracing integration
 * 
 * This logger combines structured logging with distributed tracing,
 * allowing logs to be correlated with traces and spans.
 */
export interface UnifiedTelemetryLogger {
  // Core logging methods
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, error?: Error, attributes?: Record<string, unknown>): void;
  
  // Span integration methods
  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
  setSpanAttribute(key: string, value: string | number | boolean): void;
  // attachSpan(span: UnifiedTelemetrySpan): void;
  finishSpan(): void;
  // getSpanId(): string;
  
  // // Context management
  // createChildLogger(operationName: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetryLogger;
  // createChildContext(operationName: string): UnifiedLoggerContext;
  // getTraceId(): string;
}

/**
 * Logger context for tracing integration
 * Contains all the contextual information needed for telemetry correlation
 */
// export interface UnifiedLoggerContext {
//   traceId: string;
//   spanId: string;
//   parentSpanId?: string;
//   operationType: 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth' | 'custom' ;
//   operationName: string;
//   layer: 'http' | 'service' | 'data' | 'core' | 'integration' | 'custom';
//   attributes: Record<string, string | number | boolean>;
//   startTime: Date;
// }
export interface UnifiedLoggerContext {
options: UnifiedLoggerOptions;
span: UnifiedTelemetrySpan;
}
export type UnifiedLoggerOptions = {
  operationType: 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth' | 'custom' ;
  operationName: string;
  layer: 'http' | 'service' | 'data' | 'core' | 'integration' | 'custom';
  autoAddSpanEvents?: boolean; // Automatically add span events for all log levels
  attributes?: Record<string, string | number | boolean>; // Additional attributes to include in all logs

}

/**
 * Base logger interface for provider implementations
 * Simple logging interface without telemetry features
 */
export interface UnifiedBaseTelemetryLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
}

export interface UnifiedTelemetryLoggerService{
  getLogger(context: UnifiedLoggerContext): UnifiedTelemetryLogger;
  getBaseLogger(): UnifiedBaseTelemetryLogger;
} 