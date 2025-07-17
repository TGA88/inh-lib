import { LabelSet } from './labels';

export interface UnifiedHistogram {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  readonly boundaries: number[];
  
  record(value: number, labels?: LabelSet): void;
  getPercentile(percentile: number, labels?: LabelSet): number;
  getBucketCounts(labels?: LabelSet): HistogramBucketCounts;
}

export interface HistogramOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly boundaries?: number[];
  readonly labelKeys?: string[];
}

export interface HistogramBucketCounts {
  readonly buckets: HistogramBucket[];
  readonly count: number;
  readonly sum: number;
}

export interface HistogramBucket {
  readonly upperBound: number;
  readonly count: number;
}

export interface HistogramValue {
  readonly labels: LabelSet;
  readonly buckets: HistogramBucket[];
  readonly count: number;
  readonly sum: number;
  readonly timestamp: number;
}

export const DEFAULT_HISTOGRAM_BOUNDARIES = [
  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0
];