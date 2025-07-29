
// types/unified-telemetry.ts

export interface UnifiedTelemetrySpan {
  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan;
  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan;
  recordException(exception: Error): UnifiedTelemetrySpan;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan;
  finish(): void;
}

export interface UnifiedSpanStatus {
  code: UnifiedSpanStatusCode;
  message?: string;
}

export enum UnifiedSpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export interface UnifiedTelemetryTracer {
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan;
  getActiveSpan(): UnifiedTelemetrySpan | undefined;
  withSpan<T>(span: UnifiedTelemetrySpan, fn: () => T): T;
  withSpanAsync<T>(span: UnifiedTelemetrySpan, fn: () => Promise<T>): Promise<T>;
}

export interface UnifiedSpanOptions {
  attributes?: Record<string, string | number | boolean>;
  kind?: UnifiedSpanKind;
  parent?: UnifiedTelemetrySpan;
  startTime?: Date;
}

export enum UnifiedSpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

export interface UnifiedTelemetryLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
}

export interface UnifiedTelemetryMetrics {
  createCounter(name: string, description?: string, unit?: string): UnifiedTelemetryCounter;
  createHistogram(name: string, description?: string, unit?: string): UnifiedTelemetryHistogram;
  createGauge(name: string, description?: string, unit?: string): UnifiedTelemetryGauge;
}

export interface UnifiedTelemetryCounter {
  add(value: number, attributes?: Record<string, string | number | boolean>): void;
}

export interface UnifiedTelemetryHistogram {
  record(value: number, attributes?: Record<string, string | number | boolean>): void;
}

export interface UnifiedTelemetryGauge {
  set(value: number, attributes?: Record<string, string | number | boolean>): void;
}

export interface UnifiedTelemetryProvider {
  tracer: UnifiedTelemetryTracer;
  logger: UnifiedTelemetryLogger;
  metrics: UnifiedTelemetryMetrics;
  shutdown(): Promise<void>;
}

export interface UnifiedTelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  tracing?: UnifiedTracingConfig;
  metrics?: UnifiedMetricsConfig;
  logging?: UnifiedLoggingConfig;
}

export interface UnifiedTracingConfig {
  enabled: boolean;
  endpoint?: string;
  sampleRate?: number;
  headers?: Record<string, string>;
}

export interface UnifiedMetricsConfig {
  enabled: boolean;
  endpoint?: string;
  exportInterval?: number;
  headers?: Record<string, string>;
}

export interface UnifiedLoggingConfig {
  enabled: boolean;
  level: UnifiedLogLevel;
  format?: UnifiedLogFormat;
}

export enum UnifiedLogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum UnifiedLogFormat {
  JSON = 'json',
  CONSOLE = 'console',
}

export interface UnifiedRequestTelemetryData {
  traceId: string;
  spanId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  startTime: Date;
  attributes: Record<string, string | number | boolean>;
}

export interface UnifiedResponseTelemetryData {
  statusCode: number;
  responseTime: number;
  endTime: Date;
  attributes: Record<string, string | number | boolean>;
}

export interface UnifiedTelemetryContext {
  request: UnifiedRequestTelemetryData;
  response?: UnifiedResponseTelemetryData;
  span: UnifiedTelemetrySpan;
  logger: UnifiedTelemetryLogger;
  metrics: UnifiedTelemetryMetrics;
}