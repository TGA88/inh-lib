// src/internal/logic/otel.logic.ts

/**
 * Internal OpenTelemetry logic functions
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { trace, metrics, context, SpanContext,Context } from '@opentelemetry/api';
import { OtelTracerInstance, OtelMeterInstance } from '../types/otel.types';
import { DEFAULT_TRACER_NAME, DEFAULT_METER_NAME } from '../constants/otel.const';

/**
 * Create OpenTelemetry tracer
 */
export function createOtelTracer(serviceName: string): OtelTracerInstance {
  return trace.getTracer(serviceName || DEFAULT_TRACER_NAME);
}

/**
 * Create OpenTelemetry meter
 */
export function createOtelMeter(serviceName: string): OtelMeterInstance {
  return metrics.getMeter(serviceName || DEFAULT_METER_NAME);
}

/**
 * Extract trace ID and span ID from current OpenTelemetry context
 */
export function extractTraceAndSpanFromContext(): { traceId: string; spanId: string } {
  const activeSpan = trace.getActiveSpan();
  
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  // If no active span, try to get from context
  const currentContext = context.active();
  const spanContext = trace.getSpanContext(currentContext);
  
  if (spanContext) {
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  // Generate new trace/span if none found (fallback)
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
  };
}

/**
 * Generate random trace ID (fallback only)
 */
function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate random span ID (fallback only)
 */
function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Convert unified span kind to OpenTelemetry span kind
 */
export function convertSpanKind(unifiedKind: string): number {
  switch (unifiedKind) {
    case 'internal': return 1;
    case 'server': return 2;
    case 'client': return 3;
    case 'producer': return 4;
    case 'consumer': return 5;
    default: return 1;
  }
}

/**
 * Convert unified span status to OpenTelemetry span status
 */
export function convertSpanStatus(unifiedCode: string): number {
  switch (unifiedCode) {
    case 'unset': return 0;
    case 'ok': return 1;
    case 'error': return 2;
    default: return 0;
  }
}

/**
 * Extract trace ID from OpenTelemetry span context
 */
export function extractTraceIdFromSpan(span: unknown): string {
  // Get span context and extract trace ID
  if (span && typeof span === 'object' && 'spanContext' in span) {
    const spanContext = (span as { spanContext(): SpanContext }).spanContext();
    return spanContext.traceId;
  }
  return 'unknown-trace-id';
}

/**
 * Extract span ID from OpenTelemetry span context
 */
export function extractSpanIdFromSpan(span: unknown): string {
  // Get span context and extract span ID
  if (span && typeof span === 'object' && 'spanContext' in span) {
    const spanContext = (span as { spanContext(): SpanContext }).spanContext();
    return spanContext.spanId;
  }
  return 'unknown-span-id';
}

export function createContextFromSpanIds(traceId: string, parentSpanId: string): Context {
  // สร้าง SpanContext
  const spanContext = {
    traceId,
    spanId: parentSpanId,
    traceFlags: 1, // sampled
    isRemote: false,
  };

  // สร้าง NonRecordingSpan จาก SpanContext
  const parentSpan = trace.wrapSpanContext(spanContext);
  
  // สร้าง Context ที่มี parent span
  return trace.setSpan(context.active(), parentSpan);
}