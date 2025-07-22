

import {
  UnifiedConfigurationError,
  UnifiedProviderNotInitializedError,
  UnifiedValidationError,
  UnifiedMetricError,
  UnifiedTracingError,
  UnifiedLoggingError,
  ExportError
} from '../../errors/configuration-error';
import { UnifiedErrorCodes } from '../../errors/observability-error';

describe('Configuration Error Classes', () => {
  describe('UnifiedConfigurationError', () => {
    it('should create configuration error with correct properties', () => {
      const error = new UnifiedConfigurationError('Invalid configuration');

      expect(error.message).toBe('Invalid configuration');
      expect(error.code).toBe(UnifiedErrorCodes.CONFIGURATION_ERROR);
      expect(error.name).toBe('UnifiedConfigurationError');
      expect(error).toBeInstanceOf(UnifiedConfigurationError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create configuration error with cause', () => {
      const cause = new Error('Underlying error');
      const error = new UnifiedConfigurationError('Invalid configuration', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('UnifiedProviderNotInitializedError', () => {
    it('should create provider not initialized error', () => {
      const error = new UnifiedProviderNotInitializedError('MetricProvider');

      expect(error.message).toBe('MetricProvider provider not initialized');
      expect(error.code).toBe(UnifiedErrorCodes.PROVIDER_NOT_INITIALIZED);
      expect(error.name).toBe('UnifiedProviderNotInitializedError');
      expect(error.providerType).toBe('MetricProvider');
    });
  });

  describe('UnifiedValidationError', () => {
    it('should create validation error with validation errors', () => {
      const validationErrors = ['Error 1', 'Error 2'];
      const error = new UnifiedValidationError(
        'Validation failed',
        validationErrors
      );

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe(UnifiedErrorCodes.VALIDATION_FAILED);
      expect(error.name).toBe('UnifiedValidationError');
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should create copy of validation errors', () => {
      const validationErrors = ['Error 1'];
      const error = new UnifiedValidationError(
        'Validation failed',
        validationErrors
      );

      validationErrors.push('Error 2');
      expect(error.validationErrors).toEqual(['Error 1']);
    });

    it('should create validation error with cause', () => {
      const cause = new Error('Validation cause');
      const error = new UnifiedValidationError(
        'Validation failed',
        ['Error 1'],
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('UnifiedMetricError', () => {
    it('should create metric error with metric name', () => {
      const error = new UnifiedMetricError(
        'Metric creation failed',
        'http_requests_total',
        UnifiedErrorCodes.INVALID_METRIC_NAME
      );

      expect(error.message).toBe('Metric creation failed');
      expect(error.code).toBe(UnifiedErrorCodes.INVALID_METRIC_NAME);
      expect(error.name).toBe('UnifiedMetricError');
      expect(error.metricName).toBe('http_requests_total');
    });

    it('should create metric error with cause', () => {
      const cause = new Error('Metric cause');
      const error = new UnifiedMetricError(
        'Metric error',
        'test_metric',
        UnifiedErrorCodes.INVALID_METRIC_NAME,
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('UnifiedTracingError', () => {
    it('should create tracing error with optional span info', () => {
      const error = new UnifiedTracingError(
        'Span creation failed',
        UnifiedErrorCodes.SPAN_ALREADY_ENDED,
        'test-span',
        'trace-123'
      );

      expect(error.message).toBe('Span creation failed');
      expect(error.code).toBe(UnifiedErrorCodes.SPAN_ALREADY_ENDED);
      expect(error.name).toBe('UnifiedTracingError');
      expect(error.spanName).toBe('test-span');
      expect(error.traceId).toBe('trace-123');
    });

    it('should create tracing error without span info', () => {
      const error = new UnifiedTracingError(
        'Tracer error',
        UnifiedErrorCodes.TRACER_NOT_AVAILABLE
      );

      expect(error.spanName).toBeUndefined();
      expect(error.traceId).toBeUndefined();
    });
  });

  describe('UnifiedLoggingError', () => {
    it('should create logging error with logger name', () => {
      const error = new UnifiedLoggingError(
        'Logger creation failed',
        'api-logger',
        UnifiedErrorCodes.LOGGER_NOT_AVAILABLE
      );

      expect(error.message).toBe('Logger creation failed');
      expect(error.code).toBe(UnifiedErrorCodes.LOGGER_NOT_AVAILABLE);
      expect(error.name).toBe('UnifiedLoggingError');
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
      expect(error.code).toBe(UnifiedErrorCodes.EXPORT_FAILED);
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
