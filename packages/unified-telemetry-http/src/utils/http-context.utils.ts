import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger,
  UnifiedTelemetrySpan
} from '@inh-lib/unified-telemetry-core';

import { 
  
  HttpTelemetryContext,
  HttpTelemetryMetadata,
  HttpTelemetryOptions,
  HTTP_SPAN_ATTRIBUTES
} from '../interfaces';
import { extractTraceIdFromHeaders, generateTraceId } from './trace-extraction.utils';

/**
 * ✅ Utility functions for HTTP context operations
 * These functions replace private methods in middleware classes
 * NOT exported in main index - internal use only
 */

/**
 * Create HTTP telemetry context from provider and HTTP context
 */
export function createHttpTelemetryContext(
  provider: UnifiedTelemetryProvider,
  context: UnifiedHttpContext,
  options?: HttpTelemetryOptions
): HttpTelemetryContext {
  // Extract or generate trace ID
  const traceId = extractOrGenerateTraceId(context, options);
  
  return {
    traceId,
    provider
  };
}

/**
 * Extract or generate trace ID from HTTP context
 */
export function extractOrGenerateTraceId(
  context: UnifiedHttpContext,
  options?: HttpTelemetryOptions
): string {
  // Try to extract from headers first
  const extractedTraceId = extractTraceIdFromHeaders(
    context.request.headers,
    options?.traceIdHeader
  );
  
  if (extractedTraceId) {
    return extractedTraceId;
  }
  
  // Generate new one if extraction failed and generation is enabled
  if (options?.generateTraceId !== false) {
    return generateTraceId();
  }
  
  // Fallback - should not happen in normal circumstances
  throw new Error('No trace ID available and generation is disabled');
}

/**
 * Create HTTP-specific logger with context
 */
export function createHttpTelemetryLogger(
  provider: UnifiedTelemetryProvider,
  traceId: string,
  context: UnifiedHttpContext
): UnifiedTelemetryLogger {
  const operationName = `${context.request.method}_${getRoutePath(context.request.url)}`;
  
  return provider.logger.createChildLogger(operationName, {
    'trace.id': traceId,
    'http.method': context.request.method,
    'http.url': context.request.url,
    'http.user_agent': context.request.userAgent || '',
    'http.client_ip': context.request.ip,
  });
}

/**
 * Create HTTP span with standard attributes
 */
export function createHttpSpan(
  provider: UnifiedTelemetryProvider,
  traceId: string,
  context: UnifiedHttpContext,
  operationName?: string
): UnifiedTelemetrySpan {
  const spanName = operationName || `http.${context.request.method.toLowerCase()}`;
  
  const span = provider.tracer.startSpan(spanName, {
    attributes: {
      [HTTP_SPAN_ATTRIBUTES.METHOD]: context.request.method,
      [HTTP_SPAN_ATTRIBUTES.URL]: context.request.url,
      [HTTP_SPAN_ATTRIBUTES.USER_AGENT]: context.request.userAgent || '',
      [HTTP_SPAN_ATTRIBUTES.CLIENT_IP]: context.request.ip,
      'trace.id': traceId,
    }
  });
  
  return span;
}

/**
 * Extract HTTP telemetry metadata from context
 */
export function extractHttpTelemetryMetadata(
  context: UnifiedHttpContext,
  startTime?: Date
): HttpTelemetryMetadata {
  const contentLength = context.request.headers['content-length'];
  
  return {
    method: context.request.method,
    url: context.request.url,
    userAgent: context.request.userAgent,
    ip: context.request.ip,
    contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
    startTime: startTime || new Date(),
  };
}

/**
 * Update HTTP telemetry metadata with response information
 */
export function updateHttpTelemetryMetadataWithResponse(
  metadata: HttpTelemetryMetadata,
  statusCode: number,
  responseSize?: number
): HttpTelemetryMetadata {
  const endTime = new Date();
  const duration = endTime.getTime() - metadata.startTime.getTime();
  
  return {
    ...metadata,
    statusCode,
    responseSize,
    duration,
  };
}

/**
 * Create HTTP span attributes from metadata
 */
export function createHttpSpanAttributes(
  metadata: HttpTelemetryMetadata
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    [HTTP_SPAN_ATTRIBUTES.METHOD]: metadata.method,
    [HTTP_SPAN_ATTRIBUTES.URL]: metadata.url,
    [HTTP_SPAN_ATTRIBUTES.CLIENT_IP]: metadata.ip,
  };
  
  if (metadata.userAgent) {
    attributes[HTTP_SPAN_ATTRIBUTES.USER_AGENT] = metadata.userAgent;
  }
  
  if (metadata.statusCode !== undefined) {
    attributes[HTTP_SPAN_ATTRIBUTES.STATUS_CODE] = metadata.statusCode;
  }
  
  if (metadata.contentLength !== undefined) {
    attributes[HTTP_SPAN_ATTRIBUTES.REQUEST_SIZE] = metadata.contentLength;
  }
  
  if (metadata.responseSize !== undefined) {
    attributes[HTTP_SPAN_ATTRIBUTES.RESPONSE_SIZE] = metadata.responseSize;
  }
  
  return attributes;
}

/**
 * Check if URL should be excluded from telemetry
 */
export function shouldExcludeUrl(
  url: string,
  excludePatterns?: RegExp[]
): boolean {
  if (!excludePatterns || excludePatterns.length === 0) {
    return false;
  }
  
  return excludePatterns.some(pattern => pattern.test(url));
}

/**
 * Check if header should be excluded from telemetry
 */
export function shouldExcludeHeader(
  headerName: string,
  excludeHeaders?: string[]
): boolean {
  if (!excludeHeaders || excludeHeaders.length === 0) {
    return false;
  }
  
  const normalizedHeaderName = headerName.toLowerCase();
  return excludeHeaders.some(excluded => 
    excluded.toLowerCase() === normalizedHeaderName
  );
}

/**
 * Sanitize headers for telemetry (remove sensitive information)
 */
export function sanitizeHeadersForTelemetry(
  headers: Record<string, string>,
  excludeHeaders?: string[]
): Record<string, string> {
  const defaultExcludedHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
  ];
  
  const allExcludedHeaders = [
    ...defaultExcludedHeaders,
    ...(excludeHeaders || [])
  ];
  
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (!shouldExcludeHeader(key, allExcludedHeaders)) {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Extract route path from URL (remove query parameters and fragments)
 */
export function getRoutePath(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.pathname;
  } catch {
    // If URL parsing fails, extract path manually
    const pathMatch = /^[^?#]*/.exec(url);
    return pathMatch ? pathMatch[0] : url;
  }
}

/**
 * Determine if HTTP request was successful based on status code
 */
export function isHttpRequestSuccessful(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 400;
}

/**
 * Get HTTP status category for telemetry
 */
export function getHttpStatusCategory(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'redirect';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  if (statusCode >= 500) return 'server_error';
  return 'unknown';
}