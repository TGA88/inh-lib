// src/internal/utils/otel.utils.ts

/**
 * Internal OpenTelemetry utilities
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { TRACE_HEADERS } from '../constants/otel.const';

/**
 * Extract trace ID from HTTP headers
 */
export function extractTraceIdFromHeaders(headers: Record<string, string>): string | undefined {
  for (const header of TRACE_HEADERS) {
    const value = headers[header];
    if (value) {
      if (header === 'traceparent') {
        const parts = value.split('-');
        if (parts.length >= 2) {
          return parts[1];
        }
      }
      return value;
    }
  }
  return undefined;
}

/**
 * Validate OpenTelemetry configuration
 */
export function validateOtelConfig(config: Record<string, unknown>): boolean {
  return config['serviceName'] !== undefined && config['serviceVersion'] !== undefined;
}
