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
import {
  ResourceTrackingService, UnifiedStopResourceMeasurementResult,
  UnifiedResourceMeasurement
} from '@inh-lib/unified-telemetry-middleware';
import { OtelSpanInstance } from '../types/otel.types';
import { convertSpanStatus, extractTraceIdFromSpan, extractSpanIdFromSpan } from '../logic/otel.logic';


export class OtelSpanAdapter implements UnifiedTelemetrySpan {
  public readonly startTime: Date;
  private spanMeasurementUnit: UnifiedResourceMeasurement;
  private currentMeasurementUnit: UnifiedResourceMeasurement;
  private latestMeasurementUnit: UnifiedStopResourceMeasurementResult;

  constructor(private readonly otelSpan: OtelSpanInstance, startTime: Date, private readonly parentSpan?: UnifiedTelemetrySpanMetadata) {
    this.startTime = startTime;
    this.spanMeasurementUnit = ResourceTrackingService.startTracking();
    this.currentMeasurementUnit = this.spanMeasurementUnit;
    this.latestMeasurementUnit = ResourceTrackingService.stopTracking(this.spanMeasurementUnit);
  }
  getCurrentMeasurementUnit(): UnifiedResourceMeasurement {
    return this.currentMeasurementUnit;
  }
  getLatestMeasurementUnit(): UnifiedStopResourceMeasurementResult {
    return this.latestMeasurementUnit;
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
    // calculate latest measurement unit
    
    this.latestMeasurementUnit = ResourceTrackingService.stopTracking(this.currentMeasurementUnit);
    this.currentMeasurementUnit = this.latestMeasurementUnit.endMeasurement;

    // ลบ endMeasurement ออก
    const {endMeasurement, ...restObj} = this.latestMeasurementUnit;

    const attr = {...attributes, ...restObj};

    // add event with resource measurement attributes
    this.otelSpan.addEvent(name, attr);
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
