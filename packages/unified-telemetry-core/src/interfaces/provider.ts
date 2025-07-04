
import { UnifiedTelemetryTracer } from './tracer';
import { UnifiedTelemetryMetrics } from './metrics';
import { UnifiedTelemetryLoggerService } from './logger';

/**
 * Core telemetry provider interface
 * Pure component holder - no helper methods
 * 
 * This interface provides access to the three core telemetry components:
 * - Logger: For structured logging with trace context
 * - Tracer: For distributed tracing spans
 * - Metrics: For application metrics collection
 */
export interface UnifiedTelemetryProvider {
  /**
   * Root telemetry logger with tracing integration
   */
  readonly logger: UnifiedTelemetryLoggerService;
  
  /**
   * Telemetry tracer for creating spans
   */
  readonly tracer: UnifiedTelemetryTracer;
  
  /**
   * Telemetry metrics for counters, histograms, and gauges
   */
  readonly metrics: UnifiedTelemetryMetrics;
  
  /**
   * Shutdown the provider and flush any pending telemetry data
   */
  shutdown(): Promise<void>;
}