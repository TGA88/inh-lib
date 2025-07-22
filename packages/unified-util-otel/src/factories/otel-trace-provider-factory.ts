
// src/factories/otel-trace-provider-factory.ts

import { Resource } from '@opentelemetry/resources';
import {
  UnifiedTraceProvider,
  ObservabilityConfig
} from '@inh-lib/unified-observe-ability-core';
import { OtelTraceProviderAdapter } from '../adapters/tracing';
import {
  OtelTracingConfig,
  OtelTracingExporterType,
  OtelSpanProcessorType,
  OtelConfigurationMode
} from '../types';
import {
  buildOtelResource,
  buildTracingExporterConfig,
  validateOtelTracingConfig,
  wrapOtelErrorAsync
} from '../utils';

// Dynamic imports for optional dependencies
function tryRequireNodeSDK(): { NodeSDK: any } | null {
  try {
    return require('@opentelemetry/sdk-node');
  } catch {
    return null;
  }
}

function tryRequireAutoInstrumentations(): { getNodeAutoInstrumentations: any } | null {
  try {
    return require('@opentelemetry/auto-instrumentations-node');
  } catch {
    return null;
  }
}

function requireTraceModules(): {
  NodeTracerProvider: any;
  BatchSpanProcessor: any;
  SimpleSpanProcessor: any;
  ConsoleSpanExporter: any;
} {
  try {
    const traceModule = require('@opentelemetry/sdk-trace-node');
    return {
      NodeTracerProvider: traceModule.NodeTracerProvider,
      BatchSpanProcessor: traceModule.BatchSpanProcessor,
      SimpleSpanProcessor: traceModule.SimpleSpanProcessor,
      ConsoleSpanExporter: traceModule.ConsoleSpanExporter
    };
  } catch (error) {
    throw new Error(`Required OpenTelemetry trace modules not available: ${(error as Error).message}`);
  }
}

export class OtelTraceProviderFactory {
  static create(config: ObservabilityConfig): UnifiedTraceProvider {
    return wrapOtelErrorAsync(async () => {
      const tracingConfig = config.tracing as OtelTracingConfig;
      
      if (!tracingConfig) {
        throw new Error('Tracing configuration is required');
      }

      const validation = validateOtelTracingConfig(tracingConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid tracing configuration: ${validation.errors.join(', ')}`);
      }

      const configMode = tracingConfig.configurationMode || OtelConfigurationMode.MANUAL;

      switch (configMode) {
        case OtelConfigurationMode.AUTO:
          return this.createWithAutoConfiguration(config, tracingConfig);
        
        case OtelConfigurationMode.HYBRID:
          return this.createWithHybridConfiguration(config, tracingConfig);
        
        case OtelConfigurationMode.MANUAL:
        default:
          return this.createWithManualConfiguration(config, tracingConfig);
      }
    }, 'trace-factory', 'create')();
  }

  private static createWithAutoConfiguration(
    config: ObservabilityConfig,
    tracingConfig: OtelTracingConfig
  ): UnifiedTraceProvider {
    const nodeSDK = tryRequireNodeSDK();
    const autoInstrumentations = tryRequireAutoInstrumentations();

    if (!nodeSDK) {
      console.warn('NodeSDK not available, falling back to manual configuration. Install @opentelemetry/sdk-node for auto configuration.');
      return this.createWithManualConfiguration(config, tracingConfig);
    }

    const { NodeSDK } = nodeSDK;
    const resource = buildOtelResource({
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      environment: config.environment,
      serviceNamespace: config.serviceNamespace,
      serviceInstanceId: config.serviceInstanceId
    });

    const sdkConfig: any = {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      resource,
      traceExporter: this.createAutoExporter(tracingConfig),
      samplingRatio: tracingConfig.sampleRate || 1.0
    };

    // Add auto instrumentations if available
    if (autoInstrumentations) {
      const { getNodeAutoInstrumentations } = autoInstrumentations;
      sdkConfig.instrumentations = [getNodeAutoInstrumentations({
        // Disable some instrumentations if needed
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        }
      })];
    }

    const sdk = new NodeSDK(sdkConfig);
    sdk.start();

    // Get the auto-configured tracer provider
    const tracerProvider = sdk.getTracerProvider();
    return new OtelTraceProviderAdapter(tracerProvider as any, config.serviceName);
  }

  private static createWithHybridConfiguration(
    config: ObservabilityConfig,
    tracingConfig: OtelTracingConfig
  ): UnifiedTraceProvider {
    // Try auto first, fallback to manual
    const nodeSDK = tryRequireNodeSDK();
    
    if (nodeSDK) {
      console.log('Using auto configuration with manual overrides');
      return this.createWithAutoConfiguration(config, tracingConfig);
    } else {
      console.log('Auto configuration not available, using manual configuration');
      return this.createWithManualConfiguration(config, tracingConfig);
    }
  }

  private static createWithManualConfiguration(
    config: ObservabilityConfig,
    tracingConfig: OtelTracingConfig
  ): UnifiedTraceProvider {
    const { NodeTracerProvider, BatchSpanProcessor, SimpleSpanProcessor, ConsoleSpanExporter } = requireTraceModules();

    const resource = buildOtelResource({
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      environment: config.environment,
      serviceNamespace: config.serviceNamespace,
      serviceInstanceId: config.serviceInstanceId
    });

    const spanProcessors = this.createSpanProcessors(tracingConfig, {
      BatchSpanProcessor,
      SimpleSpanProcessor,
      ConsoleSpanExporter
    });

    const tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors,
      sampler: this.createSampler(tracingConfig)
    });

    tracerProvider.register();
    return new OtelTraceProviderAdapter(tracerProvider, config.serviceName);
  }

  private static createAutoExporter(config: OtelTracingConfig): unknown {
    const exporterType = config.exporterType || 'console';
    
    switch (exporterType) {
      case 'jaeger':
        try {
          const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
          return new JaegerExporter(buildTracingExporterConfig('jaeger', config.endpoint, config.headers));
        } catch {
          console.warn('JaegerExporter not available, using console exporter');
          return new (requireTraceModules().ConsoleSpanExporter)();
        }
      
      case 'otlp-http':
        try {
          const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
          return new OTLPTraceExporter(buildTracingExporterConfig('otlp-http', config.endpoint, config.headers));
        } catch {
          console.warn('OTLPTraceExporter not available, using console exporter');
          return new (requireTraceModules().ConsoleSpanExporter)();
        }
      
      case 'console':
      default:
        return new (requireTraceModules().ConsoleSpanExporter)();
    }
  }

  private static createSpanProcessors(
    config: OtelTracingConfig,
    modules: {
      BatchSpanProcessor: any;
      SimpleSpanProcessor: any;
      ConsoleSpanExporter: any;
    }
  ): unknown[] {
    const processors: unknown[] = [];
    const exporterType = config.exporterType || 'console';
    const processorType = config.processorType || 'batch';

    let exporter;
    
    switch (exporterType) {
      case 'jaeger':
        try {
          const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
          exporter = new JaegerExporter(buildTracingExporterConfig('jaeger', config.endpoint, config.headers));
        } catch {
          console.warn('JaegerExporter not available, using console exporter');
          exporter = new modules.ConsoleSpanExporter();
        }
        break;
      
      case 'otlp-http':
        try {
          const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
          exporter = new OTLPTraceExporter(buildTracingExporterConfig('otlp-http', config.endpoint, config.headers));
        } catch {
          console.warn('OTLPTraceExporter not available, using console exporter');
          exporter = new modules.ConsoleSpanExporter();
        }
        break;
      
      case 'console':
      default:
        exporter = new modules.ConsoleSpanExporter();
    }

    const processor = processorType === 'simple' 
      ? new modules.SimpleSpanProcessor(exporter)
      : new modules.BatchSpanProcessor(exporter, {
          maxExportBatchSize: 512,
          maxQueueSize: 2048,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: config.timeout || 30000
        });

    processors.push(processor);
    return processors;
  }

  private static createSampler(config: OtelTracingConfig): unknown {
    // Create appropriate sampler based on configuration
    if (config.sampleRate !== undefined) {
      try {
        const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');
        return new TraceIdRatioBasedSampler(config.sampleRate);
      } catch {
        console.warn('TraceIdRatioBasedSampler not available, using default sampling');
      }
    }
    return undefined;
  }
}
