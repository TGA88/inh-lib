// src/types/otel-config.types.ts

import { 
  ObservabilityConfig,
  MetricsConfig,
  TracingConfig,
  LoggingConfig
} from '@inh-lib/unified-observe-ability-core';

export interface OtelMetricsConfig extends MetricsConfig {
  readonly vendor: 'opentelemetry';
  readonly exporterType?: OtelMetricsExporterType;
  readonly exportInterval?: number;
  readonly resourceDetectionTimeout?: number;
  readonly viewConfigs?: OtelViewConfig[];
}

export interface OtelTracingConfig extends TracingConfig {
  readonly vendor: 'opentelemetry';
  readonly exporterType?: OtelTracingExporterType;
  readonly processorType?: OtelSpanProcessorType;
  readonly resourceDetectionTimeout?: number;
  readonly instrumentationConfigs?: OtelInstrumentationConfig[];
}

export interface OtelLoggingConfig extends LoggingConfig {
  readonly vendor: 'opentelemetry';
  readonly exporterType?: OtelLoggingExporterType;
  readonly processorType?: OtelLogProcessorType;
  readonly resourceDetectionTimeout?: number;
}

export const OtelMetricsExporterType = {
  PROMETHEUS: 'prometheus',
  OTLP_HTTP: 'otlp-http',
  OTLP_GRPC: 'otlp-grpc',
  CONSOLE: 'console'
} as const;

export type OtelMetricsExporterType = typeof OtelMetricsExporterType[keyof typeof OtelMetricsExporterType];

export const OtelTracingExporterType = {
  JAEGER: 'jaeger',
  OTLP_HTTP: 'otlp-http',
  OTLP_GRPC: 'otlp-grpc',
  CONSOLE: 'console'
} as const;

export type OtelTracingExporterType = typeof OtelTracingExporterType[keyof typeof OtelTracingExporterType];

export const OtelLoggingExporterType = {
  OTLP_HTTP: 'otlp-http',
  OTLP_GRPC: 'otlp-grpc',
  CONSOLE: 'console'
} as const;

export type OtelLoggingExporterType = typeof OtelLoggingExporterType[keyof typeof OtelLoggingExporterType];

export const OtelSpanProcessorType = {
  BATCH: 'batch',
  SIMPLE: 'simple'
} as const;

export type OtelSpanProcessorType = typeof OtelSpanProcessorType[keyof typeof OtelSpanProcessorType];

export const OtelLogProcessorType = {
  BATCH: 'batch',
  SIMPLE: 'simple'
} as const;

export type OtelLogProcessorType = typeof OtelLogProcessorType[keyof typeof OtelLogProcessorType];

export interface OtelViewConfig {
  readonly instrumentName: string;
  readonly instrumentType: 'counter' | 'histogram' | 'gauge';
  readonly aggregationType?: 'sum' | 'histogram' | 'last_value';
  readonly attributeKeys?: string[];
}

export interface OtelInstrumentationConfig {
  readonly name: string;
  readonly enabled: boolean;
  readonly config?: Record<string, unknown>;
}

export interface OtelResourceConfig {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly serviceNamespace?: string;
  readonly serviceInstanceId?: string;
  readonly customAttributes?: Record<string, string>;
  readonly detectors?: OtelResourceDetectorConfig[];
}

export interface OtelResourceDetectorConfig {
  readonly type: 'env' | 'host' | 'os' | 'process' | 'container' | 'k8s' | 'aws';
  readonly enabled: boolean;
  readonly timeout?: number;
}
