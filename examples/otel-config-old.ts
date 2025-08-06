/**
 * OpenTelemetry NodeSDK Configuration
 * สำหรับใช้กับ Docker Compose Telemetry Stack
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_SERVICE_NAMESPACE, SEMRESATTRS_SERVICE_INSTANCE_ID } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

/**
 * Configuration interface
 */
interface OtelConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  prometheusPort?: number;
  enableConsoleExporter?: boolean;
  enableDebug?: boolean;
}

/**
 * Create and configure OpenTelemetry NodeSDK
 */
export function createOtelSDK(config: OtelConfig): NodeSDK {
  const {
    serviceName,
    serviceVersion,
    environment,
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    prometheusPort = 9464,
    enableConsoleExporter = false,
    enableDebug = false,
  } = config;

  // Create resource with service information
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_SERVICE_NAMESPACE]: 'fastify-telemetry',
    [SEMRESATTRS_SERVICE_INSTANCE_ID]: `${serviceName}-${Date.now()}`,
    'deployment.environment': environment,
    'host.name': process.env.HOSTNAME || 'localhost',
    'container.name': process.env.CONTAINER_NAME || serviceName,
  });

  // OTLP Trace Exporter (to OpenTelemetry Collector)
  const otlpTraceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // OTLP Metrics Exporter (to OpenTelemetry Collector)
  const otlpMetricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Configure instrumentations
  const instrumentations = [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation (too verbose)
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-fastify': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pino': {
        enabled: true,
      },
    }),
  ];

  // Create NodeSDK
  const sdk = new NodeSDK({
    resource,
    instrumentations,
    
    // Trace configuration
    spanProcessor: new BatchSpanProcessor(otlpTraceExporter, {
      maxQueueSize: 1000,
      scheduledDelayMillis: 1000,
      exportTimeoutMillis: 30000,
      maxExportBatchSize: 512,
    }),

    // Metrics configuration
    metricReader: new PeriodicExportingMetricReader({
      exporter: otlpMetricExporter,
      exportIntervalMillis: 10000, // Export every 10 seconds
    }),
  });

  // Add Prometheus exporter separately (NodeSDK doesn't support multiple metric readers directly)
  // This will be handled in the application setup

  if (enableDebug) {
    console.log('🔍 OpenTelemetry SDK Configuration:');
    console.log(`  Service: ${serviceName}@${serviceVersion}`);
    console.log(`  Environment: ${environment}`);
    console.log(`  OTLP Endpoint: ${otlpEndpoint}`);
    console.log(`  Prometheus Port: ${prometheusPort}`);
    console.log(`  Resource:`, resource.attributes);
  }

  return sdk;
}

/**
 * Initialize and start OpenTelemetry SDK
 */
export function initializeOtel(config: OtelConfig): NodeSDK {
  const sdk = createOtelSDK(config);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      await sdk.shutdown();
      console.log('🛑 OpenTelemetry SDK shut down successfully');
    } catch (error) {
      console.error('❌ Error shutting down OpenTelemetry SDK:', error);
    }
  });

  // Start the SDK
  sdk.start();
  console.log('✅ OpenTelemetry SDK started successfully');

  return sdk;
}

/**
 * Default configuration for development
 */
export const defaultOtelConfig: OtelConfig = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'fastify-telemetry-example',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.DEPLOYMENT_ENVIRONMENT || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  prometheusPort: parseInt(process.env.PROMETHEUS_METRICS_PORT || '9464', 10),
  enableConsoleExporter: process.env.OTEL_ENABLE_CONSOLE === 'true',
  enableDebug: process.env.OTEL_DEBUG === 'true',
};

/**
 * Example usage in your application
 */
export function setupTelemetryForApp() {
  // Initialize OpenTelemetry before importing any other modules
  const sdk = initializeOtel(defaultOtelConfig);

  // Setup Prometheus metrics endpoint for direct scraping
  try {
    const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
    const { MeterProvider } = require('@opentelemetry/sdk-metrics');
    
    const prometheusExporter = new PrometheusExporter({
      port: defaultOtelConfig.prometheusPort,
      endpoint: '/metrics',
    });

    // Create a separate meter provider for Prometheus
    const meterProvider = new MeterProvider({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: defaultOtelConfig.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: defaultOtelConfig.serviceVersion,
      }),
      readers: [prometheusExporter],
    });

    // Register the meter provider globally
    const { metrics } = require('@opentelemetry/api');
    metrics.setGlobalMeterProvider(meterProvider);

    console.log(`📊 Prometheus metrics endpoint: http://localhost:${defaultOtelConfig.prometheusPort}/metrics`);
  } catch (error) {
    console.warn('⚠️  Could not setup Prometheus exporter:', error.message);
  }

  return sdk;
}

// Export types and utilities
export type { OtelConfig };
