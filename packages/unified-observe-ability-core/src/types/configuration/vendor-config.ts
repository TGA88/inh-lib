import { 
  MetricsVendorType,
  TracingVendorType, 
  LoggingVendorType,
  AuthType
} from '../../constants/vendor-types';

export interface VendorEndpointConfig {
  readonly url: string;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
  readonly retryConfig?: RetryConfig;
}

export interface RetryConfig {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly exponentialBackoff?: boolean;
}

export interface AuthConfig {
  readonly type: AuthType;
  readonly credentials: AuthCredentials;
}

export interface AuthCredentials {
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
export type { MetricsVendorType, TracingVendorType, LoggingVendorType, AuthType };