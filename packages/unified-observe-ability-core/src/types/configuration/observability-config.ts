import { UnifiedLogLevel, UnifiedLogFormat, UnifiedLogTransportType, UnifiedResourceDetectorType } from '../../constants';
import { 
  UnifiedMetricsVendorType, 
  UnifiedTracingVendorType, 
  UnifiedLoggingVendorType,
  UnifiedVendorEndpointConfig,
  UnifiedAuthConfig 
} from './vendor-config';

export interface UnifiedObservabilityConfig {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly serviceNamespace?: string;
  readonly serviceInstanceId?: string;
  
  readonly metrics?: UnifiedMetricsConfig;
  readonly tracing?: UnifiedTracingConfig;
  readonly logging?: UnifiedLoggingConfig;
  readonly instrumentation?: UnifiedInstrumentationConfig;
  readonly resource?: UnifiedResourceConfig;
}

export interface UnifiedMetricsConfig {
  readonly enabled: boolean;
  readonly vendor: UnifiedMetricsVendorType;
  readonly endpoint?: UnifiedVendorEndpointConfig;
  readonly interval?: number;
  readonly batchSize?: number;
  readonly auth?: UnifiedAuthConfig;
  readonly customRegistry?: unknown;
  readonly exporterConfig?: UnifiedMetricsExporterConfig;
}

export interface UnifiedMetricsExporterConfig {
  readonly prefix?: string;
  readonly includeTimestamp?: boolean;
  readonly includeMetadata?: boolean;
  readonly compressionEnabled?: boolean;
}

export interface UnifiedTracingConfig {
  readonly enabled: boolean;
  readonly vendor: UnifiedTracingVendorType;
  readonly endpoint?: UnifiedVendorEndpointConfig;
  readonly sampleRate?: number;
  readonly maxSpansPerTrace?: number;
  readonly auth?: UnifiedAuthConfig;
  readonly exporterConfig?: UnifiedTracingExporterConfig;
}

export interface UnifiedTracingExporterConfig {
  readonly batchSize?: number;
  readonly batchTimeout?: number;
  readonly compressionEnabled?: boolean;
  readonly includeResourceAttributes?: boolean;
}

export interface UnifiedLoggingConfig {
  readonly enabled: boolean;
  readonly vendor: UnifiedLoggingVendorType;
  readonly level?: UnifiedLogLevel;
  readonly endpoint?: UnifiedVendorEndpointConfig;
  readonly format?: UnifiedLogFormat;
  readonly auth?: UnifiedAuthConfig;
  readonly transports?: UnifiedLogTransportConfig[];
  readonly exporterConfig?: UnifiedLoggingExporterConfig;
}

export interface UnifiedLoggingExporterConfig {
  readonly batchSize?: number;
  readonly batchTimeout?: number;
  readonly includeTimestamp?: boolean;
  readonly includeTraceContext?: boolean;
  readonly compressionEnabled?: boolean;
}

export interface UnifiedLogTransportConfig {
  readonly type: UnifiedLogTransportType;
  readonly options?: Record<string, unknown>;
  readonly level?: UnifiedLogLevel;
  readonly format?: UnifiedLogFormat;
}

export interface UnifiedInstrumentationConfig {
  readonly http?: HttpUnifiedInstrumentationConfig;
  readonly database?: DatabaseUnifiedInstrumentationConfig;
  readonly custom?: CustomUnifiedInstrumentationConfig;
}

export interface HttpUnifiedInstrumentationConfig {
  readonly enabled: boolean;
  readonly collectRequestBody?: boolean;
  readonly collectResponseBody?: boolean;
  readonly collectHeaders?: boolean;
  readonly memoryThreshold?: number;
  readonly cpuThreshold?: number;
  readonly ignorePaths?: string[];
  readonly ignoreUserAgents?: string[];
}

export interface DatabaseUnifiedInstrumentationConfig {
  readonly enabled: boolean;
  readonly collectQueries?: boolean;
  readonly slowQueryThreshold?: number;
  readonly includeQueryParameters?: boolean;
  readonly maxQueryLength?: number;
}

export interface CustomUnifiedInstrumentationConfig {
  readonly enabled: boolean;
  readonly modules?: string[];
  readonly plugins?: UnifiedInstrumentationPlugin[];
}

export interface UnifiedInstrumentationPlugin {
  readonly name: string;
  readonly enabled: boolean;
  readonly config?: Record<string, unknown>;
}

export interface UnifiedResourceConfig {
  readonly attributes?: Record<string, string>;
  readonly detectors?: UnifiedResourceDetectorConfig[];
}

export interface UnifiedResourceDetectorConfig {
  readonly type: UnifiedResourceDetectorType;
  readonly enabled: boolean;
  readonly timeout?: number;
}

export interface UnifiedMixedVendorConfig extends UnifiedObservabilityConfig {
  readonly metrics: UnifiedMetricsConfig & { vendor: 'prometheus' };
  readonly tracing: UnifiedTracingConfig & { vendor: 'awsxray' };
  readonly logging: UnifiedLoggingConfig & { vendor: 'winston' };
}