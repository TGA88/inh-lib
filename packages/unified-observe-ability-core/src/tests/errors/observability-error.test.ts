
import {
  UnifiedObservabilityError,
  UnifiedErrorCodes
} from '../../errors/observability-error';

describe('UnifiedObservabilityError', () => {
  describe('constructor', () => {
    it('should create error with required properties', () => {
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.CONFIGURATION_ERROR
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(UnifiedErrorCodes.CONFIGURATION_ERROR);
      expect(error.name).toBe('UnifiedObservabilityError');
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const causeError = new Error('Cause error');
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.VALIDATION_FAILED,
        causeError
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(UnifiedErrorCodes.VALIDATION_FAILED);
      expect(error.cause).toBe(causeError);
    });

    it('should maintain proper prototype chain', () => {
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.EXPORT_FAILED
      );

      expect(error).toBeInstanceOf(UnifiedObservabilityError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.PROVIDER_NOT_INITIALIZED
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('UnifiedObservabilityError');
    });
  });

  describe('toJSON', () => {
    it('should serialize error without cause', () => {
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.TRACER_NOT_AVAILABLE
      );

      const serialized = error.toJSON();

      expect(serialized.name).toBe('UnifiedObservabilityError');
      expect(serialized.message).toBe('Test error');
      expect(serialized.code).toBe(UnifiedErrorCodes.TRACER_NOT_AVAILABLE);
      expect(serialized.timestamp).toBe(error.timestamp);
      expect(serialized.stack).toBe(error.stack);
      expect(serialized.cause).toBeUndefined();
    });

    it('should serialize error with cause', () => {
      const causeError = new Error('Cause error');
      causeError.stack = 'Cause stack trace';
      
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.LOGGER_NOT_AVAILABLE,
        causeError
      );

      const serialized = error.toJSON();

      expect(serialized.cause).toBeDefined();
      expect(serialized.cause?.name).toBe('Error');
      expect(serialized.cause?.message).toBe('Cause error');
      expect(serialized.cause?.stack).toBe('Cause stack trace');
    });

    it('should handle cause without stack', () => {
      const causeError = new Error('Cause error');
      delete causeError.stack;
      
      const error = new UnifiedObservabilityError(
        'Test error',
        UnifiedErrorCodes.SHUTDOWN_FAILED,
        causeError
      );

      const serialized = error.toJSON();

      expect(serialized.cause).toBeDefined();
      expect(serialized.cause?.stack).toBeUndefined();
    });
  });

  describe('UnifiedErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(UnifiedErrorCodes.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
      expect(UnifiedErrorCodes.PROVIDER_NOT_INITIALIZED).toBe('PROVIDER_NOT_INITIALIZED');
      expect(UnifiedErrorCodes.INVALID_METRIC_NAME).toBe('INVALID_METRIC_NAME');
      expect(UnifiedErrorCodes.INVALID_LABEL_KEY).toBe('INVALID_LABEL_KEY');
      expect(UnifiedErrorCodes.INVALID_ATTRIBUTE_VALUE).toBe('INVALID_ATTRIBUTE_VALUE');
      expect(UnifiedErrorCodes.SPAN_ALREADY_ENDED).toBe('SPAN_ALREADY_ENDED');
      expect(UnifiedErrorCodes.TRACER_NOT_AVAILABLE).toBe('TRACER_NOT_AVAILABLE');
      expect(UnifiedErrorCodes.LOGGER_NOT_AVAILABLE).toBe('LOGGER_NOT_AVAILABLE');
      expect(UnifiedErrorCodes.EXPORT_FAILED).toBe('EXPORT_FAILED');
      expect(UnifiedErrorCodes.SHUTDOWN_FAILED).toBe('SHUTDOWN_FAILED');
      expect(UnifiedErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    });

    it('should have consistent error code format', () => {
      Object.values(UnifiedErrorCodes).forEach(code => {
        expect(code).toMatch(/^[A-Z_]+$/);
        expect(code).toContain('_');
      });
    });
  });
});
