
// src/internal/testing.ts

import { OtelRegistry } from './otel-registry';
import { OtelExporterManager } from './otel-exporter-manager';
import { OtelInstrumentationManager } from './otel-instrumentation-manager';
import { OtelCounterAdapter } from '../adapters/metrics/otel-counter-adapter';
import { OtelHistogramAdapter } from '../adapters/metrics/otel-histogram-adapter';
import { OtelGaugeAdapter } from '../adapters/metrics/otel-gauge-adapter';
import { OtelSpanAdapter } from '../adapters/tracing/otel-span-adapter';
import {
  OtelMetricSnapshot,
  OtelSpanSnapshot,
  OtelEventSnapshot
} from '../types';

export class TestableOtelRegistry extends OtelRegistry {
  getMetersCount(): number {
    return this.getAllMeters().size;
  }
  
  getTracersCount(): number {
    return this.getAllTracers().size;
  }
  
  getRegisteredMeterNames(): string[] {
    return Array.from(this.getAllMeters().keys());
  }
  
  getRegisteredTracerNames(): string[] {
    return Array.from(this.getAllTracers().keys());
  }
}

export class TestableOtelCounterAdapter extends OtelCounterAdapter {
  readonly recordedValues: Array<{ value: number; labels?: Record<string, string> }> = [];
  
  increment(labels?: Record<string, string>, value: number = 1): void {
    super.increment(labels, value);
    this.recordedValues.push({ value, labels });
  }
  
  getRecordedValues(): Array<{ value: number; labels?: Record<string, string> }> {
    return [...this.recordedValues];
  }
  
  reset(): void {
    this.recordedValues.length = 0;
  }
}

export class TestableOtelHistogramAdapter extends OtelHistogramAdapter {
  readonly recordedValues: Array<{ value: number; labels?: Record<string, string> }> = [];
  
  record(value: number, labels?: Record<string, string>): void {
    super.record(value, labels);
    this.recordedValues.push({ value, labels });
  }
  
  getRecordedValues(): Array<{ value: number; labels?: Record<string, string> }> {
    return [...this.recordedValues];
  }
  
  reset(): void {
    this.recordedValues.length = 0;
  }
}

export class TestableOtelGaugeAdapter extends OtelGaugeAdapter {
  readonly recordedOperations: Array<{ 
    operation: 'set' | 'add' | 'subtract';
    value: number; 
    labels?: Record<string, string>;
  }> = [];
  
  set(value: number, labels?: Record<string, string>): void {
    super.set(value, labels);
    this.recordedOperations.push({ operation: 'set', value, labels });
  }
  
  add(value: number, labels?: Record<string, string>): void {
    super.add(value, labels);
    this.recordedOperations.push({ operation: 'add', value, labels });
  }
  
  subtract(value: number, labels?: Record<string, string>): void {
    super.subtract(value, labels);
    this.recordedOperations.push({ operation: 'subtract', value, labels });
  }
  
  getRecordedOperations(): Array<{ 
    operation: 'set' | 'add' | 'subtract';
    value: number; 
    labels?: Record<string, string>;
  }> {
    return [...this.recordedOperations];
  }
  
  reset(): void {
    this.recordedOperations.length = 0;
    this.currentValues.clear();
  }
}

export class TestableOtelSpanAdapter extends OtelSpanAdapter {
  readonly recordedAttributes: Map<string, string | number | boolean> = new Map();
  readonly recordedEvents: OtelEventSnapshot[] = [];
  spanStatus?: { code: string; message?: string };
  spanEnded: boolean = false;
  endTimestamp?: number;

  setAttributes(attributes: Record<string, string | number | boolean>): OtelSpanAdapter {
    super.setAttributes(attributes);
    Object.entries(attributes).forEach(([key, value]) => {
      this.recordedAttributes.set(key, value);
    });
    return this;
  }

  setAttribute(key: string, value: string | number | boolean): OtelSpanAdapter {
    super.setAttribute(key, value);
    this.recordedAttributes.set(key, value);
    return this;
  }

  setStatus(status: { code: string; message?: string }): OtelSpanAdapter {
    super.setStatus(status);
    this.spanStatus = status;
    return this;
  }

  addEvent(
    name: string, 
    attributes?: Record<string, unknown>, 
    timestamp?: number
  ): OtelSpanAdapter {
    super.addEvent(name, attributes, timestamp);
    this.recordedEvents.push({
      name,
      timestamp: timestamp || Date.now(),
      attributes
    });
    return this;
  }

  end(endTime?: number): void {
    super.end(endTime);
    this.spanEnded = true;
    this.endTimestamp = endTime || Date.now();
  }

  getRecordedAttributes(): Record<string, string | number | boolean> {
    return Object.fromEntries(this.recordedAttributes);
  }

  getRecordedEvents(): OtelEventSnapshot[] {
    return [...this.recordedEvents];
  }

  getStatus(): { code: string; message?: string } | undefined {
    return this.spanStatus;
  }

  isEnded(): boolean {
    return this.spanEnded;
  }

  getDuration(): number | undefined {
    if (this.spanEnded && this.endTimestamp) {
      return this.endTimestamp - this.startTime;
    }
    return undefined;
  }

  reset(): void {
    this.recordedAttributes.clear();
    this.recordedEvents.length = 0;
    this.spanStatus = undefined;
    this.spanEnded = false;
    this.endTimestamp = undefined;
  }
}

export function createTestOtelCounterAdapter(
  name: string, 
  description: string
): TestableOtelCounterAdapter {
  // Mock OpenTelemetry Counter
  const mockOtelCounter = {
    add: jest.fn()
  };
  
  return new TestableOtelCounterAdapter(
    mockOtelCounter as any,
    name,
    description
  );
}

export function createTestOtelSpanAdapter(
  name: string,
  startTime: number = Date.now()
): TestableOtelSpanAdapter {
  // Mock OpenTelemetry Span
  const mockOtelSpan = {
    spanContext: () => ({
      traceId: '12345678901234567890123456789012',
      spanId: '1234567890123456',
      traceFlags: 1
    }),
    setAttributes: jest.fn(),
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    updateName: jest.fn(),
    addEvent: jest.fn(),
    end: jest.fn(),
    isRecording: () => true
  };
  
  return new TestableOtelSpanAdapter(
    mockOtelSpan as any,
    name,
    'INTERNAL',
    startTime
  );
}

