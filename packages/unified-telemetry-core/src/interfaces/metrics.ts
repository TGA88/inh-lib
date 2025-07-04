/**
 * Telemetry metrics interface for creating metric instruments
 */
export interface UnifiedTelemetryMetrics {
  /**
   * Create a counter metric for tracking cumulative values
   */
  createCounter(name: string, description?: string): UnifiedTelemetryCounter;
  
  /**
   * Create a histogram metric for tracking distributions of values
   */
  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram;
  
  /**
   * Create a gauge metric for tracking point-in-time values
   */
  createGauge(name: string, description?: string): UnifiedTelemetryGauge;
}

/**
 * Counter metric interface for monotonically increasing values
 * Examples: request counts, error counts, bytes processed
 */
export interface UnifiedTelemetryCounter {
  /**
   * Add a value to the counter with optional labels
   */
  add(value: number, labels?: Record<string, string>): void;
}

/**
 * Histogram metric interface for distributions of values
 * Examples: request durations, response sizes, latencies
 */
export interface UnifiedTelemetryHistogram {
  /**
   * Record a value in the histogram with optional labels
   */
  record(value: number, labels?: Record<string, string>): void;
}

/**
 * Gauge metric interface for point-in-time values
 * Examples: current memory usage, active connections, queue size
 */
export interface UnifiedTelemetryGauge {
  /**
   * Set the gauge to a specific value with optional labels
   */
  set(value: number, labels?: Record<string, string>): void;
}