export class UnifiedObservabilityError extends Error {
  public readonly code: string;
  public readonly cause?: Error;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'UnifiedObservabilityError';
    this.code = code;
    this.cause = cause;
    this.timestamp = Date.now();
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, UnifiedObservabilityError.prototype);
  }

  toJSON(): UnifiedObservabilityErrorSerialized {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
}

export interface UnifiedObservabilityErrorSerialized {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly timestamp: number;
  readonly stack?: string;
  readonly cause?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
}

// Error codes
export const UnifiedErrorCodes = {
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  PROVIDER_NOT_INITIALIZED: 'PROVIDER_NOT_INITIALIZED',
  INVALID_METRIC_NAME: 'INVALID_METRIC_NAME',
  INVALID_LABEL_KEY: 'INVALID_LABEL_KEY',
  INVALID_ATTRIBUTE_VALUE: 'INVALID_ATTRIBUTE_VALUE',
  SPAN_ALREADY_ENDED: 'SPAN_ALREADY_ENDED',
  TRACER_NOT_AVAILABLE: 'TRACER_NOT_AVAILABLE',
  LOGGER_NOT_AVAILABLE: 'LOGGER_NOT_AVAILABLE',
  EXPORT_FAILED: 'EXPORT_FAILED',
  SHUTDOWN_FAILED: 'SHUTDOWN_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
} as const;

export type ErrorCode = typeof UnifiedErrorCodes[keyof typeof UnifiedErrorCodes];