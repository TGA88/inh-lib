/**
 * ✅ Utility functions for trace ID extraction and generation
 * These functions replace private methods in middleware classes
 * NOT exported in main index - internal use only
 */

/**
 * Default trace headers to check for trace ID extraction
 */
export const DEFAULT_TRACE_HEADERS = [
  'x-trace-id',
  'x-request-id',
  'traceparent',
  'x-correlation-id',
  'x-amzn-trace-id',
  'b3',
] as const;

/**
 * Extract trace ID from HTTP headers
 */
export function extractTraceIdFromHeaders(
  headers: Record<string, string>,
  customTraceHeader?: string
): string | undefined {
  // Check custom header first if provided
  if (customTraceHeader) {
    const customValue = getHeaderValue(headers, customTraceHeader);
    if (customValue) {
      return validateAndNormalizeTraceId(customValue);
    }
  }
  
  // Check default headers
  for (const headerName of DEFAULT_TRACE_HEADERS) {
    const headerValue = getHeaderValue(headers, headerName);
    if (headerValue) {
      const extractedId = extractTraceIdFromHeaderValue(headerName, headerValue);
      if (extractedId) {
        return validateAndNormalizeTraceId(extractedId);
      }
    }
  }
  
  return undefined;
}

/**
 * Extract trace ID from specific header value based on header type
 */
export function extractTraceIdFromHeaderValue(
  headerName: string,
  headerValue: string
): string | undefined {
  const normalizedHeaderName = headerName.toLowerCase();
  
  switch (normalizedHeaderName) {
    case 'traceparent':
      return extractTraceIdFromTraceparent(headerValue);
    
    case 'b3':
      return extractTraceIdFromB3(headerValue);
    
    case 'x-amzn-trace-id':
      return extractTraceIdFromAmazonTrace(headerValue);
    
    case 'x-trace-id':
    case 'x-request-id':
    case 'x-correlation-id':
    default:
      // For simple trace ID headers, return value as-is
      return headerValue.trim();
  }
}

/**
 * Extract trace ID from W3C Trace Context traceparent header
 * Format: version-traceId-spanId-flags
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */
export function extractTraceIdFromTraceparent(traceparent: string): string | undefined {
  const parts = traceparent.trim().split('-');
  
  if (parts.length !== 4) {
    return undefined;
  }
  
  const [version, traceId, spanId, flags] = parts;
  
  // Validate format
  if (version.length !== 2 || traceId.length !== 32 || spanId.length !== 16 || flags.length !== 2) {
    return undefined;
  }
  
  // Validate hex format
  if (!/^[0-9a-f]+$/i.test(traceId)) {
    return undefined;
  }
  
  return traceId.toLowerCase();
}

/**
 * Extract trace ID from B3 header
 * Format: traceId-spanId-sampled-parentSpanId
 * Example: 4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1
 */
export function extractTraceIdFromB3(b3: string): string | undefined {
  const parts = b3.trim().split('-');
  
  if (parts.length < 2) {
    return undefined;
  }
  
  const traceId = parts[0];
  
  // Validate trace ID format (16 or 32 hex characters)
  if (!/^[0-9a-f]{16}$|^[0-9a-f]{32}$/i.test(traceId)) {
    return undefined;
  }
  
  return traceId.toLowerCase();
}

/**
 * Extract trace ID from Amazon X-Ray trace header
 * Format: Root=1-5e1b4751-74dd04e4c61cdef0b9a83f55;Parent=0b11cc4b-7f5a-49e6-a8e6-b5db2c06f6f4;Sampled=1
 */
export function extractTraceIdFromAmazonTrace(xrayTrace: string): string | undefined {
  const rootRegex = /Root=1-([0-9a-f]{8})-([0-9a-f]{24})/i;
  const rootMatch = rootRegex.exec(xrayTrace);
  
  if (!rootMatch) {
    return undefined;
  }
  
  const [, timestamp, randomPart] = rootMatch;
  
  // Combine timestamp and random part to form trace ID
  return `${timestamp}${randomPart}`.toLowerCase();
}

/**
 * Get header value (case-insensitive)
 */
export function getHeaderValue(
  headers: Record<string, string>,
  headerName: string
): string | undefined {
  const normalizedHeaderName = headerName.toLowerCase();
  
  // Try exact match first
  if (headers[headerName]) {
    return headers[headerName];
  }
  
  // Try case-insensitive match
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedHeaderName) {
      return value;
    }
  }
  
  return undefined;
}

/**
 * Validate and normalize trace ID
 */
export function validateAndNormalizeTraceId(traceId: string): string | undefined {
  const normalized = traceId.trim().toLowerCase();
  
  // Check if it's empty
  if (!normalized) {
    return undefined;
  }
  
  // Check if it's a valid hex string of appropriate length
  if (/^[0-9a-f]{16}$|^[0-9a-f]{32}$/i.test(normalized)) {
    return normalized;
  }
  
  // For non-hex trace IDs (like UUIDs), validate format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    // Convert UUID to hex string without dashes
    return normalized.replace(/-/g, '');
  }
  
  // For other formats, accept as-is if it's reasonable length and characters
  if (normalized.length >= 8 && normalized.length <= 64 && /^[0-9a-z\-_]+$/i.test(normalized)) {
    return normalized;
  }
  
  return undefined;
}

/**
 * Generate a new trace ID (32 hex characters)
 */
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a new span ID (16 hex characters)
 */
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Create W3C Trace Context traceparent header
 */
export function createTraceparentHeader(
  traceId: string,
  spanId?: string,
  flags = '01'
): string {
  const normalizedTraceId = traceId.padStart(32, '0');
  const normalizedSpanId = (spanId || generateSpanId()).padStart(16, '0');
  
  return `00-${normalizedTraceId}-${normalizedSpanId}-${flags}`;
}

/**
 * Create B3 header
 */
export function createB3Header(
  traceId: string,
  spanId?: string,
  sampled = true
): string {
  const normalizedTraceId = traceId.padStart(32, '0');
  const normalizedSpanId = (spanId || generateSpanId()).padStart(16, '0');
  const sampledFlag = sampled ? '1' : '0';
  
  return `${normalizedTraceId}-${normalizedSpanId}-${sampledFlag}`;
}

/**
 * Check if trace ID is valid format
 */
export function isValidTraceId(traceId: string): boolean {
  return validateAndNormalizeTraceId(traceId) !== undefined;
}

/**
 * Check if span ID is valid format
 */
export function isValidSpanId(spanId: string): boolean {
  const normalized = spanId.trim().toLowerCase();
  return /^[0-9a-f]{16}$/i.test(normalized);
}

/**
 * Extract trace context from multiple header formats
 */
export function extractTraceContext(
  headers: Record<string, string>
): { traceId?: string; spanId?: string; parentSpanId?: string } | undefined {
  // Try W3C Trace Context first
  const traceparent = getHeaderValue(headers, 'traceparent');
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length === 4) {
      return {
        traceId: parts[1],
        spanId: parts[2],
      };
    }
  }
  
  // Try B3 format
  const b3 = getHeaderValue(headers, 'b3');
  if (b3) {
    const parts = b3.split('-');
    if (parts.length >= 2) {
      return {
        traceId: parts[0],
        spanId: parts[1],
        parentSpanId: parts.length > 3 ? parts[3] : undefined,
      };
    }
  }
  
  // Fallback to simple trace ID
  const traceId = extractTraceIdFromHeaders(headers);
  if (traceId) {
    return { traceId };
  }
  
  return undefined;
}