import { UnifiedLoggerContext } from '../interfaces/logger';
import { generateSpanId } from './id-generators';

/**
 * Utility functions for logger implementations
 * These functions replace private methods in logger classes
 * NOT exported in main index - internal use only
 */

/**
 * Enrich log attributes with context information
 * Combines trace context, operation context, timing, and custom attributes
 */
export function enrichLogAttributes(
  context: UnifiedLoggerContext, 
  attributes?: Record<string, unknown>
): Record<string, unknown> {
  return {
    // Trace context
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    
    // Operation context
    layer: context.layer,
    operationType: context.operationType,
    operationName: context.operationName,
    
    // Timing information
    timestamp: new Date().toISOString(),
    operationDuration: Date.now() - context.startTime.getTime(),
    
    // Context attributes
    ...context.attributes,
    
    // Method attributes (highest priority)
    ...attributes,
  };
}

/**
 * Create child logger context from parent context
 * Generates new span ID and preserves trace context
 */
export function createChildLoggerContext(
  parentContext: UnifiedLoggerContext,
  operationName: string,
  additionalAttributes?: Record<string, string | number | boolean>
): UnifiedLoggerContext {
  return {
    ...parentContext,
    parentSpanId: parentContext.spanId,
    spanId: generateSpanId(),
    operationName,
    startTime: new Date(),
    attributes: {
      ...parentContext.attributes,
      ...additionalAttributes,
    },
  };
}

/**
 * Create root logger context
 * Used when creating the initial logger context
 */
export function createRootLoggerContext(
  traceId: string,
  operationName: string,
  layer: UnifiedLoggerContext['layer'],
  operationType: UnifiedLoggerContext['operationType'],
  additionalAttributes?: Record<string, string | number | boolean>
): UnifiedLoggerContext {
  return {
    traceId,
    spanId: generateSpanId(),
    operationType,
    operationName,
    layer,
    attributes: {
      ...additionalAttributes,
    },
    startTime: new Date(),
  };
}

/**
 * Extract error information for logging
 * Safely extracts error details without risking serialization issues
 */
export function extractErrorInfo(error: Error): Record<string, string> {
  return {
    error: error.message,
    errorType: error.constructor.name,
    stack: error.stack || 'No stack trace available',
  };
}