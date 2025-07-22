import {
  isUnifiedPrimitive,
  isValidUnifiedLabelValue,
  isValidUnifiedAttributeValue,
  ensureStringMap
} from '../../utils/type.utils';

describe('type.utils', () => {
  describe('isUnifiedPrimitive', () => {
    it('should return true for primitive types', () => {
      expect(isUnifiedPrimitive('string')).toBe(true);
      expect(isUnifiedPrimitive(123)).toBe(true);
      expect(isUnifiedPrimitive(true)).toBe(true);
      expect(isUnifiedPrimitive(false)).toBe(true);
      expect(isUnifiedPrimitive(0)).toBe(true);
      expect(isUnifiedPrimitive('')).toBe(true);
      expect(isUnifiedPrimitive(-42)).toBe(true);
      expect(isUnifiedPrimitive(3.14)).toBe(true);
    });

    it('should return false for non-primitive types', () => {
      expect(isUnifiedPrimitive(null)).toBe(false);
      expect(isUnifiedPrimitive(undefined)).toBe(false);
      expect(isUnifiedPrimitive({})).toBe(false);
      expect(isUnifiedPrimitive([])).toBe(false);
      expect(isUnifiedPrimitive(new Date())).toBe(false);
      expect(isUnifiedPrimitive(/regex/)).toBe(false);
      expect(isUnifiedPrimitive(() => 'test')).toBe(false);
      expect(isUnifiedPrimitive(Symbol('test'))).toBe(false);
      expect(isUnifiedPrimitive(new Map())).toBe(false);
      expect(isUnifiedPrimitive(new Set())).toBe(false);
    });

    it('should handle special number values', () => {
      expect(isUnifiedPrimitive(Infinity)).toBe(true);
      expect(isUnifiedPrimitive(-Infinity)).toBe(true);
      expect(isUnifiedPrimitive(NaN)).toBe(true);
      expect(isUnifiedPrimitive(Number.MAX_VALUE)).toBe(true);
      expect(isUnifiedPrimitive(Number.MIN_VALUE)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isUnifiedPrimitive(BigInt(123))).toBe(false); // BigInt is not primitive in this context
      expect(isUnifiedPrimitive(Object('string'))).toBe(false); // String object, not primitive
      expect(isUnifiedPrimitive(Object(123))).toBe(false); // Number object, not primitive  
      expect(isUnifiedPrimitive(Object(true))).toBe(false); // Boolean object, not primitive
    });
  });

  describe('isValidUnifiedLabelValue', () => {
    it('should return true for valid label values', () => {
      expect(isValidUnifiedLabelValue('GET')).toBe(true);
      expect(isValidUnifiedLabelValue('200')).toBe(true);
      expect(isValidUnifiedLabelValue('api/users')).toBe(true);
      expect(isValidUnifiedLabelValue('a')).toBe(true);
      expect(isValidUnifiedLabelValue('special-chars_123')).toBe(true);
      expect(isValidUnifiedLabelValue('unicode-测试')).toBe(true);
      expect(isValidUnifiedLabelValue('with spaces')).toBe(true);
      expect(isValidUnifiedLabelValue('special@chars#ok')).toBe(true);
    });

    it('should return false for invalid label values', () => {
      expect(isValidUnifiedLabelValue('')).toBe(false);
      expect(isValidUnifiedLabelValue(123)).toBe(false);
      expect(isValidUnifiedLabelValue(true)).toBe(false);
      expect(isValidUnifiedLabelValue(false)).toBe(false);
      expect(isValidUnifiedLabelValue(null)).toBe(false);
      expect(isValidUnifiedLabelValue(undefined)).toBe(false);
      expect(isValidUnifiedLabelValue({})).toBe(false);
      expect(isValidUnifiedLabelValue([])).toBe(false);
      expect(isValidUnifiedLabelValue(new Date())).toBe(false);
      expect(isValidUnifiedLabelValue(function testFunction() { return 'test'; })).toBe(false);
      expect(isValidUnifiedLabelValue(Symbol('test'))).toBe(false);
    });

    it('should handle special string values', () => {
      expect(isValidUnifiedLabelValue('0')).toBe(true);
      expect(isValidUnifiedLabelValue('false')).toBe(true);
      expect(isValidUnifiedLabelValue('null')).toBe(true);
      expect(isValidUnifiedLabelValue('undefined')).toBe(true);
      expect(isValidUnifiedLabelValue('NaN')).toBe(true);
      expect(isValidUnifiedLabelValue('Infinity')).toBe(true);
    });

    it('should handle whitespace-only strings', () => {
      expect(isValidUnifiedLabelValue(' ')).toBe(true);
      expect(isValidUnifiedLabelValue('  ')).toBe(true);
      expect(isValidUnifiedLabelValue('\t')).toBe(true);
      expect(isValidUnifiedLabelValue('\n')).toBe(true);
      expect(isValidUnifiedLabelValue('\r')).toBe(true);
    });
  });

  describe('isValidUnifiedAttributeValue', () => {
    it('should return true for valid attribute values', () => {
      expect(isValidUnifiedAttributeValue('string')).toBe(true);
      expect(isValidUnifiedAttributeValue(123)).toBe(true);
      expect(isValidUnifiedAttributeValue(true)).toBe(true);
      expect(isValidUnifiedAttributeValue(false)).toBe(true);
      expect(isValidUnifiedAttributeValue(0)).toBe(true);
      expect(isValidUnifiedAttributeValue('')).toBe(true);
      expect(isValidUnifiedAttributeValue(-42)).toBe(true);
      expect(isValidUnifiedAttributeValue(3.14)).toBe(true);
    });

    it('should return false for invalid attribute values', () => {
      expect(isValidUnifiedAttributeValue(null)).toBe(false);
      expect(isValidUnifiedAttributeValue(undefined)).toBe(false);
      expect(isValidUnifiedAttributeValue({})).toBe(false);
      expect(isValidUnifiedAttributeValue([])).toBe(false);
      expect(isValidUnifiedAttributeValue(new Date())).toBe(false);
      expect(isValidUnifiedAttributeValue(() => 'test')).toBe(false);
      expect(isValidUnifiedAttributeValue(Symbol('test'))).toBe(false);
      expect(isValidUnifiedAttributeValue(new Map())).toBe(false);
      expect(isValidUnifiedAttributeValue(new Set())).toBe(false);
    });

    it('should handle special number values', () => {
      expect(isValidUnifiedAttributeValue(Infinity)).toBe(true);
      expect(isValidUnifiedAttributeValue(-Infinity)).toBe(true);
      expect(isValidUnifiedAttributeValue(NaN)).toBe(true);
      expect(isValidUnifiedAttributeValue(Number.MAX_VALUE)).toBe(true);
      expect(isValidUnifiedAttributeValue(Number.MIN_VALUE)).toBe(true);
      expect(isValidUnifiedAttributeValue(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(isValidUnifiedAttributeValue(Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isValidUnifiedAttributeValue(BigInt(123))).toBe(false);
      expect(isValidUnifiedAttributeValue(Object('string'))).toBe(false);
      expect(isValidUnifiedAttributeValue(Object(123))).toBe(false);
      expect(isValidUnifiedAttributeValue(Object(true))).toBe(false);
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
        expect(isUnifiedPrimitive(primitive)).toBe(true);
        expect(isValidUnifiedAttributeValue(primitive)).toBe(true);
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
        expect(isUnifiedPrimitive(nonPrimitive)).toBe(false);
        expect(isValidUnifiedAttributeValue(nonPrimitive)).toBe(false);
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
        expect(isValidUnifiedLabelValue(str)).toBe(str !== ''); // Empty string is not valid for labels
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