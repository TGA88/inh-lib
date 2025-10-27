/**
 * @inh-lib/unified-telemetry-middleware
 * 
 * Main exports for unified telemetry middleware
 * Integrates with @inh-lib/unified-route and @inh-lib/unified-telemetry-otel
 */

// Export main service class
export { TelemetryMiddlewareService } from './services/telemetry-middleware.service';

// Export configuration interface
export type { TelemetryMiddlewareConfig } from './services/telemetry-middleware.service';

export * from './services/processor.service';
export * from './services/processorV2.service';

// Export public types
export type {
  TelemetryOperationType,
  TelemetryLayerType,
  TelemetryAttributeValue,
  TelemetryAttributes,
  InitializeTelemetryContextResult,
  UnifiedHttpTelemetryContext
} from './types/telemetry.types';

// Export public constants
export { 
  TELEMETRY_HEADERS,
  TELEMETRY_LAYERS,
  TELEMETRY_OPERATION_TYPES,
  TELEMETRY_SPAN_KINDS,
} from './constants/telemetry-middleware.const';


export * from './types/resource-tracking.types';
export * from './services/resource-tracking.service';
// Note: We deliberately do NOT export:
// - Internal types from ./internal/
// - Internal utilities 
// - Internal constants
// This maintains clean public API and prevents performance issues