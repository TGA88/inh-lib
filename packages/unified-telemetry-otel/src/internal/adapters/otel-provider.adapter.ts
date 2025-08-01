// src/internal/adapters/otel-provider.adapter.ts

/**
 * OpenTelemetry Provider Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetryProvider,  
  UnifiedTelemetryLoggerService,
  UnifiedTelemetryTracer, 
  UnifiedTelemetryMetrics,
  UnifiedBaseTelemetryLogger,
  UnifiedLoggerService,
  ProviderInitOptions
} from '@inh-lib/unified-telemetry-core';

import { NodeSDK } from '@opentelemetry/sdk-node';

import { OtelTracerAdapter } from './otel-tracer.adapter';
import { OtelMetricsAdapter } from './otel-metrics.adapter';
import { createOtelTracer, createOtelMeter } from '../logic/otel.logic';


export class OtelProviderAdapter implements UnifiedTelemetryProvider {
  readonly logger: UnifiedTelemetryLoggerService;
  readonly tracer: UnifiedTelemetryTracer;
  readonly metrics: UnifiedTelemetryMetrics;
  private readonly sdk: NodeSDK;

  constructor(
    options: ProviderInitOptions,
    baseLogger: UnifiedBaseTelemetryLogger,
    sdk: NodeSDK
  ) {
    const {config} = options
    
    // Store SDK reference for shutdown
    this.sdk = sdk;

    // Create OpenTelemetry instances
    const otelTracer = createOtelTracer(config.serviceName);
    const otelMeter = createOtelMeter(config.serviceName);

    // Create adapters
    this.logger = new UnifiedLoggerService(baseLogger);
    this.tracer = new OtelTracerAdapter(otelTracer);
    this.metrics = new OtelMetricsAdapter(otelMeter);
    
  }

  async shutdown(): Promise<void> {
    try {
      console.debug('[OTEL-PROVIDER] Starting shutdown sequence...');
      
      // Shutdown the OpenTelemetry SDK
      // This will properly flush all pending telemetry data (traces, metrics, logs)
      await this.sdk.shutdown();
      
      console.debug('[OTEL-PROVIDER] OpenTelemetry SDK shutdown completed successfully');
    } catch (error) {
      console.error('[OTEL-PROVIDER] Error during SDK shutdown:', error);
      throw error;
    }
  }
}
