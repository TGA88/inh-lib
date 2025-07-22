// src/adapters/metrics/otel-counter-adapter.ts

import { Counter } from '@opentelemetry/api';
import { 
  UnifiedCounter,
  LabelSet
} from '@inh-lib/unified-observe-ability-core';
import { 
  convertLabelsToAttributes,
  validateMetricValue
} from '../../utils';

export class OtelCounterAdapter implements UnifiedCounter {
  public readonly labelKeys: string[];

  constructor(
    readonly otelCounter: Counter,
    public readonly name: string,
    public readonly description: string,
    public readonly unit?: string,
    labelKeys?: string[]
  ) {
    this.labelKeys = labelKeys || [];
  }

  increment(labels?: LabelSet, value = 1): void {
    if (!validateMetricValue(value)) {
      throw new Error(`Invalid counter value: ${value}`);
    }

    if (value < 0) {
      throw new Error('Counter value must be non-negative');
    }

    const attributes = convertLabelsToAttributes(labels);
    this.otelCounter.add(value, attributes);
  }

  get(labels?: LabelSet): number {
    // OpenTelemetry API doesn't provide direct value access
    // This would require custom metric reader implementation
    throw new Error('Counter value retrieval not supported in OpenTelemetry implementation');
  }
}
