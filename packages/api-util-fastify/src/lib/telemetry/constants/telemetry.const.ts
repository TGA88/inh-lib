export const TELEMETRY_REGISTRY_KEYS = {
  TELEMETRY_PROVIDER: 'telemetry:provider',
  TELEMETRY_SPAN: 'telemetry:span',
  TELEMETRY_LOGGER: 'telemetry:logger',
  TELEMETRY_METRICS: 'telemetry:metrics',
  REQUEST_START_TIME: 'telemetry:request_start_time',
  REQUEST_ID: 'telemetry:request_id',
  REQUEST_MEMORY_START: 'telemetry:request_memory_start',
  REQUEST_CPU_START: 'telemetry:request_cpu_start'
} as const;

export const DEFAULT_TELEMETRY_PLUGIN_OPTIONS = {
  autoTracing: true,
  serviceName: 'fastify-service',
  skipRoutes: ['/health', '/metrics', '/ping'],
  enableResourceTracking: true,
  enableSystemMetrics: true
} as const;

export const STANDARD_METRIC_NAMES = {
  // Request metrics
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_DURATION_SECONDS: 'http_request_duration_seconds',
  
  // Resource metrics
  HTTP_REQUEST_MEMORY_USAGE_BYTES: 'http_request_memory_usage_bytes',
  HTTP_REQUEST_CPU_TIME_SECONDS: 'http_request_cpu_time_seconds',
  
  // System metrics
  MEMORY_USAGE_PERCENT: 'memory_usage_percent',
  CPU_USAGE_PERCENT: 'cpu_usage_percent',
  
  // Database metrics
  DB_QUERY_DURATION_SECONDS: 'db_query_duration_seconds',
  DB_CONNECTION_POOL_USAGE_PERCENT: 'db_connection_pool_usage_percent',
  DB_MEMORY_USAGE_BYTES: 'db_memory_usage_bytes'
} as const;