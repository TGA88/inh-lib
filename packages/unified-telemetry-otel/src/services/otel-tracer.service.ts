// src/services/otel-tracer.service.ts

import { UnifiedTelemetryTracer } from '@inh-lib/unified-telemetry-core';
import { OtelTracerAdapter } from '../internal/adapters/otel-tracer.adapter';
import { createOtelTracer } from '../internal/logic/otel.logic';

/**
 * OpenTelemetry Tracer Service
 * 
 * Service class for creating OpenTelemetry tracers.
 */
export class OtelTracerService {
  /**
   * Create a tracer with OpenTelemetry integration
   */
  static createTracer(serviceName: string): UnifiedTelemetryTracer {
    const otelTracer = createOtelTracer(serviceName);
    return new OtelTracerAdapter(otelTracer);
  }
}
