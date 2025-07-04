// src/internal/adapters/otel-metrics.adapter.ts

/**
 * OpenTelemetry Metrics Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetryMetrics, 
  UnifiedTelemetryCounter, 
  UnifiedTelemetryHistogram, 
  UnifiedTelemetryGauge 
} from '@inh-lib/unified-telemetry-core';
import { OtelMeterInstance, OtelInstruments } from '../types/otel.types';

export class OtelMetricsAdapter implements UnifiedTelemetryMetrics {
  private readonly instruments: OtelInstruments = {
    counters: new Map(),
    histograms: new Map(),
    gauges: new Map(),
  };

  constructor(private readonly otelMeter: OtelMeterInstance) {}

  createCounter(name: string, description?: string): UnifiedTelemetryCounter {
    const counter = this.otelMeter.createCounter(name, { description });
    this.instruments.counters.set(name, counter);
    
    return {
      add: (value: number, labels?: Record<string, string>) => {
        counter.add(value, labels);
      },
    };
  }

  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram {
    const histogram = this.otelMeter.createHistogram(name, { description });
    this.instruments.histograms.set(name, histogram);
    
    return {
      record: (value: number, labels?: Record<string, string>) => {
        histogram.record(value, labels);
      },
    };
  }

  createGauge(name: string, description?: string): UnifiedTelemetryGauge {
    const gauge = this.otelMeter.createUpDownCounter(name, { description });
    this.instruments.gauges.set(name, gauge);
    
    let currentValue = 0;
    
    return {
      set: (value: number, labels?: Record<string, string>) => {
        const delta = value - currentValue;
        gauge.add(delta, labels);
        currentValue = value;
      },
    };
  }
}
