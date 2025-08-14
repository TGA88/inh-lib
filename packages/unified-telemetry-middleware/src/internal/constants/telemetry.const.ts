// src/internal/constants/telemetry.const.ts
/**
 * Internal constants for telemetry middleware
 * These constants are for internal use only
 */

/**
 * Metrics names as defined in metrics-dashboard.README.md
 */
export const INTERNAL_METRICS_NAMES = {
  // Request metrics
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_DURATION_SECONDS: 'http_request_duration_seconds',
  HTTP_REQUEST_MEMORY_USAGE_BYTES: 'http_request_memory_usage_bytes',
  HTTP_REQUEST_CPU_TIME_SECONDS: 'http_request_cpu_time_seconds',
  
  // System metrics
  MEMORY_USAGE_PERCENT: 'memory_usage_percent',
  CPU_USAGE_PERCENT: 'cpu_usage_percent',
  
  // Database metrics
  DB_QUERY_DURATION_SECONDS: 'db_query_duration_seconds',
  DB_CONNECTION_POOL_USAGE_PERCENT: 'db_connection_pool_usage_percent',
  DB_MEMORY_USAGE_BYTES: 'db_memory_usage_bytes',
} as const;

/**
 * Metrics descriptions
 */
export const INTERNAL_METRICS_DESCRIPTIONS = {
  [INTERNAL_METRICS_NAMES.HTTP_REQUESTS_TOTAL]: 'Total number of HTTP requests',
  [INTERNAL_METRICS_NAMES.HTTP_REQUEST_DURATION_SECONDS]: 'HTTP request duration in seconds',
  [INTERNAL_METRICS_NAMES.HTTP_REQUEST_MEMORY_USAGE_BYTES]: 'Memory usage per HTTP request in bytes',
  [INTERNAL_METRICS_NAMES.HTTP_REQUEST_CPU_TIME_SECONDS]: 'CPU time per HTTP request in seconds',
  [INTERNAL_METRICS_NAMES.MEMORY_USAGE_PERCENT]: 'System memory usage percentage',
  [INTERNAL_METRICS_NAMES.CPU_USAGE_PERCENT]: 'System CPU usage percentage',
} as const;

/**
 * Registry keys for unified-route context storage
 */
export const INTERNAL_REGISTRY_KEYS = {
  TELEMETRY_START_TIME: 'telemetry:startTime',
  TELEMETRY_START_MEMORY: 'telemetry:startMemory',
  TELEMETRY_START_CPU: 'telemetry:startCpu',
  TELEMETRY_SPAN: 'telemetry:span',
  TELEMETRY_LOGGER: 'telemetry:logger',
  TELEMETRY_TRACE_ID: 'telemetry:traceId',
  TELEMETRY_SPAN_ID: 'telemetry:spanId',
  TELEMETRY_REQUEST_ID: 'telemetry:requestId',
  TELEMETRY_ROUTE_INFO: 'telemetry:routeInfo',
} as const;

/**
 * Default values for telemetry configuration
 */
export const INTERNAL_DEFAULTS = {
  SPAN_NAME_PREFIX: 'http',
  OPERATION_NAME_PREFIX: 'http_request',
  DEFAULT_ROUTE: 'unknown',
  DEFAULT_METHOD: 'unknown',
  DEFAULT_STATUS_CODE: 0,
  MEMORY_SAMPLE_INTERVAL_MS: 100,
  CPU_SAMPLE_INTERVAL_MS: 100,
} as const;

/**
 * Error messages for internal use
 */
export const INTERNAL_ERROR_MESSAGES = {
  TELEMETRY_PROVIDER_NOT_FOUND: 'Telemetry provider not found in registry',
  SPAN_NOT_FOUND: 'Telemetry span not found in registry',
  LOGGER_NOT_FOUND: 'Telemetry logger not found in registry',
  INVALID_TRACE_HEADER: 'Invalid trace header format',
  RESOURCE_TRACKING_FAILED: 'Resource tracking failed',
} as const;