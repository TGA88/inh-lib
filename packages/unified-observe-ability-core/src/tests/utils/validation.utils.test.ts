import {
  validateMetricName,
  validateLabelKeys,
  validateLabels,
  validateAttributes,
  validateHistogramBoundaries,
  validateServiceName,
  createUnifiedValidationResult
} from '../../utils/validation.utils';

describe('validation.utils', () => {
  describe('createUnifiedValidationResult', () => {
    it('should create valid result with no errors', () => {
      const result = createUnifiedValidationResult(true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should create invalid result with errors', () => {
      const errors = ['error1', 'error2'];
      const result = createUnifiedValidationResult(false, errors);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it('should create a copy of errors array', () => {
      const errors = ['error1'];
      const result = createUnifiedValidationResult(false, errors);
      errors.push('error2');
      expect(result.errors).toEqual(['error1']);
    });
  });

  describe('validateMetricName', () => {
    it('should validate correct metric names', () => {
      const validNames = [
        'http_requests_total',
        'memory_usage_bytes',
        'cpu_usage_percent',
        'db:query_duration_seconds',
        '_internal_metric',
        'a',
        'metric_123'
      ];

      validNames.forEach(name => {
        const result = validateMetricName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should reject invalid metric names', () => {
      const invalidCases = [
        { name: '', expectedError: 'Metric name must be a non-empty string' },
        { name: null as unknown as string, expectedError: 'Metric name must be a non-empty string' },
        { name: undefined as unknown as string, expectedError: 'Metric name must be a non-empty string' },
        { name: 123 as unknown as string, expectedError: 'Metric name must be a non-empty string' },
        { name: '123_invalid', expectedError: 'Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons' },
        { name: 'invalid-metric', expectedError: 'Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons' },
        { name: 'invalid metric', expectedError: 'Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons' },
        { name: 'metric@invalid', expectedError: 'Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons' }
      ];

      invalidCases.forEach(({ name, expectedError }) => {
        const result = validateMetricName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });

    it('should reject metric names that are too long', () => {
      const longName = 'a'.repeat(256);
      const result = validateMetricName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Metric name cannot exceed 255 characters');
    });
  });

  describe('validateLabelKeys', () => {
    it('should validate correct label keys', () => {
      const validKeys = [
        'method',
        'status_code',
        'route',
        '_internal',
        'a',
        'key123'
      ];

      const result = validateLabelKeys(validKeys);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid label keys', () => {
      const invalidCases = [
        { keys: [''], expectedError: 'Label keys must be non-empty strings' },
        { keys: ['123invalid'], expectedError: 'Label key "123invalid" must start with letter or underscore and contain only alphanumeric characters and underscores' },
        { keys: ['invalid-key'], expectedError: 'Label key "invalid-key" must start with letter or underscore and contain only alphanumeric characters and underscores' },
        { keys: ['__reserved'], expectedError: 'Label key "__reserved" cannot start with double underscore (reserved prefix)' },
        { keys: ['invalid key'], expectedError: 'Label key "invalid key" must start with letter or underscore and contain only alphanumeric characters and underscores' }
      ];

      invalidCases.forEach(({ keys, expectedError }) => {
        const result = validateLabelKeys(keys);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });

    it('should handle mixed valid and invalid keys', () => {
      const keys = ['valid_key', '123invalid', 'another_valid', '__reserved'];
      const result = validateLabelKeys(keys);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should reject non-string keys', () => {
      const keys = [null as unknown as string, undefined as unknown as string, 123 as unknown as string];
      const result = validateLabelKeys(keys);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Label keys must be non-empty strings');
    });
  });

  describe('validateLabels', () => {
    it('should validate correct labels', () => {
      const validLabels = {
        method: 'GET',
        status_code: '200',
        route: '/api/users',
        user_id: '123'
      };

      const result = validateLabels(validLabels);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-string label values', () => {
      const invalidLabels = {
        method: 'GET',
        status_code: 200 as unknown as string,
        route: '/api/users',
        flag: true as unknown as string
      };

      const result = validateLabels(invalidLabels);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Label value for key "status_code" must be a string');
      expect(result.errors).toContain('Label value for key "flag" must be a string');
    });

    it('should reject invalid label keys', () => {
      const invalidLabels = {
        'valid_key': 'value',
        '123invalid': 'value',
        '__reserved': 'value'
      };

      const result = validateLabels(invalidLabels);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty labels object', () => {
      const result = validateLabels({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateAttributes', () => {
    it('should validate correct attributes', () => {
      const validAttributes = {
        'http.method': 'GET',
        'http.status_code': 200,
        'http.success': true,
        'request.duration': 123.45
      };

      const result = validateAttributes(validAttributes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid attribute values', () => {
      const invalidAttributes = {
        'valid_key': 'string_value',
        'object_key': { nested: 'object' } as unknown as string | number | boolean,
        'array_key': ['array', 'value'] as unknown as string | number | boolean,
        'null_key': null as unknown as string | number | boolean,
        'undefined_key': undefined as unknown as string | number | boolean
      };

      const result = validateAttributes(invalidAttributes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Attribute value for key "object_key" must be string, number, or boolean');
      expect(result.errors).toContain('Attribute value for key "array_key" must be string, number, or boolean');
      expect(result.errors).toContain('Attribute value for key "null_key" must be string, number, or boolean');
      expect(result.errors).toContain('Attribute value for key "undefined_key" must be string, number, or boolean');
    });

    it('should reject empty attribute keys', () => {
      const invalidAttributes = {
        '': 'value',
        'valid_key': 'value'
      };

      const result = validateAttributes(invalidAttributes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Attribute keys must be non-empty strings');
    });

    it('should reject non-string attribute keys', () => {
      // Test with empty string key (which is invalid)
      const invalidAttributes = {
        '': 'value',
        'valid_key': 'value'
      };

      const result = validateAttributes(invalidAttributes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Attribute keys must be non-empty strings');
    });

    it('should handle empty attributes object', () => {
      const result = validateAttributes({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateHistogramBoundaries', () => {
    it('should validate correct histogram boundaries', () => {
      const validBoundaries = [0.1, 0.5, 1.0, 2.5, 5.0, 10.0];
      const result = validateHistogramBoundaries(validBoundaries);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty boundaries', () => {
      const result = validateHistogramBoundaries([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries cannot be empty');
    });

    it('should reject non-numeric boundaries', () => {
      const invalidBoundaries = [0.1, 'invalid' as unknown as number, 1.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All histogram boundaries must be finite numbers');
    });

    it('should reject infinite boundaries', () => {
      const invalidBoundaries = [0.1, Infinity, 1.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All histogram boundaries must be finite numbers');
    });

    it('should reject NaN boundaries', () => {
      const invalidBoundaries = [0.1, NaN, 1.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All histogram boundaries must be finite numbers');
    });

    it('should reject non-sorted boundaries', () => {
      const invalidBoundaries = [0.1, 1.0, 0.5, 2.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries must be in strictly increasing order');
    });

    it('should reject equal boundaries', () => {
      const invalidBoundaries = [0.1, 0.5, 0.5, 1.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries must be in strictly increasing order');
    });

    it('should reject non-positive boundaries', () => {
      const invalidBoundaries = [0, 0.5, 1.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries must be positive');
    });

    it('should reject negative boundaries', () => {
      const invalidBoundaries = [-0.1, 0.5, 1.0];
      const result = validateHistogramBoundaries(invalidBoundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries must be positive');
    });

    it('should handle single boundary', () => {
      const result = validateHistogramBoundaries([1.0]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle very small boundaries', () => {
      const result = validateHistogramBoundaries([0.001, 0.002, 0.003]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle very large boundaries', () => {
      const result = validateHistogramBoundaries([1000, 10000, 100000]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateServiceName', () => {
    it('should validate correct service names', () => {
      const validNames = [
        'api-service',
        'user_service',
        'OrderService',
        'service.v1',
        'my-api-service',
        'a',
        'API_SERVICE_123'
      ];

      validNames.forEach(name => {
        const result = validateServiceName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should reject invalid service names', () => {
      const invalidCases = [
        { name: '', expectedError: 'Service name must be a non-empty string' },
        { name: null as unknown as string, expectedError: 'Service name must be a non-empty string' },
        { name: undefined as unknown as string, expectedError: 'Service name must be a non-empty string' },
        { name: 123 as unknown as string, expectedError: 'Service name must be a non-empty string' },
        { name: '123service', expectedError: 'Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens' },
        { name: '-service', expectedError: 'Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens' },
        { name: '.service', expectedError: 'Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens' },
        { name: 'service@invalid', expectedError: 'Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens' },
        { name: 'service space', expectedError: 'Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens' }
      ];

      invalidCases.forEach(({ name, expectedError }) => {
        const result = validateServiceName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });

    it('should reject service names that are too long', () => {
      const longName = 'a' + 'b'.repeat(100);
      const result = validateServiceName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service name cannot exceed 100 characters');
    });

    it('should handle edge cases for service names', () => {
      // Test minimum length
      const result = validateServiceName('a');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle maximum valid length', () => {
      const maxName = 'a' + 'b'.repeat(98); // 99 characters total
      const result = validateServiceName(maxName);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject names with special characters', () => {
      const invalidNames = [
        'service#invalid',
        'service$invalid',
        'service%invalid',
        'service^invalid',
        'service&invalid',
        'service*invalid',
        'service+invalid',
        'service=invalid',
        'service|invalid',
        'service\\invalid',
        'service/invalid',
        'service?invalid',
        'service<invalid',
        'service>invalid',
        'service,invalid',
        'service;invalid',
        'service:invalid',
        'service[invalid',
        'service]invalid',
        'service{invalid',
        'service}invalid',
        'service`invalid',
        'service~invalid',
        'service!invalid'
      ];

      invalidNames.forEach(name => {
        const result = validateServiceName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens');
      });
    });

    it('should accept valid special characters', () => {
      const validNames = [
        'service-name',
        'service_name',
        'service.name',
        'service123',
        'Service123',
        'SERVICE123',
        'service-name_test.v1'
      ];

      validNames.forEach(name => {
        const result = validateServiceName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('edge cases and error combinations', () => {
    it('should handle multiple validation errors in metric name', () => {
      const result = validateMetricName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Metric name must be a non-empty string');
    });

    it('should handle multiple validation errors in label keys', () => {
      const keys = ['', '123invalid', '__reserved'];
      const result = validateLabelKeys(keys);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle multiple validation errors in histogram boundaries', () => {
      const boundaries: number[] = []; // Empty array
      const result = validateHistogramBoundaries(boundaries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Histogram boundaries cannot be empty');
    });

    it('should handle null and undefined inputs gracefully', () => {
      expect(() => validateMetricName(null as unknown as string)).not.toThrow();
      expect(() => validateMetricName(undefined as unknown as string)).not.toThrow();
      expect(() => validateLabelKeys([null as unknown as string])).not.toThrow();
      expect(() => validateServiceName(null as unknown as string)).not.toThrow();
    });

    it('should handle empty string inputs', () => {
      expect(validateMetricName('').isValid).toBe(false);
      expect(validateServiceName('').isValid).toBe(false);
      expect(validateLabelKeys([''])).toEqual({ 
        isValid: false, 
        errors: expect.arrayContaining([expect.stringContaining('Label keys must be non-empty strings')])
      });
    });

    it('should handle non-string inputs to string validators', () => {
      const numberInput = 123;
      const booleanInput = true;
      const objectInput = { test: 'value' };
      const arrayInput = ['test'];

      expect(validateMetricName(numberInput as unknown as string).isValid).toBe(false);
      expect(validateMetricName(booleanInput as unknown as string).isValid).toBe(false);
      expect(validateMetricName(objectInput as unknown as string).isValid).toBe(false);
      expect(validateMetricName(arrayInput as unknown as string).isValid).toBe(false);

      expect(validateServiceName(numberInput as unknown as string).isValid).toBe(false);
      expect(validateServiceName(booleanInput as unknown as string).isValid).toBe(false);
      expect(validateServiceName(objectInput as unknown as string).isValid).toBe(false);
      expect(validateServiceName(arrayInput as unknown as string).isValid).toBe(false);
    });

    it('should handle mixed type arrays in label keys', () => {
      const mixedKeys = [
        'valid_key',
        123 as unknown as string,
        true as unknown as string,
        null as unknown as string,
        undefined as unknown as string,
        { test: 'value' } as unknown as string
      ];

      const result = validateLabelKeys(mixedKeys);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle complex object structures in attributes', () => {
      const complexAttributes = {
        'simple_string': 'value',
        'simple_number': 42,
        'simple_boolean': true,
        'complex_object': {
          nested: {
            deeply: 'nested'
          }
        } as unknown as string | number | boolean,
        'function_value': (() => 'test') as unknown as string | number | boolean,
        'symbol_value': Symbol('test') as unknown as string | number | boolean,
        'date_value': new Date() as unknown as string | number | boolean
      };

      const result = validateAttributes(complexAttributes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Attribute value for key "complex_object" must be string, number, or boolean');
      expect(result.errors).toContain('Attribute value for key "function_value" must be string, number, or boolean');
      expect(result.errors).toContain('Attribute value for key "symbol_value" must be string, number, or boolean');
      expect(result.errors).toContain('Attribute value for key "date_value" must be string, number, or boolean');
    });

    it('should handle extreme boundary values in histogram', () => {
      const extremeBoundaries = [
        Number.MIN_VALUE,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_VALUE
      ];

      const result = validateHistogramBoundaries(extremeBoundaries);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});