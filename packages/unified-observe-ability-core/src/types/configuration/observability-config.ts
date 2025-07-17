import { LogLevel, LogFormat, LogTransportType, ResourceDetectorType } from '../../constants';
import { 
  MetricsVendorType, 
  TracingVendorType, 
  LoggingVendorType,
  VendorEndpointConfig,
  AuthConfig 
} from './vendor-config';

export interface ObservabilityConfig {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly serviceNamespace?: string;
  readonly serviceInstanceId?: string;
  
  readonly metrics?: MetricsConfig;
  readonly tracing?: TracingConfig;
  readonly logging?: LoggingConfig;
  readonly instrumentation?: InstrumentationConfig;
  readonly resource?: ResourceConfig;
}

export interface MetricsConfig {
  readonly enabled: boolean;
  readonly vendor: MetricsVendorType;
  readonly endpoint?: VendorEndpointConfig;
  readonly interval?: number;
  readonly batchSize?: number;
  readonly auth?: AuthConfig;
  readonly customRegistry?: unknown;
  readonly exporterConfig?: MetricsExporterConfig;
}

export interface MetricsExporterConfig {
  readonly prefix?: string;
  readonly includeTimestamp?: boolean;
  readonly includeMetadata?: boolean;
  readonly compressionEnabled?: boolean;
}

export interface TracingConfig {
  readonly enabled: boolean;
  readonly vendor: TracingVendorType;
  readonly endpoint?: VendorEndpointConfig;
  readonly sampleRate?: number;
  readonly maxSpansPerTrace?: number;
  readonly auth?: AuthConfig;
  readonly exporterConfig?: TracingExporterConfig;
}

export interface TracingExporterConfig {
  readonly batchSize?: number;
  readonly batchTimeout?: number;
  readonly compressionEnabled?: boolean;
  readonly includeResourceAttributes?: boolean;
}

export interface LoggingConfig {
  readonly enabled: boolean;
  readonly vendor: LoggingVendorType;
  readonly level?: LogLevel;
  readonly endpoint?: VendorEndpointConfig;
  readonly format?: LogFormat;
  readonly auth?: AuthConfig;
  readonly transports?: LogTransportConfig[];
  readonly exporterConfig?: LoggingExporterConfig;
}

export interface LoggingExporterConfig {
  readonly batchSize?: number;
  readonly batchTimeout?: number;
  readonly includeTimestamp?: boolean;
  readonly includeTraceContext?: boolean;
  readonly compressionEnabled?: boolean;
}

export interface LogTransportConfig {
  readonly type: LogTransportType;
  readonly options?: Record<string, unknown>;
  readonly level?: LogLevel;
  readonly format?: LogFormat;
}

export interface InstrumentationConfig {
  readonly http?: HttpInstrumentationConfig;
  readonly database?: DatabaseInstrumentationConfig;
  readonly custom?: CustomInstrumentationConfig;
}

export interface HttpInstrumentationConfig {
  readonly enabled: boolean;
  readonly collectRequestBody?: boolean;
  readonly collectResponseBody?: boolean;
  readonly collectHeaders?: boolean;
  readonly memoryThreshold?: number;
  readonly cpuThreshold?: number;
  readonly ignorePaths?: string[];
  readonly ignoreUserAgents?: string[];
}

export interface DatabaseInstrumentationConfig {
  readonly enabled: boolean;
  readonly collectQueries?: boolean;
  readonly slowQueryThreshold?: number;
  readonly includeQueryParameters?: boolean;
  readonly maxQueryLength?: number;
}

export interface CustomInstrumentationConfig {
  readonly enabled: boolean;
  readonly modules?: string[];
  readonly plugins?: InstrumentationPlugin[];
}

export interface InstrumentationPlugin {
  readonly name: string;
  readonly enabled: boolean;
  readonly config?: Record<string, unknown>;
}

export interface ResourceConfig {
  readonly attributes?: Record<string, string>;
  readonly detectors?: ResourceDetectorConfig[];
}

export interface ResourceDetectorConfig {
  readonly type: ResourceDetectorType;
  readonly enabled: boolean;
  readonly timeout?: number;
}

export interface MixedVendorConfig extends ObservabilityConfig {
  readonly metrics: MetricsConfig & { vendor: 'prometheus' };
  readonly tracing: TracingConfig & { vendor: 'awsxray' };
  readonly logging: LoggingConfig & { vendor: 'winston' };
}