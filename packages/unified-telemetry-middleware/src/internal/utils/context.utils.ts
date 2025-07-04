/**
 * Context utilities for unified-route integration
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import { getRegistryItem, addRegistryItem } from '@inh-lib/unified-route';
import type { UnifiedTelemetrySpan, UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import type { InternalHttpRequestContext, InternalPerformanceTrackingData, InternalResourceMeasurement } from '../types/middleware.types';
import { INTERNAL_REGISTRY_KEYS, INTERNAL_DEFAULTS } from '../constants/telemetry.const';

/**
 * Extract HTTP request context from unified-route context
 */
export function extractHttpRequestContext(context: UnifiedHttpContext): InternalHttpRequestContext {
  const { request } = context;
  
  return {
    method: request.method || INTERNAL_DEFAULTS.DEFAULT_METHOD,
    route: extractRoute(request.url) || INTERNAL_DEFAULTS.DEFAULT_ROUTE,
    url: request.url || '',
    statusCode: INTERNAL_DEFAULTS.DEFAULT_STATUS_CODE, // Will be updated in response
    userAgent: request.userAgent,
    ip: request.ip,
    correlationId: request.headers['x-correlation-id'],
    requestId: request.headers['x-request-id'],
  };
}

/**
 * Extract route pattern from URL (simple implementation)
 * In production, this should integrate with your routing system
 */
export function extractRoute(url: string): string {
  if (!url) return INTERNAL_DEFAULTS.DEFAULT_ROUTE;
  
  // Remove query parameters
  const pathOnly = url.split('?')[0];
  
  // Basic route pattern extraction
  // Replace numeric IDs with parameter patterns
  return pathOnly.replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUIDs
    .replace(/\/[a-f0-9]{24}/g, '/:objectId'); // MongoDB ObjectIds
}

/**
 * Generate request ID if not present
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate correlation ID if not present
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Store performance tracking data in registry
 */
export function storePerformanceData(
  context: UnifiedHttpContext,
  data: InternalPerformanceTrackingData
): void {
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_SPAN, data.span);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_LOGGER, data.logger);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_START_TIME, data.startTime);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_START_MEMORY, data.startMemory);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_TRACE_ID, data.traceContext.traceId);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_SPAN_ID, data.traceContext.spanId);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_REQUEST_ID, data.requestContext.requestId);
}

/**
 * Retrieve performance tracking data from registry
 */
export function getPerformanceData(context: UnifiedHttpContext): InternalPerformanceTrackingData | Error {
  const span = getRegistryItem<UnifiedTelemetrySpan>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_SPAN);
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_LOGGER);
  const startTime = getRegistryItem<number>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_START_TIME);
  const startMemory = getRegistryItem<InternalResourceMeasurement>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_START_MEMORY);
  const traceId = getRegistryItem<string>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_TRACE_ID);
  const spanId = getRegistryItem<string>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_SPAN_ID);
  const requestId = getRegistryItem<string>(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_REQUEST_ID);

  // Check if any required items are missing (returned as Error)
  if (span instanceof Error) return new Error(`Missing span: ${span.message}`);
  if (logger instanceof Error) return new Error(`Missing logger: ${logger.message}`);
  if (startTime instanceof Error) return new Error(`Missing startTime: ${startTime.message}`);
  if (startMemory instanceof Error) return new Error(`Missing startMemory: ${startMemory.message}`);
  if (traceId instanceof Error) return new Error(`Missing traceId: ${traceId.message}`);
  if (spanId instanceof Error) return new Error(`Missing spanId: ${spanId.message}`);

  return {
    span,
    logger,
    startTime,
    startMemory,
    traceContext: {
      traceId,
      spanId,
      sampled: true,
      format: 'w3c' as const,
    },
    requestContext: {
      method: '',
      route: '',
      url: '',
      statusCode: 0,
      requestId: requestId instanceof Error ? '' : requestId,
    }
  };
}

/**
 * Update request context with response data
 */
export function updateRequestContextWithResponse(
  context: UnifiedHttpContext,
  statusCode: number
): void {
  addRegistryItem(context, 'telemetry:statusCode', statusCode);
}

/**
 * Get status code from context registry
 */
export function getStatusCodeFromContext(context: UnifiedHttpContext): number {
  const statusCode = getRegistryItem<number>(context, 'telemetry:statusCode');
  return statusCode instanceof Error ? INTERNAL_DEFAULTS.DEFAULT_STATUS_CODE : statusCode;
}

/**
 * Clean up telemetry data from registry
 */
export function cleanupTelemetryData(context: UnifiedHttpContext): void {
  // Note: unified-route doesn't have a deleteRegistryItem function
  // So we'll set to undefined to clear the reference
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_SPAN, undefined);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_LOGGER, undefined);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_START_TIME, undefined);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_START_MEMORY, undefined);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_TRACE_ID, undefined);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_SPAN_ID, undefined);
  addRegistryItem(context, INTERNAL_REGISTRY_KEYS.TELEMETRY_REQUEST_ID, undefined);
  addRegistryItem(context, 'telemetry:statusCode', undefined);
}