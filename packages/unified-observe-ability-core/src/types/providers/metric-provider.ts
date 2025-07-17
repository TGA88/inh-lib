import { UnifiedCounter, CounterOptions } from '../metrics/counter';
import { UnifiedHistogram, HistogramOptions } from '../metrics/histogram';
import { UnifiedGauge, GaugeOptions } from '../metrics/gauge';

export interface UnifiedMetricProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  createCounter(options: CounterOptions): UnifiedCounter;
  createHistogram(options: HistogramOptions): UnifiedHistogram;
  createGauge(options: GaugeOptions): UnifiedGauge;
  
  getCounter(name: string): UnifiedCounter | undefined;
  getHistogram(name: string): UnifiedHistogram | undefined;
  getGauge(name: string): UnifiedGauge | undefined;
  
  getAllMetrics(): MetricsList;
  shutdown(): Promise<void>;
}

export interface MetricsList {
  readonly counters: UnifiedCounter[];
  readonly histograms: UnifiedHistogram[];
  readonly gauges: UnifiedGauge[];
}

export interface MetricExporter {
  export(): Promise<MetricsExportResult>;
}

export interface MetricsExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly metricsCount: number;
  readonly timestamp: number;
}