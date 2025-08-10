/**
 * Utility functions for span extraction without UnifiedHttpContext
 * Internal utilities for span extraction functionality
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import type { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetrySpan 
} from '@inh-lib/unified-telemetry-core';
import type { 
  InternalTelemetryMiddlewareConfig 
} from '../types/middleware.types';
import type { 
  ExtractSpanOptions,
  FallbackSpanOptions,
  SpanExtractionSource
} from '../types/span-extraction.types';
import { SPAN_EXTRACTION_DEFAULTS, SPAN_EXTRACTION_ATTRIBUTES } from '../constants/span-extraction.const';

/**
 * Try to get active span from provider's tracer
 */
export function tryGetActiveSpanFromProvider(
  provider: UnifiedTelemetryProvider
): UnifiedTelemetrySpan | null {
  try {
    const activeSpan = provider.tracer.getActiveSpan();
    if (activeSpan) {
      return activeSpan;
    }
  } catch (error) {
    // Provider doesn't support getActiveSpan or error occurred
    console.warn('[SpanExtraction] Failed to get active span from provider:', error);
  }
  
  return null;
}

/**
 * Extract span from headers using trace context
 */
export function extractSpanFromHeaders(
  headers: Record<string, string>,
  provider: UnifiedTelemetryProvider,
  config: InternalTelemetryMiddlewareConfig,
  options?: ExtractSpanOptions
): UnifiedTelemetrySpan | null {
  if (!config.enableTraceExtraction) {
    return null;
  }

  try {
    // Try to extract trace context using existing logic
    // Note: This would need to be adapted based on actual extractor implementation
    const traceParent = headers['traceparent'];
    if (!traceParent) {
      return null;
    }

    // Parse traceparent header: version-traceId-spanId-flags
    const parts = traceParent.split('-');
    if (parts.length !== 4) {
      return null;
    }

    const [, traceId, parentSpanId] = parts;
    
    // Create span with extracted parent context
    const operationName = options?.operationName || SPAN_EXTRACTION_DEFAULTS.PARENT_OPERATION_NAME;
    
    const span = provider.tracer.startSpan(operationName, {
      kind: 'internal',
      attributes: {
        [SPAN_EXTRACTION_ATTRIBUTES.SOURCE_KEY]: SPAN_EXTRACTION_ATTRIBUTES.EXTRACTED_SOURCE,
        [SPAN_EXTRACTION_ATTRIBUTES.TRACE_EXTRACTED]: true,
        'operation.type': options?.operationType || SPAN_EXTRACTION_DEFAULTS.FALLBACK_OPERATION_TYPE,
        'operation.layer': options?.layer || SPAN_EXTRACTION_DEFAULTS.FALLBACK_LAYER,
        'operation.name': operationName,
        'trace.parent_id': parentSpanId,
        'trace.id': traceId,
        ...options?.attributes,
        ...config.customAttributes,
      }
    });

    return span;
  } catch (error) {
    console.warn('[SpanExtraction] Failed to extract span from headers:', error);
    return null;
  }
}

/**
 * Create fallback span when no active span or extraction fails
 */
export function createFallbackSpan(
  provider: UnifiedTelemetryProvider,
  config: InternalTelemetryMiddlewareConfig,
  options?: FallbackSpanOptions
): UnifiedTelemetrySpan {
  const operationName = options?.operationName || SPAN_EXTRACTION_DEFAULTS.OPERATION_NAME;
  
  const span = provider.tracer.startSpan(operationName, {
    kind: 'internal',
    attributes: {
      [SPAN_EXTRACTION_ATTRIBUTES.SOURCE_KEY]: SPAN_EXTRACTION_ATTRIBUTES.FALLBACK_SOURCE,
      [SPAN_EXTRACTION_ATTRIBUTES.TRACE_ROOT]: true,
      'operation.type': options?.operationType || SPAN_EXTRACTION_DEFAULTS.FALLBACK_OPERATION_TYPE,
      'operation.layer': options?.layer || SPAN_EXTRACTION_DEFAULTS.FALLBACK_LAYER,
      'operation.name': operationName,
      ...options?.attributes,
      ...config.customAttributes,
    }
  });

  return span;
}

/**
 * Create minimal UnifiedHttpContext from headers for extraction
 */
export function createMinimalContextFromHeaders(
  headers: Record<string, string>
): Partial<UnifiedHttpContext> {
  return {
    request: {
      headers: headers,
      method: 'GET', // Default method
      url: '/', // Default URL
      body: {}, // Required property
      params: {}, // Required property
      query: {}, // Required property
      ip: '127.0.0.1', // Required property
    },
    // Add minimal properties that extractor might need
  };
}

/**
 * Determine span extraction source
 */
export function getSpanExtractionSource(
  hasActiveSpan: boolean,
  hasValidHeaders: boolean,
  createNewAllowed: boolean
): SpanExtractionSource {
  if (hasActiveSpan) {
    return 'active';
  }
  
  if (hasValidHeaders) {
    return 'extracted';
  }
  
  if (createNewAllowed) {
    return 'fallback';
  }
  
  return 'fallback'; // Should not reach here
}

/**
 * Check if headers contain valid trace context
 */
export function hasValidTraceHeaders(headers: Record<string, string>): boolean {
  const traceParent = headers['traceparent'];
  if (!traceParent) {
    return false;
  }

  // Basic validation of traceparent format
  const parts = traceParent.split('-');
  return parts.length === 4;
}
