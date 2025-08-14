/**
 * Utility functions for telemetry decorator methods
 * Internal utilities for TelemetryPluginService decorator functionality
 */

import type { UnifiedTelemetrySpan, UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import type { 
  TelemetryMiddlewareService,
  TelemetryOperationType,
  TelemetryLayerType 
} from '@inh-lib/unified-telemetry-middleware';

/**
 * Options for getOrCreateSpan method
 */
export interface GetOrCreateSpanOptions {
  operationName?: string;
  createNewIfNotFound?: boolean;
  operationType?: TelemetryOperationType;
  layer?: TelemetryLayerType;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Result of getOrCreateSpan operation
 */
export interface SpanTelemetryResult {
  span: UnifiedTelemetrySpan;
  logger: UnifiedTelemetryLogger;
  finish: () => void;
}

/**
 * Create telemetry result object from span using middleware service
 */
export function createTelemetryResult(
  span: UnifiedTelemetrySpan,
  middlewareService: TelemetryMiddlewareService,
  options?: GetOrCreateSpanOptions
): SpanTelemetryResult {
  // Create logger for the span using middleware service's provider
  const logger = middlewareService['dependencies'].provider.logger.getLogger({
    span,
    options: {
      operationType: options?.operationType || 'business',
      operationName: options?.operationName || 'fastify_hook',
      layer: options?.layer || 'service',
      autoAddSpanEvents: true,
    }
  });

  return {
    span,
    logger,
    finish: () => {
      logger.finishSpan();
    }
  };
}

/**
 * Execute getOrCreateSpan logic using middleware service
 */
export function executeGetOrCreateSpan(
  middlewareService: TelemetryMiddlewareService,
  headers?: Record<string, string>,
  options?: GetOrCreateSpanOptions
): SpanTelemetryResult | null {
  
  // Use middleware service's getActiveSpanWithoutUnifiedContext method
  const span = middlewareService.getActiveSpanWithoutUnifiedContext(headers, {
    operationName: options?.operationName,
    createNewIfNotFound: options?.createNewIfNotFound,
    operationType: options?.operationType,
    layer: options?.layer,
    attributes: options?.attributes,
  });

  if (!span) {
    return null;
  }

  return createTelemetryResult(span, middlewareService, options);
}
