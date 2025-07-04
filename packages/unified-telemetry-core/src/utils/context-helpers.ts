import { UnifiedLoggerContext } from '../interfaces/logger';

/**
 * Utility functions for context operations
 * These functions help with context creation and manipulation
 * NOT exported in main index - internal use only
 */

/**
 * Extract trace ID from various sources
 * Attempts to extract trace ID from headers, context, or generates a new one
 */
export function extractTraceId(
  headers?: Record<string, string>,
  existingTraceId?: string
): string {
  if (existingTraceId) {
    return existingTraceId;
  }

  if (headers) {
    // Try common trace ID headers
    const traceHeaders = [
      'x-trace-id',
      'x-request-id', 
      'traceparent',
      'x-correlation-id'
    ];

    for (const header of traceHeaders) {
      const value = headers[header];
      if (value) {
        // Extract trace ID from W3C traceparent format if needed
        if (header === 'traceparent') {
          const parts = value.split('-');
          if (parts.length >= 2) {
            return parts[1];
          }
        }
        return value;
      }
    }
  }

  // Generate new trace ID if none found
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Create context attributes for different layers
 */
export function createLayerAttributes(
  layer: UnifiedLoggerContext['options']['layer'],
  operation: string,
  additionalAttributes?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const baseAttributes: Record<string, string | number | boolean> = {
    'operation.layer': layer,
    'operation.name': operation,
  };

  switch (layer) {
    case 'http':
      return {
        ...baseAttributes,
        'component': 'http-server',
        ...additionalAttributes,
      };
    
    case 'service':
      return {
        ...baseAttributes,
        'component': 'business-logic',
        ...additionalAttributes,
      };
    
    case 'data':
      return {
        ...baseAttributes,
        'component': 'data-access',
        ...additionalAttributes,
      };
    
    case 'core':
      return {
        ...baseAttributes,
        'component': 'core-utility',
        ...additionalAttributes,
      };
    
    case 'integration':
      return {
        ...baseAttributes,
        'component': 'external-integration',
        ...additionalAttributes,
      };
    
    case 'custom':
      return {
        ...baseAttributes,
        'component': 'custom',
        ...additionalAttributes,
      };
    
    default:
      return {
        ...baseAttributes,
        ...additionalAttributes,
      };
  }
}


/**
 * Create operation type attributes
 */
export function createOperationTypeAttributes(
  operationType: UnifiedLoggerContext['options']['operationType'],
  additionalAttributes?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const baseAttributes: Record<string, string | number | boolean> = {
    'operation.type': operationType,
  };

  switch (operationType) {
    case 'http':
      return {
        ...baseAttributes,
        'protocol': 'http',
        ...additionalAttributes,
      };
    
    case 'database':
      return {
        ...baseAttributes,
        'component': 'database',
        ...additionalAttributes,
      };
    
    case 'business':
      return {
        ...baseAttributes,
        'component': 'business-logic',
        ...additionalAttributes,
      };
    
    case 'utility':
      return {
        ...baseAttributes,
        'component': 'utility',
        ...additionalAttributes,
      };
    
    case 'integration':
      return {
        ...baseAttributes,
        'component': 'integration',
        ...additionalAttributes,
      };
    
    case 'auth':
      return {
        ...baseAttributes,
        'component': 'authentication',
        ...additionalAttributes,
      };
    
    case 'custom':
      return {
        ...baseAttributes,
        'component': 'custom',
        ...additionalAttributes,
      };
    
    default:
      return {
        ...baseAttributes,
        ...additionalAttributes,
      };
  }
}

/**
 * Sanitize attributes to ensure they are telemetry-safe
 * Removes undefined values and converts complex objects to strings
 */
export function sanitizeAttributes(
  attributes: Record<string, unknown>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      // Convert complex objects to JSON string
      try {
        sanitized[key] = JSON.stringify(value);
      } catch {
        sanitized[key] = `[${typeof value}]`;
      }
    }
  }

  return sanitized;
}