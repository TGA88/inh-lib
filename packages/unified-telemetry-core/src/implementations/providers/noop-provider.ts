import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetrySpan,
  UnifiedTelemetryCounter,
  UnifiedTelemetryHistogram,
  UnifiedTelemetryGauge,
  UnifiedTelemetryConfig,
  UnifiedSpanOptions,
  UnifiedTelemetryLoggerService
} from '../../interfaces';
import { UnifiedLoggerService } from '../../services/unified-logger.service';

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
  public readonly logger: UnifiedTelemetryLoggerService;
  public readonly tracer: UnifiedTelemetryTracer;
  public readonly metrics: UnifiedTelemetryMetrics;

  constructor(_config?: UnifiedTelemetryConfig) {
    this.tracer = new NoOpTracer();
    this.logger = new NoOpLoggerService();
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
  startSpan(_name?: string, _options?: UnifiedSpanOptions): UnifiedTelemetrySpan {
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
  public readonly startTime: Date = new Date();

  getStartTime(): Date {
    return this.startTime;
  }

  setTag(_key: string, _value: string | number | boolean): UnifiedTelemetrySpan {
    return this;
  }

  setStatus(_status: { code: string; message?: string }): UnifiedTelemetrySpan {
    return this;
  }

  recordException(_exception: Error): UnifiedTelemetrySpan {
    return this;
  }

  addEvent(_name: string, _attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan {
    return this;
  }

  finish(): void {
    // No-op
  }

  getTraceId(): string {
    return 'noop-trace-id';
  }

  getSpanId(): string {
    return 'noop-span-id';
  }
  getParentSpanId(): string {
    return 'noop-parent-span-id';
  }
}

/**
 * No-op implementation of metrics
 */
class NoOpMetrics implements UnifiedTelemetryMetrics {
  createCounter(_name?: string, _description?: string): UnifiedTelemetryCounter {
    return new NoOpCounter();
  }

  createHistogram(_name?: string, _description?: string): UnifiedTelemetryHistogram {
    return new NoOpHistogram();
  }

  createGauge(_name?: string, _description?: string): UnifiedTelemetryGauge {
    return new NoOpGauge();
  }
}

/**
 * No-op counter implementation
 */
class NoOpCounter implements UnifiedTelemetryCounter {
  add(_value?: number, _labels?: Record<string, string>): void {
    // No-op
  }
}

/**
 * No-op histogram implementation
 */
class NoOpHistogram implements UnifiedTelemetryHistogram {
  record(_value?: number, _labels?: Record<string, string>): void {
    // No-op
  }
}

/**
 * No-op gauge implementation
 */
class NoOpGauge implements UnifiedTelemetryGauge {
  set(_value?: number, _labels?: Record<string, string>): void {
    // No-op
  }
}

/**
 * No-op implementation of logger service
 */
class NoOpLoggerService extends UnifiedLoggerService {
  constructor() {
    // Create a no-op base logger
    const noOpBaseLogger = {
      debug: (_message: string, _attributes?: Record<string, unknown>) => {
        // No-op
      },
      info: (_message: string, _attributes?: Record<string, unknown>) => {
        // No-op
      },
      warn: (_message: string, _attributes?: Record<string, unknown>) => {
        // No-op
      },
      error: (_message: string, _attributes?: Record<string, unknown>) => {
        // No-op
      },
    };
    
    super(noOpBaseLogger);
  }
}