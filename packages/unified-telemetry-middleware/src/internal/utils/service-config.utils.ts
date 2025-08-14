/**
 * Service configuration utilities
 * ✅ Utility functions to support telemetry middleware service
 * ✅ Replaces private methods in service classes
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import type { 
  InternalTelemetryMiddlewareConfig 
} from '../types/middleware.types';
import type { 
  TelemetryOperationType,
  TelemetryLayerType,
} from '../types/telemetry.types';
import type { TelemetryMiddlewareConfig } from '../../services/telemetry-middleware.service';
import { getStatusCodeFromContext } from './context.utils';

/**
 * Create internal configuration from public config
 * ✅ Utility function (not private method)
 */
export function createInternalTelemetryConfig(
  config: TelemetryMiddlewareConfig
): InternalTelemetryMiddlewareConfig {
  return {
    metrics: {
      enableRequestCounter: config.enableMetrics ?? true,
      enableDurationHistogram: config.enableMetrics ?? true,
      enableMemoryHistogram: config.enableResourceTracking ?? true,
      enableCpuHistogram: config.enableResourceTracking ?? true,
      enableSystemMetrics: config.enableSystemMetrics ?? true,
    },
    spans: {
      enableTracing: config.enableTracing ?? true,
      enableAutoSpanEvents: true,
      spanNamePrefix: 'http',
      operationNamePrefix: 'http_request',
    },
    enableResourceTracking: config.enableResourceTracking ?? true,
    enableTraceExtraction: config.enableTraceExtraction ?? true,
    enableCorrelationId: config.enableCorrelationId ?? true,
    enableSystemMetrics: config.enableSystemMetrics ?? true,
    enableRegistryCleanup: config.enableRegistryCleanup ?? true,
    customAttributes: config.customAttributes,
  };
}

/**
 * Extract status code from HTTP context
 * ✅ Utility function (not private method)
 */
export function extractTelemetryStatusCode(context: UnifiedHttpContext): number {
  return getStatusCodeFromContext(context) || 200;
}

/**
 * System metrics labels creation utility
 * ✅ Utility function (not private method)
 */
export function createSystemMetricsLabels(serviceName: string): {
  service: string;
  instance: string;
} {
  return {
    service: serviceName,
    instance: 'default',
  };
}

/**
 * HTTP metrics labels creation utility
 * ✅ Utility function (not private method)
 */
export function createHttpMetricsLabels(
  method: string,
  route: string,
  statusCode: number
): {
  method: string;
  route: string;
  status_code: string;
} {
  return {
    method,
    route,
    status_code: statusCode.toString(),
  };
}

/**
 * Get operation metadata from span for debugging/inspection
 * ✅ Utility function (not private method)
 */
export function getOperationMetadataFromSpan(): {
  operationType: TelemetryOperationType;
  layer: TelemetryLayerType;
  operationName: string;
} {
  // In a real implementation, you'd extract these from span attributes
  // For now, return defaults (could be enhanced based on span implementation)
  return {
    operationType: 'logic',
    layer: 'service', 
    operationName: 'operation'
  };
}
