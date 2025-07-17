
import {
  ObservabilityError,
  ErrorCodes
} from '../../errors/observability-error';

describe('ObservabilityError', () => {
  describe('constructor', () => {
    it('should create error with required properties', () => {
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.CONFIGURATION_ERROR
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodes.CONFIGURATION_ERROR);
      expect(error.name).toBe('ObservabilityError');
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const causeError = new Error('Cause error');
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.VALIDATION_FAILED,
        causeError
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.cause).toBe(causeError);
    });

    it('should maintain proper prototype chain', () => {
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.EXPORT_FAILED
      );

      expect(error).toBeInstanceOf(ObservabilityError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.PROVIDER_NOT_INITIALIZED
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ObservabilityError');
    });
  });

  describe('toJSON', () => {
    it('should serialize error without cause', () => {
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.TRACER_NOT_AVAILABLE
      );

      const serialized = error.toJSON();

      expect(serialized.name).toBe('ObservabilityError');
      expect(serialized.message).toBe('Test error');
      expect(serialized.code).toBe(ErrorCodes.TRACER_NOT_AVAILABLE);
      expect(serialized.timestamp).toBe(error.timestamp);
      expect(serialized.stack).toBe(error.stack);
      expect(serialized.cause).toBeUndefined();
    });

    it('should serialize error with cause', () => {
      const causeError = new Error('Cause error');
      causeError.stack = 'Cause stack trace';
      
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.LOGGER_NOT_AVAILABLE,
        causeError
      );

      const serialized = error.toJSON();

      expect(serialized.cause).toBeDefined();
      expect(serialized.cause!.name).toBe('Error');
      expect(serialized.cause!.message).toBe('Cause error');
      expect(serialized.cause!.stack).toBe('Cause stack trace');
    });

    it('should handle cause without stack', () => {
      const causeError = new Error('Cause error');
      delete causeError.stack;
      
      const error = new ObservabilityError(
        'Test error',
        ErrorCodes.SHUTDOWN_FAILED,
        causeError
      );

      const serialized = error.toJSON();

      expect(serialized.cause).toBeDefined();
      expect(serialized.cause!.stack).toBeUndefined();
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
      expect(ErrorCodes.PROVIDER_NOT_INITIALIZED).toBe('PROVIDER_NOT_INITIALIZED');
      expect(ErrorCodes.INVALID_METRIC_NAME).toBe('INVALID_METRIC_NAME');
      expect(ErrorCodes.INVALID_LABEL_KEY).toBe('INVALID_LABEL_KEY');
      expect(ErrorCodes.INVALID_ATTRIBUTE_VALUE).toBe('INVALID_ATTRIBUTE_VALUE');
      expect(ErrorCodes.SPAN_ALREADY_ENDED).toBe('SPAN_ALREADY_ENDED');
      expect(ErrorCodes.TRACER_NOT_AVAILABLE).toBe('TRACER_NOT_AVAILABLE');
      expect(ErrorCodes.LOGGER_NOT_AVAILABLE).toBe('LOGGER_NOT_AVAILABLE');
      expect(ErrorCodes.EXPORT_FAILED).toBe('EXPORT_FAILED');
      expect(ErrorCodes.SHUTDOWN_FAILED).toBe('SHUTDOWN_FAILED');
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    });

    it('should have consistent error code format', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(code).toMatch(/^[A-Z_]+$/);
        expect(code).toContain('_');
      });
    });
  });
});
