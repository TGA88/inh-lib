
// src/adapters/metrics/otel-gauge-adapter.ts

import { UpDownCounter } from '@opentelemetry/api';
import { 
  UnifiedGauge,
  LabelSet
} from '@inh-lib/unified-observe-ability-core';
import { 
  convertLabelsToAttributes,
  validateMetricValue
} from '../../utils';

export class OtelGaugeAdapter implements UnifiedGauge {
  public readonly labelKeys: string[];
  readonly currentValues: Map<string, number>;

  constructor(
    readonly otelUpDownCounter: UpDownCounter,
    public readonly name: string,
    public readonly description: string,
    public readonly unit?: string,
    labelKeys?: string[]
  ) {
    this.labelKeys = labelKeys || [];
    this.currentValues = new Map();
  }

  set(value: number, labels?: LabelSet): void {
    if (!validateMetricValue(value)) {
      throw new Error(`Invalid gauge value: ${value}`);
    }

    const attributes = convertLabelsToAttributes(labels);
    const labelsKey = createLabelsKey(labels);
    const currentValue = this.currentValues.get(labelsKey) || 0;
    const delta = value - currentValue;

    this.otelUpDownCounter.add(delta, attributes);
    this.currentValues.set(labelsKey, value);
  }

  add(value: number, labels?: LabelSet): void {
    if (!validateMetricValue(value)) {
      throw new Error(`Invalid gauge delta: ${value}`);
    }

    const attributes = convertLabelsToAttributes(labels);
    const labelsKey = createLabelsKey(labels);
    const currentValue = this.currentValues.get(labelsKey) || 0;
    const newValue = currentValue + value;

    this.otelUpDownCounter.add(value, attributes);
    this.currentValues.set(labelsKey, newValue);
  }

  subtract(value: number, labels?: LabelSet): void {
    this.add(-value, labels);
  }

  get(labels?: LabelSet): number {
    const labelsKey = createLabelsKey(labels);
    return this.currentValues.get(labelsKey) || 0;
  }
}

function createLabelsKey(labels?: LabelSet): string {
  if (!labels) return '';
  
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}
