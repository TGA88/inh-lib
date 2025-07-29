import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetrySpan,
  UnifiedTelemetryCounter,
  UnifiedTelemetryHistogram,
  UnifiedTelemetryGauge
} from '../../interfaces';
import { NoOpUnifiedTelemetryLogger } from '../loggers/noop-telemetry-logger';

/**
 * No-op implementation of UnifiedTelemetryProvider
 * 
 * This provider does nothing and is used when telemetry is disabled
 * or for testing purposes where telemetry output is not desired.
 * 
 * ✅ No private methods - all methods are straightforward no-ops
 * ✅ No 'any' types - fully typed
 */
export class NoOpUnifiedTelemetryProvider implements UnifiedTelemetryProvider {
  public readonly logger: UnifiedTelemetryLogger;
  public readonly tracer: UnifiedTelemetryTracer;
  public readonly metrics: UnifiedTelemetryMetrics;

  constructor() {
    this.logger = new NoOpUnifiedTelemetryLogger();
    this.tracer = new NoOpTracer();
    this.metrics = new NoOpMetrics();
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

/**
 * No-op implementation of tracer
 */
class NoOpTracer implements UnifiedTelemetryTracer {
  startSpan(): UnifiedTelemetrySpan {
    return new NoOpSpan();
  }

  getActiveSpan(): UnifiedTelemetrySpan | undefined {
    return undefined;
  }

  getCurrentTraceId(): string | undefined {
    return undefined;
  }

  getCurrentSpanId(): string | undefined {
    return undefined;
  }
}

/**
 * No-op implementation of span
 */
class NoOpSpan implements UnifiedTelemetrySpan {
  setTag(): UnifiedTelemetrySpan {
    return this;
  }

  setStatus(): UnifiedTelemetrySpan {
    return this;
  }

  recordException(): UnifiedTelemetrySpan {
    return this;
  }

  addEvent(): UnifiedTelemetrySpan {
    return this;
  }

  finish(): void {
    // No-op
  }

  getTraceId(): string {
    return 'noop';
  }

  getSpanId(): string {
    return 'noop';
  }
}

/**
 * No-op implementation of metrics
 */
class NoOpMetrics implements UnifiedTelemetryMetrics {
  createCounter(): UnifiedTelemetryCounter {
    return new NoOpCounter();
  }

  createHistogram(): UnifiedTelemetryHistogram {
    return new NoOpHistogram();
  }

  createGauge(): UnifiedTelemetryGauge {
    return new NoOpGauge();
  }
}

/**
 * No-op counter implementation
 */
class NoOpCounter implements UnifiedTelemetryCounter {
  add(): void {
    // No-op
  }
}

/**
 * No-op histogram implementation
 */
class NoOpHistogram implements UnifiedTelemetryHistogram {
  record(): void {
    // No-op
  }
}

/**
 * No-op gauge implementation
 */
class NoOpGauge implements UnifiedTelemetryGauge {
  set(): void {
    // No-op
  }
}