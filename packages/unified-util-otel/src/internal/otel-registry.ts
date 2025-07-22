
// src/internal/otel-registry.ts

import { Meter, Tracer } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OtelInternalRegistry } from '../types';

export class OtelRegistry {
  readonly meters: Map<string, Meter> = new Map();
  readonly tracers: Map<string, Tracer> = new Map();
  meterProvider?: MeterProvider;
  tracerProvider?: NodeTracerProvider;

  registerMeter(name: string, meter: Meter): void {
    this.meters.set(name, meter);
  }

  getMeter(name: string): Meter | undefined {
    return this.meters.get(name);
  }

  registerTracer(name: string, tracer: Tracer): void {
    this.tracers.set(name, tracer);
  }

  getTracer(name: string): Tracer | undefined {
    return this.tracers.get(name);
  }

  setMeterProvider(provider: MeterProvider): void {
    this.meterProvider = provider;
  }

  setTracerProvider(provider: NodeTracerProvider): void {
    this.tracerProvider = provider;
  }

  getAllMeters(): Map<string, Meter> {
    return new Map(this.meters);
  }

  getAllTracers(): Map<string, Tracer> {
    return new Map(this.tracers);
  }

  getInternalState(): OtelInternalRegistry {
    return {
      meters: new Map(this.meters),
      tracers: new Map(this.tracers),
      meterProvider: this.meterProvider,
      tracerProvider: this.tracerProvider
    };
  }

  clear(): void {
    this.meters.clear();
    this.tracers.clear();
    this.meterProvider = undefined;
    this.tracerProvider = undefined;
  }

  getMetricsCount(): number {
    return this.meters.size;
  }

  getTracersCount(): number {
    return this.tracers.size;
  }
}
