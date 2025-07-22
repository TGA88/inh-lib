# 📦 Unified Observability Library Architecture Plan

## 🏗️ Overall Package Structure

```
packages/
├── @inh-lib/unified-observe-ability-core/      # Core types & interfaces
│
├── vendor-adapters/                            # Vendor-specific implementations
│   ├── @inh-lib/unified-metrics-prometheus/    # Prometheus metrics
│   ├── @inh-lib/unified-metrics-datadog/       # DataDog metrics  
│   ├── @inh-lib/unified-tracing-jaeger/        # Jaeger tracing
│   ├── @inh-lib/unified-tracing-awsxray/       # AWS X-Ray tracing
│   ├── @inh-lib/unified-tracing-datadog/       # DataDog tracing
│   ├── @inh-lib/unified-logging-winston/       # Winston logging
│   ├── @inh-lib/unified-logging-pino/          # Pino logging
│   └── @inh-lib/unified-util-otel/             # OpenTelemetry (all-in-one)
│
├── @inhl-lib/unified-observe-ability/           # Main provider & context
│
├── framework-adapters/                         # Framework-specific integrations
│   ├── @inh-lib/api-utils-fastify/             # Fastify-specific adapter
│   ├── @inh-lib/api-utils-hono/                # Hono-specific adapter
│   └── @inh-lib/api-utils-express/             # Express-specific adapter
│
└── project-api-service/                         # Entry point application
```

---

## 📁 Package 1: `@inh-lib/unified-observe-ability-core`

### 🎯 Purpose
Core types และ interfaces ที่แชร์ระหว่าง packages อื่นๆ

### 📂 Folder Structure
```
src/
├── types/
│   ├── metrics/
│   │   ├── index.ts
│   │   ├── counter.ts
│   │   ├── histogram.ts
│   │   ├── gauge.ts
│   │   └── labels.ts
│   ├── tracing/
│   │   ├── index.ts
│   │   ├── tracer.ts
│   │   ├── span.ts
│   │   └── context.ts
│   ├── logging/
│   │   ├── index.ts
│   │   ├── logger.ts
│   │   └── log-level.ts
│   ├── providers/
│   │   ├── index.ts
│   │   ├── metric-provider.ts
│   │   ├── trace-provider.ts
│   │   └── log-provider.ts
│   └── configuration/
│       ├── index.ts
│       ├── observability-config.ts
│       └── vendor-config.ts
├── constants/
│   ├── index.ts
│   ├── metric-type.ts
│   ├── log-level.ts
│   ├── status-code.ts
│   ├── span-kind.ts
│   └── vendor-types.ts
├── errors/
│   ├── index.ts
│   ├── observability-error.ts
│   └── configuration-error.ts
├── utils/
│   ├── index.ts
│   ├── validation.utils.ts
│   └── type.utils.ts
├── internal/
│   ├── testing.ts
│   └── validation.ts
└── index.ts
```

### 📋 Key Files & Functions

#### **types/metrics/counter.ts**
```typescript
export interface UnifiedCounter {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  increment(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
}

export interface CounterOptions {
  name: string;
  description: string;
  unit?: string;
  labelKeys?: string[];
}
```

#### **types/metrics/histogram.ts**
```typescript
export interface UnifiedHistogram {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  record(value: number, labels?: Record<string, string>): void;
  getPercentile(percentile: number, labels?: Record<string, string>): number;
}

export interface HistogramOptions {
  name: string;
  description: string;
  unit?: string;
  boundaries?: number[];
  labelKeys?: string[];
}
```

#### **types/metrics/gauge.ts**
```typescript
export interface UnifiedGauge {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  set(value: number, labels?: Record<string, string>): void;
  add(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

export interface GaugeOptions {
  name: string;
  description: string;
  unit?: string;
  labelKeys?: string[];
}
```

#### **types/tracing/span.ts**
```typescript
export interface UnifiedSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  setAttributes(attributes: Record<string, string | number | boolean>): void;
  setStatus(status: SpanStatus): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  end(endTime?: number): void;
}

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export enum SpanStatusCode {
  OK = 'OK',
  ERROR = 'ERROR'
}
```

#### **types/tracing/tracer.ts**
```typescript
export interface UnifiedTracer {
  startSpan(name: string, options?: SpanOptions): UnifiedSpan;
  startActiveSpan<T>(
    name: string,
    fn: (span: UnifiedSpan) => T,
    options?: SpanOptions
  ): T;
  getActiveSpan(): UnifiedSpan | undefined;
  withSpan<T>(span: UnifiedSpan, fn: () => T): T;
}

export interface SpanOptions {
  kind?: SpanKind;
  startTime?: number;
  parent?: UnifiedSpan;
  attributes?: Record<string, string | number | boolean>;
}

export enum SpanKind {
  INTERNAL = 'INTERNAL',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER'
}
```

#### **types/logging/logger.ts**
```typescript
export interface UnifiedLogger {
  trace(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  fatal(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  name: string;
  level: LogLevel;
  format?: LogFormat;
  includeStack?: boolean;
}

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogFormat {
  JSON = 'json',
  TEXT = 'text'
}
```

#### **types/providers/metric-provider.ts**
```typescript
export interface UnifiedMetricProvider {
  createCounter(options: CounterOptions): UnifiedCounter;
  createHistogram(options: HistogramOptions): UnifiedHistogram;
  createGauge(options: GaugeOptions): UnifiedGauge;
  getCounter(name: string): UnifiedCounter | undefined;
  getHistogram(name: string): UnifiedHistogram | undefined;
  getGauge(name: string): UnifiedGauge | undefined;
  shutdown(): Promise<void>;
}
```

#### **types/providers/trace-provider.ts**
```typescript
export interface UnifiedTraceProvider {
  getTracer(name: string, version?: string): UnifiedTracer;
  getActiveTracer(): UnifiedTracer;
  shutdown(): Promise<void>;
}
```

#### **types/providers/log-provider.ts**
```typescript
export interface UnifiedLogProvider {
  getLogger(options: LoggerOptions): UnifiedLogger;
  getLogger(name: string): UnifiedLogger;
  shutdown(): Promise<void>;
}
```

#### **types/configuration/observability-config.ts**
```typescript
export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  
  // Mixed vendor support - each component can use different vendor
  metrics?: MetricsConfig;
  tracing?: TracingConfig;
  logging?: LoggingConfig;
  instrumentation?: InstrumentationConfig;
}

export interface MetricsConfig {
  enabled: boolean;
  vendor: MetricsVendorType;  // Specific vendor for metrics
  endpoint?: string;
  interval?: number;
  timeout?: number;
  headers?: Record<string, string>;
  customRegistry?: unknown;   // Vendor-specific registry
}

export interface TracingConfig {
  enabled: boolean;
  vendor: TracingVendorType;  // Specific vendor for tracing
  endpoint?: string;
  sampleRate?: number;
  timeout?: number;
  headers?: Record<string, string>;
  awsConfig?: {               // AWS X-Ray specific config
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

export interface LoggingConfig {
  enabled: boolean;
  vendor: LoggingVendorType;  // Specific vendor for logging
  level?: LogLevel;
  endpoint?: string;
  format?: LogFormat;
  transports?: LogTransportConfig[];
}

// Separate vendor types for each component
export type MetricsVendorType = 
  | 'prometheus' 
  | 'datadog' 
  | 'newrelic'
  | 'opentelemetry';

export type TracingVendorType = 
  | 'jaeger'
  | 'awsxray' 
  | 'datadog'
  | 'newrelic'
  | 'opentelemetry';

export type LoggingVendorType = 
  | 'winston'
  | 'pino'
  | 'bunyan'
  | 'datadog'
  | 'opentelemetry';

export interface LogTransportConfig {
  type: 'console' | 'file' | 'cloudwatch' | 'custom';
  options?: Record<string, unknown>;
}

// Mixed vendor configuration example
export interface MixedVendorConfig extends ObservabilityConfig {
  metrics: MetricsConfig & { vendor: 'prometheus' };
  tracing: TracingConfig & { vendor: 'awsxray' };
  logging: LoggingConfig & { vendor: 'winston' };
}
```

#### **errors/observability-error.ts**
```typescript
export class ObservabilityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ObservabilityError';
  }
}

export class ConfigurationError extends ObservabilityError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', cause);
    this.name = 'ConfigurationError';
  }
}

export class ProviderNotInitializedError extends ObservabilityError {
  constructor(providerType: string) {
    super(
      `${providerType} provider not initialized`,
      'PROVIDER_NOT_INITIALIZED'
    );
    this.name = 'ProviderNotInitializedError';
  }
}
```

---

## 📁 Vendor Adapter Packages

### **Package 2a: `@inh-lib/unified-metrics-prometheus`**

#### 🎯 Purpose
Prometheus-specific metrics implementation

#### 📂 Folder Structure
```
src/
├── adapters/
│   ├── index.ts
│   ├── prometheus-counter-adapter.ts
│   ├── prometheus-histogram-adapter.ts
│   └── prometheus-gauge-adapter.ts
├── factories/
│   ├── index.ts
│   └── prometheus-metric-provider-factory.ts
├── exporters/
│   ├── index.ts
│   ├── prometheus-exporter.ts
│   └── prometheus-registry-manager.ts
├── configuration/
│   ├── index.ts
│   └── prometheus-config-mapper.ts
├── internal/
│   └── prometheus-registry.ts
└── index.ts
```

#### 📋 Key Files & Functions

##### **adapters/prometheus-counter-adapter.ts**
```typescript
import { Counter } from 'prom-client';
import { UnifiedCounter } from '@inh-lib/unified-observe-ability-core';

export class PrometheusCounterAdapter implements UnifiedCounter {
  constructor(
    private readonly prometheusCounter: Counter<string>,
    public readonly name: string,
    public readonly description: string,
    public readonly unit?: string
  ) {}

  increment(labels?: Record<string, string>, value: number = 1): void {
    if (labels) {
      this.prometheusCounter.inc(labels, value);
    } else {
      this.prometheusCounter.inc(value);
    }
  }

  get(labels?: Record<string, string>): number {
    // Get current value from Prometheus registry
    const metric = this.prometheusCounter.get();
    if (labels) {
      const values = metric.values.find(v => 
        Object.entries(labels).every(([key, value]) => v.labels[key] === value)
      );
      return values?.value || 0;
    }
    return metric.values.reduce((sum, v) => sum + v.value, 0);
  }
}
```

##### **factories/prometheus-metric-provider-factory.ts**
```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { 
  UnifiedMetricProvider,
  MetricsConfig,
  CounterOptions,
  HistogramOptions,
  GaugeOptions
} from '@inh-lib/unified-observe-ability-core';
import { PrometheusMetricProviderAdapter } from '../adapters';

export class PrometheusMetricProviderFactory {
  static create(config: MetricsConfig): UnifiedMetricProvider {
    // Configure Prometheus registry
    const registry = config.customRegistry || register;
    
    if (config.endpoint) {
      // Start Prometheus metrics server
      this.setupMetricsServer(config, registry);
    }

    return new PrometheusMetricProviderAdapter(registry, config);
  }

  private static setupMetricsServer(config: MetricsConfig, registry: any): void {
    // Implementation for starting Prometheus metrics HTTP server
    // e.g., /metrics endpoint
  }
}

export class PrometheusMetricProviderAdapter implements UnifiedMetricProvider {
  private readonly counters = new Map<string, PrometheusCounterAdapter>();
  private readonly histograms = new Map<string, PrometheusHistogramAdapter>();
  private readonly gauges = new Map<string, PrometheusGaugeAdapter>();

  constructor(
    private readonly registry: any,
    private readonly config: MetricsConfig
  ) {}

  createCounter(options: CounterOptions): UnifiedCounter {
    if (this.counters.has(options.name)) {
      return this.counters.get(options.name)!;
    }

    const prometheusCounter = new Counter({
      name: options.name,
      help: options.description,
      labelNames: options.labelKeys || [],
      registers: [this.registry]
    });

    const adapter = new PrometheusCounterAdapter(
      prometheusCounter,
      options.name,
      options.description,
      options.unit
    );

    this.counters.set(options.name, adapter);
    return adapter;
  }

  // Similar implementations for createHistogram, createGauge...
  
  async shutdown(): Promise<void> {
    this.registry.clear();
  }
}
```

---

### **Package 2b: `@inh-lib/unified-tracing-awsxray`**

#### 🎯 Purpose
AWS X-Ray specific tracing implementation

#### 📂 Folder Structure
```
src/
├── adapters/
│   ├── index.ts
│   ├── xray-tracer-adapter.ts
│   └── xray-span-adapter.ts
├── factories/
│   ├── index.ts
│   └── xray-trace-provider-factory.ts
├── exporters/
│   ├── index.ts
│   └── xray-exporter.ts
├── configuration/
│   ├── index.ts
│   └── xray-config-mapper.ts
├── internal/
│   └── xray-segment-manager.ts
└── index.ts
```

#### 📋 Key Files & Functions

##### **adapters/xray-span-adapter.ts**
```typescript
import * as AWSXRay from 'aws-xray-sdk-core';
import { 
  UnifiedSpan, 
  SpanStatus, 
  SpanStatusCode 
} from '@inh-lib/unified-observe-ability-core';

export class XRaySpanAdapter implements UnifiedSpan {
  constructor(
    private readonly xraySegment: AWSXRay.Segment | AWSXRay.Subsegment,
    private isSubsegment: boolean = false
  ) {}

  get traceId(): string {
    return this.xraySegment.trace_id;
  }

  get spanId(): string {
    return this.xraySegment.id;
  }

  get parentSpanId(): string | undefined {
    return this.xraySegment.parent_id;
  }

  setAttributes(attributes: Record<string, string | number | boolean>): void {
    // X-Ray uses annotations and metadata
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length <= 256) {
        // Use annotations for searchable fields (limited to 256 chars)
        this.xraySegment.addAnnotation(key, value);
      } else {
        // Use metadata for larger or complex data
        this.xraySegment.addMetadata(key, value);
      }
    });
  }

  setStatus(status: SpanStatus): void {
    if (status.code === SpanStatusCode.ERROR) {
      this.xraySegment.addError(new Error(status.message || 'Unknown error'));
    }
    // X-Ray automatically sets status based on errors and HTTP status codes
  }

  addEvent(name: string, attributes?: Record<string, unknown>): void {
    // X-Ray doesn't have events concept, add as metadata with timestamp
    this.xraySegment.addMetadata(`event.${name}`, {
      timestamp: Date.now(),
      ...attributes
    });
  }

  end(endTime?: number): void {
    if (endTime) {
      this.xraySegment.end_time = endTime / 1000; // X-Ray uses seconds
    } else {
      this.xraySegment.close();
    }
  }
}
```

##### **factories/xray-trace-provider-factory.ts**
```typescript
import * as AWSXRay from 'aws-xray-sdk-core';
import { 
  UnifiedTraceProvider,
  TracingConfig 
} from '@inh-lib/unified-observe-ability-core';
import { XRayTraceProviderAdapter } from '../adapters';

export class XRayTraceProviderFactory {
  static create(config: TracingConfig): UnifiedTraceProvider {
    // Configure X-Ray SDK
    AWSXRay.config([
      AWSXRay.plugins.ECSPlugin,
      AWSXRay.plugins.EC2Plugin,
    ]);

    // Set sampling rules if provided
    if (config.sampleRate !== undefined) {
      AWSXRay.setContextMissingStrategy('LOG_ERROR');
      AWSXRay.setSamplingRules({
        rules: [{
          description: 'Default sampling rule',
          service_name: '*',
          http_method: '*',
          url_path: '*',
          fixed_target: Math.floor(config.sampleRate * 10),
          rate: config.sampleRate
        }],
        default: {
          fixed_target: 1,
          rate: config.sampleRate
        }
      });
    }

    return new XRayTraceProviderAdapter(config);
  }
}

export class XRayTraceProviderAdapter implements UnifiedTraceProvider {
  constructor(private readonly config: TracingConfig) {}

  getTracer(name: string, version?: string): UnifiedTracer {
    return new XRayTracerAdapter(name, version, this.config);
  }

  getActiveTracer(): UnifiedTracer {
    return this.getTracer('default');
  }

  async shutdown(): Promise<void> {
    // X-Ray cleanup if needed
    AWSXRay.getLogger().info('X-Ray trace provider shutdown');
  }
}
```

---

### **Package 2c: `@inh-lib/unified-logging-winston`**

#### 🎯 Purpose
Winston-specific logging implementation

#### 📂 Folder Structure
```
src/
├── adapters/
│   ├── index.ts
│   └── winston-logger-adapter.ts
├── factories/
│   ├── index.ts
│   └── winston-log-provider-factory.ts
├── formatters/
│   ├── index.ts
│   ├── json-formatter.ts
│   └── structured-formatter.ts
├── transports/
│   ├── index.ts
│   ├── cloudwatch-transport.ts
│   └── file-transport.ts
└── index.ts
```

#### 📋 Key Files & Functions

##### **adapters/winston-logger-adapter.ts**
```typescript
import winston from 'winston';
import { UnifiedLogger } from '@inh-lib/unified-observe-ability-core';

export class WinstonLoggerAdapter implements UnifiedLogger {
  constructor(
    private readonly winstonLogger: winston.Logger,
    private readonly name: string
  ) {}

  trace(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, { level: 'trace', logger: this.name, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, { logger: this.name, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.info(message, { logger: this.name, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.warn(message, { logger: this.name, ...meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.error(message, { logger: this.name, ...meta });
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.error(message, { level: 'fatal', logger: this.name, ...meta });
  }
}
```

### 🎯 Purpose  
OpenTelemetry specific adapters และ factories

### 📂 Folder Structure
```
src/
├── adapters/
│   ├── metrics/
│   │   ├── index.ts
│   │   ├── otel-counter-adapter.ts
│   │   ├── otel-histogram-adapter.ts
│   │   └── otel-gauge-adapter.ts
│   ├── tracing/
│   │   ├── index.ts
│   │   ├── otel-tracer-adapter.ts
│   │   └── otel-span-adapter.ts
│   └── logging/
│       ├── index.ts
│       └── otel-logger-adapter.ts
├── factories/
│   ├── index.ts
│   ├── otel-metric-provider-factory.ts
│   ├── otel-trace-provider-factory.ts
│   └── otel-log-provider-factory.ts
├── configuration/
│   ├── index.ts
│   ├── otel-config-mapper.ts
│   └── otel-resource-builder.ts
├── internal/
│   ├── otel-registry.ts
│   ├── otel-exporter-manager.ts
│   └── otel-instrumentation-manager.ts
└── index.ts
```

### 📋 Key Files & Functions

#### **adapters/metrics/otel-counter-adapter.ts**
```typescript
import { Counter } from '@opentelemetry/api';
import { UnifiedCounter } from '@inh-lib/unified-observe-ability-core';

export class OtelCounterAdapter implements UnifiedCounter {
  constructor(
    private readonly otelCounter: Counter,
    public readonly name: string,
    public readonly description: string,
    public readonly unit?: string
  ) {}

  increment(labels?: Record<string, string>, value: number = 1): void {
    this.otelCounter.add(value, labels);
  }

  get(labels?: Record<string, string>): number {
    // Implementation depends on OTEL meter reader
    // This would require custom metric reader implementation
    throw new Error('Get operation not supported in OTEL Counter adapter');
  }
}
```

#### **adapters/metrics/otel-histogram-adapter.ts**
```typescript
import { Histogram } from '@opentelemetry/api';
import { UnifiedHistogram } from '@inh-lib/unified-observe-ability-core';

export class OtelHistogramAdapter implements UnifiedHistogram {
  constructor(
    private readonly otelHistogram: Histogram,
    public readonly name: string,
    public readonly description: string,
    public readonly unit?: string
  ) {}

  record(value: number, labels?: Record<string, string>): void {
    this.otelHistogram.record(value, labels);
  }

  getPercentile(percentile: number, labels?: Record<string, string>): number {
    // Implementation would require custom aggregation
    throw new Error('Percentile calculation not supported in OTEL Histogram adapter');
  }
}
```

#### **adapters/tracing/otel-span-adapter.ts**
```typescript
import { Span } from '@opentelemetry/api';
import { 
  UnifiedSpan, 
  SpanStatus, 
  SpanStatusCode 
} from '@inh-lib/unified-observe-ability-core';

export class OtelSpanAdapter implements UnifiedSpan {
  constructor(private readonly otelSpan: Span) {}

  get traceId(): string {
    return this.otelSpan.spanContext().traceId;
  }

  get spanId(): string {
    return this.otelSpan.spanContext().spanId;
  }

  get parentSpanId(): string | undefined {
    // Would need to track parent span manually
    return undefined;
  }

  setAttributes(attributes: Record<string, string | number | boolean>): void {
    this.otelSpan.setAttributes(attributes);
  }

  setStatus(status: SpanStatus): void {
    this.otelSpan.setStatus({
      code: status.code === SpanStatusCode.OK ? 1 : 2, // OTEL status codes
      message: status.message
    });
  }

  addEvent(name: string, attributes?: Record<string, unknown>): void {
    this.otelSpan.addEvent(name, attributes);
  }

  end(endTime?: number): void {
    this.otelSpan.end(endTime);
  }
}
```

#### **factories/otel-metric-provider-factory.ts**
```typescript
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { 
  UnifiedMetricProvider, 
  ObservabilityConfig 
} from '@inh-lib/unified-observe-ability-core';
import { OtelMetricProviderAdapter } from '../adapters';
import { OtelResourceBuilder } from '../configuration';

export class OtelMetricProviderFactory {
  static create(config: ObservabilityConfig): UnifiedMetricProvider {
    const resource = OtelResourceBuilder.build(config);
    const readers = this.buildReaders(config);

    const meterProvider = new MeterProvider({
      resource,
      readers
    });

    return new OtelMetricProviderAdapter(meterProvider, config.serviceName);
  }

  private static buildReaders(config: ObservabilityConfig): MetricReader[] {
    const readers: MetricReader[] = [];

    if (config.metrics?.enabled && config.metrics.endpoint) {
      // Add Prometheus or OTLP metric reader based on endpoint
      const reader = this.createMetricReader(config.metrics);
      readers.push(reader);
    }

    return readers;
  }

  private static createMetricReader(metricsConfig: MetricsConfig): MetricReader {
    // Implementation would depend on the specific exporter needed
    // PrometheusRegistry, OTLPMetricExporter, etc.
    throw new Error('Metric reader creation not implemented');
  }
}
```

#### **internal/otel-registry.ts** *(Internal - Not Exported)*
```typescript
import { Meter, Tracer } from '@opentelemetry/api';

export class OtelRegistry {
  private readonly meters = new Map<string, Meter>();
  private readonly tracers = new Map<string, Tracer>();

  registerMeter(name: string, meter: Meter): void {
    this.meters.set(name, meter);
  }

  getMeter(name: string): Meter | undefined {
    return this.meters.get(name);
  }

  registerTracer(name: string, tracer: Tracer): void {
    this.tracers.set(name, tracer);
  }

  getTracer(name: string): Tracer | undefined {
    return this.tracers.get(name);
  }

  getAllMeters(): Map<string, Meter> {
    return new Map(this.meters);
  }

  getAllTracers(): Map<string, Tracer> {
    return new Map(this.tracers);
  }

  clear(): void {
    this.meters.clear();
    this.tracers.clear();
  }
}
```

#### **configuration/otel-resource-builder.ts**
```typescript
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ObservabilityConfig } from '@inh-lib/unified-observe-ability-core';

export class OtelResourceBuilder {
  static build(config: ObservabilityConfig): Resource {
    return new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
      [SemanticResourceAttributes.TELEMETRY_SDK_NAME]: 'inh-unified-observability',
      [SemanticResourceAttributes.TELEMETRY_SDK_VERSION]: '1.0.0',
      [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: 'nodejs'
    });
  }

  static buildWithCustomAttributes(
    config: ObservabilityConfig,
    customAttributes: Record<string, string>
  ): Resource {
    const baseResource = this.build(config);
    const customResource = new Resource(customAttributes);
    return baseResource.merge(customResource);
  }
}
```

---

## 📁 Package 3: `@inhl-lib/unified-observe-ability`

### 🎯 Purpose
Main provider classes และ context management

### 📂 Folder Structure
```
src/
├── providers/
│   ├── index.ts
│   ├── observability-provider.ts
│   ├── metric-provider-manager.ts
│   ├── trace-provider-manager.ts
│   └── log-provider-manager.ts
├── context/
│   ├── index.ts
│   ├── observability-context.ts
│   └── context-manager.ts
├── instrumentation/
│   ├── index.ts
│   ├── auto-instrumentation.ts
│   ├── http-instrumentation.ts
│   ├── database-instrumentation.ts
│   └── resource-instrumentation.ts
├── abstractions/
│   ├── index.ts
│   ├── framework-adapter.ts
│   └── middleware-factory.ts
├── middleware/
│   ├── index.ts
│   └── observability-middleware.ts
├── internal/
│   ├── provider-registry.ts
│   ├── instrumentation-registry.ts
│   ├── context-storage.ts
│   └── resource-tracker.ts
└── index.ts
```

### 📋 Key Files & Functions

#### **providers/observability-provider.ts**
```typescript
import { 
  UnifiedMetricProvider, 
  UnifiedTraceProvider, 
  UnifiedLogProvider,
  ObservabilityConfig,
  MetricsVendorType,
  TracingVendorType,
  LoggingVendorType,
  ConfigurationError
} from '@inh-lib/unified-observe-ability-core';

export class ObservabilityProvider {
  private metricProvider?: UnifiedMetricProvider;
  private traceProvider?: UnifiedTraceProvider;
  private logProvider?: UnifiedLogProvider;
  private isInitialized = false;

  constructor(private readonly config: ObservabilityConfig) {
    this.validateConfig();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await Promise.all([
        this.initializeMetrics(),
        this.initializeTracing(),
        this.initializeLogging()
      ]);

      this.isInitialized = true;
    } catch (error) {
      throw new ConfigurationError(
        'Failed to initialize observability provider',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ... other methods remain same ...

  private async initializeMetrics(): Promise<void> {
    if (!this.config.metrics?.enabled) {
      return;
    }

    const vendor = this.config.metrics.vendor;
    
    switch (vendor) {
      case 'prometheus':
        const { PrometheusMetricProviderFactory } = await import('@inh-lib/unified-metrics-prometheus');
        this.metricProvider = PrometheusMetricProviderFactory.create(this.config.metrics);
        break;
        
      case 'datadog':
        const { DatadogMetricProviderFactory } = await import('@inh-lib/unified-metrics-datadog');
        this.metricProvider = DatadogMetricProviderFactory.create(this.config.metrics);
        break;
        
      case 'opentelemetry':
        const { OtelMetricProviderFactory } = await import('@inh-lib/unified-util-otel');
        this.metricProvider = OtelMetricProviderFactory.create(this.config);
        break;
        
      default:
        throw new ConfigurationError(`Unsupported metrics vendor: ${vendor}`);
    }
  }

  private async initializeTracing(): Promise<void> {
    if (!this.config.tracing?.enabled) {
      return;
    }

    const vendor = this.config.tracing.vendor;

    switch (vendor) {
      case 'awsxray':
        const { XRayTraceProviderFactory } = await import('@inh-lib/unified-tracing-awsxray');
        this.traceProvider = XRayTraceProviderFactory.create(this.config.tracing);
        break;
        
      case 'jaeger':
        const { JaegerTraceProviderFactory } = await import('@inh-lib/unified-tracing-jaeger');
        this.traceProvider = JaegerTraceProviderFactory.create(this.config.tracing);
        break;
        
      case 'datadog':
        const { DatadogTraceProviderFactory } = await import('@inh-lib/unified-tracing-datadog');
        this.traceProvider = DatadogTraceProviderFactory.create(this.config.tracing);
        break;
        
      case 'opentelemetry':
        const { OtelTraceProviderFactory } = await import('@inh-lib/unified-util-otel');
        this.traceProvider = OtelTraceProviderFactory.create(this.config);
        break;
        
      default:
        throw new ConfigurationError(`Unsupported tracing vendor: ${vendor}`);
    }
  }

  private async initializeLogging(): Promise<void> {
    if (!this.config.logging?.enabled) {
      return;
    }

    const vendor = this.config.logging.vendor;

    switch (vendor) {
      case 'winston':
        const { WinstonLogProviderFactory } = await import('@inh-lib/unified-logging-winston');
        this.logProvider = WinstonLogProviderFactory.create(this.config.logging);
        break;
        
      case 'pino':
        const { PinoLogProviderFactory } = await import('@inh-lib/unified-logging-pino');
        this.logProvider = PinoLogProviderFactory.create(this.config.logging);
        break;
        
      case 'opentelemetry':
        const { OtelLogProviderFactory } = await import('@inh-lib/unified-util-otel');
        this.logProvider = OtelLogProviderFactory.create(this.config);
        break;
        
      default:
        throw new ConfigurationError(`Unsupported logging vendor: ${vendor}`);
    }
  }

  private validateConfig(): void {
    if (!this.config.serviceName) {
      throw new ConfigurationError('serviceName is required');
    }
    if (!this.config.serviceVersion) {
      throw new ConfigurationError('serviceVersion is required');
    }
    
    // Validate vendor-specific configs
    if (this.config.metrics?.enabled && !this.config.metrics.vendor) {
      throw new ConfigurationError('metrics.vendor is required when metrics are enabled');
    }
    if (this.config.tracing?.enabled && !this.config.tracing.vendor) {
      throw new ConfigurationError('tracing.vendor is required when tracing are enabled');
    }
    if (this.config.logging?.enabled && !this.config.logging.vendor) {
      throw new ConfigurationError('logging.vendor is required when logging are enabled');
    }
  }
}
```

#### **context/observability-context.ts**
```typescript
import { ObservabilityProvider } from '../providers';
import { ConfigurationError } from '@inh-lib/unified-observe-ability-core';

export class ObservabilityContext {
  private static instance?: ObservabilityContext;
  private provider?: ObservabilityProvider;

  private constructor() {}

  static getInstance(): ObservabilityContext {
    if (!this.instance) {
      this.instance = new ObservabilityContext();
    }
    return this.instance;
  }

  setProvider(provider: ObservabilityProvider): void {
    this.provider = provider;
  }

  getProvider(): ObservabilityProvider {
    if (!this.provider) {
      throw new ConfigurationError('ObservabilityProvider not set in context');
    }
    return this.provider;
  }

  getMetrics() {
    return this.getProvider().getMetricProvider();
  }

  getTracing() {
    return this.getProvider().getTraceProvider();
  }

  getLogging() {
    return this.getProvider().getLogProvider();
  }

  hasProvider(): boolean {
    return !!this.provider;
  }
}
```

#### **instrumentation/http-instrumentation.ts**
```typescript
import { 
  UnifiedSpan, 
  SpanKind, 
  SpanStatusCode,
  HttpInstrumentationConfig 
} from '@inh-lib/unified-observe-ability-core';
import { ObservabilityContext } from '../context';

export interface HttpRequestInfo {
  method: string;
  route: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponseInfo {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
  size?: number;
}

export class HttpInstrumentation {
  private readonly metrics;
  private readonly tracer;
  
  constructor(
    private readonly config: HttpInstrumentationConfig = { enabled: true },
    private readonly context = ObservabilityContext.getInstance()
  ) {
    this.metrics = context.getMetrics();
    this.tracer = context.getTracing().getActiveTracer();
  }

  createRequestSpan(request: HttpRequestInfo): UnifiedSpan {
    const span = this.tracer.startSpan(`HTTP ${request.method} ${request.route}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': request.method,
        'http.route': request.route,
        'http.url': request.url,
        'http.scheme': new URL(request.url).protocol.slice(0, -1),
        'http.target': new URL(request.url).pathname
      }
    });

    // Add headers if configured
    if (this.config.collectHeaders && request.headers) {
      Object.entries(request.headers).forEach(([key, value]) => {
        span.setAttributes({ [`http.request.header.${key.toLowerCase()}`]: value });
      });
    }

    // Add request body size if available
    if (request.body) {
      const bodySize = this.calculateBodySize(request.body);
      span.setAttributes({ 'http.request.body.size': bodySize });
    }

    return span;
  }

  completeRequestSpan(
    span: UnifiedSpan, 
    response: HttpResponseInfo, 
    duration: number,
    error?: Error
  ): void {
    // Set response attributes
    span.setAttributes({
      'http.status_code': response.statusCode,
      'http.response.size': response.size || 0,
      'request.duration_ms': duration
    });

    // Add response headers if configured
    if (this.config.collectHeaders && response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        span.setAttributes({ [`http.response.header.${key.toLowerCase()}`]: value });
      });
    }

    // Set status based on response code or error
    if (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.addEvent('error', {
        'error.name': error.name,
        'error.message': error.message,
        'error.stack': error.stack
      });
    } else {
      span.setStatus({
        code: response.statusCode >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK
      });
    }

    span.end();
  }

  recordRequestMetrics(request: HttpRequestInfo, response: HttpResponseInfo, duration: number): void {
    const labels = {
      method: request.method,
      route: request.route,
      status_code: response.statusCode.toString()
    };

    // Record request count
    this.metrics.createCounter({
      name: 'http_requests_total',
      description: 'Total HTTP requests',
      labelKeys: ['method', 'route', 'status_code']
    }).increment(labels);

    // Record request duration
    this.metrics.createHistogram({
      name: 'http_request_duration_seconds',
      description: 'HTTP request duration',
      unit: 'seconds',
      labelKeys: ['method', 'route', 'status_code'],
      boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    }).record(duration / 1000, labels);

    // Record response size
    if (response.size) {
      this.metrics.createHistogram({
        name: 'http_response_size_bytes',
        description: 'HTTP response size',
        unit: 'bytes',
        labelKeys: ['method', 'route', 'status_code']
      }).record(response.size, labels);
    }
  }

  recordResourceUsage(span: UnifiedSpan, memoryUsage: number, cpuTime: number): void {
    const attributes = {
      'request.memory_usage_bytes': memoryUsage,
      'request.cpu_time_ms': cpuTime
    };

    span.setAttributes(attributes);

    // Record resource metrics if thresholds exceeded
    if (this.config.memoryThreshold && memoryUsage > this.config.memoryThreshold) {
      this.metrics.createHistogram({
        name: 'http_request_memory_usage_bytes',
        description: 'Memory usage per HTTP request',
        unit: 'bytes'
      }).record(memoryUsage);
    }

    if (this.config.cpuThreshold && cpuTime > this.config.cpuThreshold) {
      this.metrics.createHistogram({
        name: 'http_request_cpu_time_seconds',
        description: 'CPU time per HTTP request',
        unit: 'seconds'
      }).record(cpuTime / 1000);
    }
  }

  private calculateBodySize(body: unknown): number {
    if (typeof body === 'string') {
      return Buffer.byteLength(body, 'utf8');
    }
    if (Buffer.isBuffer(body)) {
      return body.length;
    }
    if (typeof body === 'object') {
      return Buffer.byteLength(JSON.stringify(body), 'utf8');
    }
    return 0;
  }
}
```

#### **abstractions/framework-adapter.ts**
```typescript
import { 
  UnifiedSpan,
  HttpInstrumentationConfig 
} from '@inh-lib/unified-observe-ability-core';

export interface HttpRequestInfo {
  method: string;
  route: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  startTime: number;
}

export interface HttpResponseInfo {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
  size?: number;
  endTime: number;
}

export interface RequestContext {
  span: UnifiedSpan;
  startTime: number;
  startResources: ResourceSnapshot;
  requestInfo: HttpRequestInfo;
}

/**
 * Abstract base class for framework adapters
 * Framework-specific packages should extend this class
 */
export abstract class FrameworkAdapter {
  protected readonly httpInstrumentation: HttpInstrumentation;
  protected readonly resourceTracker: ResourceTracker;
  protected readonly context: ObservabilityContext;

  constructor(config?: HttpInstrumentationConfig) {
    this.context = ObservabilityContext.getInstance();
    this.httpInstrumentation = new HttpInstrumentation(config);
    this.resourceTracker = new ResourceTracker();
  }

  /**
   * Register observability hooks with the framework
   * Must be implemented by framework-specific adapters
   */
  abstract register(framework: unknown): void;

  /**
   * Create request context with span and resource tracking
   */
  protected createRequestContext(requestInfo: HttpRequestInfo): RequestContext {
    const startResources = this.resourceTracker.capture();
    const span = this.httpInstrumentation.createRequestSpan(requestInfo);

    return {
      span,
      startTime: requestInfo.startTime,
      startResources,
      requestInfo
    };
  }

  /**
   * Complete request processing with metrics and span completion
   */
  protected completeRequest(
    context: RequestContext,
    responseInfo: HttpResponseInfo,
    error?: Error
  ): void {
    const duration = responseInfo.endTime - context.startTime;
    const endResources = this.resourceTracker.capture();
    const resourceDelta = this.resourceTracker.calculateDelta(
      context.startResources,
      endResources
    );

    // Complete span
    this.httpInstrumentation.completeRequestSpan(
      context.span,
      responseInfo,
      duration,
      error
    );

    // Record metrics
    this.httpInstrumentation.recordRequestMetrics(
      context.requestInfo,
      responseInfo,
      duration
    );

    // Record resource usage
    this.httpInstrumentation.recordResourceUsage(
      context.span,
      resourceDelta.memoryDelta,
      resourceDelta.cpuDelta
    );
  }

  /**
   * Handle errors during request processing
   */
  protected handleError(context: RequestContext, error: Error): void {
    const responseInfo: HttpResponseInfo = {
      statusCode: 500,
      endTime: Date.now()
    };

    this.completeRequest(context, responseInfo, error);

    // Record error metrics
    this.context.getMetrics().createCounter({
      name: 'http_errors_total',
      description: 'Total HTTP errors',
      labelKeys: ['method', 'route', 'error_type']
    }).increment({
      method: context.requestInfo.method,
      route: context.requestInfo.route,
      error_type: error.constructor.name
    });
  }

  /**
   * Extract response size from framework-specific response object
   */
  protected abstract extractResponseSize(response: unknown): number;

  /**
   * Extract headers from framework-specific request/response objects
   */
  protected abstract extractHeaders(object: unknown): Record<string, string>;
}

/**
 * Interface for framework registration
 * Framework packages should implement this for easy integration
 */
export interface FrameworkIntegration<T = unknown> {
  register(framework: T): void;
  createAdapter(config?: HttpInstrumentationConfig): FrameworkAdapter;
}
```

#### **internal/resource-tracker.ts** *(Internal - Not Exported)*
```typescript
export interface ResourceSnapshot {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  processUptime: number;
}

export interface ResourceDelta {
  memoryDelta: number;
  cpuDelta: number;
  duration: number;
  memoryGrowthRate: number;
  cpuUtilization: number;
}

export class ResourceTracker {
  private readonly startupMemory: NodeJS.MemoryUsage;
  private readonly startupCpu: NodeJS.CpuUsage;

  constructor() {
    this.startupMemory = process.memoryUsage();
    this.startupCpu = process.cpuUsage();
  }

  capture(): ResourceSnapshot {
    return {
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      processUptime: process.uptime()
    };
  }

  calculateDelta(start: ResourceSnapshot, end: ResourceSnapshot): ResourceDelta {
    const memoryDelta = this.calculateMemoryDelta(start.memoryUsage, end.memoryUsage);
    const cpuDelta = this.calculateCpuDelta(start.cpuUsage, end.cpuUsage);
    const duration = end.timestamp - start.timestamp;

    return {
      memoryDelta,
      cpuDelta,
      duration,
      memoryGrowthRate: duration > 0 ? memoryDelta / duration : 0,
      cpuUtilization: duration > 0 ? (cpuDelta / (duration * 1000)) * 100 : 0
    };
  }

  getSystemResourceUsage(): {
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    uptimeSeconds: number;
  } {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    
    return {
      memoryUsagePercent: (memoryUsage.rss / totalMemory) * 100,
      cpuUsagePercent: this.getCurrentCpuUsage(),
      uptimeSeconds: process.uptime()
    };
  }

  private calculateMemoryDelta(start: NodeJS.MemoryUsage, end: NodeJS.MemoryUsage): number {
    // Focus on heap used as primary indicator
    const heapDelta = end.heapUsed - start.heapUsed;
    return Math.max(0, heapDelta); // Only count positive growth
  }

  private calculateCpuDelta(start: NodeJS.CpuUsage, end: NodeJS.CpuUsage): number {
    const userDelta = end.user - start.user;
    const systemDelta = end.system - start.system;
    return (userDelta + systemDelta) / 1000; // Convert to milliseconds
  }

  private getCurrentCpuUsage(): number {
    // This is a simplified version - real implementation would need
    // to track CPU usage over time intervals
    const cpuUsage = process.cpuUsage(this.startupCpu);
    const uptimeMs = process.uptime() * 1000;
    return ((cpuUsage.user + cpuUsage.system) / (uptimeMs * 1000)) * 100;
  }
}
```

---

## 📁 Package 4: `@inh-lib/api-utils-fastify`

### 🎯 Purpose
Fastify-specific observability integration

### 📂 Folder Structure
```
src/
├── adapters/
│   ├── index.ts
│   └── fastify-adapter.ts
├── plugins/
│   ├── index.ts
│   └── fastify-observability.plugin.ts
├── types/
│   ├── index.ts
│   └── fastify-observability.types.ts
└── index.ts
```

### 📋 Key Files & Functions

#### **adapters/fastify-adapter.ts**
```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  FrameworkAdapter,
  HttpRequestInfo,
  HttpResponseInfo,
  RequestContext 
} from '@inhl-lib/unified-observe-ability';
import { HttpInstrumentationConfig } from '@inh-lib/unified-observe-ability-core';

export class FastifyAdapter extends FrameworkAdapter {
  constructor(config?: HttpInstrumentationConfig) {
    super(config);
  }

  register(fastify: FastifyInstance): void {
    fastify.addHook('onRequest', this.onRequest.bind(this));
    fastify.addHook('onResponse', this.onResponse.bind(this));
    fastify.addHook('onError', this.onError.bind(this));
  }

  private async onRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const requestInfo: HttpRequestInfo = {
      method: request.method,
      route: request.routerPath || 'unknown',
      url: request.url,
      headers: request.headers as Record<string, string>,
      body: request.body,
      startTime: Date.now()
    };

    const context = this.createRequestContext(requestInfo);
    (request as any).observabilityContext = context;
  }

  private async onResponse(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = (request as any).observabilityContext as RequestContext;
    if (!context) return;

    const responseInfo: HttpResponseInfo = {
      statusCode: reply.statusCode,
      headers: this.extractHeaders(reply),
      size: this.extractResponseSize(reply),
      endTime: Date.now()
    };

    this.completeRequest(context, responseInfo);
  }

  private async onError(request: FastifyRequest, reply: FastifyReply, error: Error): Promise<void> {
    const context = (request as any).observabilityContext as RequestContext;
    if (!context) return;

    const responseInfo: HttpResponseInfo = {
      statusCode: reply.statusCode || 500,
      endTime: Date.now()
    };

    this.completeRequest(context, responseInfo, error);
  }

  protected extractResponseSize(reply: FastifyReply): number {
    const contentLength = reply.getHeader('content-length');
    if (contentLength) {
      return parseInt(contentLength as string, 10) || 0;
    }
    return 0;
  }

  protected extractHeaders(object: FastifyReply | FastifyRequest): Record<string, string> {
    if ('getHeaders' in object) {
      return object.getHeaders() as Record<string, string>;
    }
    if ('headers' in object) {
      return object.headers as Record<string, string>;
    }
    return {};
  }
}
```

#### **plugins/fastify-observability.plugin.ts**
```typescript
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { FastifyAdapter } from '../adapters';
import { 
  ObservabilityProvider,
  ObservabilityContext 
} from '@inhl-lib/unified-observe-ability';
import { HttpInstrumentationConfig } from '@inh-lib/unified-observe-ability-core';

export interface FastifyObservabilityPluginOptions {
  provider?: ObservabilityProvider;
  instrumentation?: HttpInstrumentationConfig;
}

const fastifyObservabilityPlugin: FastifyPluginAsync<FastifyObservabilityPluginOptions> = async (
  fastify: FastifyInstance,
  options
) => {
  // Set provider in context if provided
  if (options.provider) {
    ObservabilityContext.getInstance().setProvider(options.provider);
  }

  // Register Fastify adapter
  const adapter = new FastifyAdapter(options.instrumentation);
  adapter.register(fastify);

  // Add observability utilities to Fastify instance
  const context = ObservabilityContext.getInstance();
  
  fastify.decorate('observability', {
    getMetrics: () => context.getMetrics(),
    getTracing: () => context.getTracing(),
    getLogging: () => context.getLogging(),
    getProvider: () => context.getProvider()
  });

  fastify.log.info('Fastify observability plugin registered successfully');
};

export default fp(fastifyObservabilityPlugin, {
  name: 'fastify-observability',
  fastify: '4.x'
});

// Declare module for TypeScript support
declare module 'fastify' {
  interface FastifyInstance {
    observability: {
      getMetrics: () => import('@inh-lib/unified-observe-ability-core').UnifiedMetricProvider;
      getTracing: () => import('@inh-lib/unified-observe-ability-core').UnifiedTraceProvider;
      getLogging: () => import('@inh-lib/unified-observe-ability-core').UnifiedLogProvider;
      getProvider: () => ObservabilityProvider;
    };
  }
}
```

---

## 📁 Package 5: `@inh-lib/api-utils-hono`

### 🎯 Purpose
Hono-specific observability integration

### 📂 Folder Structure
```
src/
├── adapters/
│   ├── index.ts
│   └── hono-adapter.ts
├── middleware/
│   ├── index.ts
│   └── hono-observability.middleware.ts
├── types/
│   ├── index.ts
│   └── hono-observability.types.ts
└── index.ts
```

### 📋 Key Files & Functions

#### **adapters/hono-adapter.ts**
```typescript
import { Context, Next } from 'hono';
import { 
  FrameworkAdapter,
  HttpRequestInfo,
  HttpResponseInfo,
  RequestContext 
} from '@inhl-lib/unified-observe-ability';
import { HttpInstrumentationConfig } from '@inh-lib/unified-observe-ability-core';

export class HonoAdapter extends FrameworkAdapter {
  constructor(config?: HttpInstrumentationConfig) {
    super(config);
  }

  register(): never {
    throw new Error('HonoAdapter should use createMiddleware() instead of register()');
  }

  /**
   * Create Hono middleware for observability
   */
  createMiddleware() {
    return async (c: Context, next: Next) => {
      const requestInfo: HttpRequestInfo = {
        method: c.req.method,
        route: this.extractRoute(c),
        url: c.req.url,
        headers: this.extractHeaders(c.req),
        body: await this.extractBody(c.req),
        startTime: Date.now()
      };

      const context = this.createRequestContext(requestInfo);
      
      // Store context in Hono context
      c.set('observabilityContext', context);

      try {
        await next();

        // Handle successful response
        const responseInfo: HttpResponseInfo = {
          statusCode: c.res.status,
          headers: this.extractHeaders(c.res),
          size: this.extractResponseSize(c.res),
          endTime: Date.now()
        };

        this.completeRequest(context, responseInfo);
      } catch (error) {
        // Handle error response
        const responseInfo: HttpResponseInfo = {
          statusCode: 500,
          endTime: Date.now()
        };

        this.completeRequest(context, responseInfo, error as Error);
        throw error; // Re-throw for Hono error handling
      }
    };
  }

  private extractRoute(c: Context): string {
    // Try to get matched route pattern from Hono context
    const route = c.req.routePath;
    return route || 'unknown';
  }

  private async extractBody(req: Request): Promise<unknown> {
    try {
      const contentType = req.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await req.clone().json();
      }
      if (contentType?.includes('text/')) {
        return await req.clone().text();
      }
    } catch {
      // Ignore body extraction errors
    }
    return undefined;
  }

  protected extractResponseSize(res: Response): number {
    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10) || 0;
    }
    return 0;
  }

  protected extractHeaders(object: Request | Response): Record<string, string> {
    const headers: Record<string, string> = {};
    if ('headers' in object && object.headers) {
      object.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    }
    return headers;
  }
}
```

#### **middleware/hono-observability.middleware.ts**
```typescript
import { Context, Next } from 'hono';
import { HonoAdapter } from '../adapters';
import { ObservabilityContext } from '@inhl-lib/unified-observe-ability';
import { HttpInstrumentationConfig } from '@inh-lib/unified-observe-ability-core';

export interface HonoObservabilityOptions {
  instrumentation?: HttpInstrumentationConfig;
}

/**
 * Create observability middleware for Hono
 */
export function createObservabilityMiddleware(options: HonoObservabilityOptions = {}) {
  const adapter = new HonoAdapter(options.instrumentation);
  return adapter.createMiddleware();
}

/**
 * Utility to add observability context to Hono context
 */
export function getObservability(c: Context) {
  const context = ObservabilityContext.getInstance();
  
  return {
    getMetrics: () => context.getMetrics(),
    getTracing: () => context.getTracing(),
    getLogging: () => context.getLogging(),
    getProvider: () => context.getProvider(),
    getSpan: () => {
      const observabilityContext = c.get('observabilityContext');
      return observabilityContext?.span;
    }
  };
}

// Extend Hono Context type
declare module 'hono' {
  interface Context {
    observability: ReturnType<typeof getObservability>;
  }
}
```

---

## 📁 Package 6: `@inh-lib/api-utils-express`

### 🎯 Purpose
Express-specific observability integration

### 📂 Folder Structure
```
src/
├── adapters/
│   ├── index.ts
│   └── express-adapter.ts
├── middleware/
│   ├── index.ts
│   └── express-observability.middleware.ts
├── types/
│   ├── index.ts
│   └── express-observability.types.ts
└── index.ts
```

### 📋 Key Files & Functions

#### **adapters/express-adapter.ts**
```typescript
import { Request, Response, NextFunction, Application } from 'express';
import { 
  FrameworkAdapter,
  HttpRequestInfo,
  HttpResponseInfo,
  RequestContext 
} from '@inhl-lib/unified-observe-ability';
import { HttpInstrumentationConfig } from '@inh-lib/unified-observe-ability-core';

export class ExpressAdapter extends FrameworkAdapter {
  constructor(config?: HttpInstrumentationConfig) {
    super(config);
  }

  register(app: Application): void {
    app.use(this.createMiddleware());
  }

  /**
   * Create Express middleware for observability
   */
  createMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestInfo: HttpRequestInfo = {
        method: req.method,
        route: this.extractRoute(req),
        url: req.url,
        headers: req.headers as Record<string, string>,
        body: req.body,
        startTime: Date.now()
      };

      const context = this.createRequestContext(requestInfo);
      
      // Store context in request
      (req as any).observabilityContext = context;

      // Hook into response finish event
      res.on('finish', () => {
        const responseInfo: HttpResponseInfo = {
          statusCode: res.statusCode,
          headers: this.extractHeaders(res),
          size: this.extractResponseSize(res),
          endTime: Date.now()
        };

        this.completeRequest(context, responseInfo);
      });

      // Hook into error handling
      const originalNext = next;
      const wrappedNext = (error?: Error) => {
        if (error) {
          const responseInfo: HttpResponseInfo = {
            statusCode: res.statusCode || 500,
            endTime: Date.now()
          };

          this.completeRequest(context, responseInfo, error);
        }
        originalNext(error);
      };

      wrappedNext();
    };
  }

  private extractRoute(req: Request): string {
    // Try to get matched route pattern from Express
    const route = (req as any).route?.path || req.path;
    return route || 'unknown';
  }

  protected extractResponseSize(res: Response): number {
    const contentLength = res.getHeader('content-length');
    if (contentLength) {
      return parseInt(contentLength as string, 10) || 0;
    }
    return 0;
  }

  protected extractHeaders(object: Request | Response): Record<string, string> {
    if ('getHeaders' in object) {
      return object.getHeaders() as Record<string, string>;
    }
    if ('headers' in object) {
      return object.headers as Record<string, string>;
    }
    return {};
  }
}
```

---

## 📁 Package 7: `project-api-service`

### 🎯 Purpose
Entry point สำหรับ specific project integration

### 📂 Folder Structure
```
src/
├── config/
│   ├── index.ts
│   ├── observability.config.ts
│   └── environment.config.ts
├── observability/
│   ├── index.ts
│   ├── setup.ts
│   ├── metrics.ts
│   └── custom-instrumentation.ts
├── middleware/
│   ├── index.ts
│   └── observability.middleware.ts
├── plugins/
│   ├── index.ts
│   ├── fastify-observability.plugin.ts
│   └── database-observability.plugin.ts
├── types/
│   ├── index.ts
│   └── api-observability.types.ts
└── server.ts
```

### 📋 Key Files & Functions

#### **config/observability.config.ts**
```typescript
import { ObservabilityConfig } from '@inh-lib/unified-observe-ability-core';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const observabilityConfig: ObservabilityConfig = {
  serviceName: process.env.SERVICE_NAME || 'api-service',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  vendor: 'opentelemetry',
  
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true' || isProduction,
    endpoint: process.env.METRICS_ENDPOINT || 'http://localhost:9090/api/v1/write',
    interval: parseInt(process.env.METRICS_INTERVAL || '15000', 10),
    timeout: parseInt(process.env.METRICS_TIMEOUT || '5000', 10),
    headers: {
      'Authorization': process.env.METRICS_AUTH_HEADER || ''
    }
  },
  
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true' || isProduction,
    endpoint: process.env.TRACES_ENDPOINT || 'http://localhost:14268/api/traces',
    sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || (isDevelopment ? '1.0' : '0.1')),
    timeout: parseInt(process.env.TRACING_TIMEOUT || '5000', 10),
    headers: {
      'Authorization': process.env.TRACING_AUTH_HEADER || ''
    }
  },
  
  logging: {
    enabled: process.env.LOGGING_ENABLED === 'true' || true,
    level: (process.env.LOG_LEVEL as LogLevel) || (isDevelopment ? 'debug' : 'info'),
    endpoint: process.env.LOGS_ENDPOINT,
    format: isDevelopment ? 'text' : 'json'
  },

  instrumentation: {
    http: {
      enabled: true,
      collectRequestBody: isDevelopment,
      collectResponseBody: false,
      collectHeaders: isDevelopment,
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '52428800', 10), // 50MB
      cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '1000', 10) // 1 second
    },
    database: {
      enabled: true,
      collectQueries: isDevelopment,
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10) // 1 second
    },
    custom: {
      enabled: true,
      modules: ['./custom-instrumentation']
    }
  }
};

// Validation
if (observabilityConfig.metrics?.enabled && !observabilityConfig.metrics.endpoint) {
  console.warn('Metrics enabled but no endpoint configured');
}

if (observabilityConfig.tracing?.enabled && !observabilityConfig.tracing.endpoint) {
  console.warn('Tracing enabled but no endpoint configured');
}
```

#### **observability/setup.ts**
```typescript
import { ObservabilityProvider, ObservabilityContext } from '@inhl-lib/unified-observe-ability';
import { observabilityConfig } from '../config';

export class ObservabilitySetup {
  private static provider?: ObservabilityProvider;
  private static isShuttingDown = false;

  static async initialize(): Promise<ObservabilityProvider> {
    if (this.provider) {
      return this.provider;
    }

    console.log('Initializing observability...', {
      serviceName: observabilityConfig.serviceName,
      vendor: observabilityConfig.vendor,
      metricsEnabled: observabilityConfig.metrics?.enabled,
      tracingEnabled: observabilityConfig.tracing?.enabled
    });

    this.provider = new ObservabilityProvider(observabilityConfig);
    
    try {
      await this.provider.initialize();
      
      // Set global context
      ObservabilityContext.getInstance().setProvider(this.provider);
      
      // Set up graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('Observability initialized successfully');
      
      return this.provider;
    } catch (error) {
      console.error('Failed to initialize observability:', error);
      throw error;
    }
  }

  static getProvider(): ObservabilityProvider {
    if (!this.provider) {
      throw new Error('Observability not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  static isInitialized(): boolean {
    return !!this.provider;
  }

  private static setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }
      
      this.isShuttingDown = true;
      console.log(`Received ${signal}, shutting down observability...`);
      
      try {
        if (this.provider) {
          await this.provider.shutdown();
          console.log('Observability shutdown completed');
        }
      } catch (error) {
        console.error('Error during observability shutdown:', error);
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR1', () => shutdown('SIGUSR1'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2'));
  }
}
```

#### **observability/custom-instrumentation.ts**
```typescript
import { ObservabilityContext } from '@inhl-lib/unified-observe-ability';
import { 
  UnifiedCounter, 
  UnifiedHistogram, 
  UnifiedGauge 
} from '@inh-lib/unified-observe-ability-core';

export class CustomBusinessMetrics {
  private readonly metrics;
  private readonly userLookupCounter: UnifiedCounter;
  private readonly orderProcessingDuration: UnifiedHistogram;
  private readonly activeConnectionsGauge: UnifiedGauge;

  constructor() {
    this.metrics = ObservabilityContext.getInstance().getMetrics();
    
    // Initialize business-specific metrics
    this.userLookupCounter = this.metrics.createCounter({
      name: 'user_lookup_requests_total',
      description: 'Total user lookup requests',
      labelKeys: ['user_tier', 'lookup_method', 'result']
    });

    this.orderProcessingDuration = this.metrics.createHistogram({
      name: 'order_processing_duration_seconds',
      description: 'Time taken to process orders',
      unit: 'seconds',
      labelKeys: ['order_type', 'payment_method', 'status'],
      boundaries: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    this.activeConnectionsGauge = this.metrics.createGauge({
      name: 'active_connections_count',
      description: 'Number of active connections',
      labelKeys: ['connection_type']
    });
  }

  recordUserLookup(userTier: string, method: string, found: boolean): void {
    this.userLookupCounter.increment({
      user_tier: userTier,
      lookup_method: method,
      result: found ? 'found' : 'not_found'
    });
  }

  recordOrderProcessing(
    orderType: string, 
    paymentMethod: string, 
    status: string, 
    durationMs: number
  ): void {
    this.orderProcessingDuration.record(durationMs / 1000, {
      order_type: orderType,
      payment_method: paymentMethod,
      status
    });
  }

  updateActiveConnections(connectionType: string, count: number): void {
    this.activeConnectionsGauge.set(count, {
      connection_type: connectionType
    });
  }

  // Helper method to create custom spans for business logic
  createBusinessSpan(operationName: string, attributes?: Record<string, string | number | boolean>) {
    const tracer = ObservabilityContext.getInstance().getTracing().getActiveTracer();
    const span = tracer.startSpan(`business.${operationName}`);
    
    if (attributes) {
      span.setAttributes(attributes);
    }
    
    return span;
  }
}

// Export singleton instance
export const businessMetrics = new CustomBusinessMetrics();
```

#### **plugins/fastify-observability.plugin.ts**
```typescript
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { FastifyAdapter } from '@inhl-lib/unified-observe-ability';
import { ObservabilitySetup } from '../observability';
import { businessMetrics } from '../observability/custom-instrumentation';

declare module 'fastify' {
  interface FastifyInstance {
    observability: {
      getMetrics: () => UnifiedMetricProvider;
      getTracing: () => UnifiedTraceProvider;
      getLogging: () => UnifiedLogProvider;
      businessMetrics: typeof businessMetrics;
    };
  }
}

const observabilityPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Initialize observability provider
  const provider = await ObservabilitySetup.initialize();
  
  // Register Fastify adapter for automatic HTTP instrumentation
  const adapter = new FastifyAdapter();
  adapter.register(fastify);
  
  // Add observability utilities to Fastify instance
  fastify.decorate('observability', {
    getMetrics: () => provider.getMetricProvider(),
    getTracing: () => provider.getTraceProvider(),
    getLogging: () => provider.getLogProvider(),
    businessMetrics
  });

  // Add health check endpoint for observability
  fastify.get('/health/observability', async (request, reply) => {
    try {
      const isInitialized = ObservabilitySetup.isInitialized();
      
      return {
        status: 'healthy',
        observability: {
          initialized: isInitialized,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      reply.status(500);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  fastify.log.info('Observability plugin registered successfully');
};

export default fp(observabilityPlugin, {
  name: 'observability',
  fastify: '4.x'
});
```

#### **server.ts**
```typescript
import Fastify from 'fastify';
import observabilityPlugin from './plugins/fastify-observability.plugin';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Register observability first
fastify.register(observabilityPlugin);

// Example API routes with custom observability
fastify.get('/api/users/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    }
  }
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  
  // Create custom business span using fastify.observability
  const tracer = fastify.observability.getTracing().getActiveTracer();
  const span = tracer.startSpan('business.user.lookup', {
    attributes: {
      'user.id': id,
      'lookup.method': 'database'
    }
  });

  try {
    // Simulate user lookup
    const startTime = Date.now();
    const user = await getUserById(id);
    const duration = Date.now() - startTime;

    // Record business metrics using fastify.observability
    fastify.observability.getMetrics().createCounter({
      name: 'user_lookup_requests_total',
      description: 'Total user lookup requests',
      labelKeys: ['user_tier', 'lookup_method', 'result']
    }).increment({
      user_tier: user?.tier || 'unknown',
      lookup_method: 'database',
      result: user ? 'found' : 'not_found'
    });

    // Add business context to span
    span.setAttributes({
      'user.found': !!user,
      'user.tier': user?.tier || 'unknown',
      'lookup.duration_ms': duration
    });

    return { user };
  } catch (error) {
    span.setStatus({
      code: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    span.end();
  }
});

fastify.post('/api/orders', {
  schema: {
    body: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        orderType: { type: 'string' },
        paymentMethod: { type: 'string' },
        amount: { type: 'number' }
      },
      required: ['userId', 'orderType', 'paymentMethod', 'amount']
    }
  }
}, async (request, reply) => {
  const { userId, orderType, paymentMethod, amount } = request.body as {
    userId: string;
    orderType: string;
    paymentMethod: string;
    amount: number;
  };

  const tracer = fastify.observability.getTracing().getActiveTracer();
  const span = tracer.startSpan('business.order.process', {
    attributes: {
      'user.id': userId,
      'order.type': orderType,
      'order.amount': amount,
      'payment.method': paymentMethod
    }
  });

  const startTime = Date.now();
  let status = 'success';

  try {
    // Simulate order processing
    await processOrder({ userId, orderType, paymentMethod, amount });
    
    reply.status(201);
    return { orderId: `order_${Date.now()}`, status: 'created' };
  } catch (error) {
    status = 'failed';
    span.setStatus({
      code: 'ERROR',
      message: error instanceof Error ? error.message : 'Order processing failed'
    });
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    
    // Record order processing metrics
    fastify.observability.getMetrics().createHistogram({
      name: 'order_processing_duration_seconds',
      description: 'Time taken to process orders',
      unit: 'seconds',
      labelKeys: ['order_type', 'payment_method', 'status'],
      boundaries: [0.1, 0.5, 1, 2, 5, 10, 30]
    }).record(duration / 1000, {
      order_type: orderType,
      payment_method: paymentMethod,
      status
    });

    span.setAttributes({
      'order.status': status,
      'order.processing_time_ms': duration
    });
    
    span.end();
  }
});

// Mock functions for demonstration
async function getUserById(id: string): Promise<{ id: string; tier: string } | null> {
  // Simulate database lookup
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  
  if (id === 'notfound') {
    return null;
  }
  
  return {
    id,
    tier: Math.random() > 0.5 ? 'premium' : 'basic'
  };
}

async function processOrder(order: {
  userId: string;
  orderType: string;
  paymentMethod: string;
  amount: number;
}): Promise<void> {
  // Simulate order processing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  
  if (order.amount > 10000) {
    throw new Error('Amount too large for processing');
  }
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`Server listening on http://${host}:${port}`);
    fastify.log.info('Health check available at /health/observability');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  fastify.log.fatal(err, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.fatal({ reason, promise }, 'Unhandled promise rejection');
  process.exit(1);
});

start();
```

---

## 🧪 Testing Strategy

### **Internal Modules for Testing**

#### **@inh-lib/unified-observe-ability-core/internal/testing.ts**
```typescript
// Internal module for testing - not exported in main index
export interface TestableMetricProvider extends UnifiedMetricProvider {
  _getInternalMetrics(): Map<string, { counter?: number; histogram?: number[]; gauge?: number }>;
  _getMetricByName(name: string): UnifiedCounter | UnifiedHistogram | UnifiedGauge | undefined;
  _reset(): void;
}

export interface TestableSpan extends UnifiedSpan {
  _getAttributes(): Record<string, string | number | boolean>;
  _getEvents(): Array<{ name: string; attributes?: Record<string, unknown>; timestamp: number }>;
  _getStatus(): SpanStatus;
  _isEnded(): boolean;
}
```

#### **@inh-lib/unifield-util-otel/internal/testing.ts**
```typescript
export class TestableOtelRegistry extends OtelRegistry {
  getMetersCount(): number {
    return this.getAllMeters().size;
  }
  
  getTracersCount(): number {
    return this.getAllTracers().size;
  }
  
  getRegisteredMeterNames(): string[] {
    return Array.from(this.getAllMeters().keys());
  }
  
  getRegisteredTracerNames(): string[] {
    return Array.from(this.getAllTracers().keys());
  }
}

export class TestableOtelCounterAdapter extends OtelCounterAdapter {
  private recordedValues: Array<{ value: number; labels?: Record<string, string> }> = [];
  
  increment(labels?: Record<string, string>, value: number = 1): void {
    super.increment(labels, value);
    this.recordedValues.push({ value, labels });
  }
  
  _getRecordedValues() {
    return [...this.recordedValues];
  }
  
  _reset(): void {
    this.recordedValues = [];
  }
}
```

#### **@inhl-lib/unified-observe-ability/internal/testing.ts**
```typescript
export class TestableObservabilityContext extends ObservabilityContext {
  static _reset(): void {
    this.instance = undefined;
  }
  
  _getProviderState(): {
    hasProvider: boolean;
    isInitialized: boolean;
  } {
    try {
      const provider = this.getProvider();
      return {
        hasProvider: true,
        isInitialized: true // Would need to add method to check initialization state
      };
    } catch {
      return {
        hasProvider: false,
        isInitialized: false
      };
    }
  }
}

export class TestableResourceTracker extends ResourceTracker {
  private mockSnapshots: ResourceSnapshot[] = [];
  
  setMockSnapshot(snapshot: ResourceSnapshot): void {
    this.mockSnapshots.push(snapshot);
  }
  
  capture(): ResourceSnapshot {
    if (this.mockSnapshots.length > 0) {
      return this.mockSnapshots.shift()!;
    }
    return super.capture();
  }
  
  _reset(): void {
    this.mockSnapshots = [];
  }
}
```

---

## 📊 Summary

### **📦 Package Dependencies**

```
project-api-service
├── @inh-lib/api-utils-fastify          # Framework-specific adapter
│   └── @inhl-lib/unified-observe-ability
│       ├── @inh-lib/unified-observe-ability-core
│       └── @inh-lib/unifield-util-otel
│           └── @inh-lib/unified-observe-ability-core
└── @inh-lib/api-utils-hono             # Alternative framework adapter
    └── @inhl-lib/unified-observe-ability
        ├── @inh-lib/unified-observe-ability-core
        └── @inh-lib/unifield-util-otel
            └── @inh-lib/unified-observe-ability-core
```

### **🔧 Key Architecture Benefits**

- ✅ **Framework Isolation**: Core library has zero framework dependencies
- ✅ **Optional Framework Support**: Install only needed framework adapters
- ✅ **Vendor Agnostic**: Support OpenTelemetry (extensible to DataDog, New Relic)
- ✅ **Type Safe**: Full TypeScript support with no `any` types
- ✅ **Testable**: Internal modules exposed for comprehensive testing
- ✅ **Resource Tracking**: Automatic memory & CPU usage tracking per request
- ✅ **Auto Instrumentation**: HTTP requests, database calls, custom business metrics
- ✅ **Context Management**: Thread-safe observability context across frameworks
- ✅ **Graceful Shutdown**: Proper cleanup and export on application termination
- ✅ **Plugin Architecture**: Easy integration with framework-specific plugin systems

### **📦 Package Responsibilities (Updated)**

| Package | Responsibility | Dependencies | Exports |
|---------|---------------|-------------|---------|
| `@inh-lib/unified-observe-ability-core` | Core types & interfaces | None | Types, Enums, Errors |
| `@inh-lib/unifield-util-otel` | OpenTelemetry adapters | core + @opentelemetry/* | Factories, Adapters |
| `@inhl-lib/unified-observe-ability` | Main functionality | core + unifield-util-otel | Providers, Context, Instrumentation |
| `@inh-lib/api-utils-fastify` | Fastify integration | unified-observe-ability + fastify | FastifyAdapter, Plugin |
| `@inh-lib/api-utils-hono` | Hono integration | unified-observe-ability + hono | HonoAdapter, Middleware |
| `@inh-lib/api-utils-express` | Express integration | unified-observe-ability + express | ExpressAdapter, Middleware |
| `project-api-service` | Application integration | api-utils-fastify | Plugins, Configuration |

### **🚀 Usage Flow (Updated)**

1. **Install core packages** and specific framework adapter
   ```bash
   npm install @inh-lib/unified-observe-ability-core
   npm install @inh-lib/unifield-util-otel  
   npm install @inhl-lib/unified-observe-ability
   npm install @inh-lib/api-utils-fastify    # For Fastify projects
   # OR
   npm install @inh-lib/api-utils-hono       # For Hono projects
   ```

2. **Configure** observability settings via environment variables or config file

3. **Initialize** observability provider in main application startup

4. **Register** framework-specific plugin/middleware (automatically instruments HTTP requests)
   ```typescript
   // Fastify
   fastify.register(fastifyObservabilityPlugin, { provider, instrumentation: {...} });
   
   // Hono  
   app.use(createObservabilityMiddleware({ instrumentation: {...} }));
   
   // Express
   app.use(expressObservabilityMiddleware({ instrumentation: {...} }));
   ```

5. **Add custom metrics** for business logic using framework-specific observability utilities

6. **Deploy** with proper backend configuration (Prometheus, Jaeger, etc.)

### **📋 Framework Selection Guide**

| Framework | Package | Plugin Type | Integration Style |
|-----------|---------|-------------|-------------------|
| **Fastify** | `@inh-lib/api-utils-fastify` | Fastify Plugin | `fastify.register()` |
| **Hono** | `@inh-lib/api-utils-hono` | Middleware | `app.use()` |
| **Express** | `@inh-lib/api-utils-express` | Middleware | `app.use()` |

### **🔌 Integration Examples**

#### **Fastify Integration**
```typescript
import fastifyObservabilityPlugin from '@inh-lib/api-utils-fastify';

await fastify.register(fastifyObservabilityPlugin, {
  provider: await ObservabilitySetup.initialize(),
  instrumentation: { enabled: true }
});

// Use fastify.observability.getMetrics() in routes
```

#### **Hono Integration**  
```typescript
import { createObservabilityMiddleware, getObservability } from '@inh-lib/api-utils-hono';

app.use(createObservabilityMiddleware({ 
  instrumentation: { enabled: true } 
}));

// Use getObservability(c).getMetrics() in handlers
```

#### **Express Integration**
```typescript
import { createObservabilityMiddleware } from '@inh-lib/api-utils-express';

app.use(createObservabilityMiddleware({
  instrumentation: { enabled: true }
}));

// Use req.observability.getMetrics() in routes
```

### **📈 Monitoring Capabilities**

Based on the dashboard requirements from the original document:

- **Performance Overview**: Request rates, response times, memory/CPU usage per route
- **Top 10 Analysis**: Most resource-intensive routes and operations
- **Error Analysis**: Error rates and patterns by route and type
- **Individual Trace Analysis**: Detailed request-level investigation
- **Database Performance**: Query performance and connection pool monitoring
- **Resource Correlation**: Memory and CPU usage correlated with business metrics

**Result**: Complete, production-ready, type-safe observability solution with **mixed vendor support** and **zero coupling**! 🎯

## 🎯 Mixed Vendor Architecture Advantages

### **🏗️ Complete Separation of Concerns**
- **Core Library**: Framework and vendor agnostic, pure observability orchestration
- **Vendor Adapters**: Isolated vendor-specific implementations
- **Framework Adapters**: Framework-specific integration without vendor coupling  
- **Application Layer**: Configuration and business logic

### **💰 Cost & Performance Optimization**
```typescript
// Example: Cost-optimized production setup
{
  metrics: { vendor: 'prometheus' },     // Self-hosted, no per-metric cost
  tracing: { vendor: 'awsxray' },        // AWS native, optimized performance  
  logging: { vendor: 'winston' }         // Flexible, multiple destinations
}

// vs expensive all-DataDog setup
{
  metrics: { vendor: 'datadog' },        // High per-metric cost
  tracing: { vendor: 'datadog' },        // High per-span cost
  logging: { vendor: 'datadog' }         // High per-log cost  
}
```

### **📦 Dependency Management Excellence**
```typescript
// ❌ Bad: Monolithic approach
unified-observability
├── @opentelemetry/*     // 15+ packages
├── aws-xray-sdk         // Large SDK
├── prom-client          // Prometheus
├── winston              // Logging
├── fastify              // Framework
└── datadog-*            // DataDog packages

// ✅ Good: Modular approach
project-api-service
├── @inh-lib/unified-observe-ability-core     // Types only
├── @inhl-lib/unified-observe-ability         // Orchestration  
├── @inh-lib/api-utils-fastify               // Framework only
├── @inh-lib/unified-metrics-prometheus      // Metrics only
└── @inh-lib/unified-tracing-awsxray         // Tracing only
```

### **🚀 Migration & Vendor Independence**
```typescript
// Gradual migration example:
// Step 1: Start with OpenTelemetry
{ metrics: 'opentelemetry', tracing: 'opentelemetry', logging: 'opentelemetry' }

// Step 2: Optimize metrics cost  
{ metrics: 'prometheus', tracing: 'opentelemetry', logging: 'opentelemetry' }

// Step 3: Add AWS native tracing
{ metrics: 'prometheus', tracing: 'awsxray', logging: 'opentelemetry' }

// Step 4: Optimize logging performance
{ metrics: 'prometheus', tracing: 'awsxray', logging: 'winston' }
```

### **⚡ Performance Benefits**
- **Smaller Bundle Size**: Only needed vendor packages in final bundle
- **Faster Startup**: No unused vendor initialization  
- **Better Tree Shaking**: Eliminate unused vendor code completely
- **Reduced Memory**: Each vendor optimized for its specific use case

### **🧪 Testing & Development**
- **Isolated Testing**: Test each vendor adapter independently
- **Easy Mocking**: Mock specific vendors without affecting others
- **Development Flexibility**: Use lightweight vendors for dev, production vendors for prod
- **Debugging**: Focus on specific vendor issues without cross-vendor interference

### **👥 Team & Enterprise Benefits**
- **Team Specialization**: Different teams can own different vendor integrations
- **Budget Control**: Optimize costs per observability component
- **Compliance**: Use compliant vendors for specific data types
- **Regional Requirements**: Use region-specific vendors where needed

### **🔮 Future Extensibility**
Adding support for new vendors is trivial:

```typescript
// New vendor: Honeycomb for tracing
@inh-lib/unified-tracing-honeycomb/
├── src/adapters/honeycomb-span-adapter.ts
├── src/factories/honeycomb-trace-provider-factory.ts  
└── src/index.ts

// Configuration update
{ tracing: { vendor: 'honeycomb', endpoint: '...' } }

// Zero changes to core library or other vendors!
```

### **📈 Real-World Usage Patterns**

#### **Startup → Enterprise Evolution**
```typescript
// Startup: Simple & Free
{ metrics: 'prometheus', tracing: 'jaeger', logging: 'winston' }

// Growth: Add managed services  
{ metrics: 'prometheus', tracing: 'awsxray', logging: 'cloudwatch' }

// Enterprise: Best-of-breed
{ metrics: 'datadog', tracing: 'awsxray', logging: 'splunk' }
```

#### **Multi-Cloud Strategy**
```typescript
// AWS workloads
{ metrics: 'cloudwatch', tracing: 'awsxray', logging: 'cloudwatch' }

// GCP workloads  
{ metrics: 'stackdriver', tracing: 'cloudtrace', logging: 'stackdriver' }

// On-premises
{ metrics: 'prometheus', tracing: 'jaeger', logging: 'elasticsearch' }
```

This architecture provides **maximum flexibility** with **minimum complexity** - the holy grail of enterprise software design! 🏆