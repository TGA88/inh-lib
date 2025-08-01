// src/internal/types/otel.types.ts

/**
 * Internal OpenTelemetry types
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { Tracer, Span, Meter } from '@opentelemetry/api';

export interface OtelSpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  isRemote: boolean;
}

export interface OtelInstruments {
  counters: Map<string, unknown>;
  histograms: Map<string, unknown>;
  gauges: Map<string, unknown>;
}

export type OtelTracerInstance = Tracer;
export type OtelSpanInstance = Span;
export type OtelMeterInstance = Meter;
