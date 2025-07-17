# @inh-lib/unified-observe-ability-core

## Package Structure

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

## File Contents

### **src/constants/metric-type.ts**
```typescript
export const MetricType = {
  COUNTER: 'counter',
  HISTOGRAM: 'histogram',
  GAUGE: 'gauge',
  SUMMARY: 'summary'
} as const;

export type MetricType = typeof MetricType[keyof typeof MetricType];
```

### **src/constants/log-level.ts**
```typescript
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Helper function for level comparison
export function getLogLevelPriority(level: LogLevel): number {
  const priorities = {
    [LogLevel.TRACE]: 0,
    [LogLevel.DEBUG]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.WARN]: 3,
    [LogLevel.ERROR]: 4,
    [LogLevel.FATAL]: 5
  };
  return priorities[level];
}

export function isLogLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return getLogLevelPriority(targetLevel) >= getLogLevelPriority(currentLevel);
}
```

### **src/constants/status-code.ts**
```typescript
export const SpanStatusCode = {
  UNSET: 'UNSET',
  OK: 'OK',
  ERROR: 'ERROR'
} as const;

export type SpanStatusCode = typeof SpanStatusCode[keyof typeof SpanStatusCode];

export const HttpStatusCodeRange = {
  SUCCESS: '2xx',
  CLIENT_ERROR: '4xx',
  SERVER_ERROR: '5xx'
} as const;

export type HttpStatusCodeRange = typeof HttpStatusCodeRange[keyof typeof HttpStatusCodeRange];

// Helper functions
export function getSpanStatusFromHttpCode(statusCode: number): SpanStatusCode {
  if (statusCode >= 400) {
    return SpanStatusCode.ERROR;
  }
  return SpanStatusCode.OK;
}

export function getHttpStatusRange(statusCode: number): HttpStatusCodeRange | undefined {
  if (statusCode >= 200 && statusCode < 300) {
    return HttpStatusCodeRange.SUCCESS;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return HttpStatusCodeRange.CLIENT_ERROR;
  }
  if (statusCode >= 500 && statusCode < 600) {
    return HttpStatusCodeRange.SERVER_ERROR;
  }
  return undefined;
}
```

### **src/constants/span-kind.ts**
```typescript
export const SpanKind = {
  INTERNAL: 'INTERNAL',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  PRODUCER: 'PRODUCER',
  CONSUMER: 'CONSUMER'
} as const;

export type SpanKind = typeof SpanKind[keyof typeof SpanKind];
```

### **src/constants/vendor-types.ts**
```typescript
export const MetricsVendorType = {
  PROMETHEUS: 'prometheus',
  DATADOG: 'datadog',
  NEWRELIC: 'newrelic',
  CLOUDWATCH: 'cloudwatch',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type MetricsVendorType = typeof MetricsVendorType[keyof typeof MetricsVendorType];

export const TracingVendorType = {
  JAEGER: 'jaeger',
  AWSXRAY: 'awsxray',
  DATADOG: 'datadog',
  NEWRELIC: 'newrelic',
  CLOUDTRACE: 'cloudtrace',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type TracingVendorType = typeof TracingVendorType[keyof typeof TracingVendorType];

export const LoggingVendorType = {
  WINSTON: 'winston',
  PINO: 'pino',
  BUNYAN: 'bunyan',
  DATADOG: 'datadog',
  CLOUDWATCH: 'cloudwatch',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type LoggingVendorType = typeof LoggingVendorType[keyof typeof LoggingVendorType];

export const AuthType = {
  API_KEY: 'api_key',
  BEARER_TOKEN: 'bearer_token',
  BASIC: 'basic',
  AWS_SIGNATURE: 'aws_signature',
  OAUTH: 'oauth'
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];

export const LogFormat = {
  JSON: 'json',
  TEXT: 'text',
  STRUCTURED: 'structured'
} as const;

export type LogFormat = typeof LogFormat[keyof typeof LogFormat];

export const LogTransportType = {
  CONSOLE: 'console',
  FILE: 'file',
  HTTP: 'http',
  TCP: 'tcp',
  UDP: 'udp',
  CLOUDWATCH: 'cloudwatch',
  CUSTOM: 'custom'
} as const;

export type LogTransportType = typeof LogTransportType[keyof typeof LogTransportType];

export const ResourceDetectorType = {
  ENV: 'env',
  HOST: 'host',
  OS: 'os',
  PROCESS: 'process',
  CONTAINER: 'container',
  K8S: 'k8s',
  AWS_EC2: 'aws_ec2',
  AWS_ECS: 'aws_ecs',
  AWS_EKS: 'aws_eks',
  GCP: 'gcp',
  AZURE: 'azure'
} as const;

export type ResourceDetectorType = typeof ResourceDetectorType[keyof typeof ResourceDetectorType];

export const LabelMatchOperator = {
  EQUAL: '=',
  NOT_EQUAL: '!=',
  REGEX_MATCH: '=~',
  REGEX_NOT_MATCH: '!~'
} as const;

export type LabelMatchOperator = typeof LabelMatchOperator[keyof typeof LabelMatchOperator];
```

### **src/constants/index.ts**
```typescript
export * from './metric-type';
export * from './log-level';
export * from './status-code';
export * from './span-kind';
export * from './vendor-types';
```

### **src/utils/type.utils.ts**
```typescript
export type Primitive = string | number | boolean;
export type LabelValue = string;
export type AttributeValue = string | number | boolean;

export interface KeyValuePair<T = string> {
  readonly key: string;
  readonly value: T;
}

export type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<Record<K, V>>;

export function isPrimitive(value: unknown): value is Primitive {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export function isValidLabelValue(value: unknown): value is LabelValue {
  return typeof value === 'string' && value.length > 0;
}

export function isValidAttributeValue(value: unknown): value is AttributeValue {
  return isPrimitive(value);
}

export function ensureStringMap(input: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    } else {
      result[key] = 'unknown';
    }
  }
  
  return result;
}
```

### **src/utils/validation.utils.ts**
```typescript
import { AttributeValue, LabelValue } from './type.utils';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
}

export function createValidationResult(isValid: boolean, errors: string[] = []): ValidationResult {
  return { isValid, errors: [...errors] };
}

export function validateMetricName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Metric name must be a non-empty string');
    return createValidationResult(false, errors);
  }
  
  if (name.length === 0) {
    errors.push('Metric name cannot be empty');
  }
  
  if (name.length > 255) {
    errors.push('Metric name cannot exceed 255 characters');
  }
  
  // Check valid characters (alphanumeric, underscore, colon)
  const validNameRegex = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
  if (!validNameRegex.test(name)) {
    errors.push('Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons');
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateLabelKeys(labelKeys: string[]): ValidationResult {
  const errors: string[] = [];
  
  for (const key of labelKeys) {
    if (!key || typeof key !== 'string') {
      errors.push('Label keys must be non-empty strings');
      continue;
    }
    
    if (key.length === 0) {
      errors.push('Label key cannot be empty');
      continue;
    }
    
    if (key.startsWith('__')) {
      errors.push(`Label key "${key}" cannot start with double underscore (reserved prefix)`);
    }
    
    const validKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validKeyRegex.test(key)) {
      errors.push(`Label key "${key}" must start with letter or underscore and contain only alphanumeric characters and underscores`);
    }
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateLabels(labels: Record<string, LabelValue>): ValidationResult {
  const errors: string[] = [];
  
  for (const [key, value] of Object.entries(labels)) {
    const keyValidation = validateLabelKeys([key]);
    if (!keyValidation.isValid) {
      errors.push(...keyValidation.errors);
    }
    
    if (typeof value !== 'string') {
      errors.push(`Label value for key "${key}" must be a string`);
    }
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateAttributes(attributes: Record<string, AttributeValue>): ValidationResult {
  const errors: string[] = [];
  
  for (const [key, value] of Object.entries(attributes)) {
    if (!key || typeof key !== 'string') {
      errors.push('Attribute keys must be non-empty strings');
      continue;
    }
    
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      errors.push(`Attribute value for key "${key}" must be string, number, or boolean`);
    }
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateHistogramBoundaries(boundaries: number[]): ValidationResult {
  const errors: string[] = [];
  
  if (boundaries.length === 0) {
    errors.push('Histogram boundaries cannot be empty');
    return createValidationResult(false, errors);
  }
  
  // Check for non-numeric values
  for (const boundary of boundaries) {
    if (typeof boundary !== 'number' || !Number.isFinite(boundary)) {
      errors.push('All histogram boundaries must be finite numbers');
      break;
    }
  }
  
  // Check for sorted order
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] <= boundaries[i - 1]) {
      errors.push('Histogram boundaries must be in strictly increasing order');
      break;
    }
  }
  
  // Check for positive values
  if (boundaries[0] <= 0) {
    errors.push('Histogram boundaries must be positive');
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateServiceName(serviceName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!serviceName || typeof serviceName !== 'string') {
    errors.push('Service name must be a non-empty string');
    return createValidationResult(false, errors);
  }
  
  if (serviceName.length === 0) {
    errors.push('Service name cannot be empty');
  }
  
  if (serviceName.length > 100) {
    errors.push('Service name cannot exceed 100 characters');
  }
  
  const validServiceNameRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
  if (!validServiceNameRegex.test(serviceName)) {
    errors.push('Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens');
  }
  
  return createValidationResult(errors.length === 0, errors);
}
```

### **src/utils/index.ts**
```typescript
export * from './type.utils';
export * from './validation.utils';
```

### **src/types/metrics/labels.ts**
```typescript
import { LabelValue } from '../../utils/type.utils';
import { LabelMatchOperator } from '../../constants/vendor-types';

export interface LabelSet {
  readonly [key: string]: LabelValue;
}

export interface LabelMatcher {
  readonly key: string;
  readonly value: LabelValue;
  readonly operator: LabelMatchOperator;
}

export interface LabelSelector {
  readonly matchers: LabelMatcher[];
}
```

### **src/types/metrics/counter.ts**
```typescript
import { LabelSet } from './labels';

export interface UnifiedCounter {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  
  increment(labels?: LabelSet, value?: number): void;
  get(labels?: LabelSet): number;
}

export interface CounterOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys?: string[];
}

export interface CounterValue {
  readonly labels: LabelSet;
  readonly value: number;
  readonly timestamp: number;
}
```

### **src/types/metrics/histogram.ts**
```typescript
import { LabelSet } from './labels';

export interface UnifiedHistogram {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  readonly boundaries: number[];
  
  record(value: number, labels?: LabelSet): void;
  getPercentile(percentile: number, labels?: LabelSet): number;
  getBucketCounts(labels?: LabelSet): HistogramBucketCounts;
}

export interface HistogramOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly boundaries?: number[];
  readonly labelKeys?: string[];
}

export interface HistogramBucketCounts {
  readonly buckets: HistogramBucket[];
  readonly count: number;
  readonly sum: number;
}

export interface HistogramBucket {
  readonly upperBound: number;
  readonly count: number;
}

export interface HistogramValue {
  readonly labels: LabelSet;
  readonly buckets: HistogramBucket[];
  readonly count: number;
  readonly sum: number;
  readonly timestamp: number;
}

export const DEFAULT_HISTOGRAM_BOUNDARIES = [
  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0
];
```

### **src/types/metrics/gauge.ts**
```typescript
import { LabelSet } from './labels';

export interface UnifiedGauge {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  
  set(value: number, labels?: LabelSet): void;
  add(value: number, labels?: LabelSet): void;
  subtract(value: number, labels?: LabelSet): void;
  get(labels?: LabelSet): number;
}

export interface GaugeOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys?: string[];
}

export interface GaugeValue {
  readonly labels: LabelSet;
  readonly value: number;
  readonly timestamp: number;
}
```

### **src/types/metrics/index.ts**
```typescript
export * from './labels';
export * from './counter';
export * from './histogram';
export * from './gauge';
```

### **src/types/tracing/context.ts**
```typescript
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly isValid: boolean;
}

export interface SpanContext extends TraceContext {
  readonly parentSpanId?: string;
  readonly baggage?: Record<string, string>;
}

export interface ContextManager {
  active(): TraceContext | undefined;
  with<T>(context: TraceContext, fn: () => T): T;
  bind<T extends (...args: unknown[]) => unknown>(context: TraceContext, target: T): T;
}
```

### **src/types/tracing/span.ts**
```typescript
import { AttributeValue } from '../../utils/type.utils';
import { SpanStatusCode, SpanKind } from '../../constants';

export interface UnifiedSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: number;
  readonly isRecording: boolean;
  
  setAttributes(attributes: Record<string, AttributeValue>): UnifiedSpan;
  setAttribute(key: string, value: AttributeValue): UnifiedSpan;
  setStatus(status: SpanStatus): UnifiedSpan;
  setName(name: string): UnifiedSpan;
  addEvent(name: string, attributes?: Record<string, AttributeValue>, timestamp?: number): UnifiedSpan;
  end(endTime?: number): void;
}

export interface SpanOptions {
  readonly kind?: SpanKind;
  readonly startTime?: number;
  readonly parent?: UnifiedSpan;
  readonly attributes?: Record<string, AttributeValue>;
  readonly links?: SpanLink[];
}

export interface SpanStatus {
  readonly code: SpanStatusCode;
  readonly message?: string;
}

export interface SpanEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: Record<string, AttributeValue>;
}

export interface SpanLink {
  readonly context: SpanContext;
  readonly attributes?: Record<string, AttributeValue>;
}

export interface SpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly isRemote?: boolean;
}
```

### **src/types/tracing/tracer.ts**
```typescript
import { UnifiedSpan, SpanOptions } from './span';

export interface UnifiedTracer {
  readonly name: string;
  readonly version?: string;
  
  startSpan(name: string, options?: SpanOptions): UnifiedSpan;
  startActiveSpan<T>(
    name: string,
    fn: (span: UnifiedSpan) => T,
    options?: SpanOptions
  ): T;
  startActiveSpan<T>(
    name: string,
    options: SpanOptions,
    fn: (span: UnifiedSpan) => T
  ): T;
  getActiveSpan(): UnifiedSpan | undefined;
  withSpan<T>(span: UnifiedSpan, fn: () => T): T;
}

export interface TracerOptions {
  readonly name: string;
  readonly version?: string;
  readonly schemaUrl?: string;
}
```

### **src/types/tracing/index.ts**
```typescript
export * from './context';
export * from './span';
export * from './tracer';
```

### **src/types/logging/logger.ts**
```typescript
import { LogLevel, LogFormat } from '../../constants';

export interface UnifiedLogger {
  readonly name: string;
  readonly level: LogLevel;
  
  trace(message: string, meta?: LogMetadata): void;
  debug(message: string, meta?: LogMetadata): void;
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
  fatal(message: string, meta?: LogMetadata): void;
  
  child(bindings: LogMetadata): UnifiedLogger;
  isLevelEnabled(level: LogLevel): boolean;
}

export interface LoggerOptions {
  readonly name: string;
  readonly level?: LogLevel;
  readonly format?: LogFormat;
  readonly includeStack?: boolean;
  readonly bindings?: LogMetadata;
}

export interface LogMetadata {
  readonly [key: string]: LogValue;
}

export type LogValue = string | number | boolean | Date | Error | Record<string, unknown> | LogValue[];

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly logger: string;
  readonly metadata?: LogMetadata;
  readonly traceId?: string;
  readonly spanId?: string;
}
```

### **src/types/logging/index.ts**
```typescript
export * from './logger';
```

### **src/types/providers/metric-provider.ts**
```typescript
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
```

### **src/types/providers/trace-provider.ts**
```typescript
import { UnifiedTracer, TracerOptions } from '../tracing/tracer';

export interface UnifiedTraceProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  getTracer(name: string, version?: string): UnifiedTracer;
  getTracer(options: TracerOptions): UnifiedTracer;
  getActiveTracer(): UnifiedTracer;
  
  getAllTracers(): TracersList;
  shutdown(): Promise<void>;
}

export interface TracersList {
  readonly tracers: UnifiedTracer[];
}

export interface TraceExporter {
  export(): Promise<TracesExportResult>;
}

export interface TracesExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly tracesCount: number;
  readonly timestamp: number;
}
```

### **src/types/providers/log-provider.ts**
```typescript
import { UnifiedLogger, LoggerOptions } from '../logging/logger';

export interface UnifiedLogProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  getLogger(options: LoggerOptions): UnifiedLogger;
  getLogger(name: string): UnifiedLogger;
  
  getAllLoggers(): LoggersList;
  shutdown(): Promise<void>;
}

export interface LoggersList {
  readonly loggers: UnifiedLogger[];
}

export interface LogExporter {
  export(): Promise<LogsExportResult>;
}

export interface LogsExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly logsCount: number;
  readonly timestamp: number;
}
```

### **src/types/providers/index.ts**
```typescript
export * from './metric-provider';
export * from './trace-provider';
export * from './log-provider';
```

### **src/types/configuration/vendor-config.ts**
```typescript
import { 
  MetricsVendorType,
  TracingVendorType, 
  LoggingVendorType,
  AuthType
} from '../../constants/vendor-types';

export interface VendorEndpointConfig {
  readonly url: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
  readonly retryConfig?: RetryConfig;
}

export interface RetryConfig {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly exponentialBackoff?: boolean;
}

export interface AuthConfig {
  readonly type: AuthType;
  readonly credentials: AuthCredentials;
}

export interface AuthCredentials {
  readonly apiKey?: string;
  readonly bearerToken?: string;
  readonly username?: string;
  readonly password?: string;
  readonly awsAccessKeyId?: string;
  readonly awsSecretAccessKey?: string;
  readonly awsRegion?: string;
  readonly oauthClientId?: string;
  readonly oauthClientSecret?: string;
  readonly oauthTokenUrl?: string;
}

// Re-export types for convenience
export type { MetricsVendorType, TracingVendorType, LoggingVendorType, AuthType };
```

### **src/types/configuration/observability-config.ts**
```typescript
import { LogLevel, LogFormat, LogTransportType, ResourceDetectorType } from '../../constants';
import { 
  MetricsVendorType, 
  TracingVendorType, 
  LoggingVendorType,
  VendorEndpointConfig,
  AuthConfig 
} from './vendor-config';

export interface ObservabilityConfig {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly serviceNamespace?: string;
  readonly serviceInstanceId?: string;
  
  readonly metrics?: MetricsConfig;
  readonly tracing?: TracingConfig;
  readonly logging?: LoggingConfig;
  readonly instrumentation?: InstrumentationConfig;
  readonly resource?: ResourceConfig;
}

export interface MetricsConfig {
  readonly enabled: boolean;
  readonly vendor: MetricsVendorType;
  readonly endpoint?: VendorEndpointConfig;
  readonly interval?: number;
  readonly batchSize?: number;
  readonly auth?: AuthConfig;
  readonly customRegistry?: unknown;
  readonly exporterConfig?: MetricsExporterConfig;
}

export interface MetricsExporterConfig {
  readonly prefix?: string;
  readonly includeTimestamp?: boolean;
  readonly includeMetadata?: boolean;
  readonly compressionEnabled?: boolean;
}

export interface TracingConfig {
  readonly enabled: boolean;
  readonly vendor: TracingVendorType;
  readonly endpoint?: VendorEndpointConfig;
  readonly sampleRate?: number;
  readonly maxSpansPerTrace?: number;
  readonly auth?: AuthConfig;
  readonly exporterConfig?: TracingExporterConfig;
}

export interface TracingExporterConfig {
  readonly batchSize?: number;
  readonly batchTimeout?: number;
  readonly compressionEnabled?: boolean;
  readonly includeResourceAttributes?: boolean;
}

export interface LoggingConfig {
  readonly enabled: boolean;
  readonly vendor: LoggingVendorType;
  readonly level?: LogLevel;
  readonly endpoint?: VendorEndpointConfig;
  readonly format?: LogFormat;
  readonly auth?: AuthConfig;
  readonly transports?: LogTransportConfig[];
  readonly exporterConfig?: LoggingExporterConfig;
}

export interface LoggingExporterConfig {
  readonly batchSize?: number;
  readonly batchTimeout?: number;
  readonly includeTimestamp?: boolean;
  readonly includeTraceContext?: boolean;
  readonly compressionEnabled?: boolean;
}

export interface LogTransportConfig {
  readonly type: LogTransportType;
  readonly options?: Record<string, unknown>;
  readonly level?: LogLevel;
  readonly format?: LogFormat;
}

export interface InstrumentationConfig {
  readonly http?: HttpInstrumentationConfig;
  readonly database?: DatabaseInstrumentationConfig;
  readonly custom?: CustomInstrumentationConfig;
}

export interface HttpInstrumentationConfig {
  readonly enabled: boolean;
  readonly collectRequestBody?: boolean;
  readonly collectResponseBody?: boolean;
  readonly collectHeaders?: boolean;
  readonly memoryThreshold?: number;
  readonly cpuThreshold?: number;
  readonly ignorePaths?: string[];
  readonly ignoreUserAgents?: string[];
}

export interface DatabaseInstrumentationConfig {
  readonly enabled: boolean;
  readonly collectQueries?: boolean;
  readonly slowQueryThreshold?: number;
  readonly includeQueryParameters?: boolean;
  readonly maxQueryLength?: number;
}

export interface CustomInstrumentationConfig {
  readonly enabled: boolean;
  readonly modules?: string[];
  readonly plugins?: InstrumentationPlugin[];
}

export interface InstrumentationPlugin {
  readonly name: string;
  readonly enabled: boolean;
  readonly config?: Record<string, unknown>;
}

export interface ResourceConfig {
  readonly attributes?: Record<string, string>;
  readonly detectors?: ResourceDetectorConfig[];
}

export interface ResourceDetectorConfig {
  readonly type: ResourceDetectorType;
  readonly enabled: boolean;
  readonly timeout?: number;
}

export interface MixedVendorConfig extends ObservabilityConfig {
  readonly metrics: MetricsConfig & { vendor: 'prometheus' };
  readonly tracing: TracingConfig & { vendor: 'awsxray' };
  readonly logging: LoggingConfig & { vendor: 'winston' };
}
```

### **src/types/configuration/index.ts**
```typescript
export * from './vendor-config';
export * from './observability-config';
```

### **src/types/index.ts**
```typescript
export * from './metrics';
export * from './tracing';
export * from './logging';
export * from './providers';
export * from './configuration';
```

### **src/errors/observability-error.ts**
```typescript
export class ObservabilityError extends Error {
  public readonly code: string;
  public readonly cause?: Error;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'ObservabilityError';
    this.code = code;
    this.cause = cause;
    this.timestamp = Date.now();
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ObservabilityError.prototype);
  }

  toJSON(): ObservabilityErrorSerialized {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
}

export interface ObservabilityErrorSerialized {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly timestamp: number;
  readonly stack?: string;
  readonly cause?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
}

// Error codes
export const ErrorCodes = {
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  PROVIDER_NOT_INITIALIZED: 'PROVIDER_NOT_INITIALIZED',
  INVALID_METRIC_NAME: 'INVALID_METRIC_NAME',
  INVALID_LABEL_KEY: 'INVALID_LABEL_KEY',
  INVALID_ATTRIBUTE_VALUE: 'INVALID_ATTRIBUTE_VALUE',
  SPAN_ALREADY_ENDED: 'SPAN_ALREADY_ENDED',
  TRACER_NOT_AVAILABLE: 'TRACER_NOT_AVAILABLE',
  LOGGER_NOT_AVAILABLE: 'LOGGER_NOT_AVAILABLE',
  EXPORT_FAILED: 'EXPORT_FAILED',
  SHUTDOWN_FAILED: 'SHUTDOWN_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### **src/errors/configuration-error.ts**
```typescript
import { ObservabilityError, ErrorCodes } from './observability-error';

export class ConfigurationError extends ObservabilityError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCodes.CONFIGURATION_ERROR, cause);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ProviderNotInitializedError extends ObservabilityError {
  public readonly providerType: string;

  constructor(providerType: string) {
    super(
      `${providerType} provider not initialized`,
      ErrorCodes.PROVIDER_NOT_INITIALIZED
    );
    this.name = 'ProviderNotInitializedError';
    this.providerType = providerType;
    Object.setPrototypeOf(this, ProviderNotInitializedError.prototype);
  }
}

export class ValidationError extends ObservabilityError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[], cause?: Error) {
    super(message, ErrorCodes.VALIDATION_FAILED, cause);
    this.name = 'ValidationError';
    this.validationErrors = [...validationErrors];
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class MetricError extends ObservabilityError {
  public readonly metricName: string;

  constructor(message: string, metricName: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'MetricError';
    this.metricName = metricName;
    Object.setPrototypeOf(this, MetricError.prototype);
  }
}

export class TracingError extends ObservabilityError {
  public readonly spanName?: string;
  public readonly traceId?: string;

  constructor(message: string, code: string, spanName?: string, traceId?: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'TracingError';
    this.spanName = spanName;
    this.traceId = traceId;
    Object.setPrototypeOf(this, TracingError.prototype);
  }
}

export class LoggingError extends ObservabilityError {
  public readonly loggerName: string;

  constructor(message: string, loggerName: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'LoggingError';
    this.loggerName = loggerName;
    Object.setPrototypeOf(this, LoggingError.prototype);
  }
}

export class ExportError extends ObservabilityError {
  public readonly exporterType: string;
  public readonly itemsCount: number;

  constructor(message: string, exporterType: string, itemsCount: number, cause?: Error) {
    super(message, ErrorCodes.EXPORT_FAILED, cause);
    this.name = 'ExportError';
    this.exporterType = exporterType;
    this.itemsCount = itemsCount;
    Object.setPrototypeOf(this, ExportError.prototype);
  }
}
```

### **src/errors/index.ts**
```typescript
export * from './observability-error';
export * from './configuration-error';
```

### **src/internal/validation.ts**
```typescript
import { ValidationResult, validateMetricName, validateLabelKeys, validateLabels, validateAttributes, validateServiceName } from '../utils/validation.utils';
import { CounterOptions } from '../types/metrics/counter';
import { HistogramOptions } from '../types/metrics/histogram';
import { GaugeOptions } from '../types/metrics/gauge';
import { ObservabilityConfig } from '../types/configuration/observability-config';
import { LoggerOptions } from '../types/logging/logger';
import { SpanOptions } from '../types/tracing/span';
import { ValidationError } from '../errors';

export function validateCounterOptions(options: CounterOptions): ValidationResult {
  const errors: string[] = [];
  
  const nameValidation = validateMetricName(options.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  if (!options.description || typeof options.description !== 'string') {
    errors.push('Counter description is required and must be a string');
  }
  
  if (options.labelKeys) {
    const labelKeysValidation = validateLabelKeys(options.labelKeys);
    if (!labelKeysValidation.isValid) {
      errors.push(...labelKeysValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateHistogramOptions(options: HistogramOptions): ValidationResult {
  const errors: string[] = [];
  
  const nameValidation = validateMetricName(options.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  if (!options.description || typeof options.description !== 'string') {
    errors.push('Histogram description is required and must be a string');
  }
  
  if (options.labelKeys) {
    const labelKeysValidation = validateLabelKeys(options.labelKeys);
    if (!labelKeysValidation.isValid) {
      errors.push(...labelKeysValidation.errors);
    }
  }
  
  if (options.boundaries) {
    const boundariesValidation = validateHistogramBoundaries(options.boundaries);
    if (!boundariesValidation.isValid) {
      errors.push(...boundariesValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateGaugeOptions(options: GaugeOptions): ValidationResult {
  const errors: string[] = [];
  
  const nameValidation = validateMetricName(options.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  if (!options.description || typeof options.description !== 'string') {
    errors.push('Gauge description is required and must be a string');
  }
  
  if (options.labelKeys) {
    const labelKeysValidation = validateLabelKeys(options.labelKeys);
    if (!labelKeysValidation.isValid) {
      errors.push(...labelKeysValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateObservabilityConfig(config: ObservabilityConfig): ValidationResult {
  const errors: string[] = [];
  
  const serviceNameValidation = validateServiceName(config.serviceName);
  if (!serviceNameValidation.isValid) {
    errors.push(...serviceNameValidation.errors);
  }
  
  if (!config.serviceVersion || typeof config.serviceVersion !== 'string') {
    errors.push('Service version is required and must be a string');
  }
  
  if (!config.environment || typeof config.environment !== 'string') {
    errors.push('Environment is required and must be a string');
  }
  
  // Validate vendor-specific configs
  if (config.metrics?.enabled && !config.metrics.vendor) {
    errors.push('metrics.vendor is required when metrics are enabled');
  }
  
  if (config.tracing?.enabled && !config.tracing.vendor) {
    errors.push('tracing.vendor is required when tracing are enabled');
  }
  
  if (config.logging?.enabled && !config.logging.vendor) {
    errors.push('logging.vendor is required when logging are enabled');
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateLoggerOptions(options: LoggerOptions): ValidationResult {
  const errors: string[] = [];
  
  if (!options.name || typeof options.name !== 'string') {
    errors.push('Logger name is required and must be a string');
  }
  
  if (options.name && options.name.length === 0) {
    errors.push('Logger name cannot be empty');
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateSpanOptions(name: string, options?: SpanOptions): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Span name is required and must be a string');
  }
  
  if (name && name.length === 0) {
    errors.push('Span name cannot be empty');
  }
  
  if (options?.attributes) {
    const attributesValidation = validateAttributes(options.attributes);
    if (!attributesValidation.isValid) {
      errors.push(...attributesValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Helper function to throw ValidationError if validation fails
export function assertValid(validation: ValidationResult, context: string): void {
  if (!validation.isValid) {
    throw new ValidationError(
      `Validation failed for ${context}`,
      validation.errors
    );
  }
}

// Add missing function import
import { validateHistogramBoundaries } from '../utils/validation.utils';
```

### **src/internal/testing.ts**
```typescript
// Internal testing utilities - not exported in main index
import { UnifiedCounter, CounterValue } from '../types/metrics/counter';
import { UnifiedHistogram, HistogramValue } from '../types/metrics/histogram';
import { UnifiedGauge, GaugeValue } from '../types/metrics/gauge';
import { UnifiedSpan, SpanEvent } from '../types/tracing/span';
import { UnifiedMetricProvider } from '../types/providers/metric-provider';
import { UnifiedTraceProvider } from '../types/providers/trace-provider';
import { UnifiedLogProvider } from '../types/providers/log-provider';
import { SpanStatus } from '../types/tracing/span';
import { AttributeValue } from '../utils/type.utils';

export interface TestableMetricProvider extends UnifiedMetricProvider {
  _getInternalMetrics(): Map<string, TestableMetric>;
  _getMetricByName(name: string): UnifiedCounter | UnifiedHistogram | UnifiedGauge | undefined;
  _reset(): void;
  _getMetricCount(): number;
}

export interface TestableMetric {
  readonly type: 'counter' | 'histogram' | 'gauge';
  readonly counter?: TestableCounterData;
  readonly histogram?: TestableHistogramData;
  readonly gauge?: TestableGaugeData;
}

export interface TestableCounterData {
  readonly values: CounterValue[];
  readonly totalValue: number;
}

export interface TestableHistogramData {
  readonly values: HistogramValue[];
  readonly totalCount: number;
  readonly totalSum: number;
}

export interface TestableGaugeData {
  readonly values: GaugeValue[];
  readonly currentValue: number;
}

export interface TestableSpan extends UnifiedSpan {
  _getAttributes(): Record<string, AttributeValue>;
  _getEvents(): SpanEvent[];
  _getStatus(): SpanStatus;
  _isEnded(): boolean;
  _getDuration(): number | undefined;
  _getChildSpans(): TestableSpan[];
}

export interface TestableTraceProvider extends UnifiedTraceProvider {
  _getActiveSpans(): Map<string, TestableSpan>;
  _getCompletedSpans(): TestableSpan[];
  _getSpanCount(): number;
  _reset(): void;
}

export interface TestableLogProvider extends UnifiedLogProvider {
  _getLogEntries(): TestLogEntry[];
  _getLogEntriesForLogger(name: string): TestLogEntry[];
  _reset(): void;
}

export interface TestLogEntry {
  readonly level: string;
  readonly message: string;
  readonly timestamp: number;
  readonly logger: string;
  readonly metadata?: Record<string, unknown>;
  readonly traceId?: string;
  readonly spanId?: string;
}

// Testing utilities
export function createTestMetricProvider(): TestableMetricProvider {
  const metrics = new Map<string, TestableMetric>();
  
  return {
    name: 'test-metric-provider',
    isInitialized: true,
    
    createCounter: jest.fn(),
    createHistogram: jest.fn(),
    createGauge: jest.fn(),
    getCounter: jest.fn(),
    getHistogram: jest.fn(),
    getGauge: jest.fn(),
    getAllMetrics: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
    
    _getInternalMetrics: () => new Map(metrics),
    _getMetricByName: (name: string) => undefined,
    _reset: () => metrics.clear(),
    _getMetricCount: () => metrics.size
  } as TestableMetricProvider;
}

export function createTestSpan(name: string): TestableSpan {
  const attributes = new Map<string, AttributeValue>();
  const events: SpanEvent[] = [];
  let status: SpanStatus = { code: 'UNSET' };
  let ended = false;
  let endTime: number | undefined;
  const startTime = Date.now();
  
  return {
    traceId: 'test-trace-id',
    spanId: 'test-span-id',
    name,
    kind: 'INTERNAL',
    startTime,
    isRecording: true,
    
    setAttributes: jest.fn().mockReturnThis(),
    setAttribute: jest.fn().mockReturnThis(),
    setStatus: jest.fn().mockImplementation((newStatus: SpanStatus) => {
      status = newStatus;
      return this;
    }),
    setName: jest.fn().mockReturnThis(),
    addEvent: jest.fn().mockImplementation((eventName: string, eventAttributes?: Record<string, AttributeValue>, timestamp?: number) => {
      events.push({
        name: eventName,
        timestamp: timestamp || Date.now(),
        attributes: eventAttributes
      });
      return this;
    }),
    end: jest.fn().mockImplementation((time?: number) => {
      ended = true;
      endTime = time || Date.now();
    }),
    
    _getAttributes: () => Object.fromEntries(attributes),
    _getEvents: () => [...events],
    _getStatus: () => status,
    _isEnded: () => ended,
    _getDuration: () => endTime ? endTime - startTime : undefined,
    _getChildSpans: () => []
  } as TestableSpan;
}

export function createMockValidationResult(isValid: boolean, errors: string[] = []) {
  return { isValid, errors: [...errors] };
}

export function assertValidationPassed(result: { isValid: boolean; errors: string[] }): void {
  if (!result.isValid) {
    throw new Error(`Validation failed: ${result.errors.join(', ')}`);
  }
}

export function assertValidationFailed(result: { isValid: boolean; errors: string[] }): void {
  if (result.isValid) {
    throw new Error('Expected validation to fail, but it passed');
  }
}
```

### **src/internal/index.ts**
```typescript
// Internal modules are not exported in main index
// They should only be imported directly for testing purposes
export * from './validation';
export * from './testing';
```

### **src/index.ts**
```typescript
// Main exports - only public API
export * from './types';
export * from './constants';
export * from './errors';
export * from './utils';

// Do not export internal modules - they should be imported directly for testing
// export * from './internal';
```

### **package.json**
```json
{
  "name": "@inh-lib/unified-observe-ability-core",
  "version": "1.0.0",
  "description": "Core types and interfaces for unified observability library",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "keywords": [
    "observability",
    "metrics",
    "tracing",
    "logging",
    "typescript",
    "telemetry"
  ],
  "author": "INH Team",
  "license": "MIT",
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.45.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  },
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### **tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### **jest.config.js**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/internal/testing.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```