// src/services/otel-metrics.service.ts

import { UnifiedTelemetryMetrics } from '@inh-lib/unified-telemetry-core';
import { OtelMetricsAdapter } from '../internal/adapters/otel-metrics.adapter';
import { createOtelMeter } from '../internal/logic/otel.logic';

/**
 * OpenTelemetry Metrics Service
 * 
 * Service class for creating OpenTelemetry metrics.
 */
export class OtelMetricsService {
  /**
   * Create metrics with OpenTelemetry integration
   */
  static createMetrics(serviceName: string): UnifiedTelemetryMetrics {
    const otelMeter = createOtelMeter(serviceName);
    return new OtelMetricsAdapter(otelMeter);
  }
}