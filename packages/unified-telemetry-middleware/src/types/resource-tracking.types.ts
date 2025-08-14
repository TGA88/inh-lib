import {InternalResourceMeasurement}  from "../internal/types/middleware.types";

// UnifiedResourceMeasurement is equivalent to InternalResourceMeasurement, so use a type alias
export type UnifiedResourceMeasurement = InternalResourceMeasurement;

export type UnifiedStopResourceMeasurementResult = { memoryUsageBytes: number;
  cpuTimeSeconds: number;
  durationMs: number;
  endMeasurement: UnifiedResourceMeasurement;
}