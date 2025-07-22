
// src/factories/otel-metric-provider-factory.ts

import { MeterProvider, PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  UnifiedMetricProvider,
  ObservabilityConfig
} from '@inh-lib/unified-observe-ability-core';
import { OtelMetricProviderAdapter } from '../adapters/metrics';
import {
  OtelMetricsConfig,
  OtelMetricsExporterType
} from '../types';
import {
  buildOtelResource,
  buildMetricsExporterConfig,
  validateOtelMetricsConfig
} from '../utils';

export class OtelMetricProviderFactory {
  static create(config: ObservabilityConfig): UnifiedMetricProvider {
    const metricsConfig = config.metrics as OtelMetricsConfig;
    
    if (!metricsConfig) {
      throw new Error('Metrics configuration is required');
    }

    const validation = validateOtelMetricsConfig(metricsConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid metrics configuration: ${validation.errors.join(', ')}`);
    }

    const resource = buildOtelResource({
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      environment: config.environment,
      serviceNamespace: config.serviceNamespace,
      serviceInstanceId: config.serviceInstanceId
    });

    const readers = createMetricReaders(metricsConfig);
    const views = createMetricViews(metricsConfig);

    const meterProvider = new MeterProvider({
      resource,
      readers,
      views
    });

    return new OtelMetricProviderAdapter(meterProvider, config.serviceName);
  }
}

function createMetricReaders(config: OtelMetricsConfig): PeriodicExportingMetricReader[] {
  const readers: PeriodicExportingMetricReader[] = [];
  const exporterType = config.exporterType || 'console';

  let exporter;
  
  switch (exporterType) {
    case 'prometheus':
      // In real implementation, would use PrometheusExporter
      exporter = new ConsoleMetricExporter();
      break;
    
    case 'otlp-http':
      // In real implementation, would use OTLPMetricExporter
      exporter = new ConsoleMetricExporter();
      break;
    
    case 'console':
    default:
      exporter = new ConsoleMetricExporter();
  }

  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: config.exportInterval || 15000,
    exportTimeoutMillis: config.timeout || 5000
  });

  readers.push(reader);
  return readers;
}

function createMetricViews(config: OtelMetricsConfig): unknown[] {
  // In real implementation, would create View objects based on viewConfigs
  return [];
}
