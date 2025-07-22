
// src/adapters/metrics/otel-histogram-adapter.ts

import { Histogram } from '@opentelemetry/api';
import { 
  UnifiedHistogram,
  LabelSet,
  HistogramBucketCounts
} from '@inh-lib/unified-observe-ability-core';
import { 
  convertLabelsToAttributes,
  validateMetricValue
} from '../../utils';

export class OtelHistogramAdapter implements UnifiedHistogram {
  public readonly labelKeys: string[];

  constructor(
    readonly otelHistogram: Histogram,
    public readonly name: string,
    public readonly description: string,
    public readonly boundaries: number[],
    public readonly unit?: string,
    labelKeys?: string[]
  ) {
    this.labelKeys = labelKeys || [];
  }

  record(value: number, labels?: LabelSet): void {
    if (!validateMetricValue(value)) {
      throw new Error(`Invalid histogram value: ${value}`);
    }

    if (value < 0) {
      throw new Error('Histogram value must be non-negative');
    }

    const attributes = convertLabelsToAttributes(labels);
    this.otelHistogram.record(value, attributes);
  }

  getPercentile(percentile: number, labels?: LabelSet): number {
    // OpenTelemetry API doesn't provide direct percentile calculation
    // This would require custom aggregation implementation
    throw new Error('Percentile calculation not supported in OpenTelemetry implementation');
  }

  getBucketCounts(labels?: LabelSet): HistogramBucketCounts {
    // OpenTelemetry API doesn't provide direct bucket access
    // This would require custom metric reader implementation
    throw new Error('Bucket counts retrieval not supported in OpenTelemetry implementation');
  }
}
