import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetryConfig,
  UnifiedTelemetrySpan,
  UnifiedSpanOptions,
  UnifiedTelemetryCounter,
  UnifiedTelemetryHistogram,
  UnifiedTelemetryGauge,
} from '../../interfaces';
import { ConsoleUnifiedTelemetryLogger } from '../loggers/console-telemetry-logger';
import { 
  createRootLoggerContext,
  generateTraceId,
  generateSpanId,
  createDefaultSpanOptions 
} from '../../utils';

/**
 * Console implementation of UnifiedTelemetryProvider
 * 
 * This provider outputs all telemetry data to the console,
 * useful for development and debugging purposes.
 * 
 * ✅ No private methods - uses utils functions instead
 * ✅ No 'any' types - fully typed
 */
export class ConsoleUnifiedTelemetryProvider implements UnifiedTelemetryProvider {
  public readonly logger: UnifiedTelemetryLogger;
  public readonly tracer: UnifiedTelemetryTracer;
  public readonly metrics: UnifiedTelemetryMetrics;

  constructor(config: UnifiedTelemetryConfig) {
    // Create root logger context
    const rootContext = createRootLoggerContext(
      generateTraceId(),
      'console_root',
      'http',
      'utility',
      {
        'service.name': config.serviceName,
        'service.version': config.serviceVersion,
        'service.environment': config.environment,
        'logger.type': 'console',
      }
    );

    // Initialize components
    this.logger = new ConsoleUnifiedTelemetryLogger(rootContext);
    this.tracer = new ConsoleTracer();
    this.metrics = new ConsoleMetrics();
  }

  async shutdown(): Promise<void> {
    console.log('[TELEMETRY] Console provider shutdown');
  }
}

/**
 * Console implementation of tracer
 */
class ConsoleTracer implements UnifiedTelemetryTracer {
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan {
    const spanOptions = createDefaultSpanOptions(options?.kind, options?.attributes);
    return new ConsoleSpan(name, spanOptions);
  }

  getActiveSpan(): UnifiedTelemetrySpan | undefined {
    // Console tracer doesn't track active spans
    return undefined;
  }

  getCurrentTraceId(): string | undefined {
    // Console tracer doesn't track current trace
    return undefined;
  }

  getCurrentSpanId(): string | undefined {
    // Console tracer doesn't track current span
    return undefined;
  }
}

/**
 * Console implementation of span
 */
class ConsoleSpan implements UnifiedTelemetrySpan {
  private readonly spanId: string;
  private readonly traceId: string;
  private finished = false;

  constructor(
    private readonly name: string,
    private readonly options: UnifiedSpanOptions
  ) {
    this.spanId = generateSpanId();
    this.traceId = generateTraceId();
    
    console.debug(`[SPAN-START] ${name} (${this.spanId})`, {
      kind: options.kind,
      attributes: options.attributes,
    });
  }

  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan {
    console.debug(`[SPAN-TAG] ${this.name} (${this.spanId}): ${key}=${value}`);
    return this;
  }

  setStatus(status: { code: string; message?: string }): UnifiedTelemetrySpan {
    console.debug(`[SPAN-STATUS] ${this.name} (${this.spanId}):`, status);
    return this;
  }

  recordException(exception: Error): UnifiedTelemetrySpan {
    console.debug(`[SPAN-EXCEPTION] ${this.name} (${this.spanId}):`, {
      message: exception.message,
      stack: exception.stack,
    });
    return this;
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan {
    console.debug(`[SPAN-EVENT] ${this.name} (${this.spanId}): ${name}`, attributes);
    return this;
  }

  finish(): void {
    if (!this.finished) {
      console.debug(`[SPAN-FINISH] ${this.name} (${this.spanId})`);
      this.finished = true;
    }
  }

  getTraceId(): string {
    return this.traceId;
  }

  getSpanId(): string {
    return this.spanId;
  }
}

/**
 * Console implementation of metrics
 */
class ConsoleMetrics implements UnifiedTelemetryMetrics {
  createCounter(name: string, description?: string): UnifiedTelemetryCounter {
    console.debug(`[METRIC-COUNTER] Created: ${name} - ${description || 'No description'}`);
    return new ConsoleCounter(name);
  }

  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram {
    console.debug(`[METRIC-HISTOGRAM] Created: ${name} - ${description || 'No description'}`);
    return new ConsoleHistogram(name);
  }

  createGauge(name: string, description?: string): UnifiedTelemetryGauge {
    console.debug(`[METRIC-GAUGE] Created: ${name} - ${description || 'No description'}`);
    return new ConsoleGauge(name);
  }
}

/**
 * Console counter implementation
 */
class ConsoleCounter implements UnifiedTelemetryCounter {
  constructor(private readonly name: string) {}

  add(value: number, labels?: Record<string, string>): void {
    console.debug(`[COUNTER] ${this.name}: +${value}`, labels);
  }
}

/**
 * Console histogram implementation
 */
class ConsoleHistogram implements UnifiedTelemetryHistogram {
  constructor(private readonly name: string) {}

  record(value: number, labels?: Record<string, string>): void {
    console.debug(`[HISTOGRAM] ${this.name}: ${value}`, labels);
  }
}

/**
 * Console gauge implementation
 */
class ConsoleGauge implements UnifiedTelemetryGauge {
  constructor(private  readonly name: string) {}

  set(value: number, labels?: Record<string, string>): void {
    console.debug(`[GAUGE] ${this.name}: ${value}`, labels);
  }
}