

/**
 * Telemetry tracer interface for creating and managing spans
 */
export interface UnifiedTelemetryTracer {
  /**
   * Start a new span with the given name and options
   */
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan;
  
  /**
   * Get the currently active span (if any)
   */
  getActiveSpan(): UnifiedTelemetrySpan | undefined;
  
  // /**
  //  * Get the current trace ID from the active context
  //  */
  // getCurrentTraceId(): string | undefined;
  
  // /**
  //  * Get the current span ID from the active context
  //  */
  // getCurrentSpanId(): string | undefined;
}

/**
 * Telemetry span interface for tracking operations
 */
export interface UnifiedTelemetrySpan {
  /**
   * Set a tag (attribute) on the span
   */
  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan;
  
  /**
   * Set the status of the span
   */
  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan;
  
  /**
   * Record an exception that occurred during the span
   */
  recordException(exception: Error): UnifiedTelemetrySpan;
  
  /**
   * Add an event to the span with optional attributes
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan;
  
  /**
   * Finish the span (marks it as complete)
   */
  finish(): void;
  
  /**
   * Get the trace ID of this span
   */
  getTraceId(): string;
  
  /**
   * Get the span ID of this span
   */
  getSpanId(): string;

  getParentSpanId(): string | undefined;

  /**
   * Get the start time of the span
   * This is used to calculate the duration of the span by UnifiedTelemetryLogger for each log entry
   */
  getStartTime(): Date;
  
}

/**
 * Options for creating a span
 */
export interface UnifiedSpanOptions {
  kind?: UnifiedSpanKind;
  attributes?: Record<string, string | number | boolean>;
  startTime?: Date;
  parent?: UnifiedTelemetrySpan
}

/**
 * Span kind enumeration using union types instead of enum
 */
export type UnifiedSpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

/**
 * Constants for span kinds (replacement for enum)
 */
export const UNIFIED_SPAN_KIND = {
  INTERNAL: 'internal' as const,
  SERVER: 'server' as const,
  CLIENT: 'client' as const,
  PRODUCER: 'producer' as const,
  CONSUMER: 'consumer' as const,
} as const;

/**
 * Span status interface
 */
export interface UnifiedSpanStatus {
  code: UnifiedSpanStatusCode;
  message?: string;
}

/**
 * Span status codes using union types instead of enum
 */
export type UnifiedSpanStatusCode = 'unset' | 'ok' | 'error';

/**
 * Constants for span status codes (replacement for enum)
 */
export const UNIFIED_SPAN_STATUS_CODE = {
  UNSET: 'unset' as const,
  OK: 'ok' as const,
  ERROR: 'error' as const,
} as const;