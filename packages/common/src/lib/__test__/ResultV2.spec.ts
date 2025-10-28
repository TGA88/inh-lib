import { Result, isSuccess, isFailure, sequence } from '../ResultV2';
import { CommonFailures } from '../Failure/CommonFailures';

interface TestUser {
  id: string;
  name: string;
  email: string;
}

interface TestError {
  code: string;
  message: string;
}

// Helper functions to reduce nesting
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const sumReducer = (sum: number, val: number): number => sum + val;

describe('ResultV2 Complete Test Suite', () => {
  
  describe('Basic Construction', () => {
    it('should create successful Result with value', () => {
      const result = Result.ok<string>('hello');
      
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.getValue()).toBe('hello');
    });

    it('should create successful Result without value', () => {
      const result = Result.ok<void>();
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeUndefined();
    });

    it('should create failed Result with error', () => {
      const result = Result.fail<string>('error message');
      
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('error message');
      expect(result.errorValue()).toBe('error message');
    });

    it('should be immutable (frozen)', () => {
      const result = Result.ok('test');
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should create Result with complex object', () => {
      const user: TestUser = { id: '1', name: 'John', email: 'john@test.com' };
      const result = Result.ok<TestUser>(user);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(user);
    });

    it('should create Result with custom error type', () => {
      const error: TestError = { code: 'VALIDATION_ERROR', message: 'Invalid input' };
      const result = Result.fail<string, TestError>(error);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toEqual(error);
    });
  });

  describe('Value Access Methods', () => {
    it('getValue() should return value for successful Result', () => {
      const user: TestUser = { id: '1', name: 'John', email: 'john@test.com' };
      const result = Result.ok<TestUser>(user);
      
      expect(result.getValue()).toEqual(user);
    });

    it('getValue() should throw error for failed Result', () => {
      const result = Result.fail<TestUser>('user not found');
      
      expect(() => result.getValue()).toThrow("Can't get the value of an error Result. Use 'errorValue' instead.");
    });

    it('getValueOrDefault() should return value for successful Result', () => {
      const result = Result.ok<string>('success');
      const value = result.getValueOrDefault('default');
      
      expect(value).toBe('success');
    });

    it('getValueOrDefault() should return default for failed Result', () => {
      const result = Result.fail<string>('error');
      const value = result.getValueOrDefault('default');
      
      expect(value).toBe('default');
    });

    it('getValueOrUndefined() should return value for successful Result', () => {
      const result = Result.ok<number>(42);
      const value = result.getValueOrUndefined();
      
      expect(value).toBe(42);
    });

    it('getValueOrUndefined() should return undefined for failed Result', () => {
      const result = Result.fail<number>('error');
      const value = result.getValueOrUndefined();
      
      expect(value).toBeUndefined();
    });

    it('errorValue() should return error for failed Result', () => {
      const error: TestError = { code: 'NOT_FOUND', message: 'User not found' };
      const result = Result.fail<TestUser, TestError>(error);
      
      expect(result.errorValue()).toEqual(error);
    });

    it('errorValue() should throw error for successful Result', () => {
      const result = Result.ok<string>('success');
      
      expect(() => result.errorValue()).toThrow("Can't get error value of a successful Result. Use 'getValue' instead.");
    });
  });

  describe('Chain Operations', () => {
    it('chain() should continue with successful Result', () => {
      const result = Result.ok<number>(5)
        .chain(value => Result.ok<string>(`Value: ${value}`))
        .chain(text => Result.ok<string>(text.toUpperCase()));
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('VALUE: 5');
    });

    it('chain() should stop at first failure', () => {
      const result = Result.ok<number>(5)
        .chain(() => Result.fail<string>('conversion failed'))
        .chain(text => Result.ok<string>(text.toUpperCase()));
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('conversion failed');
    });

    it('chain() should propagate error from failed Result', () => {
      const result = Result.fail<number>('initial error')
        .chain(value => Result.ok<string>(`Value: ${value}`));
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('initial error');
    });

    it('chainAsync() should work with async functions', async () => {
      const asyncOperation = async (value: number): Promise<Result<string>> => {
        return Result.ok<string>(`Async: ${value}`);
      };

      const result = await Result.ok<number>(42).chainAsync(asyncOperation);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('Async: 42');
    });

    it('chainAsync() should propagate error from failed Result', async () => {
      const asyncOperation = async (value: number): Promise<Result<string>> => {
        return Result.ok<string>(`Async: ${value}`);
      };

      const result = await Result.fail<number>('initial error').chainAsync(asyncOperation);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('initial error');
    });

    it('chainAsync() should handle async operation errors', async () => {
      const asyncOperation = async (): Promise<Result<string, Error>> => {
        return Result.fail<string,Error>(new Error('async error'));
      };

      const result = await Result.ok<number>(42).chainAsync(asyncOperation);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBeInstanceOf(Error);
    });
  });

  describe('Map Operations', () => {
    it('map() should transform successful Result value', () => {
      const result = Result.ok<number>(42)
        .map(value => value * 2)
        .map(value => `Result: ${value}`);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('Result: 84');
    });

    it('map() should preserve error in failed Result', () => {
      const result = Result.fail<number>('error')
        .map(value => value * 2);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('error');
    });

    it('map() should catch exceptions and return failed Result', () => {
      const result = Result.ok<string>('test')
        .map(() => {
          throw new Error('mapping failed');
        });
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toEqual(new Error('mapping failed'));
    });

    it('mapError() should transform error in failed Result', () => {
      const result = Result.fail<string>('simple error')
        .mapError(error => ({ code: 'ERROR', message: error }));
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toEqual({ code: 'ERROR', message: 'simple error' });
    });

    it('mapError() should preserve value in successful Result', () => {
      const result = Result.ok<string>('success')
        .mapError(error => ({ code: 'ERROR', message: error }));
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('success');
    });

    it('mapAsync() should work with async transformations', async () => {
      const asyncTransform = async (value: number): Promise<string> => {
        return `Transformed: ${value}`;
      };

      const result = await Result.ok<number>(42).mapAsync(asyncTransform);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('Transformed: 42');
    });

    it('mapAsync() should preserve error in failed Result', async () => {
      const asyncTransform = async (value: number): Promise<string> => {
        return `Transformed: ${value}`;
      };

      const result = await Result.fail<number>('error').mapAsync(asyncTransform);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('error');
    });

    it('mapAsync() should catch async exceptions', async () => {
      const asyncTransform = async (): Promise<string> => {
        throw new Error('async transformation failed');
      };

      const result = await Result.ok<number>(42).mapAsync(asyncTransform);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toEqual(new Error('async transformation failed'));
    });
  });

  describe('Side Effects (tap methods)', () => {
    it('tap() should execute function for successful Result and return same instance', () => {
      let sideEffect = '';
      const original = Result.ok<string>('test');
      
      const result = original.tap(value => { 
        sideEffect = `Processed: ${value}`; 
      });
      
      expect(result).toBe(original); // Same instance
      expect(result.getValue()).toBe('test');
      expect(sideEffect).toBe('Processed: test');
    });

    it('tap() should not execute function for failed Result', () => {
      let sideEffect = '';
      
      const result = Result.fail<string>('error')
        .tap(() => { sideEffect = 'executed'; });
      
      expect(result.isFailure).toBe(true);
      expect(sideEffect).toBe('');
    });

    it('tapError() should execute function for failed Result and return same instance', () => {
      let sideEffect = '';
      const original = Result.fail<string>('test error');
      
      const result = original.tapError(error => { 
        sideEffect = `Error: ${error}`; 
      });
      
      expect(result).toBe(original); // Same instance
      expect(result.errorValue()).toBe('test error');
      expect(sideEffect).toBe('Error: test error');
    });

    it('tapError() should not execute function for successful Result', () => {
      let sideEffect = '';
      
      const result = Result.ok<string>('success')
        .tapError(() => { sideEffect = 'executed'; });
      
      expect(result.isSuccess).toBe(true);
      expect(sideEffect).toBe('');
    });

    it('tap() and tapError() should be chainable', () => {
      let successSideEffect = '';
      let errorSideEffect = '';
      
      const result = Result.ok<string>('test')
        .tap(value => { successSideEffect = `Success: ${value}`; })
        .tapError(error => { errorSideEffect = `Error: ${error}`; });
      
      expect(result.isSuccess).toBe(true);
      expect(successSideEffect).toBe('Success: test');
      expect(errorSideEffect).toBe('');
    });
  });

  describe('Pattern Matching', () => {
    it('match() should execute success handler for successful Result', () => {
      const result = Result.ok<number>(42);
      
      const matched = result.match(
        value => `Success: ${value}`,
        error => `Error: ${error}`
      );
      
      expect(matched).toBe('Success: 42');
    });

    it('match() should execute error handler for failed Result', () => {
      const result = Result.fail<number>('calculation failed');
      
      const matched = result.match(
        value => `Success: ${value}`,
        error => `Error: ${error}`
      );
      
      expect(matched).toBe('Error: calculation failed');
    });

    it('match() should work with different return types', () => {
      const successResult = Result.ok<string>('test');
      const failResult = Result.fail<string>('error');
      
      const successNumber = successResult.match(
        value => value.length,
        () => -1
      );
      
      const failNumber = failResult.match(
        value => value.length,
        () => -1
      );
      
      expect(successNumber).toBe(4);
      expect(failNumber).toBe(-1);
    });

    it('match() should handle complex transformations', () => {
      const userResult = Result.ok<TestUser>({ 
        id: '1', 
        name: 'John Doe', 
        email: 'john@test.com' 
      });
      
      const summary = userResult.match(
        user => ({
          status: 'success',
          userInfo: `${user.name} (${user.email})`,
          hasValidId: user.id.length > 0
        }),
        error => ({
          status: 'error',
          userInfo: `Error: ${error}`,
          message: error,
          hasValidId: false
        })
      );
      
      expect(summary).toEqual({
        status: 'success',
        userInfo: 'John Doe (john@test.com)',
        hasValidId: true
      });
    });
  });

  describe('HTTP Response Integration', () => {
    let mockResponse: {
      json: jest.Mock<void, [unknown]>;
      send: jest.Mock<unknown, [unknown]>;
      status: jest.Mock<{ json: jest.Mock<void, [unknown]>; send: jest.Mock<unknown, [unknown]> }, [number]>;
    };

    beforeEach(() => {
      const mockJsonMethod = jest.fn<void, [unknown]>();
      const mockSendMethod = jest.fn<unknown, [unknown]>();
      
      const mockChainableResponse = {
        json: mockJsonMethod,
        send: mockSendMethod
      };

      mockResponse = {
        json: jest.fn<void, [unknown]>(),
        send: jest.fn<unknown, [unknown]>(),
        status: jest.fn<{ json: jest.Mock<void, [unknown]>; send: jest.Mock<unknown, [unknown]> }, [number]>().mockReturnValue(mockChainableResponse)
      };
    });

    it('toHttpResponse() should send success response for successful Result', () => {
      mockResponse.status.mockClear();
      
      const user: TestUser = { id: '1', name: 'John', email: 'john@test.com' };
      const result = Result.ok<TestUser>(user);
      
      result.toHttpResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.json).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'OK',
        dataResult: user,
        traceId: undefined
      });
    });

    it('toHttpResponse() should send error response for failed Result', () => {
      mockResponse.status.mockClear();
      
      const result = Result.fail<TestUser>(new CommonFailures.NotFoundFail('User'));
      
      result.toHttpResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(statusReturn?.json).toHaveBeenCalledWith({
        statusCode: 404,
        isSuccess: false,
        codeResult: 'NOT_FOUND',
        message: 'User not found',
        dataResult: null,
        traceId: undefined
      });
    });

    it('toHttpResponse() should handle undefined value correctly', () => {
      mockResponse.status.mockClear();
      
      const result = Result.ok<void>();
      
      result.toHttpResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.json).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'OK',
        dataResult: undefined,
        traceId: undefined
      });
    });

    it('toHttpResponse() should handle custom options', () => {
      mockResponse.status.mockClear();
      
      const user: TestUser = { id: '1', name: 'John', email: 'john@test.com' };
      const result = Result.ok<TestUser>(user);
      
      result.toHttpResponse(mockResponse, {
        successMessage: 'User created successfully',
        traceId: 'test-trace-123'
      });
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.json).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'User created successfully',
        dataResult: user,
        traceId: 'test-trace-123'
      });
    });

    it('toStreamResponse() should send success response for successful Result', () => {
      mockResponse.status.mockClear();
      
      const user: TestUser = { id: '1', name: 'John', email: 'john@test.com' };
      const result = Result.ok<TestUser>(user);
      
      result.toStreamResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.send).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'OK',
        dataResult: user,
        traceId: undefined
      });
    });

    it('toStreamResponse() should send error response for failed Result', () => {
      mockResponse.status.mockClear();
      
      const result = Result.fail<TestUser>(new CommonFailures.InternalFail('Stream error'));
      
      result.toStreamResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(statusReturn?.send).toHaveBeenCalledWith({
        statusCode: 500,
        isSuccess: false,
        codeResult: 'INTERNAL_ERROR',
        message: 'Stream error',
        dataResult: null,
        traceId: undefined
      });
    });

    it('toStreamResponse() should handle string data correctly', () => {
      mockResponse.status.mockClear();
      
      const result = Result.ok<string>('Hello Stream');
      
      result.toStreamResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.send).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'OK',
        dataResult: 'Hello Stream',
        traceId: undefined
      });
    });

    it('toStreamResponse() should handle custom options', () => {
      mockResponse.status.mockClear();
      
      const data = { content: 'Stream content', type: 'text' };
      const result = Result.ok(data);
      
      result.toStreamResponse(mockResponse, {
        successMessage: 'Stream data sent successfully',
        traceId: 'stream-trace-456'
      });
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.send).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'Stream data sent successfully',
        dataResult: data,
        traceId: 'stream-trace-456'
      });
    });

    it('toStreamResponse() should handle binary data', () => {
      mockResponse.status.mockClear();
      
      const binaryData = Buffer.from('binary content');
      const result = Result.ok(binaryData);
      
      result.toStreamResponse(mockResponse);
      
      const statusReturn = mockResponse.status.mock.results[0]?.value;
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(statusReturn?.send).toHaveBeenCalledWith({
        statusCode: 200,
        isSuccess: true,
        codeResult: 'OK',
        message: 'OK',
        dataResult: binaryData,
        traceId: undefined
      });
    });
  });

  describe('Static Factory Methods', () => {
    it('from() should create successful Result when function succeeds', () => {
      const result = Result.from<number, string>(() => 42);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(42);
    });

    it('from() should create failed Result when function throws', () => {
      const result = Result.from<number, string>(() => {
        throw new Error('calculation failed');
      });
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toEqual(new Error('calculation failed'));
    });

    it('from() should use error mapper when provided', () => {
      const result = Result.from<number, string>(
        () => { throw new Error('original error'); },
        error => `Mapped: ${(error as Error).message}`
      );
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('Mapped: original error');
    });

    it('from() should handle complex operations', () => {
      const parseNumber = (str: string) => {
        const num = Number.parseInt(str, 10);
        if (Number.isNaN(num)) throw new Error('Not a valid number');
        return num;
      };

      const validResult = Result.from(() => parseNumber('42'));
      const invalidResult = Result.from(() => parseNumber('abc'));
      
      expect(validResult.isSuccess).toBe(true);
      expect(validResult.getValue()).toBe(42);
      
      expect(invalidResult.isFailure).toBe(true);
      expect(invalidResult.errorValue()).toEqual(new Error('Not a valid number'));
    });

    it('fromAsync() should create successful Result when async function succeeds', async () => {
      const asyncOperation = async () => {
        await delay(1);
        return 42;
      };

      const result = await Result.fromAsync<number, string>(asyncOperation);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(42);
    });

    it('fromAsync() should create failed Result when async function throws', async () => {
      const asyncOperation = async () => {
        await delay(1);
        throw new Error('async error');
      };

      const result = await Result.fromAsync<number, string>(asyncOperation);
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toEqual(new Error('async error'));
    });

    it('fromAsync() should use error mapper for async errors', async () => {
      const result = await Result.fromAsync<number, string>(
        async () => {
          throw new Error('async error');
        },
        error => `Async error: ${(error as Error).message}`
      );
      
      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('Async error: async error');
    });
  });

  describe('Combination Operations', () => {
    it('combine() should succeed when all Results are successful', () => {
      const results = [
        Result.ok<string>('hello'),
        Result.ok<number>(42),
        Result.ok<boolean>(true)
      ] as const;
      
      const combined = Result.combine(results);
      
      expect(combined.isSuccess).toBe(true);
      const [str, num, bool] = combined.getValue();
      expect(str).toBe('hello');
      expect(num).toBe(42);
      expect(bool).toBe(true);
    });

    it('combine() should fail when any Result is failed', () => {
      const results = [
        Result.ok<string>('hello'),
        Result.fail<number>('number error'),
        Result.ok<boolean>(true)
      ] as const;
      
      const combined = Result.combine(results);
      
      expect(combined.isFailure).toBe(true);
      expect(combined.errorValue()).toBe('number error');
    });

    it('combine() should handle empty array', () => {
      const results: [] = [];
      const combined = Result.combine(results);
      
      expect(combined.isSuccess).toBe(true);
      expect(combined.getValue()).toEqual([]);
    });

    it('combineWith() should apply combiner function to successful Results', () => {
      const results = [
        Result.ok<number>(1),
        Result.ok<number>(2),
        Result.ok<number>(3)
      ];
      
      const combined = Result.combineWith(results, values => values.reduce(sumReducer, 0));
      
      expect(combined.isSuccess).toBe(true);
      expect(combined.getValue()).toBe(6);
    });

    it('combineWith() should fail when any input Result is failed', () => {
      const results = [
        Result.ok<number>(1),
        Result.fail<number>('error'),
        Result.ok<number>(3)
      ];
      
      const combined = Result.combineWith(results, values => values.reduce(sumReducer, 0));
      
      expect(combined.isFailure).toBe(true);
      expect(combined.errorValue()).toBe('error');
    });

    it('combineWith() should handle combiner function errors', () => {
      const results = [
        Result.ok<number>(1),
        Result.ok<number>(2)
      ];
      
      const combined = Result.combineWith(
        results,
        () => {
          throw new Error('combiner error');
        }
      );
      
      expect(combined.isFailure).toBe(true);
      expect(combined.errorValue()).toEqual(new Error('combiner error'));
    });

    it('combineWith() should handle empty array', () => {
      const results: Result<number, string>[] = [];
      
      const combined = Result.combineWith(
        results,
        values => values.length
      );
      
      expect(combined.isSuccess).toBe(true);
      expect(combined.getValue()).toBe(0);
    });

    it('firstSuccess() should return first successful Result', () => {
      const results = [
        Result.fail<string, string>('error1'),
        Result.fail<string, string>('error2'),
        Result.ok<string, string>('success'),
        Result.ok<string, string>('another success')
      ];
      
      const first = Result.firstSuccess(results);
      
      expect(first.isSuccess).toBe(true);
      expect(first.getValue()).toBe('success');
    });

    it('firstSuccess() should return all errors when no Result is successful', () => {
      const results = [
        Result.fail<string, string>('error1'),
        Result.fail<string, string>('error2'),
        Result.fail<string, string>('error3')
      ];
      
      const first = Result.firstSuccess(results);
      
      expect(first.isFailure).toBe(true);
      expect(first.errorValue()).toEqual(['error1', 'error2', 'error3']);
    });

    it('firstSuccess() should handle empty array', () => {
      const results: Result<string, string>[] = [];
      const first = Result.firstSuccess(results);
      
      expect(first.isFailure).toBe(true);
      expect(first.errorValue()).toEqual([]);
    });

    it('firstSuccess() should handle single successful Result', () => {
      const results = [Result.ok<string, string>('only success')];
      const first = Result.firstSuccess(results);
      
      expect(first.isSuccess).toBe(true);
      expect(first.getValue()).toBe('only success');
    });
  });

  describe('Type Guards', () => {
    it('isSuccess() type guard should work correctly', () => {
      const successResult = Result.ok<string>('test');
      const failResult = Result.fail<string>('error');
      
      expect(isSuccess(successResult)).toBe(true);
      expect(isSuccess(failResult)).toBe(false);
      
      // Type narrowing test
      if (isSuccess(successResult)) {
        expect(successResult.isSuccess).toBe(true);
        // TypeScript should know this is a success result
        expect(successResult.getValue()).toBe('test');
      }
    });

    it('isFailure() type guard should work correctly', () => {
      const successResult = Result.ok<string>('test');
      const failResult = Result.fail<string>('error');
      
      expect(isFailure(successResult)).toBe(false);
      expect(isFailure(failResult)).toBe(true);
      
      // Type narrowing test
      if (isFailure(failResult)) {
        expect(failResult.isFailure).toBe(true);
        // TypeScript should know this is a failed result
        expect(failResult.errorValue()).toBe('error');
      }
    });
  });

  describe('Utility Functions', () => {
    it('sequence() should succeed when all Results are successful', () => {
      const results = [
        Result.ok<string>('first'),
        Result.ok<string>('second'),
        Result.ok<string>('third')
      ];
      
      const sequenced = sequence(results);
      
      expect(sequenced.isSuccess).toBe(true);
      expect(sequenced.getValue()).toEqual(['first', 'second', 'third']);
    });

    it('sequence() should fail when any Result is failed', () => {
      const results = [
        Result.ok<string>('first'),
        Result.fail<string>('error'),
        Result.ok<string>('third')
      ];
      
      const sequenced = sequence(results);
      
      expect(sequenced.isFailure).toBe(true);
      expect(sequenced.errorValue()).toBe('error');
    });

    it('sequence() should handle empty array', () => {
      const results: Result<string, string>[] = [];
      const sequenced = sequence(results);
      
      expect(sequenced.isSuccess).toBe(true);
      expect(sequenced.getValue()).toEqual([]);
    });

    it('sequence() should handle single Result', () => {
      const results = [Result.ok<string>('single')];
      const sequenced = sequence(results);
      
      expect(sequenced.isSuccess).toBe(true);
      expect(sequenced.getValue()).toEqual(['single']);
    });
  });

  describe('Complex Integration Scenarios', () => {
    interface ValidationInput {
      name: string;
      email: string;
      age: number;
    }

    const createValidationPipeline = () => {
      const validateName = (input: ValidationInput): Result<ValidationInput, string> => {
        return input.name.length > 0 
          ? Result.ok(input) 
          : Result.fail('Name is required');
      };

      const validateEmail = (input: ValidationInput): Result<ValidationInput, string> => {
        return input.email.includes('@') 
          ? Result.ok(input) 
          : Result.fail('Invalid email format');
      };

      const validateAge = (input: ValidationInput): Result<ValidationInput, string> => {
        return input.age >= 18 
          ? Result.ok(input) 
          : Result.fail('Must be 18 or older');
      };

      return { validateName, validateEmail, validateAge };
    };

    it('should handle successful validation pipeline', () => {
      const { validateName, validateEmail, validateAge } = createValidationPipeline();
      
      const validInput: ValidationInput = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const result = Result.ok(validInput)
        .chain(validateName)
        .chain(validateEmail)
        .chain(validateAge)
        .map(input => ({ ...input, validated: true }))
        .tap(result => console.log('Validation successful:', result.name));

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        validated: true
      });
    });

    it('should handle validation failure in pipeline', () => {
      const { validateName, validateEmail } = createValidationPipeline();
      
      const invalidInput: ValidationInput = {
        name: '', // Invalid name
        email: 'john@example.com',
        age: 25
      };

      const result = Result.ok(invalidInput)
        .chain(validateName)
        .chain(validateEmail)
        .map(input => ({ ...input, validated: true }));

      expect(result.isFailure).toBe(true);
      expect(result.errorValue()).toBe('Name is required');
    });

    it('should handle complex async operations', async () => {
      const fetchUserData = async (id: string): Promise<Result<TestUser, string>> => {
        if (id === '1') {
          return Result.ok({ id: '1', name: 'John', email: 'john@test.com' });
        }
        return Result.fail('User not found');
      };

      const enrichWithProfile = async (user: TestUser): Promise<Result<TestUser & { profile: string }, string>> => {
        return Result.ok({ ...user, profile: `Profile for ${user.name}` });
      };

      const validatePermissions = (user: TestUser & { profile: string }): Result<TestUser & { profile: string; canAccess: boolean }, string> => {
        if (user.id === '1') {
          return Result.ok({ ...user, canAccess: true });
        }
        return Result.fail('Access denied');
      };

      // Test successful async pipeline
      const result = await Result.ok('1')
        .chainAsync(fetchUserData)
        .then(result => result.chainAsync(enrichWithProfile))
        .then(result => result.chain(validatePermissions));

        

      expect(result.isSuccess).toBe(true);
      const finalUser = result.getValue();
      expect(finalUser).toEqual({
        id: '1',
        name: 'John',
        email: 'john@test.com',
        profile: 'Profile for John',
        canAccess: true
      });
    });

    it('should handle error recovery patterns', () => {
      const primaryService = (): Result<string, string> => Result.fail('Primary service down');
      const fallbackService = (): Result<string, string> => Result.ok('Fallback data');
      const lastResortService = (): Result<string, string> => Result.fail('All services down');

      // Try primary, then fallback, then last resort
      const result = Result.firstSuccess([
        primaryService(),
        fallbackService(),
        lastResortService()
      ]);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe('Fallback data');
    });

    it('should handle batch processing with partial failures', () => {
      const processItem = (item: string): Result<string, string> => {
        if (item === 'invalid') {
          return Result.fail(`Cannot process: ${item}`);
        }
        return Result.ok(`Processed: ${item}`);
      };

      const items = ['item1', 'item2', 'invalid', 'item4'];
      const results = items.map(processItem);
      
      // Process all items and collect results
      const successful = results.filter(isSuccess).map(r => r.getValue());
      const failed = results.filter(isFailure).map(r => r.errorValue());

      expect(successful).toEqual(['Processed: item1', 'Processed: item2', 'Processed: item4']);
      expect(failed).toEqual(['Cannot process: invalid']);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle deeply nested chain operations', () => {
      let result = Result.ok<number>(1);
      
      // Chain 100 operations
      for (let i = 0; i < 100; i++) {
        result = result.chain(value => Result.ok(value + 1));
      }
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(101);
    });

    it('should handle large data structures', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const result = Result.ok(largeArray);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().length).toBe(10000);
    });

    it('should handle null and undefined values correctly', () => {
      const nullResult = Result.ok<string | null>(null);
      const undefinedResult = Result.ok<string | undefined>();
      
      expect(nullResult.isSuccess).toBe(true);
      expect(nullResult.getValue()).toBeNull();
      
      expect(undefinedResult.isSuccess).toBe(true);
      expect(undefinedResult.getValue()).toBeUndefined();
    });

    it('should maintain type safety with generic constraints', () => {
      interface Identifiable {
        id: string;
      }
      
      const createEntity = <T extends Identifiable>(data: T): Result<T, string> => {
        if (!data.id) {
          return Result.fail('ID is required');
        }
        return Result.ok(data);
      };
      
      const user = { id: '1', name: 'John', email: 'john@test.com' };
      const result = createEntity(user);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(user);
    });
  });
});
