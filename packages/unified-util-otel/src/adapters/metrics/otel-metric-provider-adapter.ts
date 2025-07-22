
// src/adapters/metrics/otel-metric-provider-adapter.ts

import { Meter } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import {
  UnifiedMetricProvider,
  UnifiedCounter,
  UnifiedHistogram,
  UnifiedGauge,
  CounterOptions,
  HistogramOptions,
  GaugeOptions,
  MetricsList
} from '@inh-lib/unified-observe-ability-core';
import { OtelCounterAdapter } from './otel-counter-adapter';
import { OtelHistogramAdapter } from './otel-histogram-adapter';
import { OtelGaugeAdapter } from './otel-gauge-adapter';
import { 
  normalizeMetricName,
  getDefaultHistogramBoundaries
} from '../../utils';

export class OtelMetricProviderAdapter implements UnifiedMetricProvider {
  public readonly name = 'opentelemetry-metrics';
  public readonly isInitialized: boolean = true;

  readonly counters: Map<string, OtelCounterAdapter> = new Map();
  readonly histograms: Map<string, OtelHistogramAdapter> = new Map();
  readonly gauges: Map<string, OtelGaugeAdapter> = new Map();

  constructor(
    readonly meterProvider: MeterProvider,
    readonly serviceName: string
  ) {}

  createCounter(options: CounterOptions): UnifiedCounter {
    const normalizedName = normalizeMetricName(options.name);
    
    if (this.counters.has(normalizedName)) {
      return this.counters.get(normalizedName)!;
    }

    const meter = this.getMeter();
    const otelCounter = meter.createCounter(normalizedName, {
      description: options.description,
      unit: options.unit
    });

    const adapter = new OtelCounterAdapter(
      otelCounter,
      options.name,
      options.description,
      options.unit,
      options.labelKeys
    );

    this.counters.set(normalizedName, adapter);
    return adapter;
  }

  createHistogram(options: HistogramOptions): UnifiedHistogram {
    const normalizedName = normalizeMetricName(options.name);
    
    if (this.histograms.has(normalizedName)) {
      return this.histograms.get(normalizedName)!;
    }

    const meter = this.getMeter();
    const boundaries = options.boundaries || getDefaultHistogramBoundaries();
    
    const otelHistogram = meter.createHistogram(normalizedName, {
      description: options.description,
      unit: options.unit
    });

    const adapter = new OtelHistogramAdapter(
      otelHistogram,
      options.name,
      options.description,
      boundaries,
      options.unit,
      options.labelKeys
    );

    this.histograms.set(normalizedName, adapter);
    return adapter;
  }

  createGauge(options: GaugeOptions): UnifiedGauge {
    const normalizedName = normalizeMetricName(options.name);
    
    if (this.gauges.has(normalizedName)) {
      return this.gauges.get(normalizedName)!;
    }

    const meter = this.getMeter();
    const otelUpDownCounter = meter.createUpDownCounter(normalizedName, {
      description: options.description,
      unit: options.unit
    });

    const adapter = new OtelGaugeAdapter(
      otelUpDownCounter,
      options.name,
      options.description,
      options.unit,
      options.labelKeys
    );

    this.gauges.set(normalizedName, adapter);
    return adapter;
  }

  getCounter(name: string): UnifiedCounter | undefined {
    const normalizedName = normalizeMetricName(name);
    return this.counters.get(normalizedName);
  }

  getHistogram(name: string): UnifiedHistogram | undefined {
    const normalizedName = normalizeMetricName(name);
    return this.histograms.get(normalizedName);
  }

  getGauge(name: string): UnifiedGauge | undefined {
    const normalizedName = normalizeMetricName(name);
    return this.gauges.get(normalizedName);
  }

  getAllMetrics(): MetricsList {
    return {
      counters: Array.from(this.counters.values()),
      histograms: Array.from(this.histograms.values()),
      gauges: Array.from(this.gauges.values())
    };
  }

  async shutdown(): Promise<void> {
    await this.meterProvider.shutdown();
  }

  getMeter(): Meter {
    return this.meterProvider.getMeter(this.serviceName);
  }
}
