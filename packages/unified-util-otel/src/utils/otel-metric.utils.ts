
// src/utils/otel-metric.utils.ts

import { Attributes, Histogram, Counter, UpDownCounter } from '@opentelemetry/api';
import { LabelSet } from '@inh-lib/unified-observe-ability-core';

export function convertLabelsToAttributes(labels?: LabelSet): Attributes | undefined {
  if (!labels) {
    return undefined;
  }

  const attributes: Attributes = {};
  Object.entries(labels).forEach(([key, value]) => {
    attributes[key] = value;
  });

  return attributes;
}

export function normalizeMetricName(name: string): string {
  // Convert to OpenTelemetry compatible metric name
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function validateMetricValue(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

export function calculateHistogramBoundaries(min: number, max: number, buckets: number): number[] {
  const boundaries: number[] = [];
  const factor = Math.pow(max / min, 1 / (buckets - 1));
  
  for (let i = 0; i < buckets; i++) {
    boundaries.push(min * Math.pow(factor, i));
  }
  
  return boundaries;
}

export function getDefaultHistogramBoundaries(): number[] {
  return [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];
}
