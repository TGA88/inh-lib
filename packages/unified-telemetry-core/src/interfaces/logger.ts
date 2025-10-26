

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
  // createChildLogger  just only create new BaseChildLogger for specific scope but keep Span context
  // eg. createOrderEndpoint there are many functions called inside but all should keep same Span context.
  createChildLogger(operationName: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetryLogger;
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

/**
 * Valid operation types for telemetry spans
 * endpoint - represents an API endpoint operation with http or api layer
 * middleware - represents a middleware operation with http or api layer
 * command - represents a command operation with service layer
 * query - represents a query operation with  service layer
 * produce - represents a message production operation with api or service layer
 * consume - represents a message consumption operation with api or service layer
 * database - represents a database operation with data layer
 * logic - represents a business logic operation with http, api, service, data, core layer
 * integration - represents an integration operation (e.g. external API calls) with integration layer
 * auth - represents an authentication operation with http or api layer
 * custom - represents a custom operation defined by the user with custom layer
 */
export type LogOperationType = 'endpoint' | 'middleware' | 'command' | 'query' |  'produce' | 'consume' | 'database' | 'logic' | 'integration' | 'auth' | 'custom';


/**
 * Valid layer types for telemetry spans
 * http - represent to Framework HTTP layer (e.g. Fastify, Express)
 * api - represent to Unified Route
 * service - represent to Service layer
 * data - represent to Data layer
 * core - represent to Core layer
 * integration - represent to Integration layer like message broker, external API requests
 * custom - represent to Custom layer defined by user
 */
export type LogLayerType = 'http' | 'api' | 'service' | 'data' | 'core' | 'integration' | 'custom';


export interface UnifiedLoggerContext {
options: UnifiedLoggerOptions;
span: UnifiedTelemetrySpan;
}
export type UnifiedLoggerOptions = {
  operationType: LogOperationType; // Operation type for the span
  operationName: string;
  layer: LogLayerType; // Layer type for the span
  autoAddSpanEvents?: boolean; // Automatically add span events for all log levels
  requestId?: string; // Optional request ID for correlation
  correlationId?: string; // Optional correlation ID for correlation
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
  /**
   * Create a child logger that inherits parent's settings.
   * Useful for scoping logs to a specific module or operation.
   * @param scope - name of the child scope (e.g. module or operation)
   * @param attributes - optional attributes to attach to every log emitted by the child
   */
  createChildLogger(scope: string, attributes?: Record<string, unknown>): UnifiedBaseTelemetryLogger;
}

export interface UnifiedTelemetryLoggerService{
  getLogger(context: UnifiedLoggerContext): UnifiedTelemetryLogger;
  getBaseLogger(): UnifiedBaseTelemetryLogger;
} 