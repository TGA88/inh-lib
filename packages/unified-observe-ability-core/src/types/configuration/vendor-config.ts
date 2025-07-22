import { 
  UnifiedMetricsVendorType,
  UnifiedTracingVendorType, 
  UnifiedLoggingVendorType,
  UnifiedAuthType
} from '../../constants/vendor-types';

export interface UnifiedVendorEndpointConfig {
  readonly url: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
  readonly retryConfig?: UnifiedRetryConfig;
}

export interface UnifiedRetryConfig {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly exponentialBackoff?: boolean;
}

export interface UnifiedAuthConfig {
  readonly type: UnifiedAuthType;
  readonly credentials: UnifiedAuthCredentials;
}

export interface UnifiedAuthCredentials {
  readonly apiKey?: string;
  readonly bearerToken?: string;
  readonly username?: string;
  readonly password?: string;
  readonly awsAccessKeyId?: string;
  readonly awsSecretAccessKey?: string;
  readonly awsRegion?: string;
  readonly oauthClientId?: string;
  readonly oauthClientSecret?: string;
  readonly oauthTokenUrl?: string;
}

// Re-export types for convenience
export type { UnifiedMetricsVendorType, UnifiedTracingVendorType, UnifiedLoggingVendorType, UnifiedAuthType };