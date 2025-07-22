import { UnifiedObservabilityError, UnifiedErrorCodes } from './observability-error';

export class UnifiedConfigurationError extends UnifiedObservabilityError {
  constructor(message: string, cause?: Error) {
    super(message, UnifiedErrorCodes.CONFIGURATION_ERROR, cause);
    this.name = 'UnifiedConfigurationError';
    Object.setPrototypeOf(this, UnifiedConfigurationError.prototype);
  }
}

export class UnifiedProviderNotInitializedError extends UnifiedObservabilityError {
  public readonly providerType: string;

  constructor(providerType: string) {
    super(
      `${providerType} provider not initialized`,
      UnifiedErrorCodes.PROVIDER_NOT_INITIALIZED
    );
    this.name = 'UnifiedProviderNotInitializedError';
    this.providerType = providerType;
    Object.setPrototypeOf(this, UnifiedProviderNotInitializedError.prototype);
  }
}

export class UnifiedValidationError extends UnifiedObservabilityError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[], cause?: Error) {
    super(message, UnifiedErrorCodes.VALIDATION_FAILED, cause);
    this.name = 'UnifiedValidationError';
    this.validationErrors = [...validationErrors];
    Object.setPrototypeOf(this, UnifiedValidationError.prototype);
  }
}

export class UnifiedMetricError extends UnifiedObservabilityError {
  public readonly metricName: string;

  constructor(message: string, metricName: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'UnifiedMetricError';
    this.metricName = metricName;
    Object.setPrototypeOf(this, UnifiedMetricError.prototype);
  }
}

export class UnifiedTracingError extends UnifiedObservabilityError {
  public readonly spanName?: string;
  public readonly traceId?: string;

  constructor(message: string, code: string, spanName?: string, traceId?: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'UnifiedTracingError';
    this.spanName = spanName;
    this.traceId = traceId;
    Object.setPrototypeOf(this, UnifiedTracingError.prototype);
  }
}

export class UnifiedLoggingError extends UnifiedObservabilityError {
  public readonly loggerName: string;

  constructor(message: string, loggerName: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'UnifiedLoggingError';
    this.loggerName = loggerName;
    Object.setPrototypeOf(this, UnifiedLoggingError.prototype);
  }
}

export class ExportError extends UnifiedObservabilityError {
  public readonly exporterType: string;
  public readonly itemsCount: number;

  constructor(message: string, exporterType: string, itemsCount: number, cause?: Error) {
    super(message, UnifiedErrorCodes.EXPORT_FAILED, cause);
    this.name = 'ExportError';
    this.exporterType = exporterType;
    this.itemsCount = itemsCount;
    Object.setPrototypeOf(this, ExportError.prototype);
  }
}