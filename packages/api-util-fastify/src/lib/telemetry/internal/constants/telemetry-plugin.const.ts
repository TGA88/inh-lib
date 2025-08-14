export const INTERNAL_TELEMETRY_CONSTANTS = {
  PLUGIN_NAME: 'fastify-unified-telemetry',
  SPAN_NAME_PREFIX: 'fastify.request',
  DEFAULT_OPERATION_TYPE: 'custom',
  DEFAULT_LAYER: 'http',
  SYSTEM_METRICS_INTERVAL: 5000,
  MEMORY_THRESHOLD_MB: 50,
  CPU_THRESHOLD_MS: 100
} as const;

export const TELEMETRY_SPAN_ATTRIBUTES = {
  HTTP_METHOD: 'http.method',
  HTTP_URL: 'http.url',
  HTTP_ROUTE: 'http.route',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_USER_AGENT: 'http.user_agent',
  REQUEST_ID: 'request.id',
  REQUEST_DURATION_MS: 'request.duration_ms',
  REQUEST_MEMORY_USAGE_BYTES: 'request.memory_usage_bytes',
  REQUEST_CPU_TIME_MS: 'request.cpu_time_ms',
  REQUEST_MEMORY_HEAP_USED: 'request.memory_heap_used',
  REQUEST_MEMORY_HEAP_TOTAL: 'request.memory_heap_total',
  HTTP_CONTENT_TYPE: 'http.content_type',
  HTTP_CLIENT_IP: 'http.client_ip',
  USER_ID: 'user.id',
  USER_TIER: 'user.tier'
} as const;

export const METRIC_LABELS = {
  METHOD: 'method',
  ROUTE: 'route',
  STATUS_CODE: 'status_code',
  STATUS_CATEGORY: 'status_category',
  SERVICE: 'service',
  INSTANCE: 'instance',
  DB_COMMAND: 'db_command',
  DATABASE: 'database',
  TABLE: 'table',
  POOL_NAME: 'pool_name'
} as const;