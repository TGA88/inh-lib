/**
 * Telemetry configuration interface
 * Defines all configuration options for telemetry providers
 */
export interface UnifiedTelemetryConfig {
  /**
   * Name of the service being instrumented
   */
  serviceName: string;
  
  /**
   * Version of the service being instrumented
   */
  serviceVersion: string;
  
  /**
   * Environment where the service is running
   */
  environment: 'development' | 'staging' | 'production';
  
  /**
   * Optional unique identifier for this service instance
   */
  instanceId?: string;
  
  // Feature flags
  /**
   * Enable or disable logging functionality
   * @default true
   */
  enableLogging?: boolean;
  
  /**
   * Enable or disable tracing functionality
   * @default true
   */
  enableTracing?: boolean;
  
  /**
   * Enable or disable metrics functionality
   * @default true
   */
  enableMetrics?: boolean;
  
  // Logging configuration
  /**
   * Minimum log level to output
   * @default 'info'
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // Tracing configuration
  /**
   * Sampling rate for traces (0.0 to 1.0)
   * @default 1.0
   */
  sampleRate?: number;
  
  // Provider-specific configuration
  /**
   * Provider-specific configuration options
   * Type-safe configuration without using 'any'
   */
  providerConfig?: Record<string, string | number | boolean | Record<string, unknown>>;
}

/**
 * Options for initializing a telemetry provider
 */
export interface ProviderInitOptions {
  /**
   * Telemetry configuration
   */
  config: UnifiedTelemetryConfig;
  
  /**
   * Additional custom attributes to add to all telemetry data
   */
  customAttributes?: Record<string, string | number | boolean>;
}

/**
 * Default configuration values
 */
export const DEFAULT_TELEMETRY_CONFIG: Partial<UnifiedTelemetryConfig> = {
  enableLogging: true,
  enableTracing: true,
  enableMetrics: true,
  logLevel: 'info',
  sampleRate: 1.0,
} as const;