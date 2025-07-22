export const UnifiedMetricType = {
  COUNTER: 'counter',
  HISTOGRAM: 'histogram',
  GAUGE: 'gauge',
  SUMMARY: 'summary'
} as const;

export type UnifiedMetricType = typeof UnifiedMetricType[keyof typeof UnifiedMetricType];