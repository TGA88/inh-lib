/**
 * Modern OpenTelemetry NodeSDK Configuration
 * Updated for latest OpenTelemetry packages (v1.19+)
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

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
  enableOtlpMetrics?: boolean; // ส่ง metrics ไป OTLP
  enablePrometheusMetrics?: boolean; // เปิด Prometheus endpoint
  enableDualMode?: boolean; // ใหม่: รองรับ OTLP + Prometheus พร้อมกัน
}

/**
 * Create OpenTelemetry resource configuration
 */
function createOtelResource(config: OtelConfig): Resource {
  const { serviceName, serviceVersion, environment } = config;
  
  return new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'service.namespace': 'fastify-telemetry',
    'service.instance.id': `${serviceName}-${Date.now()}`,
    'deployment.environment': environment,
    'host.name': process.env.HOSTNAME || 'localhost',
    'container.name': process.env.CONTAINER_NAME || serviceName,
  });
}

/**
 * Configure OpenTelemetry instrumentations
 */
function createInstrumentations(): any[] {
  return [
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
}

/**
 * Configure OTLP trace exporter
 */
function configureOtlpTraceExporter(config: OtelConfig): any | undefined {
  const { otlpEndpoint, enableDebug } = config;
  
  if (!otlpEndpoint) return undefined;
  
  try {
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const exporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: {},
    });
    
    if (enableDebug) {
      console.log(`🔗 OTLP Trace Exporter configured: ${otlpEndpoint}/v1/traces`);
    }
    
    return exporter;
  } catch (error) {
    console.warn('⚠️  Could not configure OTLP trace exporter:', (error as Error).message);
    return undefined;
  }
}

/**
 * Log OpenTelemetry configuration for debugging
 */
function logOtelConfiguration(config: OtelConfig): void {
  const {
    serviceName,
    serviceVersion,
    environment,
    otlpEndpoint,
    enableOtlpMetrics,
    enablePrometheusMetrics,
    enableDualMode,
    prometheusPort,
  } = config;

  console.log('🔍 OpenTelemetry SDK Configuration:');
  console.log(`  Service: ${serviceName}@${serviceVersion}`);
  console.log(`  Environment: ${environment}`);
  console.log(`  OTLP Endpoint: ${otlpEndpoint}`);
  console.log(`  OTLP Metrics: ${enableOtlpMetrics ? 'enabled' : 'disabled'}`);
  console.log(`  Prometheus Metrics: ${enablePrometheusMetrics ? 'enabled' : 'disabled'}`);
  console.log(`  Prometheus Port: ${prometheusPort || 9464}`);
  console.log(`  Dual Mode: ${enableDualMode ? 'enabled' : 'disabled'}`);
  
  // แสดงรายละเอียดตาม mode ที่เลือก
  if (enableDualMode && enableOtlpMetrics && enablePrometheusMetrics) {
    console.log('🔄 Dual Mode Active:');
    console.log('   → OTLP metrics sent to collector');
    console.log('   → Prometheus metrics available for scraping');
  } else if (enableOtlpMetrics && enablePrometheusMetrics && !enableDualMode) {
    console.log('ℹ️  Note: Both OTLP and Prometheus enabled but dual mode disabled.');
    console.log('   → OTLP takes priority (Prometheus will be ignored)');
  }
}

/**
 * Configure metrics reader (OTLP or Prometheus)
 */
function configureMetricsReader(config: OtelConfig): any | undefined {
  const { 
    otlpEndpoint, 
    enableOtlpMetrics, 
    enablePrometheusMetrics,
    enableDualMode,
  } = config;

  // DualMode: ถ้าเปิด dual mode จะใช้ OTLP เป็นหลัก และตั้ง Prometheus แยก
  if (enableDualMode && enableOtlpMetrics && enablePrometheusMetrics && otlpEndpoint) {
    return configureOtlpMetricsReader(config);
  }
  
  // Priority: OTLP metrics > Prometheus (เมื่อไม่ใช่ dual mode)
  if (enableOtlpMetrics && otlpEndpoint && !enableDualMode) {
    return configureOtlpMetricsReader(config);
  } else if (enablePrometheusMetrics && !enableDualMode) {
    return configurePrometheusMetricsReader(config);
  }
  
  return undefined;
}

/**
 * Configure OTLP metrics reader
 */
function configureOtlpMetricsReader(config: OtelConfig): any | undefined {
  const { otlpEndpoint, enableDebug } = config;
  
  try {
    const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
    const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
    
    const reader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
        headers: {},
      }),
      exportIntervalMillis: 10000, // Export every 10 seconds
    });
    
    if (enableDebug) {
      console.log(`📊 OTLP Metrics Exporter configured: ${otlpEndpoint}/v1/metrics`);
    }
    
    return reader;
  } catch (error) {
    console.warn('⚠️  Could not configure OTLP metrics exporter:', (error as Error).message);
    return undefined;
  }
}

/**
 * Setup separate Prometheus exporter for dual mode
 */
function setupDualModePrometheus(config: OtelConfig): void {
  const { prometheusPort, enableDebug } = config;
  
  try {
    const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
    const { MeterProvider } = require('@opentelemetry/sdk-metrics');
    const { Resource } = require('@opentelemetry/resources');
    
    const prometheusExporter = new PrometheusExporter({
      port: prometheusPort || 9464,
      endpoint: '/metrics',
    });

    // Create a separate meter provider for Prometheus
    const meterProvider = new MeterProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_VERSION]: config.serviceVersion,
      }),
      readers: [prometheusExporter],
    });

    // Register the meter provider globally for dual export
    const { metrics } = require('@opentelemetry/api');
    metrics.setGlobalMeterProvider(meterProvider);

    if (enableDebug) {
      console.log(`🔄 Dual Mode: Prometheus metrics endpoint: http://localhost:${prometheusPort || 9464}/metrics`);
      console.log('   (OTLP metrics will also be sent to collector)');
    }
  } catch (error) {
    console.warn('⚠️  Could not setup dual mode Prometheus exporter:', (error as Error).message);
  }
}
function configurePrometheusMetricsReader(config: OtelConfig): any | undefined {
  const { prometheusPort, enableDebug } = config;
  
  try {
    const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
    
    const reader = new PrometheusExporter({
      port: prometheusPort || 9464,
      endpoint: '/metrics',
    });
    
    if (enableDebug) {
      console.log(`📊 Prometheus Metrics Exporter configured: http://localhost:${prometheusPort || 9464}/metrics`);
    }
    
    return reader;
  } catch (error) {
    console.warn('⚠️  Could not configure Prometheus metrics exporter:', (error as Error).message);
    return undefined;
  }
}

/**
 * Create and configure OpenTelemetry NodeSDK
 */
export function createOtelSDK(config: OtelConfig): NodeSDK {
  const {
    enableDebug = false,
    enableOtlpMetrics = false,
    enablePrometheusMetrics = true,
    enableDualMode = false,
  } = config;

  // Create OpenTelemetry resource
  const resource = createOtelResource(config);
  
  // Configure instrumentations
  const instrumentations = createInstrumentations();
  
  // Base NodeSDK configuration
  const sdkConfig: any = {
    resource,
    instrumentations,
  };

  // Configure trace exporter
  const traceExporter = configureOtlpTraceExporter(config);
  if (traceExporter) {
    sdkConfig.traceExporter = traceExporter;
  }

  // Configure metrics reader
  const metricReader = configureMetricsReader(config);
  if (metricReader) {
    sdkConfig.metricReader = metricReader;
  }

  // Create NodeSDK
  const sdk = new NodeSDK(sdkConfig);

  // Setup dual mode Prometheus if enabled
  if (enableDualMode && enableOtlpMetrics && enablePrometheusMetrics) {
    setupDualModePrometheus(config);
  }

  // Log configuration if debug is enabled
  if (enableDebug) {
    logOtelConfiguration(config);
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
  enableOtlpMetrics: process.env.OTEL_ENABLE_OTLP_METRICS === 'true', // Default: false
  enablePrometheusMetrics: process.env.OTEL_ENABLE_PROMETHEUS !== 'false', // Default: true
  enableDualMode: process.env.OTEL_ENABLE_DUAL_MODE === 'true', // Default: false
};

/**
 * Simple telemetry setup for development
 */
export function setupTelemetryForApp() {
  console.log('🔄 Initializing OpenTelemetry...');
  
  // Initialize OpenTelemetry before importing any other modules
  const sdk = initializeOtel(defaultOtelConfig);

  // Setup separate Prometheus metrics endpoint only if:
  // 1. Prometheus metrics is enabled AND
  // 2. OTLP metrics is also enabled (dual export scenario)
  if (defaultOtelConfig.enablePrometheusMetrics && defaultOtelConfig.enableOtlpMetrics) {
    try {
      const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
      const { MeterProvider } = require('@opentelemetry/sdk-metrics');
      
      const prometheusExporter = new PrometheusExporter({
        port: defaultOtelConfig.prometheusPort,
        endpoint: '/metrics',
      });

      // Create a separate meter provider for Prometheus (dual export)
      const meterProvider = new MeterProvider({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: defaultOtelConfig.serviceName,
          [ATTR_SERVICE_VERSION]: defaultOtelConfig.serviceVersion,
        }),
        readers: [prometheusExporter],
      });

      // Register the meter provider globally
      const { metrics } = require('@opentelemetry/api');
      metrics.setGlobalMeterProvider(meterProvider);

      console.log(`📊 Additional Prometheus metrics endpoint: http://localhost:${defaultOtelConfig.prometheusPort}/metrics`);
    } catch (error) {
      console.warn('⚠️  Could not setup additional Prometheus exporter:', (error as Error).message);
    }
  } else if (defaultOtelConfig.enablePrometheusMetrics && !defaultOtelConfig.enableOtlpMetrics) {
    console.log(`� Prometheus metrics configured in NodeSDK: http://localhost:${defaultOtelConfig.prometheusPort}/metrics`);
  } else {
    console.log('📝 Prometheus metrics disabled');
  }

  return sdk;
}

// Export types and utilities
export type { OtelConfig };
