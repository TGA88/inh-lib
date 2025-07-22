import { UnifiedLabelSet } from './labels';

export interface UnifiedHistogram {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  readonly boundaries: number[];
  
  record(value: number, labels?: UnifiedLabelSet): void;
  getPercentile(percentile: number, labels?: UnifiedLabelSet): number;
  getBucketCounts(labels?: UnifiedLabelSet): UnifiedUnifiedHistogramBucketCounts;
}

export interface UnifiedHistogramOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly boundaries?: number[];
  readonly labelKeys?: string[];
}

export interface UnifiedUnifiedHistogramBucketCounts {
  readonly buckets: UnifiedHistogramBucket[];
  readonly count: number;
  readonly sum: number;
}

export interface UnifiedHistogramBucket {
  readonly upperBound: number;
  readonly count: number;
}

export interface UnifiedHistogramValue {
  readonly labels: UnifiedLabelSet;
  readonly buckets: UnifiedHistogramBucket[];
  readonly count: number;
  readonly sum: number;
  readonly timestamp: number;
}

export const DEFAULT_HISTOGRAM_BOUNDARIES = [
  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0
];