

import {
  ConfigurationError,
  ProviderNotInitializedError,
  ValidationError,
  MetricError,
  TracingError,
  LoggingError,
  ExportError
} from '../../errors/configuration-error';
import { ErrorCodes } from '../../errors/observability-error';

describe('Configuration Error Classes', () => {
  describe('ConfigurationError', () => {
    it('should create configuration error with correct properties', () => {
      const error = new ConfigurationError('Invalid configuration');

      expect(error.message).toBe('Invalid configuration');
      expect(error.code).toBe(ErrorCodes.CONFIGURATION_ERROR);
      expect(error.name).toBe('ConfigurationError');
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create configuration error with cause', () => {
      const cause = new Error('Underlying error');
      const error = new ConfigurationError('Invalid configuration', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('ProviderNotInitializedError', () => {
    it('should create provider not initialized error', () => {
      const error = new ProviderNotInitializedError('MetricProvider');

      expect(error.message).toBe('MetricProvider provider not initialized');
      expect(error.code).toBe(ErrorCodes.PROVIDER_NOT_INITIALIZED);
      expect(error.name).toBe('ProviderNotInitializedError');
      expect(error.providerType).toBe('MetricProvider');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with validation errors', () => {
      const validationErrors = ['Error 1', 'Error 2'];
      const error = new ValidationError(
        'Validation failed',
        validationErrors
      );

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.name).toBe('ValidationError');
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should create copy of validation errors', () => {
      const validationErrors = ['Error 1'];
      const error = new ValidationError(
        'Validation failed',
        validationErrors
      );

      validationErrors.push('Error 2');
      expect(error.validationErrors).toEqual(['Error 1']);
    });

    it('should create validation error with cause', () => {
      const cause = new Error('Validation cause');
      const error = new ValidationError(
        'Validation failed',
        ['Error 1'],
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('MetricError', () => {
    it('should create metric error with metric name', () => {
      const error = new MetricError(
        'Metric creation failed',
        'http_requests_total',
        ErrorCodes.INVALID_METRIC_NAME
      );

      expect(error.message).toBe('Metric creation failed');
      expect(error.code).toBe(ErrorCodes.INVALID_METRIC_NAME);
      expect(error.name).toBe('MetricError');
      expect(error.metricName).toBe('http_requests_total');
    });

    it('should create metric error with cause', () => {
      const cause = new Error('Metric cause');
      const error = new MetricError(
        'Metric error',
        'test_metric',
        ErrorCodes.INVALID_METRIC_NAME,
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('TracingError', () => {
    it('should create tracing error with optional span info', () => {
      const error = new TracingError(
        'Span creation failed',
        ErrorCodes.SPAN_ALREADY_ENDED,
        'test-span',
        'trace-123'
      );

      expect(error.message).toBe('Span creation failed');
      expect(error.code).toBe(ErrorCodes.SPAN_ALREADY_ENDED);
      expect(error.name).toBe('TracingError');
      expect(error.spanName).toBe('test-span');
      expect(error.traceId).toBe('trace-123');
    });

    it('should create tracing error without span info', () => {
      const error = new TracingError(
        'Tracer error',
        ErrorCodes.TRACER_NOT_AVAILABLE
      );

      expect(error.spanName).toBeUndefined();
      expect(error.traceId).toBeUndefined();
    });
  });

  describe('LoggingError', () => {
    it('should create logging error with logger name', () => {
      const error = new LoggingError(
        'Logger creation failed',
        'api-logger',
        ErrorCodes.LOGGER_NOT_AVAILABLE
      );

      expect(error.message).toBe('Logger creation failed');
      expect(error.code).toBe(ErrorCodes.LOGGER_NOT_AVAILABLE);
      expect(error.name).toBe('LoggingError');
      expect(error.loggerName).toBe('api-logger');
    });
  });

  describe('ExportError', () => {
    it('should create export error with exporter info', () => {
      const error = new ExportError(
        'Export failed',
        'PrometheusExporter',
        100
      );

      expect(error.message).toBe('Export failed');
      expect(error.code).toBe(ErrorCodes.EXPORT_FAILED);
      expect(error.name).toBe('ExportError');
      expect(error.exporterType).toBe('PrometheusExporter');
      expect(error.itemsCount).toBe(100);
    });

    it('should create export error with cause', () => {
      const cause = new Error('Network error');
      const error = new ExportError(
        'Export failed',
        'JaegerExporter',
        50,
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });
});
