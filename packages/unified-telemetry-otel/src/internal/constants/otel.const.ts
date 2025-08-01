// src/internal/constants/otel.const.ts

/**
 * Internal OpenTelemetry constants
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

export const OTEL_SPAN_KINDS = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
  PRODUCER: 4,
  CONSUMER: 5,
} as const;

export const OTEL_SPAN_STATUS_CODES = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const;

export const DEFAULT_TRACER_NAME = 'unified-telemetry-tracer';
export const DEFAULT_METER_NAME = 'unified-telemetry-metrics';

export const TRACE_HEADERS = [
  'x-trace-id',
  'x-request-id', 
  'traceparent',
  'x-correlation-id'
] as const;
