/**
 * Business logic for span extraction strategies
 * Internal logic for executing span extraction with fallback strategies
 */

import type { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetrySpan,
  UnifiedTelemetryLogger
} from '@inh-lib/unified-telemetry-core';
import type { 
  InternalTelemetryMiddlewareConfig 
} from '../types/middleware.types';
import type { 
  SpanExtractionResult,
  GetActiveSpanOptions
} from '../types/span-extraction.types';
import { 
  tryGetActiveSpanFromProvider,
  extractSpanFromHeaders,
  createFallbackSpan,
  hasValidTraceHeaders
} from '../utils/span-extraction.utils';
import { SPAN_EXTRACTION_DEFAULTS } from '../constants/span-extraction.const';
import { TelemetryLayerType, TelemetryOperationType } from '../types/telemetry.types';

/**
 * Execute span extraction strategy with fallbacks
 * Strategy: Active Span → Extract from Headers → Create Fallback
 */
export function executeSpanExtractionStrategy(
  headers: Record<string, string> | undefined,
  provider: UnifiedTelemetryProvider,
  config: InternalTelemetryMiddlewareConfig,
  fallbackOptions?: GetActiveSpanOptions
): SpanExtractionResult | null {
  
  // Strategy 1: Try to get active span from provider
  const activeSpan = tryGetActiveSpanFromProvider(provider);
  if (activeSpan) {
    return {
      span: activeSpan,
      source: 'active',
      metadata: {
        'strategy.used': 'active_span_from_provider',
      }
    };
  }

  // Strategy 2: Extract from headers if provided and extraction is enabled
  if (headers  && config.enableTraceExtraction) {
    const extractedSpan = extractSpanFromHeaders(
      headers,
      provider,
      config,
      {
        operationName: fallbackOptions?.operationName,
        operationType: fallbackOptions?.operationType,
        layer: fallbackOptions?.layer,
        attributes: fallbackOptions?.attributes,
      }
    );
    
    if (extractedSpan) {
      return {
        span: extractedSpan,
        source: 'extracted',
        metadata: {
          'strategy.used': 'extracted_from_headers',
          'trace.has_headers': true,
        }
      };
    }
  }

  // Strategy 3: Create fallback span if requested
  const createNewIfNotFound = fallbackOptions?.createNewIfNotFound ?? SPAN_EXTRACTION_DEFAULTS.CREATE_NEW_IF_NOT_FOUND;
  if (createNewIfNotFound) {
    const fallbackSpan = createFallbackSpan(
      provider,
      config,
      {
        operationName: fallbackOptions?.operationName,
        operationType: fallbackOptions?.operationType,
        layer: fallbackOptions?.layer,
        attributes: fallbackOptions?.attributes,
      }
    );
    
    return {
      span: fallbackSpan,
      source: 'fallback',
      metadata: {
        'strategy.used': 'fallback_new_span',
        'trace.has_headers': headers ? hasValidTraceHeaders(headers) : false,
      }
    };
  }

  return null;
}

/**
 * Create child span without UnifiedHttpContext using parent span or headers
 */
export function createChildSpanWithoutContext(
  parentSpanOrHeaders: UnifiedTelemetrySpan | { headers: Record<string, string> },
  operationName: string,
  provider: UnifiedTelemetryProvider,
  config: InternalTelemetryMiddlewareConfig,
  options?: {
    operationType?: string;
    layer?: string;
    attributes?: Record<string, string | number | boolean>;
  }
): { 
  span: UnifiedTelemetrySpan; 
  logger: UnifiedTelemetryLogger; 
  finish: () => void 
} {
  
  let parentSpan: UnifiedTelemetrySpan;
  
  if ('headers' in parentSpanOrHeaders) {
    // Get parent span using extraction strategy
    const extractionResult = executeSpanExtractionStrategy(
      parentSpanOrHeaders.headers,
      provider,
      config,
      {
        operationName: `parent_${operationName}`,
        createNewIfNotFound: true,
      }
    );
    
    if (!extractionResult) {
      throw new Error('Unable to get or create parent span');
    }
    
    parentSpan = extractionResult.span;
  } else {
    parentSpan = parentSpanOrHeaders;
  }
  
  // Create child span from resolved parent
  const opType = options?.operationType || SPAN_EXTRACTION_DEFAULTS.FALLBACK_OPERATION_TYPE;
  const layerType = options?.layer || SPAN_EXTRACTION_DEFAULTS.FALLBACK_LAYER;
  
  const childSpan = provider.tracer.startSpan(operationName, {
    parent: parentSpan,
    kind: 'internal',
    attributes: {
      'operation.type': opType,
      'operation.layer': layerType,
      'operation.name': operationName,
      'span.parent_source': 'headers' in parentSpanOrHeaders ? 'extracted' : 'direct',
      ...options?.attributes,
      ...config.customAttributes,
    }
  });

  // Create logger for the child span
  const childLogger = provider.logger.getLogger({
    span: childSpan,
    options: {
      operationType: opType as TelemetryOperationType,
      operationName: operationName,
      layer: layerType as TelemetryLayerType,
      autoAddSpanEvents: true,
    }
  });

  return {
    span: childSpan,
    logger: childLogger,
    finish: () => {
      // Finish the span
      childLogger.finishSpan();
      // Note: No span stack management since no UnifiedHttpContext
    }
  };
}
