import { UnifiedCounter, UnifiedCounterOptions } from '../metrics/counter';
import { UnifiedHistogram, UnifiedHistogramOptions } from '../metrics/histogram';
import { UnifiedGauge, UnifiedGaugeOptions } from '../metrics/gauge';

export interface UnifiedMetricProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  createCounter(options: UnifiedCounterOptions): UnifiedCounter;
  createHistogram(options: UnifiedHistogramOptions): UnifiedHistogram;
  createGauge(options: UnifiedGaugeOptions): UnifiedGauge;
  
  getCounter(name: string): UnifiedCounter | undefined;
  getHistogram(name: string): UnifiedHistogram | undefined;
  getGauge(name: string): UnifiedGauge | undefined;
  
  getAllMetrics(): UnifiedMetricsList;
  shutdown(): Promise<void>;
}

export interface UnifiedMetricsList {
  readonly counters: UnifiedCounter[];
  readonly histograms: UnifiedHistogram[];
  readonly gauges: UnifiedGauge[];
}

export interface UnifiedMetricExporter {
  export(): Promise<UnifiedMetricsExportResult>;
}

export interface UnifiedMetricsExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly metricsCount: number;
  readonly timestamp: number;
}