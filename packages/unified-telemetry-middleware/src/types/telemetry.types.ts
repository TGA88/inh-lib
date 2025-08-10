/**
 * Public types for telemetry middleware
 * Types that consumer projects can use
 */

/**
 * Valid operation types for telemetry spans
 */
export type TelemetryOperationType = 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth' | 'custom';

/**
 * Valid layer types for telemetry spans
 */
export type TelemetryLayerType = 'http' | 'service' | 'data' | 'core' | 'integration' | 'custom';

/**
 * Type aliases for telemetry configuration
 */
export type TelemetryAttributeValue = string | number | boolean;
export type TelemetryAttributes = Record<string, TelemetryAttributeValue>;
