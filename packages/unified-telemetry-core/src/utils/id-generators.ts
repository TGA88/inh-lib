/**
 * Utility functions for generating trace and span IDs
 * These functions generate unique identifiers for telemetry correlation
 * NOT exported in main index - internal use only
 */

/**
 * Generate a random trace ID (32 hex characters)
 * Used to identify a complete request flow across multiple services
 */
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a random span ID (16 hex characters)
 * Used to identify individual operations within a trace
 */
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a random instance ID
 * Used to identify a specific instance of a service
 */
export function generateInstanceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Validate trace ID format
 * Returns true if the trace ID is a valid 32-character hex string
 */
export function isValidTraceId(traceId: string): boolean {
  return /^[0-9a-f]{32}$/.test(traceId);
}

/**
 * Validate span ID format
 * Returns true if the span ID is a valid 16-character hex string
 */
export function isValidSpanId(spanId: string): boolean {
  return /^[0-9a-f]{16}$/.test(spanId);
}