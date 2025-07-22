import {
  validateUnifiedCounterOptions,
  validateUnifiedHistogramOptions,
  validateUnifiedGaugeOptions,
  validateUnifiedObservabilityConfig,
  validateUnifiedLoggerOptions,
  validateUnifiedSpanOptions,
  validateUnifiedSpanContext,
  validateTraceState,
  assertValid
} from '../../internal/validation';
import { UnifiedValidationError } from '../../errors/configuration-error';
import { UnifiedLogLevel } from '../../constants/log-level';
import { UnifiedSpanKind } from '../../constants/span-kind';
import { 
  UnifiedObservabilityConfig, 
  UnifiedMetricsConfig, 
  UnifiedTracingConfig, 
  UnifiedLoggingConfig 
} from '../../types/configuration/observability-config';
import { UnifiedSpanContext } from '../../types/tracing/context';

describe('internal/validation', () => {
  describe('validateUnifiedCounterOptions', () => {
    it('should validate correct counter options', () => {
      const options = {
        name: 'http_requests_total',
        description: 'Total HTTP requests',
        unit: 'count',
        labelKeys: ['method', 'status_code']
      };

      const result = validateUnifiedCounterOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid counter options', () => {
      const options = {
        name: '',
        description: '',
        labelKeys: ['123invalid']
      };

      const result = validateUnifiedCounterOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject counter options with invalid name', () => {
      const options = {
        name: '123invalid',
        description: 'Test counter',
        labelKeys: ['method']
      };

      const result = validateUnifiedCounterOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons');
    });

    it('should reject counter options with missing description', () => {
      const options = {
        name: 'valid_counter',
        description: '',
        labelKeys: ['method']
      };

      const result = validateUnifiedCounterOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Counter description is required and must be a string');
    });

    it('should reject counter options with non-string description', () => {
      const options = {
        name: 'valid_counter',
        description: null as unknown as string,
        labelKeys: ['method']
      };

      const result = validateUnifiedCounterOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Counter description is required and must be a string');
    });

    it('should validate counter options without labelKeys', () => {
      const options = {
        name: 'simple_counter',
        description: 'Simple counter without labels'
      };

      const result = validateUnifiedCounterOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUnifiedHistogramOptions', () => {
    it('should validate correct histogram options', () => {
      const options = {
        name: 'request_duration_seconds',
        description: 'Request duration in seconds',
        unit: 'seconds',
        boundaries: [0.1, 0.5, 1.0, 2.0, 5.0],
        labelKeys: ['method', 'route']
      };

      const result = validateUnifiedHistogramOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid histogram options', () => {
      const options = {
        name: 'invalid name',
        description: '',
        boundaries: [1.0, 0.5, 2.0], // Invalid order
        labelKeys: ['__reserved']
      };

      const result = validateUnifiedHistogramOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject histogram options with invalid boundaries', () => {
      const options = {
        name: 'valid_histogram',
        description: 'Valid histogram with invalid boundaries',
        boundaries: [0.5, 0.3, 1.0] // Not sorted
      };

      const result = validateUnifiedHistogramOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries must be in strictly increasing order');
    });

    it('should reject histogram options with non-string description', () => {
      const options = {
        name: 'valid_histogram',
        description: undefined as unknown as string,
        boundaries: [0.1, 0.5, 1.0]
      };

      const result = validateUnifiedHistogramOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram description is required and must be a string');
    });

    it('should validate histogram options without boundaries', () => {
      const options = {
        name: 'simple_histogram',
        description: 'Simple histogram without custom boundaries'
      };

      const result = validateUnifiedHistogramOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUnifiedGaugeOptions', () => {
    it('should validate correct gauge options', () => {
      const options = {
        name: 'memory_usage_bytes',
        description: 'Memory usage in bytes',
        unit: 'bytes',
        labelKeys: ['service', 'instance']
      };

      const result = validateUnifiedGaugeOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid gauge options', () => {
      const options = {
        name: '123invalid',
        description: null as unknown as string,
        labelKeys: ['invalid-key']
      };

      const result = validateUnifiedGaugeOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject gauge options with invalid name', () => {
      const options = {
        name: 'invalid-name',
        description: 'Test gauge'
      };

      const result = validateUnifiedGaugeOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons');
    });

    it('should reject gauge options with missing description', () => {
      const options = {
        name: 'valid_gauge',
        description: ''
      };

      const result = validateUnifiedGaugeOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Gauge description is required and must be a string');
    });

    it('should validate gauge options without labelKeys', () => {
      const options = {
        name: 'simple_gauge',
        description: 'Simple gauge without labels'
      };

      const result = validateUnifiedGaugeOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUnifiedObservabilityConfig', () => {
    it('should validate correct observability config', () => {
      const config: UnifiedObservabilityConfig = {
        serviceName: 'api-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        metrics: {
          enabled: true,
          vendor: 'prometheus'
        } as UnifiedMetricsConfig,
        tracing: {
          enabled: true,
          vendor: 'jaeger'
        } as UnifiedTracingConfig,
        logging: {
          enabled: true,
          vendor: 'winston'
        } as UnifiedLoggingConfig
      };

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid observability config', () => {
      const config = {
        serviceName: '',
        serviceVersion: null as unknown as string,
        environment: undefined as unknown as string,
        metrics: {
          enabled: true,
          vendor: 'prometheus'
        } as UnifiedMetricsConfig,
        tracing: {
          enabled: true,
          vendor: 'jaeger'
        } as UnifiedTracingConfig
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject config with missing service name', () => {
      const config = {
        serviceName: '',
        serviceVersion: '1.0.0',
        environment: 'production'
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service name must be a non-empty string');
    });

    it('should reject config with invalid service name', () => {
      const config = {
        serviceName: '123invalid',
        serviceVersion: '1.0.0',
        environment: 'production'
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens');
    });

    it('should reject config with missing service version', () => {
      const config = {
        serviceName: 'api-service',
        serviceVersion: '',
        environment: 'production'
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service version is required and must be a string');
    });

    it('should reject config with missing environment', () => {
      const config = {
        serviceName: 'api-service',
        serviceVersion: '1.0.0',
        environment: ''
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Environment is required and must be a string');
    });

    it('should reject config with enabled metrics but missing vendor', () => {
      const config = {
        serviceName: 'api-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        metrics: {
          enabled: true
          // Missing vendor
        } as UnifiedMetricsConfig
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('metrics.vendor is required when metrics are enabled');
    });

    it('should reject config with enabled tracing but missing vendor', () => {
      const config = {
        serviceName: 'api-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        tracing: {
          enabled: true
          // Missing vendor
        } as UnifiedTracingConfig
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('tracing.vendor is required when tracing are enabled');
    });

    it('should reject config with enabled logging but missing vendor', () => {
      const config = {
        serviceName: 'api-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        logging: {
          enabled: true
          // Missing vendor
        } as UnifiedLoggingConfig
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('logging.vendor is required when logging are enabled');
    });

    it('should validate config with disabled observability components', () => {
      const config: UnifiedObservabilityConfig = {
        serviceName: 'api-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        metrics: {
          enabled: false,
          vendor: 'prometheus'
        } as UnifiedMetricsConfig,
        tracing: {
          enabled: false,
          vendor: 'jaeger'
        } as UnifiedTracingConfig,
        logging: {
          enabled: false,
          vendor: 'winston'
        } as UnifiedLoggingConfig
      };

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate minimal config', () => {
      const config: UnifiedObservabilityConfig = {
        serviceName: 'minimal-service',
        serviceVersion: '1.0.0',
        environment: 'development'
      };

      const result = validateUnifiedObservabilityConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUnifiedLoggerOptions', () => {
    it('should validate correct logger options', () => {
      const options = {
        name: 'api-logger',
        level: UnifiedLogLevel.INFO,
        format: 'json' as const
      };

      const result = validateUnifiedLoggerOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid logger options', () => {
      const options = {
        name: '',
        level: UnifiedLogLevel.DEBUG
      };

      const result = validateUnifiedLoggerOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Logger name is required and must be a string');
    });

    it('should reject logger options with non-string name', () => {
      const options = {
        name: null as unknown as string,
        level: UnifiedLogLevel.INFO
      };

      const result = validateUnifiedLoggerOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Logger name is required and must be a string');
    });

    it('should reject logger options with undefined name', () => {
      const options = {
        name: undefined as unknown as string,
        level: UnifiedLogLevel.INFO
      };

      const result = validateUnifiedLoggerOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Logger name is required and must be a string');
    });

    it('should validate logger options with minimal config', () => {
      const options = {
        name: 'simple-logger'
      };

      const result = validateUnifiedLoggerOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUnifiedSpanOptions', () => {
    it('should validate correct span options', () => {
      const options = {
        kind: UnifiedSpanKind.SERVER,
        attributes: {
          'http.method': 'GET',
          'http.status_code': 200
        }
      };

      const result = validateUnifiedSpanOptions('test-span', options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid span name', () => {
      const result = validateUnifiedSpanOptions('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span name is required and must be a string');
    });

    it('should reject null span name', () => {
      const result = validateUnifiedSpanOptions(null as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span name is required and must be a string');
    });

    it('should reject undefined span name', () => {
      const result = validateUnifiedSpanOptions(undefined as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span name is required and must be a string');
    });

    it('should reject invalid attributes', () => {
      const options = {
        attributes: {
          'valid': 'value',
          'invalid': {} as unknown as string | number | boolean
        }
      };

      const result = validateUnifiedSpanOptions('test-span', options);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate span options without options parameter', () => {
      const result = validateUnifiedSpanOptions('valid-span');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate span options with valid attributes', () => {
      const options = {
        attributes: {
          'http.method': 'POST',
          'http.status_code': 201,
          'http.success': true,
          'request.duration': 123.45
        }
      };

      const result = validateUnifiedSpanOptions('api-request', options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUnifiedSpanContext', () => {
    it('should validate correct span context', () => {
      const context: UnifiedSpanContext = {
        traceId: '12345678901234567890123456789012',
        spanId: '1234567890123456',
        traceFlags: 1,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid trace ID format', () => {
      const context: UnifiedSpanContext = {
        traceId: 'invalid-trace-id',
        spanId: '1234567890123456',
        traceFlags: 1,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace ID must be 32 hexadecimal characters');
    });

    it('should reject invalid span ID format', () => {
      const context: UnifiedSpanContext = {
        traceId: '12345678901234567890123456789012',
        spanId: 'invalid-span-id',
        traceFlags: 1,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span ID must be 16 hexadecimal characters');
    });

    it('should reject all-zero trace ID', () => {
      const context: UnifiedSpanContext = {
        traceId: '00000000000000000000000000000000',
        spanId: '1234567890123456',
        traceFlags: 1,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace ID cannot be all zeros');
    });

    it('should reject all-zero span ID', () => {
      const context: UnifiedSpanContext = {
        traceId: '12345678901234567890123456789012',
        spanId: '0000000000000000',
        traceFlags: 1,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span ID cannot be all zeros');
    });

    it('should reject invalid trace flags', () => {
      const context: UnifiedSpanContext = {
        traceId: '12345678901234567890123456789012',
        spanId: '1234567890123456',
        traceFlags: 256,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace flags must be between 0 and 255');
    });

    it('should reject negative trace flags', () => {
      const context: UnifiedSpanContext = {
        traceId: '12345678901234567890123456789012',
        spanId: '1234567890123456',
        traceFlags: -1,
        isValid: true
      };

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace flags must be between 0 and 255');
    });

    it('should reject missing trace ID', () => {
      const context = {
        traceId: '',
        spanId: '1234567890123456',
        traceFlags: 1,
        isValid: true
      } as UnifiedSpanContext;

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace ID is required and must be a string');
    });

    it('should reject missing span ID', () => {
      const context = {
        traceId: '12345678901234567890123456789012',
        spanId: '',
        traceFlags: 1,
        isValid: true
      } as UnifiedSpanContext;

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span ID is required and must be a string');
    });

    it('should reject non-string trace ID', () => {
      const context = {
        traceId: 123 as unknown as string,
        spanId: '1234567890123456',
        traceFlags: 1,
        isValid: true
      } as UnifiedSpanContext;

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace ID is required and must be a string');
    });

    it('should reject non-string span ID', () => {
      const context = {
        traceId: '12345678901234567890123456789012',
        spanId: 123 as unknown as string,
        traceFlags: 1,
        isValid: true
      } as UnifiedSpanContext;

      const result = validateUnifiedSpanContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Span ID is required and must be a string');
    });

    it('should validate edge case trace flags', () => {
      const validFlags = [0, 1, 255];
      
      validFlags.forEach(flag => {
        const context: UnifiedSpanContext = {
          traceId: '12345678901234567890123456789012',
          spanId: '1234567890123456',
          traceFlags: flag,
          isValid: true
        };

        const result = validateUnifiedSpanContext(context);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('validateTraceState', () => {
    it('should validate correct trace state', () => {
      const traceState = 'vendor1=value1,vendor2=value2';
      const result = validateTraceState(traceState);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate undefined trace state', () => {
      const result = validateTraceState(undefined);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate empty trace state', () => {
      const result = validateTraceState('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string trace state', () => {
      const result = validateTraceState(123 as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace state must be a string');
    });

    it('should reject trace state that is too long', () => {
      const longTraceState = 'a'.repeat(513);
      const result = validateTraceState(longTraceState);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace state cannot exceed 512 characters');
    });

    it('should reject invalid trace state format', () => {
      const invalidTraceState = 'invalidformat';
      const result = validateTraceState(invalidTraceState);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid trace state entry format: invalidformat');
    });

    it('should reject trace state with invalid key format', () => {
      const invalidTraceState = 'invalid key=value';
      const result = validateTraceState(invalidTraceState);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid characters in trace state key: invalid key');
    });

    it('should reject trace state with key that is too long', () => {
      const longKey = 'a'.repeat(257);
      const invalidTraceState = `${longKey}=value`;
      const result = validateTraceState(invalidTraceState);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Trace state key too long: ${longKey}`);
    });

    it('should reject trace state with value that is too long', () => {
      const longValue = 'a'.repeat(257);
      const invalidTraceState = `key=${longValue}`;
      const result = validateTraceState(invalidTraceState);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trace state value too long for key: key');
    });

    it('should validate single trace state entry', () => {
      const result = validateTraceState('vendor=value');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate multiple trace state entries', () => {
      const result = validateTraceState('vendor1=value1,vendor2=value2,vendor3=value3');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate trace state with special characters in value', () => {
      const result = validateTraceState('vendor=value with spaces and symbols!@#$%^&*()');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate trace state with maximum valid length', () => {
      const maxValidState = 'a'.repeat(256) + '=' + 'b'.repeat(256); // 513 characters total
      const result = validateTraceState(maxValidState);
      expect(result.isValid).toBe(false); // Should be invalid because > 512 chars
      expect(result.errors).toContain('Trace state cannot exceed 512 characters');
    });

    it('should validate trace state with valid length under limit', () => {
      const validState = 'vendor=' + 'a'.repeat(100); // Well under 512 chars
      const result = validateTraceState(validState);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('assertValid', () => {
    it('should not throw for valid validation result', () => {
      const validResult = { isValid: true, errors: [] };
      expect(() => assertValid(validResult, 'test')).not.toThrow();
    });

    it('should throw UnifiedValidationError for invalid validation result', () => {
      const invalidResult = { isValid: false, errors: ['Error 1', 'Error 2'] };
      expect(() => assertValid(invalidResult, 'test')).toThrow(UnifiedValidationError);
    });

    it('should include context in error message', () => {
      const invalidResult = { isValid: false, errors: ['Error 1'] };
      expect(() => assertValid(invalidResult, 'metric options')).toThrow(
        'Validation failed for metric options'
      );
    });

    it('should include all validation errors in thrown error', () => {
      const invalidResult = { isValid: false, errors: ['Error 1', 'Error 2', 'Error 3'] };
      
      try {
        assertValid(invalidResult, 'test context');
        fail('Expected UnifiedValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnifiedValidationError);
        const validationError = error as UnifiedValidationError;
        expect(validationError.validationErrors).toEqual(['Error 1', 'Error 2', 'Error 3']);
        expect(validationError.message).toBe('Validation failed for test context');
      }
    });

    it('should handle empty errors array', () => {
      const invalidResult = { isValid: false, errors: [] };
      
      try {
        assertValid(invalidResult, 'empty errors');
        fail('Expected UnifiedValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnifiedValidationError);
        const validationError = error as UnifiedValidationError;
        expect(validationError.validationErrors).toEqual([]);
      }
    });
  });

  describe('edge cases and integration tests', () => {
    it('should handle complex counter options validation', () => {
      const complexOptions = {
        name: 'complex_counter_with_long_name_but_valid',
        description: 'A complex counter with multiple validation aspects',
        unit: 'requests',
        labelKeys: ['method', 'status_code', 'route', 'user_tier', 'region']
      };

      const result = validateUnifiedCounterOptions(complexOptions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle complex histogram options validation', () => {
      const complexOptions = {
        name: 'request_duration_histogram',
        description: 'Histogram tracking request duration with fine-grained buckets',
        unit: 'seconds',
        boundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
        labelKeys: ['method', 'endpoint', 'status_code', 'user_type', 'region', 'service_version']
      };

      const result = validateUnifiedHistogramOptions(complexOptions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle complex observability config validation', () => {
      const complexConfig: UnifiedObservabilityConfig = {
        serviceName: 'complex-microservice-api',
        serviceVersion: '2.1.0-beta.3',
        environment: 'staging',
        serviceNamespace: 'user-management',
        serviceInstanceId: 'instance-abc123',
        metrics: {
          enabled: true,
          vendor: 'prometheus',
          interval: 15000,
          batchSize: 1000
        } as UnifiedMetricsConfig,
        tracing: {
          enabled: true,
          vendor: 'awsxray',
          sampleRate: 0.1,
          maxSpansPerTrace: 10000
        } as UnifiedTracingConfig,
        logging: {
          enabled: true,
          vendor: 'winston',
          level: UnifiedLogLevel.INFO,
          format: 'json'
        } as UnifiedLoggingConfig
      };

      const result = validateUnifiedObservabilityConfig(complexConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle multiple validation errors correctly', () => {
      const invalidConfig = {
        serviceName: '123invalid-service',
        serviceVersion: '',
        environment: null as unknown as string,
        metrics: {
          enabled: true
          // Missing vendor
        } as UnifiedMetricsConfig,
        tracing: {
          enabled: true
          // Missing vendor
        } as UnifiedTracingConfig
      } as UnifiedObservabilityConfig;

      const result = validateUnifiedObservabilityConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors).toContain('Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens');
      expect(result.errors).toContain('Service version is required and must be a string');
      expect(result.errors).toContain('Environment is required and must be a string');
      expect(result.errors).toContain('metrics.vendor is required when metrics are enabled');
      expect(result.errors).toContain('tracing.vendor is required when tracing are enabled');
    });

    it('should handle span context with all edge cases', () => {
      const edgeCases = [
        {
          name: 'lowercase hex',
          context: {
            traceId: 'abcdef1234567890abcdef1234567890',
            spanId: 'abcdef1234567890',
            traceFlags: 0,
            isValid: true
          } as UnifiedSpanContext,
          shouldBeValid: true
        },
        {
          name: 'uppercase hex',
          context: {
            traceId: 'ABCDEF1234567890ABCDEF1234567890',
            spanId: 'ABCDEF1234567890',
            traceFlags: 255,
            isValid: true
          } as UnifiedSpanContext,
          shouldBeValid: true
        },
        {
          name: 'mixed case hex',
          context: {
            traceId: 'AbCdEf1234567890aBcDeF1234567890',
            spanId: 'AbCdEf1234567890',
            traceFlags: 128,
            isValid: true
          } as UnifiedSpanContext,
          shouldBeValid: true
        }
      ];

      edgeCases.forEach(({  context, shouldBeValid }) => {
        const result = validateUnifiedSpanContext(context);
        expect(result.isValid).toBe(shouldBeValid);
        if (shouldBeValid) {
          expect(result.errors).toEqual([]);
        }
      });
    });

    it('should handle trace state with complex valid scenarios', () => {
      const complexScenarios = [
        'vendor1=simple',
        'vendor_name=complex_value_123',
        'v1=val1,v2=val2',
        'vendor1=value1,vendor2=value2,vendor3=value3',
        'test=value_with_underscores_and_numbers_123',
        'a=b,c=d,e=f,g=h' // Multiple short entries
      ];

      complexScenarios.forEach(traceState => {
        const result = validateTraceState(traceState);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });
});