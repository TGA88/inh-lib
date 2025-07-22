// src/configuration/otel-config-mapper.ts

import {
  ObservabilityConfig,
  MetricsConfig,
  TracingConfig,
  LoggingConfig
} from '@inh-lib/unified-observe-ability-core';
import {
  OtelMetricsConfig,
  OtelTracingConfig,
  OtelLoggingConfig,
  OtelResourceConfig
} from '../types';

export function mapToOtelMetricsConfig(config: MetricsConfig): OtelMetricsConfig {
  return {
    ...config,
    vendor: 'opentelemetry',
    exporterType: determineMetricsExporterType(config.endpoint),
    exportInterval: config.interval || 15000,
    resourceDetectionTimeout: 5000
  };
}

export function mapToOtelTracingConfig(config: TracingConfig): OtelTracingConfig {
  return {
    ...config,
    vendor: 'opentelemetry',
    exporterType: determineTracingExporterType(config.endpoint),
    processorType: 'batch',
    resourceDetectionTimeout: 5000
  };
}

export function mapToOtelLoggingConfig(config: LoggingConfig): OtelLoggingConfig {
  return {
    ...config,
    vendor: 'opentelemetry',
    exporterType: determineLoggingExporterType(config.endpoint),
    processorType: 'batch',
    resourceDetectionTimeout: 5000
  };
}

export function mapToOtelResourceConfig(config: ObservabilityConfig): OtelResourceConfig {
  return {
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    environment: config.environment,
    serviceNamespace: config.serviceNamespace,
    serviceInstanceId: config.serviceInstanceId,
    detectors: [
      { type: 'env', enabled: true, timeout: 2000 },
      { type: 'host', enabled: true, timeout: 2000 },
      { type: 'os', enabled: true, timeout: 2000 },
      { type: 'process', enabled: true, timeout: 2000 }
    ]
  };
}

function determineMetricsExporterType(endpoint?: string): 'prometheus' | 'otlp-http' | 'otlp-grpc' | 'console' {
  if (!endpoint) return 'console';
  
  if (endpoint.includes('/metrics')) return 'prometheus';
  if (endpoint.includes('v1/metrics')) return 'otlp-http';
  if (endpoint.includes(':4317')) return 'otlp-grpc';
  
  return 'otlp-http';
}

function determineTracingExporterType(endpoint?: string): 'jaeger' | 'otlp-http' | 'otlp-grpc' | 'console' {
  if (!endpoint) return 'console';
  
  if (endpoint.includes('jaeger') || endpoint.includes(':14268')) return 'jaeger';
  if (endpoint.includes('v1/traces')) return 'otlp-http';
  if (endpoint.includes(':4317')) return 'otlp-grpc';
  
  return 'otlp-http';
}

function determineLoggingExporterType(endpoint?: string): 'otlp-http' | 'otlp-grpc' | 'console' {
  if (!endpoint) return 'console';
  
  if (endpoint.includes('v1/logs')) return 'otlp-http';
  if (endpoint.includes(':4317')) return 'otlp-grpc';
  
  return 'otlp-http';
}
