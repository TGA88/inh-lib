import { 
  UnifiedSpanOptions, 
  UnifiedSpanStatus, 
  UnifiedSpanKind, 
  UnifiedSpanStatusCode,
  UNIFIED_SPAN_KIND,
  UNIFIED_SPAN_STATUS_CODE,
} from '../interfaces/tracer';

/**
 * Utility functions for span operations
 * These functions help with span creation and management
 * NOT exported in main index - internal use only
 */

/**
 * Create default span options with sensible defaults
 */
export function createDefaultSpanOptions(
  kind?: UnifiedSpanKind,
  attributes?: Record<string, string | number | boolean>
): UnifiedSpanOptions {
  return {
    kind: kind || UNIFIED_SPAN_KIND.INTERNAL,
    attributes: attributes || {},
    startTime: new Date(),
  };
}

/**
 * Create span status object
 */
export function createSpanStatus(
  code: UnifiedSpanStatusCode,
  message?: string
): UnifiedSpanStatus {
  return {
    code,
    message,
  };
}

/**
 * Create success span status
 */
export function createSuccessStatus(): UnifiedSpanStatus {
  return createSpanStatus(UNIFIED_SPAN_STATUS_CODE.OK);
}

/**
 * Create error span status with error message
 */
export function createErrorStatus(error: Error): UnifiedSpanStatus {
  return createSpanStatus(UNIFIED_SPAN_STATUS_CODE.ERROR, error.message);
}

/**
 * Merge span attributes with existing attributes
 * Later attributes override earlier ones
 */
export function mergeSpanAttributes(
  existing: Record<string, string | number | boolean>,
  additional: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  return {
    ...existing,
    ...additional,
  };
}

/**
 * Create HTTP span attributes
 * Standard attributes for HTTP operations
 */
export function createHttpSpanAttributes(
  method: string,
  url: string,
  statusCode?: number,
  userAgent?: string
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    'http.method': method,
    'http.url': url,
  };

  if (statusCode !== undefined) {
    attributes['http.status_code'] = statusCode;
  }

  if (userAgent) {
    attributes['http.user_agent'] = userAgent;
  }

  return attributes;
}

/**
 * Create database span attributes
 * Standard attributes for database operations
 */
export function createDatabaseSpanAttributes(
  operation: string,
  table: string,
  query?: string
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    'db.operation': operation,
    'db.table': table,
  };

  if (query) {
    attributes['db.statement'] = query;
  }

  return attributes;
}

/**
 * Create generic operation span attributes
 * Useful for custom operations with optional resource, duration, status and extra metadata
 */
export function createOperationSpanAttributes(
  operationName: string,
  resource?: string,
  durationMs?: number,
  status?: string,
  metadata?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    'operation.name': operationName,
  };

  if (resource) {
    attributes['operation.resource'] = resource;
  }

  if (durationMs !== undefined) {
    attributes['operation.duration_ms'] = durationMs;
  }

  if (status) {
    attributes['operation.status'] = status;
  }

  if (metadata && Object.keys(metadata).length > 0) {
    return mergeSpanAttributes(attributes, metadata);
  }

  return attributes;
}

/**
 * Create external API span attributes
 * Standard attributes for external service calls
 */
export function createExternalApiSpanAttributes(
  serviceName: string,
  method: string,
  endpoint: string,
  statusCode?: number
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    'external.service': serviceName,
    'external.method': method,
    'external.endpoint': endpoint,
  };

  if (statusCode !== undefined) {
    attributes['external.status_code'] = statusCode;
  }

  return attributes;
}