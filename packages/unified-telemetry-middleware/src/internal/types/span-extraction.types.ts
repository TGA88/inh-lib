/**
 * Types for span extraction without UnifiedHttpContext
 * Internal types for span extraction functionality
 */

import type { 
  TelemetryOperationType,
  TelemetryLayerType,
  TelemetryAttributes
} from './telemetry.types';
import type { UnifiedTelemetrySpan } from '@inh-lib/unified-telemetry-core';

/**
 * Options for extracting span from headers
 */
export interface ExtractSpanOptions {
  operationName?: string;
  operationType?: TelemetryOperationType;
  layer?: TelemetryLayerType;
  attributes?: TelemetryAttributes;
}

/**
 * Options for creating fallback span
 */
export interface FallbackSpanOptions {
  operationName?: string;
  operationType?: TelemetryOperationType;
  layer?: TelemetryLayerType;
  attributes?: TelemetryAttributes;
}

/**
 * Result of span extraction operation
 */
export interface SpanExtractionResult {
  span: UnifiedTelemetrySpan;
  source: SpanExtractionSource;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Source of extracted span
 */
export type SpanExtractionSource = 'active' | 'extracted' | 'fallback';

/**
 * Options for getActiveSpanWithoutUnifiedContext method
 */
export interface GetActiveSpanOptions {
  operationName?: string;
  createNewIfNotFound?: boolean;
  operationType?: TelemetryOperationType;
  layer?: TelemetryLayerType;
  attributes?: TelemetryAttributes;
}
