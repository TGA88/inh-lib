// src/internal/adapters/otel-span.adapter.ts

/**
 * OpenTelemetry Span Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */
 

import { 
  UnifiedTelemetrySpan, 
  UnifiedSpanStatus, 
  UnifiedTelemetrySpanMetadata
} from '@inh-lib/unified-telemetry-core';
import { OtelSpanInstance } from '../types/otel.types';
import { convertSpanStatus, extractTraceIdFromSpan, extractSpanIdFromSpan } from '../logic/otel.logic';

export class OtelSpanAdapter implements UnifiedTelemetrySpan {
  public readonly startTime: Date;

  constructor(private readonly otelSpan: OtelSpanInstance, startTime: Date, private readonly parentSpan?: UnifiedTelemetrySpanMetadata) {
    this.startTime = startTime;
  }
  
  getStartTime(): Date {
    return this.startTime;
  }

  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan {
    this.otelSpan.setAttribute(key, value);

    return this;
  }

  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan {
    const otelStatusCode = convertSpanStatus(status.code);
    this.otelSpan.setStatus({
      code: otelStatusCode,
      message: status.message,
    });
    return this;
  }

  recordException(exception: Error): UnifiedTelemetrySpan {
    this.otelSpan.recordException(exception);
    return this;
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan {
    this.otelSpan.addEvent(name, attributes);
    return this;
  }

  finish(): void {
    this.otelSpan.end();
  }

  getTraceId(): string {
    return extractTraceIdFromSpan(this.otelSpan);
  }

  getSpanId(): string {
    return extractSpanIdFromSpan(this.otelSpan);
  }

  getParentSpanId(): string | undefined {
    const parent = this.parentSpan;
    return parent ? parent.spanId : undefined;
  }
getSpanMetadata(): UnifiedTelemetrySpanMetadata | undefined {
  return {
    traceId: this.getTraceId(),
    spanId: this.getSpanId(),
    parentSpanId: this.getParentSpanId()
  };
}

}
