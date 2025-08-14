import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetryConfig,
  UnifiedTelemetrySpan,
  UnifiedSpanOptions,
  UnifiedTelemetryCounter,
  UnifiedTelemetryHistogram,
  UnifiedTelemetryGauge,
  UnifiedTelemetryLoggerService
} from '../../interfaces';
import { UnifiedLoggerService } from '../../services/unified-logger.service';
import { 
  generateTraceId,
  generateSpanId
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
  public readonly logger: UnifiedTelemetryLoggerService;
  public readonly tracer: UnifiedTelemetryTracer;
  public readonly metrics: UnifiedTelemetryMetrics;

  constructor(config: UnifiedTelemetryConfig) {
    // Initialize tracer first
    this.tracer = new ConsoleTracer();
    
    // Create console logger service
    this.logger = new ConsoleLoggerService();
    this.metrics = new ConsoleMetrics();
    
    // Log the configuration for debugging purposes
    console.debug('[TELEMETRY] Console provider initialized with config:', config);
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
    return new ConsoleSpan(name, options);
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
  private readonly parentSpan? : UnifiedTelemetrySpan
  public readonly startTime: Date;  // Changed from private to public
  private finished = false;

  constructor(
    private readonly name: string,
    private readonly options?: UnifiedSpanOptions
  ) {
    this.spanId = generateSpanId();
    this.traceId = generateTraceId();
    this.parentSpan = options?.parent;
    this.startTime = new Date();
    
    console.debug(`[SPAN-START] ${name} (${this.spanId})`, {
      kind: options?.kind || 'internal',
      attributes: options?.attributes || {},
      startTime: this.startTime.toISOString(),
    });
  }

  getStartTime(): Date {
    return this.startTime;
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
      name: exception.name,
    });
    return this;
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan {
    console.debug(`[SPAN-EVENT] ${this.name} (${this.spanId}): ${name}`, {
      ...attributes,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  finish(): void {
    if (!this.finished) {
      const endTime = new Date();
      const duration = endTime.getTime() - this.startTime.getTime();
      
      console.debug(`[SPAN-FINISH] ${this.name} (${this.spanId})`, {
        duration: `${duration}ms`,
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      this.finished = true;
    }
  }

  getTraceId(): string {
    return this.traceId;
  }

  getSpanId(): string {
    return this.spanId;
  }
  
  getParentSpanId(): string | undefined {
    return this.parentSpan?.getSpanId();
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
  constructor(private readonly name: string) {}

  set(value: number, labels?: Record<string, string>): void {
    console.debug(`[GAUGE] ${this.name}: ${value}`, labels);
  }
}


/**
 * Console implementation of logger service
 */
class ConsoleLoggerService extends UnifiedLoggerService {
  constructor() {
    // Create a console base logger
    const consoleBaseLogger = {
      debug: (message: string, attributes?: Record<string, unknown>) => 
        console.debug('[DEBUG]', message, attributes),
      info: (message: string, attributes?: Record<string, unknown>) => 
        console.info('[INFO]', message, attributes),
      warn: (message: string, attributes?: Record<string, unknown>) => 
        console.warn('[WARN]', message, attributes),
      error: (message: string, attributes?: Record<string, unknown>) => 
        console.error('[ERROR]', message, attributes),
    };
    
    super(consoleBaseLogger);
  }
}
