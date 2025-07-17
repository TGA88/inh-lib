import {
  isPrimitive,
  isValidLabelValue,
  isValidAttributeValue,
  ensureStringMap
} from '../../utils/type.utils';

describe('type.utils', () => {
  describe('isPrimitive', () => {
    it('should return true for primitive types', () => {
      expect(isPrimitive('string')).toBe(true);
      expect(isPrimitive(123)).toBe(true);
      expect(isPrimitive(true)).toBe(true);
      expect(isPrimitive(false)).toBe(true);
      expect(isPrimitive(0)).toBe(true);
      expect(isPrimitive('')).toBe(true);
      expect(isPrimitive(-42)).toBe(true);
      expect(isPrimitive(3.14)).toBe(true);
    });

    it('should return false for non-primitive types', () => {
      expect(isPrimitive(null)).toBe(false);
      expect(isPrimitive(undefined)).toBe(false);
      expect(isPrimitive({})).toBe(false);
      expect(isPrimitive([])).toBe(false);
      expect(isPrimitive(new Date())).toBe(false);
      expect(isPrimitive(/regex/)).toBe(false);
      expect(isPrimitive(() => 'test')).toBe(false);
      expect(isPrimitive(Symbol('test'))).toBe(false);
      expect(isPrimitive(new Map())).toBe(false);
      expect(isPrimitive(new Set())).toBe(false);
    });

    it('should handle special number values', () => {
      expect(isPrimitive(Infinity)).toBe(true);
      expect(isPrimitive(-Infinity)).toBe(true);
      expect(isPrimitive(NaN)).toBe(true);
      expect(isPrimitive(Number.MAX_VALUE)).toBe(true);
      expect(isPrimitive(Number.MIN_VALUE)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isPrimitive(BigInt(123))).toBe(false); // BigInt is not primitive in this context
      expect(isPrimitive(Object('string'))).toBe(false); // String object, not primitive
      expect(isPrimitive(Object(123))).toBe(false); // Number object, not primitive  
      expect(isPrimitive(Object(true))).toBe(false); // Boolean object, not primitive
    });
  });

  describe('isValidLabelValue', () => {
    it('should return true for valid label values', () => {
      expect(isValidLabelValue('GET')).toBe(true);
      expect(isValidLabelValue('200')).toBe(true);
      expect(isValidLabelValue('api/users')).toBe(true);
      expect(isValidLabelValue('a')).toBe(true);
      expect(isValidLabelValue('special-chars_123')).toBe(true);
      expect(isValidLabelValue('unicode-测试')).toBe(true);
      expect(isValidLabelValue('with spaces')).toBe(true);
      expect(isValidLabelValue('special@chars#ok')).toBe(true);
    });

    it('should return false for invalid label values', () => {
      expect(isValidLabelValue('')).toBe(false);
      expect(isValidLabelValue(123)).toBe(false);
      expect(isValidLabelValue(true)).toBe(false);
      expect(isValidLabelValue(false)).toBe(false);
      expect(isValidLabelValue(null)).toBe(false);
      expect(isValidLabelValue(undefined)).toBe(false);
      expect(isValidLabelValue({})).toBe(false);
      expect(isValidLabelValue([])).toBe(false);
      expect(isValidLabelValue(new Date())).toBe(false);
      expect(isValidLabelValue(function testFunction() { return 'test'; })).toBe(false);
      expect(isValidLabelValue(Symbol('test'))).toBe(false);
    });

    it('should handle special string values', () => {
      expect(isValidLabelValue('0')).toBe(true);
      expect(isValidLabelValue('false')).toBe(true);
      expect(isValidLabelValue('null')).toBe(true);
      expect(isValidLabelValue('undefined')).toBe(true);
      expect(isValidLabelValue('NaN')).toBe(true);
      expect(isValidLabelValue('Infinity')).toBe(true);
    });

    it('should handle whitespace-only strings', () => {
      expect(isValidLabelValue(' ')).toBe(true);
      expect(isValidLabelValue('  ')).toBe(true);
      expect(isValidLabelValue('\t')).toBe(true);
      expect(isValidLabelValue('\n')).toBe(true);
      expect(isValidLabelValue('\r')).toBe(true);
    });
  });

  describe('isValidAttributeValue', () => {
    it('should return true for valid attribute values', () => {
      expect(isValidAttributeValue('string')).toBe(true);
      expect(isValidAttributeValue(123)).toBe(true);
      expect(isValidAttributeValue(true)).toBe(true);
      expect(isValidAttributeValue(false)).toBe(true);
      expect(isValidAttributeValue(0)).toBe(true);
      expect(isValidAttributeValue('')).toBe(true);
      expect(isValidAttributeValue(-42)).toBe(true);
      expect(isValidAttributeValue(3.14)).toBe(true);
    });

    it('should return false for invalid attribute values', () => {
      expect(isValidAttributeValue(null)).toBe(false);
      expect(isValidAttributeValue(undefined)).toBe(false);
      expect(isValidAttributeValue({})).toBe(false);
      expect(isValidAttributeValue([])).toBe(false);
      expect(isValidAttributeValue(new Date())).toBe(false);
      expect(isValidAttributeValue(() => 'test')).toBe(false);
      expect(isValidAttributeValue(Symbol('test'))).toBe(false);
      expect(isValidAttributeValue(new Map())).toBe(false);
      expect(isValidAttributeValue(new Set())).toBe(false);
    });

    it('should handle special number values', () => {
      expect(isValidAttributeValue(Infinity)).toBe(true);
      expect(isValidAttributeValue(-Infinity)).toBe(true);
      expect(isValidAttributeValue(NaN)).toBe(true);
      expect(isValidAttributeValue(Number.MAX_VALUE)).toBe(true);
      expect(isValidAttributeValue(Number.MIN_VALUE)).toBe(true);
      expect(isValidAttributeValue(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(isValidAttributeValue(Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isValidAttributeValue(BigInt(123))).toBe(false);
      expect(isValidAttributeValue(Object('string'))).toBe(false);
      expect(isValidAttributeValue(Object(123))).toBe(false);
      expect(isValidAttributeValue(Object(true))).toBe(false);
    });
  });

  describe('ensureStringMap', () => {
    it('should convert valid primitives to strings', () => {
      const input = {
        str: 'hello',
        num: 123,
        bool: true,
        zero: 0,
        empty: '',
        negative: -42,
        float: 3.14,
        false_val: false
      };

      const result = ensureStringMap(input);
      expect(result['str']).toBe('hello');
      expect(result['num']).toBe('123');
      expect(result['bool']).toBe('true');
      expect(result['zero']).toBe('0');
      expect(result['empty']).toBe('');
      expect(result['negative']).toBe('-42');
      expect(result['float']).toBe('3.14');
      expect(result['false_val']).toBe('false');
    });

    it('should convert invalid values to "unknown"', () => {
      const input = {
        valid: 'hello',
        null_val: null,
        undefined_val: undefined,
        object_val: { nested: 'object' },
        array_val: ['array', 'value'],
        date_val: new Date(),
        function_val: () => 'function',
        symbol_val: Symbol('test'),
        map_val: new Map(),
        set_val: new Set()
      };

      const result = ensureStringMap(input);
      expect(result['valid']).toBe('hello');
      expect(result['null_val']).toBe('unknown');
      expect(result['undefined_val']).toBe('unknown');
      expect(result['object_val']).toBe('unknown');
      expect(result['array_val']).toBe('unknown');
      expect(result['date_val']).toBe('unknown');
      expect(result['function_val']).toBe('unknown');
      expect(result['symbol_val']).toBe('unknown');
      expect(result['map_val']).toBe('unknown');
      expect(result['set_val']).toBe('unknown');
    });

    it('should handle empty object', () => {
      const result = ensureStringMap({});
      expect(result).toEqual({});
    });

    it('should handle special numbers', () => {
      const input = {
        infinity: Infinity,
        negative_infinity: -Infinity,
        nan: NaN,
        max_value: Number.MAX_VALUE,
        min_value: Number.MIN_VALUE,
        max_safe: Number.MAX_SAFE_INTEGER,
        min_safe: Number.MIN_SAFE_INTEGER
      };

      const result = ensureStringMap(input);
      expect(result['infinity']).toBe('Infinity');
      expect(result['negative_infinity']).toBe('-Infinity');
      expect(result['nan']).toBe('NaN');
      expect(result['max_value']).toBe(Number.MAX_VALUE.toString());
      expect(result['min_value']).toBe(Number.MIN_VALUE.toString());
      expect(result['max_safe']).toBe(Number.MAX_SAFE_INTEGER.toString());
      expect(result['min_safe']).toBe(Number.MIN_SAFE_INTEGER.toString());
    });

    it('should handle special boolean and numeric edge cases', () => {
      const input = {
        true_val: true,
        false_val: false,
        zero: 0,
        negative_zero: -0,
        one: 1,
        negative_one: -1,
        empty_string: '',
        space_string: ' ',
        zero_string: '0',
        false_string: 'false'
      };

      const result = ensureStringMap(input);
      expect(result['true_val']).toBe('true');
      expect(result['false_val']).toBe('false');
      expect(result['zero']).toBe('0');
      expect(result['negative_zero']).toBe('0'); // -0 becomes '0'
      expect(result['one']).toBe('1');
      expect(result['negative_one']).toBe('-1');
      expect(result['empty_string']).toBe('');
      expect(result['space_string']).toBe(' ');
      expect(result['zero_string']).toBe('0');
      expect(result['false_string']).toBe('false');
    });

    it('should handle nested objects and arrays', () => {
      const input = {
        simple: 'value',
        nested_object: {
          level1: {
            level2: 'deep'
          }
        },
        simple_array: [1, 2, 3],
        mixed_array: ['string', 123, true, null, undefined],
        empty_object: {},
        empty_array: []
      };

      const result = ensureStringMap(input);
      expect(result['simple']).toBe('value');
      expect(result['nested_object']).toBe('unknown');
      expect(result['simple_array']).toBe('unknown');
      expect(result['mixed_array']).toBe('unknown');
      expect(result['empty_object']).toBe('unknown');
      expect(result['empty_array']).toBe('unknown');
    });

    it('should handle function types', () => {
      const input = {
        arrow_function: () => 'test',
        regular_function: function() { return 'test'; },
        async_function: async () => 'test',
        generator_function: function* () { yield 'test'; },
        class_constructor: class TestClass {},
        built_in_function: Math.abs
      };

      const result = ensureStringMap(input);
      expect(result['arrow_function']).toBe('unknown');
      expect(result['regular_function']).toBe('unknown');
      expect(result['async_function']).toBe('unknown');
      expect(result['generator_function']).toBe('unknown');
      expect(result['class_constructor']).toBe('unknown');
      expect(result['built_in_function']).toBe('unknown');
    });

    it('should handle prototype and object wrapper types', () => {
      const input = {
        string_object: new String('test'),
        number_object: new Number(123),
        boolean_object: new Boolean(true),
        regex: /test/g,
        date: new Date('2023-01-01'),
        error: new Error('test error')
      };

      const result = ensureStringMap(input);
      expect(result['string_object']).toBe('unknown');
      expect(result['number_object']).toBe('unknown');
      expect(result['boolean_object']).toBe('unknown');
      expect(result['regex']).toBe('unknown');
      expect(result['date']).toBe('unknown');
      expect(result['error']).toBe('unknown');
    });

    it('should preserve original object structure', () => {
      const input = {
        a: 'first',
        b: 123,
        c: true
      };

      const result = ensureStringMap(input);
      const keys = Object.keys(result);
      
      expect(keys).toEqual(['a', 'b', 'c']);
      expect(result['a']).toBe('first');
      expect(result['b']).toBe('123');
      expect(result['c']).toBe('true');
    });

    it('should handle large numbers correctly', () => {
      const input = {
        large_int: 9007199254740991, // Number.MAX_SAFE_INTEGER
        large_float: 1.7976931348623157e+308, // Close to Number.MAX_VALUE
        small_float: 5e-324, // Close to Number.MIN_VALUE
        scientific: 1.23e-4,
        negative_scientific: -1.23e-4
      };

      const result = ensureStringMap(input);
      expect(result['large_int']).toBe('9007199254740991');
      expect(result['large_float']).toBe('1.7976931348623157e+308');
      expect(result['small_float']).toBe('5e-324');
      expect(result['scientific']).toBe('0.000123');
      expect(result['negative_scientific']).toBe('-0.000123');
    });

    it('should handle mixed valid and invalid values', () => {
      const input = {
        valid_string: 'hello',
        valid_number: 42,
        valid_boolean: true,
        invalid_null: null,
        invalid_undefined: undefined,
        invalid_object: { key: 'value' },
        invalid_array: [1, 2, 3],
        valid_zero: 0,
        valid_empty: '',
        invalid_function: () => 'test'
      };

      const result = ensureStringMap(input);
      
      // Valid values should be converted to string
      expect(result['valid_string']).toBe('hello');
      expect(result['valid_number']).toBe('42');
      expect(result['valid_boolean']).toBe('true');
      expect(result['valid_zero']).toBe('0');
      expect(result['valid_empty']).toBe('');
      
      // Invalid values should become 'unknown'
      expect(result['invalid_null']).toBe('unknown');
      expect(result['invalid_undefined']).toBe('unknown');
      expect(result['invalid_object']).toBe('unknown');
      expect(result['invalid_array']).toBe('unknown');
      expect(result['invalid_function']).toBe('unknown');
    });
  });

  describe('edge cases and comprehensive testing', () => {
    it('should handle all JavaScript primitive types correctly', () => {
      const primitives = [
        'string',
        123,
        true,
        false,
        0,
        -0,
        Infinity,
        -Infinity,
        NaN
      ];

      primitives.forEach(primitive => {
        expect(isPrimitive(primitive)).toBe(true);
        expect(isValidAttributeValue(primitive)).toBe(true);
      });
    });

    it('should handle all JavaScript non-primitive types correctly', () => {
      const nonPrimitives = [
        {},
        [],
        null,
        undefined,
        new Date(),
        /regex/,
        function emptyFunction() { return undefined; },
        Symbol('test'),
        new Map(),
        new Set(),
        BigInt(123),
        new String('test'),
        new Number(123),
        new Boolean(true)
      ];

      nonPrimitives.forEach(nonPrimitive => {
        expect(isPrimitive(nonPrimitive)).toBe(false);
        expect(isValidAttributeValue(nonPrimitive)).toBe(false);
      });
    });

    it('should handle string-specific validations', () => {
      const validStrings = [
        'normal string',
        '',
        ' ',
        '123',
        'true',
        'false',
        'null',
        'undefined',
        'special-chars_123',
        'unicode-测试',
        'emoji-😀',
        'newline\n',
        'tab\t',
        'carriage\r'
      ];

      validStrings.forEach(str => {
        expect(isValidLabelValue(str)).toBe(str !== ''); // Empty string is not valid for labels
      });
    });

    it('should handle ensureStringMap with extreme cases', () => {
      const extremeInput = {
        // Extreme numbers
        max_number: Number.MAX_VALUE,
        min_number: Number.MIN_VALUE,
        max_safe: Number.MAX_SAFE_INTEGER,
        min_safe: Number.MIN_SAFE_INTEGER,
        
        // Special values
        positive_infinity: Infinity,
        negative_infinity: -Infinity,
        not_a_number: NaN,
        
        // Edge strings
        empty_string: '',
        long_string: 'a'.repeat(1000),
        unicode_string: '测试🔥💯',
        
        // Falsy values
        false_val: false,
        zero_val: 0,
        negative_zero: -0,
        
        // Complex invalid values
        circular_ref: (() => {
          const obj: Record<string, unknown> = {};
          obj['self'] = obj;
          return obj;
        })(),
        
        // Built-in objects
        date: new Date(),
        regexp: /test/,
        error: new Error('test')
      };

      const result = ensureStringMap(extremeInput);
      
      // Verify all primitive values are converted correctly
      expect(result['max_number']).toBe(Number.MAX_VALUE.toString());
      expect(result['min_number']).toBe(Number.MIN_VALUE.toString());
      expect(result['positive_infinity']).toBe('Infinity');
      expect(result['negative_infinity']).toBe('-Infinity');
      expect(result['not_a_number']).toBe('NaN');
      expect(result['empty_string']).toBe('');
      expect(result['long_string']).toBe('a'.repeat(1000));
      expect(result['unicode_string']).toBe('测试🔥💯');
      expect(result['false_val']).toBe('false');
      expect(result['zero_val']).toBe('0');
      expect(result['negative_zero']).toBe('0');
      
      // Verify all non-primitive values become 'unknown'
      expect(result['circular_ref']).toBe('unknown');
      expect(result['date']).toBe('unknown');
      expect(result['regexp']).toBe('unknown');
      expect(result['error']).toBe('unknown');
    });
  });
});