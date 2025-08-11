// src/internal/logic/trace-extractor.logic.ts
/**
 * Trace extraction logic for W3C and B3 formats
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import type { InternalTraceContext } from '../types/middleware.types';
import { TELEMETRY_HEADERS } from '../../constants/telemetry-middleware.const';

/**
 * Extract trace context from HTTP headers supporting W3C and B3 formats
 */
export function extractTraceContextFromRequestHeaders(headers: Record<string, string>): InternalTraceContext {
  // Try W3C format first
  const w3cContext = extractW3CTraceContext(headers);
  if (w3cContext.format !== 'none') {
    return w3cContext;
  }

  // Try B3 format
  const b3Context = extractB3TraceContext(headers);
  if (b3Context.format !== 'none') {
    return b3Context;
  }

  return createEmptyTraceContext();


}
/**
 * Extract trace context from Unified HTTP headers supporting W3C and B3 formats
 */
export function extractTraceContextFromHeaders(context: UnifiedHttpContext): InternalTraceContext {
  const headers = context.request.headers;

 const res= extractTraceContextFromRequestHeaders(headers);
  if (res.format === 'none') {
    return generateNewTraceContext();
  }
  return res;
}

/**
 * Extract W3C trace context from headers
 */
export function extractW3CTraceContext(headers: Record<string, string>): InternalTraceContext {
  const traceparent = headers[TELEMETRY_HEADERS.W3C_TRACEPARENT];
  const tracestate = headers[TELEMETRY_HEADERS.W3C_TRACESTATE];

  if (!traceparent) {
    return createEmptyTraceContext();
  }

  const parsed = parseW3CTraceparent(traceparent);
  if (!parsed) {
    return createEmptyTraceContext();
  }

  return {
    traceId: parsed.traceId,
    spanId: generateSpanId(),
    parentSpanId: parsed.spanId,
    sampled: parsed.sampled,
    traceState: tracestate,
    format: 'w3c',
  };
}

/**
 * Extract B3 trace context from headers
 */
export function extractB3TraceContext(headers: Record<string, string>): InternalTraceContext {
  const traceId = headers[TELEMETRY_HEADERS.B3_TRACE_ID];
  const spanId = headers[TELEMETRY_HEADERS.B3_SPAN_ID];
  const sampled = headers[TELEMETRY_HEADERS.B3_SAMPLED];
  const parentSpanId = headers[TELEMETRY_HEADERS.B3_PARENT_SPAN_ID];

  if (!traceId) {
    return createEmptyTraceContext();
  }

  return {
    traceId: normalizeTraceId(traceId),
    spanId: generateSpanId(),
    parentSpanId: parentSpanId ? normalizeSpanId(parentSpanId) : undefined,
    sampled: parseSampledFlag(sampled),
    format: 'b3',
  };
}

/**
 * Parse W3C traceparent header
 * Format: 00-{trace-id}-{parent-id}-{trace-flags}
 */
export function parseW3CTraceparent(traceparent: string): {
  traceId: string;
  spanId: string;
  sampled: boolean;
} | null {
  const parts = traceparent.split('-');
  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, spanId, flags] = parts;

  // Validate version (should be 00)
  if (version !== '00') {
    return null;
  }

  // Validate trace ID (32 hex chars, not all zeros)
  if (!isValidTraceId(traceId)) {
    return null;
  }

  // Validate span ID (16 hex chars, not all zeros)
  if (!isValidSpanId(spanId)) {
    return null;
  }

  // Parse flags (last bit indicates sampling)
  const flagsInt = parseInt(flags, 16);
  const sampled = (flagsInt & 0x01) === 0x01;

  return {
    traceId: normalizeTraceId(traceId),
    spanId: normalizeSpanId(spanId),
    sampled,
  };
}

/**
 * Generate W3C traceparent header
 */
export function generateW3CTraceparent(context: InternalTraceContext): string {
  const flags = context.sampled ? '01' : '00';
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

/**
 * Generate B3 headers object
 */
export function generateB3Headers(context: InternalTraceContext): Record<string, string> {
  const headers: Record<string, string> = {
    [TELEMETRY_HEADERS.B3_TRACE_ID]: context.traceId,
    [TELEMETRY_HEADERS.B3_SPAN_ID]: context.spanId,
    [TELEMETRY_HEADERS.B3_SAMPLED]: context.sampled ? '1' : '0',
  };

  if (context.parentSpanId) {
    headers[TELEMETRY_HEADERS.B3_PARENT_SPAN_ID] = context.parentSpanId;
  }

  return headers;
}

/**
 * Generate new trace context when no existing context found
 */
export function generateNewTraceContext(): InternalTraceContext {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: true,
    format: 'w3c',
  };
}

/**
 * Create empty trace context for error cases
 */
export function createEmptyTraceContext(): InternalTraceContext {
  return {
    traceId: '',
    spanId: '',
    sampled: false,
    format: 'none',
  };
}

/**
 * Generate random trace ID (32 hex characters)
 */
export function generateTraceId(): string {
  const high = Math.random().toString(16).substring(2, 18).padStart(16, '0');
  const low = Math.random().toString(16).substring(2, 18).padStart(16, '0');
  return (high + low).substring(0, 32);
}

/**
 * Generate random span ID (16 hex characters)
 */
export function generateSpanId(): string {
  return Math.random().toString(16).substring(2, 18).padStart(16, '0');
}

/**
 * Validate trace ID format
 */
export function isValidTraceId(traceId: string): boolean {
  return /^[0-9a-f]{32}$/i.test(traceId) && traceId !== '00000000000000000000000000000000';
}

/**
 * Validate span ID format
 */
export function isValidSpanId(spanId: string): boolean {
  return /^[0-9a-f]{16}$/i.test(spanId) && spanId !== '0000000000000000';
}

/**
 * Normalize trace ID to lowercase
 */
export function normalizeTraceId(traceId: string): string {
  return traceId.toLowerCase().padStart(32, '0');
}

/**
 * Normalize span ID to lowercase
 */
export function normalizeSpanId(spanId: string): string {
  return spanId.toLowerCase().padStart(16, '0');
}

/**
 * Parse sampled flag from various formats
 */
export function parseSampledFlag(sampled: string | undefined): boolean {
  if (!sampled) return true; // Default to sampled
  return sampled === '1' || sampled.toLowerCase() === 'true';
}