import { FastifyRequest, FastifyReply } from 'fastify';
import { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetrySpan, 
  UnifiedTelemetryLogger,
  UNIFIED_SPAN_KIND 
} from '@inh-lib/unified-telemetry-core';
import { INTERNAL_TELEMETRY_CONSTANTS, TELEMETRY_SPAN_ATTRIBUTES, METRIC_LABELS } from '../constants/telemetry-plugin.const';
import { ResourceUsageSnapshot, RequestResourceMetrics } from '../../types/telemetry.types';
import { STANDARD_METRIC_NAMES } from '../../constants/telemetry.const';
import { 
  generateRequestId, 
  extractRoutePattern, 
  extractUserAgent, 
  createSpanName,
  getStatusCodeCategory,
  sanitizeUrl,
  extractContentType,
  captureResourceSnapshot,
  calculateResourceMetrics,
  categorizeMemoryUsage,
  categorizeCpuTime,
  categorizeDuration,
  createSystemMetricsSnapshot
} from '../utils/telemetry-plugin.utils';

export const createRequestSpan = (
  provider: UnifiedTelemetryProvider,
  request: FastifyRequest,
  resourceSnapshot?: ResourceUsageSnapshot
): { span: UnifiedTelemetrySpan; requestId: string } => {
  const requestId = generateRequestId();
  const route = extractRoutePattern(request);
  const spanName = createSpanName(request.method, sanitizeUrl(route));
  
  const span = provider.tracer.startSpan(spanName, {
    kind: UNIFIED_SPAN_KIND.SERVER,
    attributes: {
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_METHOD]: request.method,
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_URL]: sanitizeUrl(request.url),
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_ROUTE]: route,
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_USER_AGENT]: extractUserAgent(request),
      [TELEMETRY_SPAN_ATTRIBUTES.REQUEST_ID]: requestId,
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_CONTENT_TYPE]: extractContentType(request),
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_CLIENT_IP]: request.ip
    }
  });

  return { span, requestId };
};

export const finishRequestSpan = (
  span: UnifiedTelemetrySpan,
  reply: FastifyReply,
  resourceMetrics?: RequestResourceMetrics
): void => {
  const statusCode = reply.statusCode;
  const statusCategory = getStatusCodeCategory(statusCode);
  
  span.setTag(TELEMETRY_SPAN_ATTRIBUTES.HTTP_STATUS_CODE, statusCode);
  span.setTag('http.status_category', statusCategory);
  
  // Add resource metrics to span
  if (resourceMetrics) {
    span.setTag(TELEMETRY_SPAN_ATTRIBUTES.REQUEST_DURATION_MS, resourceMetrics.duration);
    span.setTag(TELEMETRY_SPAN_ATTRIBUTES.REQUEST_MEMORY_USAGE_BYTES, resourceMetrics.memoryDelta);
    span.setTag(TELEMETRY_SPAN_ATTRIBUTES.REQUEST_CPU_TIME_MS, resourceMetrics.cpuTimeMs);
    span.setTag(TELEMETRY_SPAN_ATTRIBUTES.REQUEST_MEMORY_HEAP_USED, resourceMetrics.heapUsed);
    span.setTag(TELEMETRY_SPAN_ATTRIBUTES.REQUEST_MEMORY_HEAP_TOTAL, resourceMetrics.heapTotal);
    
    // Add categorized metrics for easier querying
    span.setTag('request.memory_category', categorizeMemoryUsage(resourceMetrics.memoryDelta));
    span.setTag('request.cpu_category', categorizeCpuTime(resourceMetrics.cpuTimeMs));
    span.setTag('request.duration_category', categorizeDuration(resourceMetrics.duration));
  }
  
  if (statusCode >= 400) {
    span.setStatus({
      code: statusCode >= 500 ? 'error' : 'ok',
      message: `HTTP ${statusCode}`
    });
  }
  
  span.finish();
};

export const createRequestLogger = (
  provider: UnifiedTelemetryProvider,
  span: UnifiedTelemetrySpan,
  request: FastifyRequest
): UnifiedTelemetryLogger => {
  const route = extractRoutePattern(request);
  
  return provider.logger.getLogger({
    span,
    options: {
      operationType: INTERNAL_TELEMETRY_CONSTANTS.DEFAULT_OPERATION_TYPE,
      operationName: `${request.method} ${sanitizeUrl(route)}`,
      layer: INTERNAL_TELEMETRY_CONSTANTS.DEFAULT_LAYER,
      autoAddSpanEvents: true,
      attributes: {
        'request.method': request.method,
        'request.url': sanitizeUrl(request.url),
        'request.route': route
      }
    }
  });
};

export const recordComprehensiveRequestMetrics = (
  provider: UnifiedTelemetryProvider,
  request: FastifyRequest,
  reply: FastifyReply,
  resourceMetrics: RequestResourceMetrics,
  serviceName: string
): void => {
  const route = sanitizeUrl(extractRoutePattern(request));
  const statusCode = reply.statusCode.toString();
  const statusCategory = getStatusCodeCategory(reply.statusCode);
  
  const commonLabels = {
    [METRIC_LABELS.METHOD]: request.method,
    [METRIC_LABELS.ROUTE]: route,
    [METRIC_LABELS.STATUS_CODE]: statusCode,
    [METRIC_LABELS.STATUS_CATEGORY]: statusCategory
  };

  // 1. HTTP Requests Total (Counter)
  const requestCounter = provider.metrics.createCounter(
    STANDARD_METRIC_NAMES.HTTP_REQUESTS_TOTAL,
    'Total HTTP requests'
  );
  requestCounter.add(1, commonLabels);
  
  // 2. HTTP Request Duration (Histogram) - in seconds
  const requestDuration = provider.metrics.createHistogram(
    STANDARD_METRIC_NAMES.HTTP_REQUEST_DURATION_SECONDS,
    'HTTP request duration in seconds'
  );
  requestDuration.record(resourceMetrics.duration / 1000, commonLabels);
  
  // 3. HTTP Request Memory Usage (Histogram) - in bytes
  const memoryUsage = provider.metrics.createHistogram(
    STANDARD_METRIC_NAMES.HTTP_REQUEST_MEMORY_USAGE_BYTES,
    'HTTP request memory usage in bytes'
  );
  memoryUsage.record(Math.max(0, resourceMetrics.memoryDelta), commonLabels);
  
  // 4. HTTP Request CPU Time (Histogram) - in seconds
  const cpuTime = provider.metrics.createHistogram(
    STANDARD_METRIC_NAMES.HTTP_REQUEST_CPU_TIME_SECONDS,
    'HTTP request CPU time in seconds'
  );
  cpuTime.record(resourceMetrics.cpuTimeMs / 1000, commonLabels);
};

export const recordSystemMetrics = async (
  provider: UnifiedTelemetryProvider,
  serviceName: string
): Promise<void> => {
  try {
    const systemSnapshot = await createSystemMetricsSnapshot();
    
    const systemLabels = {
      [METRIC_LABELS.SERVICE]: serviceName,
      [METRIC_LABELS.INSTANCE]: systemSnapshot.instanceId
    };

    // System Memory Usage (Gauge)
    const memoryGauge = provider.metrics.createGauge(
      STANDARD_METRIC_NAMES.MEMORY_USAGE_PERCENT,
      'System memory usage percentage'
    );
    memoryGauge.set(systemSnapshot.memoryUsagePercent, systemLabels);

    // System CPU Usage (Gauge)
    const cpuGauge = provider.metrics.createGauge(
      STANDARD_METRIC_NAMES.CPU_USAGE_PERCENT,
      'System CPU usage percentage'
    );
    cpuGauge.set(systemSnapshot.cpuUsagePercent, systemLabels);
  } catch (error) {
    console.error('Failed to record system metrics:', error);
  }
};

export const logRequestStart = (
  logger: UnifiedTelemetryLogger,
  request: FastifyRequest,
  requestId: string,
  resourceSnapshot?: ResourceUsageSnapshot
): void => {
  const logData: Record<string, unknown> = {
    requestId,
    method: request.method,
    url: sanitizeUrl(request.url),
    userAgent: extractUserAgent(request),
    contentType: extractContentType(request),
    ip: request.ip
  };

  if (resourceSnapshot) {
    
    logData['initialMemory'] = resourceSnapshot.memoryUsage.heapUsed ;
    logData['initialCpu'] = resourceSnapshot.cpuUsage.user + resourceSnapshot.cpuUsage.system;
  }

  logger.info('HTTP request started', logData);
};

export const logRequestEnd = (
  logger: UnifiedTelemetryLogger,
  request: FastifyRequest,
  reply: FastifyReply,
  requestId: string,
  resourceMetrics?: RequestResourceMetrics
): void => {
  const logData: Record<string, unknown> = {
    requestId,
    method: request.method,
    url: sanitizeUrl(request.url),
    statusCode: reply.statusCode,
    statusCategory: getStatusCodeCategory(reply.statusCode)
  };

  if (resourceMetrics) {
    logData['duration'] = resourceMetrics.duration;
    logData['durationCategory'] = categorizeDuration(resourceMetrics.duration);
    logData['memoryDelta'] = resourceMetrics.memoryDelta;
    logData['memoryCategory'] = categorizeMemoryUsage(resourceMetrics.memoryDelta);
    logData['cpuTimeMs'] = resourceMetrics.cpuTimeMs;
    logData['cpuCategory'] = categorizeCpuTime(resourceMetrics.cpuTimeMs);
    logData['heapUsed'] = resourceMetrics.heapUsed;
  }

  logger.info('HTTP request completed', logData);
};

export const logRequestError = (
  logger: UnifiedTelemetryLogger,
  request: FastifyRequest,
  error: Error,
  requestId: string
): void => {
  logger.error('HTTP request failed', error, {
    requestId,
    method: request.method,
    url: sanitizeUrl(request.url),
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack
  });
};

// Database metrics helpers (for future use)
export const recordDatabaseMetrics = (
  provider: UnifiedTelemetryProvider,
  command: string,
  database: string,
  table: string,
  duration: number,
  success: boolean
): void => {
  const dbLabels = {
    [METRIC_LABELS.DB_COMMAND]: command,
    [METRIC_LABELS.DATABASE]: database,
    [METRIC_LABELS.TABLE]: table
  };

  // Database Query Duration (Histogram)
  const queryDuration = provider.metrics.createHistogram(
    STANDARD_METRIC_NAMES.DB_QUERY_DURATION_SECONDS,
    'Database query duration in seconds'
  );
  queryDuration.record(duration / 1000, dbLabels);
};

export const recordDatabaseConnectionMetrics = (
  provider: UnifiedTelemetryProvider,
  database: string,
  poolName: string,
  usagePercent: number,
  memoryUsage: number
): void => {
  const poolLabels = {
    [METRIC_LABELS.DATABASE]: database,
    [METRIC_LABELS.POOL_NAME]: poolName
  };

  // Connection Pool Usage (Gauge)
  const poolUsage = provider.metrics.createGauge(
    STANDARD_METRIC_NAMES.DB_CONNECTION_POOL_USAGE_PERCENT,
    'Database connection pool usage percentage'
  );
  poolUsage.set(usagePercent, poolLabels);

  // Database Memory Usage (Gauge)  
  const dbMemory = provider.metrics.createGauge(
    STANDARD_METRIC_NAMES.DB_MEMORY_USAGE_BYTES,
    'Database memory usage in bytes'
  );
  dbMemory.set(memoryUsage, poolLabels);
};