/**
 * Constants for span extraction without UnifiedHttpContext
 * Internal constants for span extraction functionality
 */

/**
 * Sources of span extraction
 */
export const SPAN_EXTRACTION_SOURCES = {
  ACTIVE: 'active',
  EXTRACTED: 'extracted',
  FALLBACK: 'fallback',
} as const;

/**
 * Default values for span extraction
 */
export const SPAN_EXTRACTION_DEFAULTS = {
  OPERATION_NAME: 'standalone_operation',
  PARENT_OPERATION_NAME: 'extracted_operation',
  FALLBACK_OPERATION_TYPE: 'business' as const,
  FALLBACK_LAYER: 'service' as const,
  CREATE_NEW_IF_NOT_FOUND: true,
} as const;

/**
 * Span attributes for extracted spans
 */
export const SPAN_EXTRACTION_ATTRIBUTES = {
  SOURCE_KEY: 'span.source',
  EXTRACTED_SOURCE: 'extracted_from_headers',
  FALLBACK_SOURCE: 'fallback_new_trace',
  TRACE_ROOT: 'trace.root',
  TRACE_EXTRACTED: 'trace.extracted',
} as const;
