/**
 * Internal types for telemetry middleware
 * Types used internally within the module
 */

/**
 * Valid operation types for telemetry spans - matches core package
 */
export type TelemetryOperationType = 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth' | 'custom';

/**
 * Valid layer types for telemetry spans - matches core package  
 */
export type TelemetryLayerType = 'http' | 'service' | 'data' | 'core' | 'integration' | 'custom';

/**
 * Type aliases for telemetry configuration
 */
export type TelemetryAttributeValue = string | number | boolean;
export type TelemetryAttributes = Record<string, TelemetryAttributeValue>;
