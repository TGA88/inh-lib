/**
 * @inh-lib/unified-telemetry-core
 * 
 * Core telemetry abstractions - framework and layer agnostic
 * 
 * This package provides:
 * - Pure telemetry interfaces
 * - Basic implementations (Console, NoOp)
 * - Utility functions for common operations
 * 
 * ✅ No HTTP dependencies
 * ✅ No framework dependencies  
 * ✅ No 'any' types
 * ✅ No enums (uses union types + constants)
 * ✅ Utils are internal only (not exported)
 */

// ✅ Interfaces - Public API
export * from './interfaces';

// ✅ Implementations - Public API
export * from './implementations';

export * from './services/unified-logger.service';

// ❌ Utils - NOT exported (internal use only)
// These are used internally by implementations but not exposed as public API
// export * from './utils';

// ✅ Re-export key interfaces for convenience
export type {
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger,
  UnifiedTelemetryLoggerService,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetryConfig,
  UnifiedLoggerContext,
  UnifiedTelemetrySpan,
  UnifiedSpanOptions,
  UnifiedTelemetryCounter,
  UnifiedTelemetryHistogram,
  UnifiedTelemetryGauge
} from './interfaces';

// ✅ Export constants for span kinds and status codes (replacement for enums)
export { 
  UNIFIED_SPAN_KIND,
  UNIFIED_SPAN_STATUS_CODE,
  DEFAULT_TELEMETRY_CONFIG
} from './interfaces';