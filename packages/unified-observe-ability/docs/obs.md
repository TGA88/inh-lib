// ============================================
// 📁 src/types/core.ts - CORE TYPES
// ============================================
export interface UnifiedSpan {
  readonly spanId: string;
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly operationName: string;
  readonly startTime: Date;
  endTime?: Date;
  tags: Record<string, string | number | boolean>;
  logs: UnifiedSpanLog[];
  readonly context: UnifiedSpanContext;
}

export interface UnifiedSpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags?: number;
  readonly baggage?: Record<string, string>;
}

export interface UnifiedSpanLog {
  timestamp: Date;
  message: string;
  level?: UnifiedLogLevel;
  fields?: Record<string, unknown>;
}

export type UnifiedLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface UnifiedMetricLabels {
  [key: string]: string;
}

export interface UnifiedLogData {
  [key: string]: unknown;
}

export type UnifiedTracingBackend = 'jaeger' | 'otel' | 'xray' | 'console' | 'none';
export type UnifiedMetricsBackend = 'prometheus' | 'otel' | 'console' | 'none';
export type UnifiedLoggingBackend = 'inh' | 'console' | 'custom';

export interface UnifiedErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  type?: string;
}

// ============================================
// 📁 src/interfaces/tracer.ts - TRACER INTERFACE
// ============================================
export interface UnifiedTracer {
  startSpan(operationName: string, parentSpan?: UnifiedSpan): UnifiedSpan;
  finishSpan(span: UnifiedSpan): void;
  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void;
  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void;
  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void;
  extractContext(headers: Record<string, string>): UnifiedSpanContext | undefined;
  injectContext(span: UnifiedSpan, headers: Record<string, string>): void;
}

// ============================================
// 📁 src/interfaces/metrics.ts - METRICS INTERFACES
// ============================================
export interface UnifiedCounter {
  increment(labels?: UnifiedMetricLabels): void;
  add(value: number, labels?: UnifiedMetricLabels): void;
  get(labels?: UnifiedMetricLabels): number;
}

export interface UnifiedGauge {
  set(value: number, labels?: UnifiedMetricLabels): void;
  increment(labels?: UnifiedMetricLabels): void;
  decrement(labels?: UnifiedMetricLabels): void;
  add(value: number, labels?: UnifiedMetricLabels): void;
  get(labels?: UnifiedMetricLabels): number;
}

export interface UnifiedHistogram {
  observe(value: number, labels?: UnifiedMetricLabels): void;
  time<T>(fn: () => T, labels?: UnifiedMetricLabels): T;
  time<T>(fn: () => Promise<T>, labels?: UnifiedMetricLabels): Promise<T>;
  getMetrics(labels?: UnifiedMetricLabels): UnifiedHistogramMetrics;
}

export interface UnifiedHistogramMetrics {
  count: number;
  sum: number;
  buckets: Record<string, number>;
}

export interface UnifiedTimer {
  start(): UnifiedTimerInstance;
  record(durationMs: number, labels?: UnifiedMetricLabels): void;
}

export interface UnifiedTimerInstance {
  stop(): number;
  record(labels?: UnifiedMetricLabels): number;
}

export interface UnifiedMetrics {
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter;
  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge;
  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram;
  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer;
  clear(): void;
  getMetrics(): string;
}

// ============================================
// 📁 src/interfaces/logger.ts - LOGGER INTERFACE
// ============================================
export interface UnifiedLogger {
  trace(message: string, data?: UnifiedLogData): void;
  debug(message: string, data?: UnifiedLogData): void;
  info(message: string, data?: UnifiedLogData): void;
  warn(message: string, data?: UnifiedLogData): void;
  error(message: string, data?: UnifiedLogData): void;
  fatal(message: string, data?: UnifiedLogData): void;
  child(context: Record<string, unknown>): UnifiedLogger;
  setLevel?(level: UnifiedLogLevel): void;
  getLevel?(): UnifiedLogLevel;
}

// ============================================
// 📁 src/config/types.ts - CONFIGURATION TYPES
// ============================================
export interface UnifiedJaegerConfig {
  endpoint?: string;
  agent?: {
    host?: string;
    port?: number;
  };
  samplingRate?: number;
  flushInterval?: number;
  tags?: Record<string, string>;
}

export interface UnifiedOtelTracingConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  compression?: 'gzip' | 'none';
  timeout?: number;
  serviceName?: string;
  serviceVersion?: string;
  attributes?: Record<string, string>;
}

export interface UnifiedXRayConfig {
  region?: string;
  daemon?: string;
  captureAWS?: boolean;
  captureHTTPs?: boolean;
  captureHTTP?: boolean;
  subsegmentStreamingThreshold?: number;
  contextMissingStrategy?: 'LOG_ERROR' | 'IGNORE_ERROR';
  plugins?: string[];
}

export interface UnifiedPrometheusConfig {
  prefix?: string;
  defaultLabels?: Record<string, string>;
  buckets?: number[];
  port?: number;
  endpoint?: string;
}

export interface UnifiedOtelMetricsConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  exportInterval?: number;
  timeout?: number;
  serviceName?: string;
  serviceVersion?: string;
  attributes?: Record<string, string>;
}

export interface UnifiedTracingConfig {
  backend: UnifiedTracingBackend;
  enabled?: boolean;
  samplingRate?: number;
  config?: UnifiedJaegerConfig | UnifiedOtelTracingConfig | UnifiedXRayConfig;
}

export interface UnifiedMetricsConfig {
  backend: UnifiedMetricsBackend;
  enabled?: boolean;
  prefix?: string;
  config?: UnifiedPrometheusConfig | UnifiedOtelMetricsConfig;
}

export interface UnifiedLoggingConfig {
  backend: UnifiedLoggingBackend;
  level?: UnifiedLogLevel;
  instance?: UnifiedLogger;
}

export interface UnifiedObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  tracing?: UnifiedTracingConfig;
  metrics?: UnifiedMetricsConfig;
  logging: UnifiedLoggingConfig;
  defaultTags?: Record<string, string>;
}

// ============================================
// 📁 src/internal/tracer-utils.ts - TRACER UTILITIES
// ============================================
import { UnifiedSpan, UnifiedSpanContext, UnifiedLogLevel, UnifiedErrorInfo } from '../types/core';

export function generateTraceId(): string {
  return Math.random().toString(16).substr(2, 32).padEnd(32, '0');
}

export function generateSpanId(): string {
  return Math.random().toString(16).substr(2, 16).padEnd(16, '0');
}

export function generateXRayTraceId(): string {
  const epoch = Math.floor(Date.now() / 1000).toString(16);
  const random = Math.random().toString(16).substr(2, 24).padEnd(24, '0');
  return `1-${epoch}-${random}`;
}

export function generateXRaySpanId(): string {
  return Math.random().toString(16).substr(2, 16).padEnd(16, '0');
}

export function createSpan(
  operationName: string,
  parentSpan?: UnifiedSpan,
  generateSpanIdFn = generateSpanId,
  generateTraceIdFn = generateTraceId
): UnifiedSpan {
  const spanId = generateSpanIdFn();
  const traceId = parentSpan?.traceId || generateTraceIdFn();
  
  return {
    spanId,
    traceId,
    parentSpanId: parentSpan?.spanId,
    operationName,
    startTime: new Date(),
    tags: {},
    logs: [],
    context: {
      traceId,
      spanId
    }
  };
}

export function finishSpan(span: UnifiedSpan): void {
  span.endTime = new Date();
  const duration = span.endTime.getTime() - span.startTime.getTime();
  span.tags.duration_ms = duration;
}

export function setSpanTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
  span.tags[key] = value;
}

export function addSpanLog(
  span: UnifiedSpan,
  message: string,
  level?: UnifiedLogLevel,
  fields?: Record<string, unknown>
): void {
  span.logs.push({
    timestamp: new Date(),
    message,
    level,
    fields
  });
}

export function setSpanError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
  span.tags.error = true;
  span.tags['error.message'] = error.message;
  if (error.stack) {
    span.tags['error.stack'] = error.stack;
  }
  if (error.type) {
    span.tags['error.type'] = error.type;
  }
}

export function extractContextFromHeaders(headers: Record<string, string>): UnifiedSpanContext | undefined {
  const traceId = headers['x-trace-id'];
  const spanId = headers['x-span-id'];
  
  if (traceId && spanId) {
    return { traceId, spanId };
  }
  
  return undefined;
}

export function injectContextToHeaders(span: UnifiedSpan, headers: Record<string, string>): void {
  headers['x-trace-id'] = span.traceId;
  headers['x-span-id'] = span.spanId;
}

// ============================================
// 📁 src/internal/metrics-utils.ts - METRICS UTILITIES
// ============================================
import { UnifiedMetricLabels } from '../types/core';

export function createMetricKey(name: string, labels?: UnifiedMetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }
  
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  
  return `${name}{${labelStr}}`;
}

export function sanitizeMetricName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function sanitizeLabelName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function sanitizeLabelValue(value: string): string {
  return value.replace(/[\n\r\t]/g, '_');
}

export function validateMetricName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function validateLabelName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function mergeLabels(defaultLabels: Record<string, string>, labels?: UnifiedMetricLabels): Record<string, string> {
  return { ...defaultLabels, ...labels };
}

// ============================================
// 📁 src/internal/logger-utils.ts - LOGGER UTILITIES
// ============================================
import { UnifiedLogData, UnifiedLogLevel } from '../types/core';

export function enrichLogData(
  baseData: Record<string, unknown>,
  additionalData?: UnifiedLogData
): UnifiedLogData {
  return {
    ...baseData,
    ...additionalData
  };
}

export function formatLogMessage(
  level: UnifiedLogLevel,
  message: string,
  data?: UnifiedLogData
): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  return `${timestamp} ${levelStr} ${message}`;
}

export function shouldLog(currentLevel: UnifiedLogLevel, targetLevel: UnifiedLogLevel): boolean {
  const levelOrder: Record<UnifiedLogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5
  };
  
  return levelOrder[targetLevel] >= levelOrder[currentLevel];
}

// ============================================
// 📁 src/internal/config-utils.ts - CONFIG UTILITIES
// ============================================
import { UnifiedObservabilityConfig, UnifiedTracingConfig, UnifiedMetricsConfig, UnifiedLoggingConfig } from '../config/types';

export function validateServiceName(serviceName: string): string[] {
  const errors: string[] = [];
  
  if (!serviceName || serviceName.trim().length === 0) {
    errors.push('serviceName is required and cannot be empty');
  }
  
  if (serviceName.length > 100) {
    errors.push('serviceName must be less than 100 characters');
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(serviceName)) {
    errors.push('serviceName must start with a letter and contain only letters, numbers, hyphens, and underscores');
  }
  
  return errors;
}

export function validateTracingConfig(config: UnifiedTracingConfig): string[] {
  const errors: string[] = [];
  
  if (!['jaeger', 'otel', 'xray', 'console', 'none'].includes(config.backend)) {
    errors.push(`Invalid tracing backend: ${config.backend}`);
  }
  
  if (config.samplingRate !== undefined) {
    if (config.samplingRate < 0 || config.samplingRate > 1) {
      errors.push('samplingRate must be between 0 and 1');
    }
  }
  
  return errors;
}

export function validateMetricsConfig(config: UnifiedMetricsConfig): string[] {
  const errors: string[] = [];
  
  if (!['prometheus', 'otel', 'console', 'none'].includes(config.backend)) {
    errors.push(`Invalid metrics backend: ${config.backend}`);
  }
  
  if (config.prefix && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.prefix)) {
    errors.push('metrics prefix must be a valid identifier');
  }
  
  return errors;
}

export function validateLoggingConfig(config: UnifiedLoggingConfig): string[] {
  const errors: string[] = [];
  
  if (!['inh', 'console', 'custom'].includes(config.backend)) {
    errors.push(`Invalid logging backend: ${config.backend}`);
  }
  
  if (config.backend === 'inh' && !config.instance) {
    errors.push('logger instance is required when using inh backend');
  }
  
  if (config.backend === 'custom' && !config.instance) {
    errors.push('logger instance is required when using custom backend');
  }
  
  if (config.level && !['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(config.level)) {
    errors.push(`Invalid log level: ${config.level}`);
  }
  
  return errors;
}

export function validateConfig(config: UnifiedObservabilityConfig): string[] {
  const errors: string[] = [];
  
  errors.push(...validateServiceName(config.serviceName));
  errors.push(...validateLoggingConfig(config.logging));
  
  if (config.tracing) {
    errors.push(...validateTracingConfig(config.tracing));
  }
  
  if (config.metrics) {
    errors.push(...validateMetricsConfig(config.metrics));
  }
  
  return errors;
}

export function createDefaultTags(config: UnifiedObservabilityConfig): Record<string, string> {
  return {
    service: config.serviceName,
    version: config.serviceVersion || '1.0.0',
    environment: config.environment || 'development',
    ...config.defaultTags
  };
}

// ============================================
// 📁 src/implementations/jaeger-tracer.ts - JAEGER TRACER
// ============================================
import { UnifiedTracer, UnifiedSpan, UnifiedSpanContext, UnifiedLogLevel, UnifiedErrorInfo } from '../types/core';
import { UnifiedJaegerConfig } from '../config/types';
import * as TracerUtils from '../internal/tracer-utils';

export class UnifiedJaegerTracer implements UnifiedTracer {
  private config: UnifiedJaegerConfig;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private spans = new Map<string, UnifiedSpan>();

  constructor(config: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    config?: UnifiedJaegerConfig;
  }) {
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion;
    this.environment = config.environment;
    this.config = config.config || {};
    
    console.log(`[JAEGER] Initializing Jaeger tracer for ${this.serviceName}`, {
      endpoint: this.config.endpoint,
      agent: this.config.agent,
      samplingRate: this.config.samplingRate,
      environment: this.environment
    });
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan): UnifiedSpan {
    const span = TracerUtils.createSpan(operationName, parentSpan);
    
    // Set Jaeger-specific tags
    TracerUtils.setSpanTag(span, 'service.name', this.serviceName);
    TracerUtils.setSpanTag(span, 'service.version', this.serviceVersion);
    TracerUtils.setSpanTag(span, 'service.environment', this.environment);
    
    // Apply config tags
    if (this.config.tags) {
      Object.entries(this.config.tags).forEach(([key, value]) => {
        TracerUtils.setSpanTag(span, key, value);
      });
    }
    
    this.spans.set(span.spanId, span);
    
    console.debug(`[JAEGER] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId,
      serviceName: this.serviceName
    });
    
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    TracerUtils.finishSpan(span);
    
    // Send to Jaeger
    this.sendToJaeger(span);
    
    console.debug(`[JAEGER] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: span.tags.duration_ms,
      tags: Object.keys(span.tags),
      logs: span.logs.length
    });
    
    this.spans.delete(span.spanId);
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    TracerUtils.setSpanTag(span, key, value);
    console.debug(`[JAEGER] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    TracerUtils.addSpanLog(span, message, level, fields);
    console.debug(`[JAEGER] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    TracerUtils.setSpanError(span, error);
    console.debug(`[JAEGER] Error set: ${error.message}`, { spanId: span.spanId });
  }

  extractContext(headers: Record<string, string>): UnifiedSpanContext | undefined {
    // Parse Jaeger trace header format
    const traceHeader = headers['uber-trace-id'];
    if (traceHeader) {
      const parts = traceHeader.split(':');
      if (parts.length >= 2) {
        const traceId = parts[0];
        const spanId = parts[1];
        
        if (traceId && spanId) {
          return { traceId, spanId };
        }
      }
    }
    
    return TracerUtils.extractContextFromHeaders(headers);
  }

  injectContext(span: UnifiedSpan, headers: Record<string, string>): void {
    // Inject Jaeger trace header format
    headers['uber-trace-id'] = `${span.traceId}:${span.spanId}:0:1`;
    
    // Also inject standard headers
    TracerUtils.injectContextToHeaders(span, headers);
  }

  private sendToJaeger(span: UnifiedSpan): void {
    const jaegerSpan = this.createJaegerSpan(span);
    
    // In real implementation, this would send to Jaeger agent/collector
    console.debug(`[JAEGER] Sending span to collector:`, {
      traceId: jaegerSpan.traceID,
      spanId: jaegerSpan.spanID,
      operationName: jaegerSpan.operationName,
      duration: jaegerSpan.duration,
      tags: jaegerSpan.tags?.length || 0,
      logs: jaegerSpan.logs?.length || 0,
      endpoint: this.config.endpoint || `${this.config.agent?.host || 'localhost'}:${this.config.agent?.port || 6832}`
    });
  }

  private createJaegerSpan(span: UnifiedSpan): JaegerSpanData {
    const startTime = span.startTime.getTime() * 1000; // microseconds
    const duration = span.endTime ? 
      (span.endTime.getTime() - span.startTime.getTime()) * 1000 : 0;
    
    return {
      traceID: span.traceId,
      spanID: span.spanId,
      parentSpanID: span.parentSpanId,
      operationName: span.operationName,
      startTime,
      duration,
      tags: Object.entries(span.tags).map(([key, value]) => ({
        key,
        type: typeof value === 'string' ? 'string' : 'number',
        value: String(value)
      })),
      logs: span.logs.map(log => ({
        timestamp: log.timestamp.getTime() * 1000,
        fields: [
          { key: 'level', value: log.level || 'info' },
          { key: 'message', value: log.message },
          ...(log.fields ? Object.entries(log.fields).map(([k, v]) => ({
            key: k,
            value: String(v)
          })) : [])
        ]
      })),
      process: {
        serviceName: this.serviceName,
        tags: [
          { key: 'service.version', value: this.serviceVersion },
          { key: 'service.environment', value: this.environment }
        ]
      }
    };
  }
}

interface JaegerSpanData {
  traceID: string;
  spanID: string;
  parentSpanID?: string;
  operationName: string;
  startTime: number;
  duration: number;
  tags: Array<{ key: string; type: string; value: string }>;
  logs: Array<{
    timestamp: number;
    fields: Array<{ key: string; value: string }>;
  }>;
  process: {
    serviceName: string;
    tags: Array<{ key: string; value: string }>;
  };
}

// ============================================
// 📁 src/implementations/otel-tracer.ts - OTEL TRACER
// ============================================
import { UnifiedTracer, UnifiedSpan, UnifiedSpanContext, UnifiedLogLevel, UnifiedErrorInfo } from '../types/core';
import { UnifiedOtelTracingConfig } from '../config/types';
import * as TracerUtils from '../internal/tracer-utils';

export class UnifiedOtelTracer implements UnifiedTracer {
  private config: UnifiedOtelTracingConfig;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private spans = new Map<string, UnifiedSpan>();

  constructor(config: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    config?: UnifiedOtelTracingConfig;
  }) {
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion;
    this.environment = config.environment;
    this.config = config.config || {};
    
    console.log(`[OTEL] Initializing OpenTelemetry tracer for ${this.serviceName}`, {
      endpoint: this.config.endpoint,
      compression: this.config.compression,
      timeout: this.config.timeout,
      environment: this.environment
    });
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan): UnifiedSpan {
    const span = TracerUtils.createSpan(operationName, parentSpan);
    
    // Set OTEL-specific attributes
    TracerUtils.setSpanTag(span, 'service.name', this.serviceName);
    TracerUtils.setSpanTag(span, 'service.version', this.serviceVersion);
    TracerUtils.setSpanTag(span, 'service.environment', this.environment);
    
    // Apply config attributes
    if (this.config.attributes) {
      Object.entries(this.config.attributes).forEach(([key, value]) => {
        TracerUtils.setSpanTag(span, key, value);
      });
    }
    
    this.spans.set(span.spanId, span);
    
    console.debug(`[OTEL] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId,
      serviceName: this.serviceName
    });
    
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    TracerUtils.finishSpan(span);
    
    // Send to OTEL collector
    this.sendToOtelCollector(span);
    
    console.debug(`[OTEL] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: span.tags.duration_ms,
      attributes: Object.keys(span.tags),
      events: span.logs.length
    });
    
    this.spans.delete(span.spanId);
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    TracerUtils.setSpanTag(span, key, value);
    console.debug(`[OTEL] Attribute set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    TracerUtils.addSpanLog(span, message, level, fields);
    console.debug(`[OTEL] Event added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    TracerUtils.setSpanError(span, error);
    
    // Set OTEL error attributes
    TracerUtils.setSpanTag(span, 'error.type', error.type || 'Error');
    TracerUtils.setSpanTag(span, 'error.message', error.message);
    
    console.debug(`[OTEL] Error set: ${error.message}`, { spanId: span.spanId });
  }

  extractContext(headers: Record<string, string>): UnifiedSpanContext | undefined {
    // Parse OTEL traceparent header (W3C Trace Context)
    const traceparent = headers['traceparent'];
    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length === 4) {
        const traceId = parts[1];
        const spanId = parts[2];
        const flags = parseInt(parts[3] || '0', 16);
        
        if (traceId && spanId) {
          return { 
            traceId, 
            spanId, 
            traceFlags: flags 
          };
        }
      }
    }
    
    return TracerUtils.extractContextFromHeaders(headers);
  }

  injectContext(span: UnifiedSpan, headers: Record<string, string>): void {
    // Inject OTEL traceparent header (W3C Trace Context)
    const flags = '01'; // sampled
    headers['traceparent'] = `00-${span.traceId}-${span.spanId}-${flags}`;
    
    // Also inject standard headers
    TracerUtils.injectContextToHeaders(span, headers);
  }

  private sendToOtelCollector(span: UnifiedSpan): void {
    const otelSpan = this.createOtelSpan(span);
    
    // In real implementation, this would send to OTEL collector via OTLP
    console.debug(`[OTEL] Sending span to collector:`, {
      traceId: otelSpan.traceId,
      spanId: otelSpan.spanId,
      name: otelSpan.name,
      kind: otelSpan.kind,
      status: otelSpan.status,
      attributes: Object.keys(otelSpan.attributes || {}),
      events: otelSpan.events?.length || 0,
      endpoint: this.config.endpoint || 'http://localhost:4317'
    });
  }

  private createOtelSpan(span: UnifiedSpan): OtelSpanData {
    const startTimeNanos = span.startTime.getTime() * 1000000; // nanoseconds
    const endTimeNanos = span.endTime ? 
      span.endTime.getTime() * 1000000 : Date.now() * 1000000;
    
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.operationName,
      kind: 'SPAN_KIND_INTERNAL',
      startTimeUnixNano: startTimeNanos,
      endTimeUnixNano: endTimeNanos,
      attributes: Object.entries(span.tags).map(([key, value]) => ({
        key,
        value: {
          stringValue: typeof value === 'string' ? value : String(value),
          intValue: typeof value === 'number' ? value : undefined,
          boolValue: typeof value === 'boolean' ? value : undefined
        }
      })),
      events: span.logs.map(log => ({
        timeUnixNano: log.timestamp.getTime() * 1000000,
        name: log.message,
        attributes: [
          { key: 'level', value: { stringValue: log.level || 'info' } },
          ...(log.fields ? Object.entries(log.fields).map(([k, v]) => ({
            key: k,
            value: { stringValue: String(v) }
          })) : [])
        ]
      })),
      status: {
        code: span.tags.error ? 'STATUS_CODE_ERROR' : 'STATUS_CODE_OK',
        message: span.tags.error ? String(span.tags['error.message']) : undefined
      }
    };
  }
}

interface OtelSpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: string;
  startTimeUnixNano: number;
  endTimeUnixNano: number;
  attributes: Array<{
    key: string;
    value: {
      stringValue?: string;
      intValue?: number;
      boolValue?: boolean;
    };
  }>;
  events: Array<{
    timeUnixNano: number;
    name: string;
    attributes: Array<{
      key: string;
      value: { stringValue: string };
    }>;
  }>;
  status: {
    code: string;
    message?: string;
  };
}

// ============================================
// 📁 src/implementations/xray-tracer.ts - X-RAY TRACER
// ============================================
import { UnifiedTracer, UnifiedSpan, UnifiedSpanContext, UnifiedLogLevel, UnifiedErrorInfo } from '../types/core';
import { UnifiedXRayConfig } from '../config/types';
import * as TracerUtils from '../internal/tracer-utils';

export class UnifiedXRayTracer implements UnifiedTracer {
  private config: UnifiedXRayConfig;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private segments = new Map<string, XRaySegment>();

  constructor(config: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    config?: UnifiedXRayConfig;
  }) {
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion;
    this.environment = config.environment;
    this.config = config.config || {};
    
    console.log(`[X-RAY] Initializing AWS X-Ray tracer for ${this.serviceName}`, {
      region: this.config.region || process.env.AWS_REGION || 'us-east-1',
      daemon: this.config.daemon || process.env._X_AMZN_TRACE_ID || 'localhost:2000',
      captureAWS: this.config.captureAWS ?? true,
      captureHTTPs: this.config.captureHTTPs ?? true,
      environment: this.environment
    });
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan): UnifiedSpan {
    const span = TracerUtils.createSpan(
      operationName, 
      parentSpan,
      TracerUtils.generateXRaySpanId,
      TracerUtils.generateXRayTraceId
    );
    
    // Set X-Ray specific annotations
    TracerUtils.setSpanTag(span, 'service.name', this.serviceName);
    TracerUtils.setSpanTag(span, 'service.version', this.serviceVersion);
    TracerUtils.setSpanTag(span, 'service.environment', this.environment);
    TracerUtils.setSpanTag(span, 'aws.region', this.config.region || process.env.AWS_REGION || 'us-east-1');
    
    // Create X-Ray segment
    const segment = this.createXRaySegment(span);
    this.segments.set(span.spanId, segment);
    
    console.debug(`[X-RAY] Started segment: ${operationName}`, {
      segmentId: span.spanId,
      traceId: span.traceId,
      parentId: span.parentSpanId,
      serviceName: this.serviceName
    });
    
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    TracerUtils.finishSpan(span);
    
    const segment = this.segments.get(span.spanId);
    if (segment) {
      segment.end_time = span.endTime ? span.endTime.getTime() / 1000 : Date.now() / 1000;
      
      // Send to X-Ray daemon
      this.sendToXRayDaemon(segment);
      
      console.debug(`[X-RAY] Finished segment: ${span.operationName}`, {
        segmentId: span.spanId,
        duration: span.tags.duration_ms,
        annotations: Object.keys(segment.annotations || {}),
        metadata: Object.keys(segment.metadata || {})
      });
      
      this.segments.delete(span.spanId);
    }
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    TracerUtils.setSpanTag(span, key, value);
    
    const segment = this.segments.get(span.spanId);
    if (segment) {
      if (this.isIndexedXRayTag(key)) {
        segment.annotations = segment.annotations || {};
        segment.annotations[key] = value;
        console.debug(`[X-RAY] Annotation set: ${key}=${value}`, { segmentId: span.spanId });
      } else {
        segment.metadata = segment.metadata || {};
        segment.metadata.custom = segment.metadata.custom || {};
        segment.metadata.custom[key] = value;
        console.debug(`[X-RAY] Metadata set: ${key}=${value}`, { segmentId: span.spanId });
      }
    }
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    TracerUtils.addSpanLog(span, message, level, fields);
    
    const segment = this.segments.get(span.spanId);
    if (segment) {
      segment.metadata = segment.metadata || {};
      segment.metadata.logs = segment.metadata.logs || [];
      
      segment.metadata.logs.push({
        timestamp: new Date().toISOString(),
        message,
        level,
        fields
      });
      
      // Set error flags for error logs
      if (level === 'error' || level === 'fatal') {
        segment.error = true;
        segment.fault = true;
        
        if (fields?.error) {
          segment.cause = {
            exceptions: [{
              message: String(fields.error),
              type: String(fields.error_type || 'Error')
            }]
          };
        }
      }
      
      console.debug(`[X-RAY] Log added: ${message}`, {
        segmentId: span.spanId,
        level,
        fields
      });
    }
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    TracerUtils.setSpanError(span, error);
    
    const segment = this.segments.get(span.spanId);
    if (segment) {
      segment.error = true;
      segment.fault = true;
      segment.cause = {
        exceptions: [{
          message: error.message,
          type: error.type || 'Error'
        }]
      };
      
      console.debug(`[X-RAY] Error set: ${error.message}`, { segmentId: span.spanId });
    }
  }

  extractContext(headers: Record<string, string>): UnifiedSpanContext | undefined {
    // Parse X-Ray trace header
    const traceHeader = headers['x-amzn-trace-id'];
    if (traceHeader) {
      const rootMatch = traceHeader.match(/Root=([^;]+)/);
      const parentMatch = traceHeader.match(/Parent=([^;]+)/);
      
      if (rootMatch && parentMatch) {
        return { 
          traceId: rootMatch[1], 
          spanId: parentMatch[1] 
        };
      }
    }
    
    return TracerUtils.extractContextFromHeaders(headers);
  }

  injectContext(span: UnifiedSpan, headers: Record<string, string>): void {
    // Inject X-Ray trace header
    headers['x-amzn-trace-id'] = `Root=${span.traceId};Parent=${span.spanId}`;
    
    // Also inject standard headers
    TracerUtils.injectContextToHeaders(span, headers);
  }

  private createXRaySegment(span: UnifiedSpan): XRaySegment {
    return {
      name: span.operationName,
      id: span.spanId,
      trace_id: span.traceId,
      parent_id: span.parentSpanId,
      start_time: span.startTime.getTime() / 1000,
      service: {
        name: this.serviceName,
        version: this.serviceVersion
      },
      aws: {
        region: this.config.region || process.env.AWS_REGION || 'us-east-1',
        account_id: process.env.AWS_ACCOUNT_ID || '123456789012'
      },
      annotations: {},
      metadata: {},
      subsegments: []
    };
  }

  private sendToXRayDaemon(segment: XRaySegment): void {
    const xrayDocument = {
      format: 'json',
      version: 1,
      segments: [segment]
    };
    
    console.debug(`[X-RAY] Sending segment to daemon:`, {
      segmentId: segment.id,
      name: segment.name,
      duration: segment.end_time ? (segment.end_time - segment.start_time) * 1000 : 0,
      annotations: Object.keys(segment.annotations || {}),
      metadata: Object.keys(segment.metadata || {}),
      daemon: this.config.daemon || 'localhost:2000'
    });
    
    // In real implementation, this would send UDP packet to X-Ray daemon
  }

  private isIndexedXRayTag(key: string): boolean {
    const indexedKeys = [
      'http.method',
      'http.status_code',
      'error',
      'fault',
      'throttle',
      'user.id',
      'service.name',
      'service.version',
      'aws.region',
      'aws.account_id'
    ];
    return indexedKeys.includes(key) || key.startsWith('aws.') || key.startsWith('http.');
  }
}

interface XRaySegment {
  name: string;
  id: string;
  trace_id: string;
  parent_id?: string;
  start_time: number;
  end_time?: number;
  service: {
    name: string;
    version: string;
  };
  aws: {
    region: string;
    account_id: string;
  };
  annotations?: Record<string, string | number | boolean>;
  metadata?: Record<string, unknown>;
  subsegments: XRaySegment[];
  error?: boolean;
  fault?: boolean;
  cause?: {
    exceptions: Array<{
      message: string;
      type: string;
    }>;
  };
}

// ============================================
// 📁 src/implementations/console-metrics.ts - CONSOLE METRICS
// ============================================
import { UnifiedMetrics, UnifiedCounter, UnifiedGauge, UnifiedHistogram, UnifiedTimer, UnifiedTimerInstance, UnifiedMetricLabels, UnifiedHistogramMetrics } from '../types/core';
import * as MetricsUtils from '../internal/metrics-utils';

export class UnifiedConsoleMetrics implements UnifiedMetrics {
  private metrics = new Map<string, { type: string; value: number; labels: Record<string, string> }>();

  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    const sanitizedName = MetricsUtils.sanitizeMetricName(name);
    
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
        console.debug(`[METRICS] Counter++: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
        console.debug(`[METRICS] Counter+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    const sanitizedName = MetricsUtils.sanitizeMetricName(name);
    
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
        console.debug(`[METRICS] Gauge=${value}: ${name}`, labels);
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
        console.debug(`[METRICS] Gauge++: ${name}`, labels);
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
        console.debug(`[METRICS] Gauge--: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
        console.debug(`[METRICS] Gauge+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    const sanitizedName = MetricsUtils.sanitizeMetricName(name);
    
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
        console.debug(`[METRICS] Histogram=${value}: ${name}`, labels);
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = Date.now() - start;
            this.histogram(name).observe(duration, labels);
            console.debug(`[METRICS] Histogram=${duration}ms: ${name}`, labels);
          }) as Promise<T>;
        } else {
          const duration = Date.now() - start;
          this.histogram(name).observe(duration, labels);
          console.debug(`[METRICS] Histogram=${duration}ms: ${name}`, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    const sanitizedName = MetricsUtils.sanitizeMetricName(name);
    
    return {
      start: (): UnifiedTimerInstance => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = MetricsUtils.createMetricKey(sanitizedName, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            console.debug(`[METRICS] Timer=${duration}ms: ${name}`, labels);
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = MetricsUtils.createMetricKey(sanitizedName, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
        console.debug(`[METRICS] Timer=${durationMs}ms: ${name}`, labels);
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }
}

// ============================================
// 📁 src/implementations/console-logger.ts - CONSOLE LOGGER
// ============================================
import { UnifiedLogger, UnifiedLogLevel, UnifiedLogData } from '../types/core';
import * as LoggerUtils from '../internal/logger-utils';

export class UnifiedConsoleLogger implements UnifiedLogger {
  private level: UnifiedLogLevel;
  private context: Record<string, unknown>;

  constructor(level: UnifiedLogLevel = 'info', context: Record<string, unknown> = {}) {
    this.level = level;
    this.context = context;
  }

  trace(message: string, data?: UnifiedLogData): void {
    if (LoggerUtils.shouldLog(this.level, 'trace')) {
      const enrichedData = LoggerUtils.enrichLogData(this.context, data);
      console.debug(LoggerUtils.formatLogMessage('trace', message), enrichedData);
    }
  }

  debug(message: string, data?: UnifiedLogData): void {
    if (LoggerUtils.shouldLog(this.level, 'debug')) {
      const enrichedData = LoggerUtils.enrichLogData(this.context, data);
      console.debug(LoggerUtils.formatLogMessage('debug', message), enrichedData);
    }
  }

  info(message: string, data?: UnifiedLogData): void {
    if (LoggerUtils.shouldLog(this.level, 'info')) {
      const enrichedData = LoggerUtils.enrichLogData(this.context, data);
      console.info(LoggerUtils.formatLogMessage('info', message), enrichedData);
    }
  }

  warn(message: string, data?: UnifiedLogData): void {
    if (LoggerUtils.shouldLog(this.level, 'warn')) {
      const enrichedData = LoggerUtils.enrichLogData(this.context, data);
      console.warn(LoggerUtils.formatLogMessage('warn', message), enrichedData);
    }
  }

  error(message: string, data?: UnifiedLogData): void {
    if (LoggerUtils.shouldLog(this.level, 'error')) {
      const enrichedData = LoggerUtils.enrichLogData(this.context, data);
      console.error(LoggerUtils.formatLogMessage('error', message), enrichedData);
    }
  }

  fatal(message: string, data?: UnifiedLogData): void {
    if (LoggerUtils.shouldLog(this.level, 'fatal')) {
      const enrichedData = LoggerUtils.enrichLogData(this.context, data);
      console.error(LoggerUtils.formatLogMessage('fatal', message), enrichedData);
    }
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedConsoleLogger(this.level, LoggerUtils.enrichLogData(this.context, context));
  }

  setLevel(level: UnifiedLogLevel): void {
    this.level = level;
  }

  getLevel(): UnifiedLogLevel {
    return this.level;
  }
}

// ============================================
// 📁 src/implementations/inh-logger-adapter.ts - INH LOGGER ADAPTER
// ============================================
import { UnifiedLogger, UnifiedLogLevel, UnifiedLogData } from '../types/core';
import * as LoggerUtils from '../internal/logger-utils';

interface InhLoggerInterface {
  trace?: (message: string, data?: unknown) => void;
  debug?: (message: string, data?: unknown) => void;
  info?: (message: string, data?: unknown) => void;
  warn?: (message: string, data?: unknown) => void;
  error?: (message: string, data?: unknown) => void;
  fatal?: (message: string, data?: unknown) => void;
  createChild?: (context: Record<string, unknown>) => InhLoggerInterface;
}

export class UnifiedInhLoggerAdapter implements UnifiedLogger {
  private inhLogger: InhLoggerInterface;

  constructor(inhLogger: InhLoggerInterface) {
    this.inhLogger = inhLogger;
  }

  trace(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.trace) {
      this.inhLogger.trace(message, data);
    } else {
      console.debug(`[TRACE] ${message}`, data);
    }
  }

  debug(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.debug) {
      this.inhLogger.debug(message, data);
    } else {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.info) {
      this.inhLogger.info(message, data);
    } else {
      console.info(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.warn) {
      this.inhLogger.warn(message, data);
    } else {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.error) {
      this.inhLogger.error(message, data);
    } else {
      console.error(`[ERROR] ${message}`, data);
    }
  }

  fatal(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.fatal) {
      this.inhLogger.fatal(message, data);
    } else {
      console.error(`[FATAL] ${message}`, data);
    }
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    if (this.inhLogger.createChild) {
      const childLogger = this.inhLogger.createChild(context);
      return new UnifiedInhLoggerAdapter(childLogger);
    }
    return this;
  }
}

// ============================================
// 📁 src/context/logger-context.ts - LOGGER CONTEXT
// ============================================
import { UnifiedLogger, UnifiedLogLevel, UnifiedLogData } from '../types/core';
import { enrichLogData } from '../internal/logger-utils';

export class UnifiedLoggerContext {
  private logger: UnifiedLogger;
  private baseData: Record<string, unknown>;

  constructor(logger: UnifiedLogger, baseData: Record<string, unknown> = {}) {
    this.logger = logger;
    this.baseData = baseData;
  }

  trace(message: string, data?: UnifiedLogData): void {
    const enrichedData = enrichLogData(this.baseData, data);
    this.logger.trace(message, enrichedData);
  }

  debug(message: string, data?: UnifiedLogData): void {
    const enrichedData = enrichLogData(this.baseData, data);
    this.logger.debug(message, enrichedData);
  }

  info(message: string, data?: UnifiedLogData): void {
    const enrichedData = enrichLogData(this.baseData, data);
    this.logger.info(message, enrichedData);
  }

  warn(message: string, data?: UnifiedLogData): void {
    const enrichedData = enrichLogData(this.baseData, data);
    this.logger.warn(message, enrichedData);
  }

  error(message: string, data?: UnifiedLogData): void {
    const enrichedData = enrichLogData(this.baseData, data);
    this.logger.error(message, enrichedData);
  }

  fatal(message: string, data?: UnifiedLogData): void {
    const enrichedData = enrichLogData(this.baseData, data);
    this.logger.fatal(message, enrichedData);
  }

  child(context: Record<string, unknown>): UnifiedLoggerContext {
    const childData = enrichLogData(this.baseData, context);
    return new UnifiedLoggerContext(this.logger, childData);
  }

  setLevel(level: UnifiedLogLevel): void {
    if (this.logger.setLevel) {
      this.logger.setLevel(level);
    }
  }

  getLevel(): UnifiedLogLevel {
    return this.logger.getLevel?.() || 'info';
  }
}

// ============================================
// 📁 src/context/metrics-context.ts - METRICS CONTEXT
// ============================================
import { UnifiedMetrics, UnifiedCounter, UnifiedGauge, UnifiedHistogram, UnifiedTimer, UnifiedMetricLabels } from '../types/core';
import * as MetricsUtils from '../internal/metrics-utils';

export class UnifiedMetricsContext {
  private metrics: UnifiedMetrics;
  private defaultLabels: Record<string, string>;

  constructor(metrics: UnifiedMetrics, defaultLabels: Record<string, string> = {}) {
    this.metrics = metrics;
    this.defaultLabels = defaultLabels;
  }

  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    const counter = this.metrics.counter(name, help, labelNames);
    
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        counter.increment(mergedLabels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        counter.add(value, mergedLabels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        return counter.get(mergedLabels);
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    const gauge = this.metrics.gauge(name, help, labelNames);
    
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        gauge.set(value, mergedLabels);
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        gauge.increment(mergedLabels);
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        gauge.decrement(mergedLabels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        gauge.add(value, mergedLabels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        return gauge.get(mergedLabels);
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    const histogram = this.metrics.histogram(name, help, labelNames, buckets);
    
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        histogram.observe(value, mergedLabels);
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        return histogram.time(fn, mergedLabels);
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        return histogram.getMetrics(mergedLabels);
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    const timer = this.metrics.timer(name, help, labelNames);
    
    return {
      start: () => {
        const instance = timer.start();
        return {
          stop: () => instance.stop(),
          record: (labels?: UnifiedMetricLabels) => {
            const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
            return instance.record(mergedLabels);
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const mergedLabels = MetricsUtils.mergeLabels(this.defaultLabels, labels);
        timer.record(durationMs, mergedLabels);
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return this.metrics.getMetrics();
  }
}

// ============================================
// 📁 src/context/tracer-context.ts - TRACER CONTEXT
// ============================================
import { UnifiedTracer, UnifiedSpan, UnifiedSpanContext, UnifiedLogLevel, UnifiedErrorInfo } from '../types/core';

export class UnifiedTracerContext {
  private tracer: UnifiedTracer;
  private defaultTags: Record<string, string | number | boolean>;

  constructor(tracer: UnifiedTracer, defaultTags: Record<string, string | number | boolean> = {}) {
    this.tracer = tracer;
    this.defaultTags = defaultTags;
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan): UnifiedSpan {
    const span = this.tracer.startSpan(operationName, parentSpan);
    
    // Apply default tags
    Object.entries(this.defaultTags).forEach(([key, value]) => {
      this.tracer.setTag(span, key, value);
    });
    
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    this.tracer.finishSpan(span);
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    this.tracer.setTag(span, key, value);
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    this.tracer.addLog(span, message, level, fields);
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    this.tracer.setError(span, error);
  }

  extractContext(headers: Record<string, string>): UnifiedSpanContext | undefined {
    return this.tracer.extractContext(headers);
  }

  injectContext(span: UnifiedSpan, headers: Record<string, string>): void {
    this.tracer.injectContext(span, headers);
  }
}

// ============================================
// 📁 src/context/observability-context.ts - MAIN OBSERVABILITY CONTEXT
// ============================================
import { v4 as uuid } from 'uuid';
import { UnifiedSpan, UnifiedSpanContext } from '../types/core';
import { UnifiedLoggerContext } from './logger-context';
import { UnifiedMetricsContext } from './metrics-context';
import { UnifiedTracerContext } from './tracer-context';

export class UnifiedObservabilityContext {
  readonly contextId: string;
  readonly operationName: string;
  readonly startTime: Date;
  readonly logger: UnifiedLoggerContext;
  readonly metrics: UnifiedMetricsContext;
  readonly tracer: UnifiedTracerContext;
  readonly span?: UnifiedSpan;
  
  private finished: boolean = false;

  constructor(
    logger: UnifiedLoggerContext,
    metrics: UnifiedMetricsContext,
    tracer: UnifiedTracerContext,
    operationName: string,
    parentSpan?: UnifiedSpan,
    parentContext?: UnifiedSpanContext
  ) {
    this.contextId = uuid();
    this.operationName = operationName;
    this.startTime = new Date();
    this.logger = logger;
    this.metrics = metrics;
    this.tracer = tracer;
    
    // Create span if tracer is available
    if (parentContext && !parentSpan) {
      // TODO: Create span from remote parent context
      // For now, create a new span
      this.span = this.tracer.startSpan(operationName);
    } else if (parentSpan) {
      this.span = this.tracer.startSpan(operationName, parentSpan);
    } else {
      this.span = this.tracer.startSpan(operationName);
    }
    
    // Set context tags
    if (this.span) {
      this.tracer.setTag(this.span, 'context.id', this.contextId);
      this.tracer.setTag(this.span, 'operation.name', operationName);
    }
  }

  createChild(operationName: string): UnifiedObservabilityContext {
    const childLogger = this.logger.child({ 
      parentContextId: this.contextId,
      operationName 
    });
    
    return new UnifiedObservabilityContext(
      childLogger,
      this.metrics,
      this.tracer,
      operationName,
      this.span
    );
  }

  setTag(key: string, value: string | number | boolean): void {
    if (this.span) {
      this.tracer.setTag(this.span, key, value);
    }
  }

  addSpanLog(message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    if (this.span) {
      this.tracer.addLog(this.span, message, level, fields);
    }
  }

  setError(error: Error | UnifiedErrorInfo): void {
    if (this.span) {
      const errorInfo = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      } : error;
      
      this.tracer.setError(this.span, errorInfo);
    }
  }

  getTraceId(): string | undefined {
    return this.span?.traceId;
  }

  getSpanId(): string | undefined {
    return this.span?.spanId;
  }

  getTraceHeaders(): Record<string, string> {
    if (this.span) {
      const headers: Record<string, string> = {};
      this.tracer.injectContext(this.span, headers);
      return headers;
    }
    return {};
  }

  finish(): void {
    if (this.finished) return;
    
    this.finished = true;
    
    if (this.span) {
      const duration = Date.now() - this.startTime.getTime();
      this.tracer.setTag(this.span, 'duration_ms', duration);
      this.tracer.finishSpan(this.span);
    }
  }

  isFinished(): boolean {
    return this.finished;
  }

  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}

// ============================================
// 📁 src/implementations/console-tracer.ts - CONSOLE TRACER
// ============================================
import { UnifiedTracer, UnifiedSpan, UnifiedSpanContext, UnifiedLogLevel, UnifiedErrorInfo } from '../types/core';
import * as TracerUtils from '../internal/tracer-utils';

export class UnifiedConsoleTracer implements UnifiedTracer {
  startSpan(operationName: string, parentSpan?: UnifiedSpan): UnifiedSpan {
    const span = TracerUtils.createSpan(operationName, parentSpan);
    
    console.debug(`[TRACER] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });
    
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    TracerUtils.finishSpan(span);
    
    console.debug(`[TRACER] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: span.tags.duration_ms,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    TracerUtils.setSpanTag(span, key, value);
    console.debug(`[TRACER] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    TracerUtils.addSpanLog(span, message, level, fields);
    console.debug(`[TRACER] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    TracerUtils.setSpanError(span, error);
    console.debug(`[TRACER] Error set: ${error.message}`, { spanId: span.spanId });
  }

  extractContext(headers: Record<string, string>): UnifiedSpanContext | undefined {
    return TracerUtils.extractContextFromHeaders(headers);
  }

  injectContext(span: UnifiedSpan, headers: Record<string, string>): void {
    TracerUtils.injectContextToHeaders(span, headers);
  }
}

// ============================================
// 📁 src/internal/provider-utils.ts - PROVIDER UTILITIES
// ============================================
import { UnifiedTracingConfig, UnifiedMetricsConfig, UnifiedLoggingConfig, UnifiedJaegerConfig, UnifiedOtelTracingConfig, UnifiedXRayConfig } from '../config/types';
import { UnifiedTracer } from '../interfaces/tracer';
import { UnifiedMetrics } from '../interfaces/metrics';
import { UnifiedLogger } from '../interfaces/logger';
import { UnifiedConsoleTracer } from '../implementations/console-tracer';
import { UnifiedJaegerTracer } from '../implementations/jaeger-tracer';
import { UnifiedOtelTracer } from '../implementations/otel-tracer';
import { UnifiedXRayTracer } from '../implementations/xray-tracer';
import { UnifiedConsoleMetrics } from '../implementations/console-metrics';
import { UnifiedConsoleLogger } from '../implementations/console-logger';
import { UnifiedInhLoggerAdapter } from '../implementations/inh-logger-adapter';

export function createLogger(config: UnifiedLoggingConfig): UnifiedLogger {
  try {
    switch (config.backend) {
      case 'inh':
        if (!config.instance) {
          throw new Error('Logger instance is required for inh backend');
        }
        return new UnifiedInhLoggerAdapter(config.instance);
        
      case 'console':
        return new UnifiedConsoleLogger(config.level);
        
      case 'custom':
        if (!config.instance) {
          throw new Error('Logger instance is required for custom backend');
        }
        return config.instance;
        
      default:
        return new UnifiedConsoleLogger();
    }
  } catch (error) {
    console.warn('Failed to initialize logger, falling back to console', error);
    return new UnifiedConsoleLogger();
  }
}

export function createTracer(
  config: UnifiedTracingConfig | undefined,
  serviceName: string,
  serviceVersion: string,
  environment: string,
  logger?: UnifiedLogger
): UnifiedTracer | undefined {
  if (!config || config.backend === 'none' || config.enabled === false) {
    return undefined;
  }

  try {
    switch (config.backend) {
      case 'console':
        return new UnifiedConsoleTracer();
        
      case 'jaeger':
        return new UnifiedJaegerTracer({
          serviceName,
          serviceVersion,
          environment,
          config: config.config as UnifiedJaegerConfig
        });
        
      case 'otel':
        return new UnifiedOtelTracer({
          serviceName,
          serviceVersion,
          environment,
          config: config.config as UnifiedOtelTracingConfig
        });
        
      case 'xray':
        return new UnifiedXRayTracer({
          serviceName,
          serviceVersion,
          environment,
          config: config.config as UnifiedXRayConfig
        });
        
      default:
        logger?.warn(`Unknown tracing backend: ${config.backend}, falling back to console`);
        return new UnifiedConsoleTracer();
    }
  } catch (error) {
    logger?.warn('Failed to initialize tracer', { 
      backend: config.backend,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

export function createMetrics(config?: UnifiedMetricsConfig, logger?: UnifiedLogger): UnifiedMetrics | undefined {
  if (!config || config.backend === 'none' || config.enabled === false) {
    return undefined;
  }

  try {
    switch (config.backend) {
      case 'console':
        return new UnifiedConsoleMetrics();
        
      case 'prometheus':
      case 'otel':
        // TODO: Implement real metrics
        console.warn(`${config.backend} metrics not implemented yet, using console metrics`);
        return new UnifiedConsoleMetrics();
        
      default:
        return undefined;
    }
  } catch (error) {
    logger?.warn('Failed to initialize metrics', { 
      backend: config.backend,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

export async function shutdownMetrics(metrics?: UnifiedMetrics, logger?: UnifiedLogger): Promise<void> {
  try {
    if (metrics && 'shutdown' in metrics) {
      await (metrics as UnifiedMetrics & { shutdown(): Promise<void> }).shutdown();
    }
  } catch (error) {
    logger?.warn('Error shutting down metrics', { 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function shutdownTracer(tracer?: UnifiedTracer, logger?: UnifiedLogger): Promise<void> {
  try {
    if (tracer && 'shutdown' in tracer) {
      await (tracer as UnifiedTracer & { shutdown(): Promise<void> }).shutdown();
    }
  } catch (error) {
    logger?.warn('Error shutting down tracer', { 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ============================================
// 📁 src/provider/provider.ts - MAIN PROVIDER
// ============================================
import { UnifiedObservabilityConfig } from '../config/types';
import { UnifiedTracer } from '../interfaces/tracer';
import { UnifiedMetrics } from '../interfaces/metrics';
import { UnifiedLogger } from '../interfaces/logger';
import { UnifiedObservabilityContext } from '../context/observability-context';
import { UnifiedLoggerContext } from '../context/logger-context';
import { UnifiedMetricsContext } from '../context/metrics-context';
import { UnifiedTracerContext } from '../context/tracer-context';
import { UnifiedConsoleTracer } from '../implementations/console-tracer';
import { UnifiedConsoleMetrics } from '../implementations/console-metrics';
import * as ConfigUtils from '../internal/config-utils';
import * as ProviderUtils from '../internal/provider-utils';

export class UnifiedObservabilityProvider {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly tracer?: UnifiedTracer;
  readonly metrics?: UnifiedMetrics;
  readonly logger: UnifiedLogger;
  readonly defaultTags: Record<string, string>;
  
  private readonly config: UnifiedObservabilityConfig;

  constructor(config: UnifiedObservabilityConfig) {
    // Validate configuration
    const errors = ConfigUtils.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    this.config = config;
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion || '1.0.0';
    this.environment = config.environment || 'development';
    this.defaultTags = ConfigUtils.createDefaultTags(config);
    
    // Initialize components using utils
    this.logger = ProviderUtils.createLogger(config.logging);
    this.tracer = ProviderUtils.createTracer(
      config.tracing,
      this.serviceName,
      this.serviceVersion,
      this.environment,
      this.logger
    );
    this.metrics = ProviderUtils.createMetrics(config.metrics, this.logger);

    // Log initialization
    this.logger.info('Unified observability provider initialized', {
      serviceName: this.serviceName,
      serviceVersion: this.serviceVersion,
      environment: this.environment,
      tracingEnabled: !!this.tracer,
      tracingBackend: config.tracing?.backend || 'none',
      metricsEnabled: !!this.metrics,
      metricsBackend: config.metrics?.backend || 'none'
    });
  }

  createRootContext(operationName: string): UnifiedObservabilityContext {
    const contextData = {
      contextId: 'root',
      operationName,
      serviceName: this.serviceName,
      serviceVersion: this.serviceVersion,
      environment: this.environment,
      traceId: undefined,
      spanId: undefined
    };

    const loggerContext = new UnifiedLoggerContext(this.logger, contextData);
    const metricsContext = new UnifiedMetricsContext(this.metrics || new UnifiedConsoleMetrics(), this.defaultTags);
    const tracerContext = new UnifiedTracerContext(this.tracer || new UnifiedConsoleTracer(), this.defaultTags);

    return new UnifiedObservabilityContext(
      loggerContext,
      metricsContext,
      tracerContext,
      operationName
    );
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down unified observability provider', {
      serviceName: this.serviceName
    });

    // Shutdown components using utils
    await ProviderUtils.shutdownMetrics(this.metrics, this.logger);
    await ProviderUtils.shutdownTracer(this.tracer, this.logger);
  }
}

// ============================================
// 📁 src/factory/factory.ts - FACTORY
// ============================================
import { UnifiedObservabilityProvider } from '../provider/provider';
import { UnifiedObservabilityConfig, UnifiedTracingConfig, UnifiedMetricsConfig, UnifiedLoggingConfig, UnifiedJaegerConfig, UnifiedOtelTracingConfig, UnifiedXRayConfig } from '../config/types';
import { UnifiedTracingBackend, UnifiedMetricsBackend, UnifiedLoggingBackend, UnifiedLogLevel } from '../types/core';

export class UnifiedObservabilityFactory {
  static createProvider(config: UnifiedObservabilityConfig): UnifiedObservabilityProvider {
    return new UnifiedObservabilityProvider(config);
  }

  static createFromEnvironment(serviceName: string): UnifiedObservabilityProvider {
    const config: UnifiedObservabilityConfig = {
      serviceName,
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      tracing: this.createTracingConfigFromEnv(),
      metrics: this.createMetricsConfigFromEnv(),
      logging: this.createLoggingConfigFromEnv(),
      
      defaultTags: this.createEnvironmentTags()
    };

    return new UnifiedObservabilityProvider(config);
  }

  private static createTracingConfigFromEnv(): UnifiedTracingConfig | undefined {
    const backend = process.env.TRACING_BACKEND as UnifiedTracingBackend;
    if (!backend || backend === 'none') return undefined;

    const baseConfig: UnifiedTracingConfig = {
      backend,
      enabled: process.env.TRACING_ENABLED !== 'false',
      samplingRate: process.env.TRACING_SAMPLING_RATE ? 
        parseFloat(process.env.TRACING_SAMPLING_RATE) : undefined
    };

    switch (backend) {
      case 'jaeger':
        baseConfig.config = {
          endpoint: process.env.JAEGER_ENDPOINT,
          agent: {
            host: process.env.JAEGER_AGENT_HOST || 'localhost',
            port: process.env.JAEGER_AGENT_PORT ? 
              parseInt(process.env.JAEGER_AGENT_PORT) : 6831
          },
          flushInterval: process.env.JAEGER_FLUSH_INTERVAL ? 
            parseInt(process.env.JAEGER_FLUSH_INTERVAL) : undefined,
          tags: this.parseTagsFromEnv('JAEGER_TAGS')
        } as UnifiedJaegerConfig;
        break;

      case 'otel':
        baseConfig.config = {
          endpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 
                   process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
          headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
            this.parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS) : undefined,
          compression: (process.env.OTEL_EXPORTER_OTLP_COMPRESSION as 'gzip' | 'none') || 'none',
          timeout: process.env.OTEL_EXPORTER_OTLP_TIMEOUT ? 
            parseInt(process.env.OTEL_EXPORTER_OTLP_TIMEOUT) : undefined,
          attributes: this.parseTagsFromEnv('OTEL_RESOURCE_ATTRIBUTES')
        } as UnifiedOtelTracingConfig;
        break;

      case 'xray':
        baseConfig.config = {
          region: process.env.AWS_REGION,
          daemon: process.env.AWS_XRAY_DAEMON_ADDRESS,
          captureAWS: process.env.AWS_XRAY_CAPTURE_AWS !== 'false',
          captureHTTPs: process.env.AWS_XRAY_CAPTURE_HTTPS !== 'false',
          captureHTTP: process.env.AWS_XRAY_CAPTURE_HTTP !== 'false',
          contextMissingStrategy: (process.env.AWS_XRAY_CONTEXT_MISSING as 'LOG_ERROR' | 'IGNORE_ERROR') || 'LOG_ERROR',
          plugins: process.env.AWS_XRAY_PLUGINS ? 
            process.env.AWS_XRAY_PLUGINS.split(',').map(p => p.trim()) : undefined
        } as UnifiedXRayConfig;
        break;
    }

    return baseConfig;
  }

  private static createMetricsConfigFromEnv(): UnifiedMetricsConfig | undefined {
    const backend = process.env.METRICS_BACKEND as UnifiedMetricsBackend;
    if (!backend || backend === 'none') return undefined;

    const baseConfig: UnifiedMetricsConfig = {
      backend,
      enabled: process.env.METRICS_ENABLED !== 'false',
      prefix: process.env.METRICS_PREFIX
    };

    switch (backend) {
      case 'prometheus':
        baseConfig.config = {
          prefix: process.env.PROMETHEUS_PREFIX,
          defaultLabels: process.env.PROMETHEUS_DEFAULT_LABELS ? 
            this.parseLabels(process.env.PROMETHEUS_DEFAULT_LABELS) : undefined,
          buckets: process.env.PROMETHEUS_BUCKETS ? 
            process.env.PROMETHEUS_BUCKETS.split(',').map(b => parseFloat(b.trim())) : undefined,
          port: process.env.PROMETHEUS_PORT ? 
            parseInt(process.env.PROMETHEUS_PORT) : undefined,
          endpoint: process.env.PROMETHEUS_ENDPOINT
        };
        break;

      case 'otel':
        baseConfig.config = {
          endpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 
                   process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
          headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
            this.parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS) : undefined,
          exportInterval: process.env.OTEL_METRICS_EXPORT_INTERVAL ? 
            parseInt(process.env.OTEL_METRICS_EXPORT_INTERVAL) : undefined,
          timeout: process.env.OTEL_EXPORTER_OTLP_TIMEOUT ? 
            parseInt(process.env.OTEL_EXPORTER_OTLP_TIMEOUT) : undefined,
          attributes: this.parseTagsFromEnv('OTEL_RESOURCE_ATTRIBUTES')
        };
        break;
    }

    return baseConfig;
  }

  private static createLoggingConfigFromEnv(): UnifiedLoggingConfig {
    const backend = (process.env.LOGGING_BACKEND || 'console') as UnifiedLoggingBackend;
    const level = (process.env.LOG_LEVEL || 'info') as UnifiedLogLevel;

    return {
      backend,
      level
    };
  }

  private static createEnvironmentTags(): Record<string, string> {
    const baseTags = {
      'deployment.id': process.env.DEPLOYMENT_ID || 'unknown',
      'instance.id': process.env.INSTANCE_ID || 'unknown',
      'pod.name': process.env.HOSTNAME || process.env.POD_NAME || 'unknown',
      'node.name': process.env.NODE_NAME || 'unknown'
    };

    // Add custom tags from environment
    const customTags = this.parseTagsFromEnv('CUSTOM_TAGS');
    
    return { ...baseTags, ...customTags };
  }

  private static parseHeaders(headersStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    headersStr.split(',').forEach(header => {
      const [key, value] = header.split('=', 2);
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    });
    return headers;
  }

  private static parseLabels(labelsStr: string): Record<string, string> {
    return this.parseHeaders(labelsStr);
  }

  private static parseTagsFromEnv(envVar: string): Record<string, string> {
    const tagsStr = process.env[envVar];
    return tagsStr ? this.parseHeaders(tagsStr) : {};
  }
}

// ============================================
// 📁 src/errors/errors.ts - ERROR CLASSES
// ============================================
export class UnifiedObservabilityError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'UnifiedObservabilityError';
  }
}

export class UnifiedConfigurationError extends UnifiedObservabilityError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'UnifiedConfigurationError';
  }
}

export class UnifiedTracingError extends UnifiedObservabilityError {
  constructor(message: string) {
    super(message, 'TRACING_ERROR');
    this.name = 'UnifiedTracingError';
  }
}

export class UnifiedMetricsError extends UnifiedObservabilityError {
  constructor(message: string) {
    super(message, 'METRICS_ERROR');
    this.name = 'UnifiedMetricsError';
  }
}

// ============================================
// 📁 src/index.ts - MAIN EXPORTS
// ============================================
// Core types
export * from './types/core';
export * from './config/types';

// Interfaces
export * from './interfaces/tracer';
export * from './interfaces/metrics';
export * from './interfaces/logger';

// Main classes
export { UnifiedObservabilityProvider } from './provider/provider';
export { UnifiedObservabilityContext } from './context/observability-context';
export { UnifiedLoggerContext } from './context/logger-context';
export { UnifiedMetricsContext } from './context/metrics-context';
export { UnifiedTracerContext } from './context/tracer-context';

// Factory
export { UnifiedObservabilityFactory } from './factory/factory';

// Implementations
export { UnifiedConsoleTracer } from './implementations/console-tracer';
export { UnifiedJaegerTracer } from './implementations/jaeger-tracer';
export { UnifiedOtelTracer } from './implementations/otel-tracer';
export { UnifiedXRayTracer } from './implementations/xray-tracer';
export { UnifiedConsoleMetrics } from './implementations/console-metrics';
export { UnifiedConsoleLogger } from './implementations/console-logger';
export { UnifiedInhLoggerAdapter } from './implementations/inh-logger-adapter';

// Errors
export * from './errors/errors';

// ============================================
// 📁 examples/tracer-backends-usage.ts - TRACER BACKENDS USAGE EXAMPLE
// ============================================
import { UnifiedObservabilityFactory } from '../src';

// Example 1: Jaeger Tracer
const jaegerProvider = UnifiedObservabilityFactory.createProvider({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  tracing: {
    backend: 'jaeger',
    enabled: true,
    samplingRate: 0.1,
    config: {
      endpoint: 'http://localhost:14268/api/traces',
      agent: {
        host: 'jaeger-agent',
        port: 6831
      },
      tags: {
        'deployment.id': 'deploy-123',
        'region': 'us-east-1'
      }
    }
  },
  logging: {
    backend: 'console',
    level: 'info'
  }
});

// Example 2: OpenTelemetry Tracer
const otelProvider = UnifiedObservabilityFactory.createProvider({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  tracing: {
    backend: 'otel',
    enabled: true,
    samplingRate: 0.1,
    config: {
      endpoint: 'http://localhost:4317',
      headers: {
        'authorization': 'Bearer token123'
      },
      compression: 'gzip',
      timeout: 5000,
      attributes: {
        'service.namespace': 'production',
        'service.instance.id': 'instance-456'
      }
    }
  },
  logging: {
    backend: 'console',
    level: 'info'
  }
});

// Example 3: AWS X-Ray Tracer
const xrayProvider = UnifiedObservabilityFactory.createProvider({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  tracing: {
    backend: 'xray',
    enabled: true,
    config: {
      region: 'us-east-1',
      daemon: 'localhost:2000',
      captureAWS: true,
      captureHTTPs: true,
      captureHTTP: true,
      contextMissingStrategy: 'LOG_ERROR',
      plugins: ['EC2Plugin', 'ECSPlugin']
    }
  },
  logging: {
    backend: 'console',
    level: 'info'
  }
});

// Example 4: Environment-based configuration
const envProvider = UnifiedObservabilityFactory.createFromEnvironment('my-service');

// Usage example with different tracers
async function processOrder(orderId: string) {
  // Use any of the providers above
  const context = jaegerProvider.createRootContext('ProcessOrder');
  
  // Set common tags
  context.setTag('order.id', orderId);
  context.setTag('user.id', 'user123');
  
  // Log the operation
  context.logger.info('Processing order', { orderId, userId: 'user123' });
  
  // Create child context for payment
  const paymentContext = context.createChild('ProcessPayment');
  paymentContext.setTag('payment.method', 'credit_card');
  
  try {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    paymentContext.logger.info('Payment processed successfully', {
      orderId,
      paymentMethod: 'credit_card'
    });
    
    // Record success metric
    const orderCounter = context.metrics.counter('orders_processed_total');
    orderCounter.increment({ status: 'success' });
    
  } catch (error) {
    paymentContext.logger.error('Payment processing failed', {
      orderId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    paymentContext.setError(error instanceof Error ? error : new Error(String(error)));
    
    // Record error metric
    const orderCounter = context.metrics.counter('orders_processed_total');
    orderCounter.increment({ status: 'error' });
    
    throw error;
  } finally {
    // Finish contexts
    paymentContext.finish();
    context.finish();
  }
}

// Environment variables for configuration
/*
TRACING_BACKEND=jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces
JAEGER_AGENT_HOST=jaeger-agent
JAEGER_AGENT_PORT=6831

TRACING_BACKEND=otel
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer token123

TRACING_BACKEND=xray
AWS_REGION=us-east-1
AWS_XRAY_DAEMON_ADDRESS=localhost:2000
*/

// ============================================
// 📁 src/internal/index.ts - INTERNAL EXPORTS (for testing)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Utilities
export * as TracerUtils from './tracer-utils';
export * as MetricsUtils from './metrics-utils';
export * as LoggerUtils from './logger-utils';
export * as ConfigUtils from './config-utils';
export * as ProviderUtils from './provider-utils';

// ============================================
// 📁 examples/provider-utils-test.ts - PROVIDER UTILS TEST EXAMPLE
// ============================================
import { UnifiedObservabilityFactory } from '../src';
import { 
  createLogger, 
  createTracer, 
  createMetrics, 
  shutdownMetrics, 
  shutdownTracer 
} from '../src/internal/provider-utils';
import { UnifiedConsoleLogger } from '../src/implementations/console-logger';
import { UnifiedJaegerTracer } from '../src/implementations/jaeger-tracer';
import { UnifiedOtelTracer } from '../src/implementations/otel-tracer';
import { UnifiedXRayTracer } from '../src/implementations/xray-tracer';

// Test individual provider utils functions
describe('Provider Utils', () => {
  describe('createLogger', () => {
    it('should create console logger', () => {
      const logger = createLogger({
        backend: 'console',
        level: 'info'
      });
      
      expect(logger).toBeInstanceOf(UnifiedConsoleLogger);
    });
    
    it('should create inh logger adapter', () => {
      const inhLogger = {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      };
      
      const logger = createLogger({
        backend: 'inh',
        instance: inhLogger
      });
      
      expect(logger).toBeDefined();
      logger.info('test message');
      expect(inhLogger.info).toHaveBeenCalledWith('test message', undefined);
    });
    
    it('should fallback to console on error', () => {
      const logger = createLogger({
        backend: 'inh'
        // Missing instance - should fallback
      });
      
      expect(logger).toBeInstanceOf(UnifiedConsoleLogger);
    });
  });
  
  describe('createTracer', () => {
    const serviceName = 'test-service';
    const serviceVersion = '1.0.0';
    const environment = 'test';
    
    it('should return undefined when disabled', () => {
      const tracer = createTracer({
        backend: 'none',
        enabled: false
      }, serviceName, serviceVersion, environment);
      
      expect(tracer).toBeUndefined();
    });
    
    it('should create console tracer', () => {
      const tracer = createTracer({
        backend: 'console',
        enabled: true
      }, serviceName, serviceVersion, environment);
      
      expect(tracer).toBeDefined();
      expect(tracer.startSpan).toBeDefined();
    });
    
    it('should create jaeger tracer', () => {
      const tracer = createTracer({
        backend: 'jaeger',
        enabled: true,
        config: {
          endpoint: 'http://localhost:14268',
          agent: {
            host: 'jaeger-agent',
            port: 6831
          }
        }
      }, serviceName, serviceVersion, environment);
      
      expect(tracer).toBeInstanceOf(UnifiedJaegerTracer);
    });
    
    it('should create otel tracer', () => {
      const tracer = createTracer({
        backend: 'otel',
        enabled: true,
        config: {
          endpoint: 'http://localhost:4317',
          headers: {
            'authorization': 'Bearer token123'
          }
        }
      }, serviceName, serviceVersion, environment);
      
      expect(tracer).toBeInstanceOf(UnifiedOtelTracer);
    });
    
    it('should create xray tracer', () => {
      const tracer = createTracer({
        backend: 'xray',
        enabled: true,
        config: {
          region: 'us-east-1',
          daemon: 'localhost:2000'
        }
      }, serviceName, serviceVersion, environment);
      
      expect(tracer).toBeInstanceOf(UnifiedXRayTracer);
    });
    
    it('should handle errors gracefully', () => {
      const mockLogger = {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
      };
      
      const tracer = createTracer({
        backend: 'invalid' as any,
        enabled: true
      }, serviceName, serviceVersion, environment, mockLogger);
      
      expect(tracer).toBeDefined(); // Should fallback to console tracer
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
  
  describe('createMetrics', () => {
    it('should return undefined when disabled', () => {
      const metrics = createMetrics({
        backend: 'none',
        enabled: false
      });
      
      expect(metrics).toBeUndefined();
    });
    
    it('should create console metrics', () => {
      const metrics = createMetrics({
        backend: 'console',
        enabled: true
      });
      
      expect(metrics).toBeDefined();
      expect(metrics.counter).toBeDefined();
      expect(metrics.gauge).toBeDefined();
      expect(metrics.histogram).toBeDefined();
    });
  });
  
  describe('shutdown functions', () => {
    it('should shutdown metrics gracefully', async () => {
      const mockMetrics = {
        counter: jest.fn(),
        gauge: jest.fn(),
        histogram: jest.fn(),
        timer: jest.fn(),
        clear: jest.fn(),
        getMetrics: jest.fn(),
        shutdown: jest.fn()
      };
      
      const mockLogger = {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
      };
      
      await shutdownMetrics(mockMetrics, mockLogger);
      
      expect(mockMetrics.shutdown).toHaveBeenCalled();
    });
    
    it('should handle shutdown errors', async () => {
      const mockMetrics = {
        counter: jest.fn(),
        gauge: jest.fn(),
        histogram: jest.fn(),
        timer: jest.fn(),
        clear: jest.fn(),
        getMetrics: jest.fn(),
        shutdown: jest.fn().mockRejectedValue(new Error('Shutdown failed'))
      };
      
      const mockLogger = {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
      };
      
      await shutdownMetrics(mockMetrics, mockLogger);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Error shutting down metrics', {
        error: 'Shutdown failed'
      });
    });
  });
});

// ============================================
// 📁 examples/basic-usage.ts - BASIC USAGE EXAMPLE
// ============================================
import { UnifiedObservabilityFactory } from '../src';

// Create provider
const provider = UnifiedObservabilityFactory.createProvider({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development',
  tracing: {
    backend: 'console',
    enabled: true
  },
  metrics: {
    backend: 'console',
    enabled: true
  },
  logging: {
    backend: 'console',
    level: 'info'
  }
});

// Create context
const context = provider.createRootContext('ProcessOrder');

// Use logging
context.logger.info('Processing order', { orderId: '123', userId: 'user456' });

// Use metrics
const orderCounter = context.metrics.counter('orders_processed_total');
orderCounter.increment({ status: 'success' });

const processingTime = context.metrics.histogram('order_processing_duration_seconds');
processingTime.time(() => {
  // Process order
  return processOrder();
});

// Use tracing
if (context.span) {
  context.tracer.setTag(context.span, 'order.id', '123');
  context.tracer.setTag(context.span, 'user.id', 'user456');
}

// Create child context
const dbContext = context.createChild('DatabaseOperation');
dbContext.logger.debug('Querying database', { table: 'orders' });

// Finish context
context.finish();

async function processOrder(): Promise<void> {
  // Simulate order processing
  await new Promise(resolve => setTimeout(resolve, 100));
}

// ============================================
// 📁 examples/fastify-integration.ts - FASTIFY INTEGRATION EXAMPLE
// ============================================
import fastify from 'fastify';
import { UnifiedObservabilityFactory } from '../src';

const app = fastify();

// Create observability provider
const provider = UnifiedObservabilityFactory.createFromEnvironment('my-api');

// Request middleware
app.addHook('onRequest', async (request, reply) => {
  const operationName = `${request.method} ${request.url}`;
  
  // Create context from headers (for distributed tracing)
  const headers = request.headers as Record<string, string>;
  const context = provider.createRootContext(operationName);
  
  // Add to request
  (request as any).observability = context;
  
  // Log request
  context.logger.info('Request received', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent']
  });
  
  // Set tracing tags
  context.setTag('http.method', request.method);
  context.setTag('http.url', request.url);
  
  // Increment request counter
  const requestCounter = context.metrics.counter('http_requests_total');
  requestCounter.increment({ 
    method: request.method,
    endpoint: request.url 
  });
});

// Response middleware
app.addHook('onResponse', async (request, reply) => {
  const context = (request as any).observability;
  if (!context) return;
  
  // Set response tags
  context.setTag('http.status_code', reply.statusCode);
  
  // Record response time
  const responseTime = context.metrics.histogram('http_request_duration_seconds');
  responseTime.observe(context.getDuration() / 1000);
  
  // Log response
  const level = reply.statusCode >= 500 ? 'error' : 
                reply.statusCode >= 400 ? 'warn' : 'info';
  
  context.logger[level]('Request completed', {
    statusCode: reply.statusCode,
    duration: context.getDuration()
  });
  
  // Finish context
  context.finish();
});

// Route handler
app.get('/users/:id', async (request, reply) => {
  const context = (request as any).observability;
  const { id } = request.params as { id: string };
  
  // Create child context for database operation
  const dbContext = context.createChild('GetUser');
  
  try {
    dbContext.logger.debug('Fetching user', { userId: id });
    
    // Simulate database call
    const user = await getUser(id);
    
    dbContext.logger.info('User fetched successfully', { userId: id });
    
    return { user };
  } catch (error) {
    dbContext.logger.error('Failed to fetch user', { 
      userId: id,
      error: error instanceof Error ? error.message : String(error)
    });
    
    dbContext.setError(error instanceof Error ? error : new Error(String(error)));
    
    reply.status(500);
    return { error: 'Internal server error' };
  }
});

async function getUser(id: string) {
  // Simulate database query
  await new Promise(resolve => setTimeout(resolve, 50));
  return { id, name: `User ${id}`, email: `user${id}@example.com` };
}

app.listen({ port: 3000 }, () => {
  console.log('Server listening on port 3000');
});

// ============================================
// 📁 package.json - PACKAGE CONFIGURATION
// ============================================
{
  "name": "@inh-lib/unified-observability",
  "version": "1.0.0",
  "description": "Simplified unified observability provider for tracing, metrics, and logging",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./internal": {
      "import": "./dist/internal/index.js",
      "require": "./dist/internal/index.js",
      "types": "./dist/internal/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "keywords": [
    "observability",
    "tracing",
    "metrics",
    "logging",
    "unified",
    "typescript"
  ],
  "author": "INH Team",
  "license": "MIT",
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "@inh-lib/inh-logger": "^1.0.0"
  },
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/inh-lib/unified-observability.git"
  }
}

// ============================================
// 📁 tsconfig.json - TYPESCRIPT CONFIGURATION
// ============================================
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "typeRoots": ["./node_modules/@types"]
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