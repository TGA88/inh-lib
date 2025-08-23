// src/constants/telemetry-middleware.const.ts
/**
 * Public constants for unified telemetry middleware
 * These constants are exported for consumer projects
 */

/**
 * HTTP header names for trace propagation
 */
export const TELEMETRY_HEADERS = {
  // W3C Trace Context
  W3C_TRACEPARENT: 'traceparent',
  W3C_TRACESTATE: 'tracestate',
  
  // B3 Headers
  B3_TRACE_ID: 'x-b3-traceid',
  B3_SPAN_ID: 'x-b3-spanid',
  B3_SAMPLED: 'x-b3-sampled',
  B3_FLAGS: 'x-b3-flags',
  B3_PARENT_SPAN_ID: 'x-b3-parentspanid',
  
  // Custom headers
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
} as const;

/**
 * Telemetry layer identifiers
 */
export const TELEMETRY_LAYERS = {
  HTTP: 'http',
  API: 'api',
  SERVICE: 'service', 
  DATA: 'data',
  CORE: 'core',
  INTEGRATION: 'integration',
  CUSTOM: 'custom',
} as const;

/**
 * Telemetry operation types
 */
export const TELEMETRY_OPERATION_TYPES = {
  ENDPOINT: 'endpoint',
  MIDDLEWARE: 'middleware',
  PRODUCE: 'produce',
  CONSUME: 'consume',
  DATABASE: 'database',
  COMMAND: 'command',
  QUERY: 'query',
  LOGIC: 'logic',
  INTEGRATION: 'integration',
  AUTH: 'auth',
  CUSTOM: 'custom',
} as const;

/**
 * Span kinds for telemetry operations
 */
export const TELEMETRY_SPAN_KINDS = {
  INTERNAL: 'internal',
  SERVER: 'server',
  CLIENT: 'client',
  PRODUCER: 'producer',
  CONSUMER: 'consumer',
} as const;
