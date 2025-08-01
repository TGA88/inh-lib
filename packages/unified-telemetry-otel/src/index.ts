// src/index.ts

/**
 * OpenTelemetry Adapter for Unified Telemetry Core
 * 
 * This package provides OpenTelemetry implementations for the unified telemetry interfaces.
 * Only service classes are exported - no types or internal implementation details.
 */

// Service exports only - no types for performance
export { OtelProviderService } from './services/otel-provider.service';

export { OtelTracerService } from './services/otel-tracer.service';
export { OtelMetricsService } from './services/otel-metrics.service';