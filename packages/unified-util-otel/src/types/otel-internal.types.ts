
// src/types/otel-internal.types.ts

import { Meter, Tracer } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

export interface OtelInternalRegistry {
  readonly meters: Map<string, Meter>;
  readonly tracers: Map<string, Tracer>;
  readonly meterProvider?: MeterProvider;
  readonly tracerProvider?: NodeTracerProvider;
}

export interface OtelExporterInstance {
  readonly type: string;
  readonly exporter: unknown;
  readonly isInitialized: boolean;
}

export interface OtelInstrumentationInstance {
  readonly name: string;
  readonly instrumentation: unknown;
  readonly isEnabled: boolean;
}

export interface OtelMetricSnapshot {
  readonly name: string;
  readonly type: 'counter' | 'histogram' | 'gauge';
  readonly description: string;
  readonly unit?: string;
  readonly values: OtelMetricValue[];
}

export interface OtelMetricValue {
  readonly labels: Record<string, string>;
  readonly value: number;
  readonly timestamp: number;
}

export interface OtelSpanSnapshot {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: string;
  readonly status: string;
  readonly attributes: Record<string, string | number | boolean>;
  readonly events: OtelEventSnapshot[];
  readonly startTime: number;
  readonly endTime?: number;
  readonly duration?: number;
}

export interface OtelEventSnapshot {
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: Record<string, unknown>;
}

