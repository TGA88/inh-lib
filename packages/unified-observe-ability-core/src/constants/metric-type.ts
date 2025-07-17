export const MetricType = {
  COUNTER: 'counter',
  HISTOGRAM: 'histogram',
  GAUGE: 'gauge',
  SUMMARY: 'summary'
} as const;

export type MetricType = typeof MetricType[keyof typeof MetricType];