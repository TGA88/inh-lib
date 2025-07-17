import { ObservabilityError, ErrorCodes } from './observability-error';

export class ConfigurationError extends ObservabilityError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCodes.CONFIGURATION_ERROR, cause);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ProviderNotInitializedError extends ObservabilityError {
  public readonly providerType: string;

  constructor(providerType: string) {
    super(
      `${providerType} provider not initialized`,
      ErrorCodes.PROVIDER_NOT_INITIALIZED
    );
    this.name = 'ProviderNotInitializedError';
    this.providerType = providerType;
    Object.setPrototypeOf(this, ProviderNotInitializedError.prototype);
  }
}

export class ValidationError extends ObservabilityError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[], cause?: Error) {
    super(message, ErrorCodes.VALIDATION_FAILED, cause);
    this.name = 'ValidationError';
    this.validationErrors = [...validationErrors];
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class MetricError extends ObservabilityError {
  public readonly metricName: string;

  constructor(message: string, metricName: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'MetricError';
    this.metricName = metricName;
    Object.setPrototypeOf(this, MetricError.prototype);
  }
}

export class TracingError extends ObservabilityError {
  public readonly spanName?: string;
  public readonly traceId?: string;

  constructor(message: string, code: string, spanName?: string, traceId?: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'TracingError';
    this.spanName = spanName;
    this.traceId = traceId;
    Object.setPrototypeOf(this, TracingError.prototype);
  }
}

export class LoggingError extends ObservabilityError {
  public readonly loggerName: string;

  constructor(message: string, loggerName: string, code: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'LoggingError';
    this.loggerName = loggerName;
    Object.setPrototypeOf(this, LoggingError.prototype);
  }
}

export class ExportError extends ObservabilityError {
  public readonly exporterType: string;
  public readonly itemsCount: number;

  constructor(message: string, exporterType: string, itemsCount: number, cause?: Error) {
    super(message, ErrorCodes.EXPORT_FAILED, cause);
    this.name = 'ExportError';
    this.exporterType = exporterType;
    this.itemsCount = itemsCount;
    Object.setPrototypeOf(this, ExportError.prototype);
  }
}