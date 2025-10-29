import { fail, complete, isCompleted, isFailed } from '../utils/process-helpers';
import { ProcessContext } from '../types/process-pipeline';

// Test interfaces
interface TestInput {
  id: string;
  data: number;
}

interface TestOutput {
  result: string;
  value: number;
}

// Mock context factory
const createMockContext = <TInput, TOutput>(input: TInput): ProcessContext<TInput, TOutput> => {
  let contextOutput: TOutput | undefined;
  let contextError: Error | undefined;
  let isCompletedFlag = false;
  let isFailedFlag = false;

  return {
    input,
    
    get output(): TOutput | undefined {
      return contextOutput;
    },
    
    set output(value: TOutput | undefined) {
      contextOutput = value;
      if (value !== undefined) {
        isCompletedFlag = true;
      }
    },

    state: {},

    get completed(): boolean {
      return isCompletedFlag;
    },

    get failed(): boolean {
      return isFailedFlag;
    },

    get error(): Error | undefined {
      return contextError;
    },

    set error(err: Error | undefined) {
      contextError = err;
      if (err) {
        isFailedFlag = true;
      }
    }
  };
};

describe('ProcessHelpers Utils Tests', () => {
  let mockContext: ProcessContext<TestInput, TestOutput>;
  
  beforeEach(() => {
    mockContext = createMockContext<TestInput, TestOutput>({ id: 'test', data: 42 });
  });

  describe('fail() helper function', () => {
    it('should set error from Error object', () => {
      const testError = new Error('Test error message');
      
      fail(mockContext, testError);
      
      expect(mockContext.error).toBe(testError);
      expect(mockContext.failed).toBe(true);
      expect(mockContext.completed).toBe(false);
    });

    it('should set error from string', () => {
      const errorMessage = 'String error message';
      
      fail(mockContext, errorMessage);
      
      expect(mockContext.error).toBeInstanceOf(Error);
      expect(mockContext.error?.message).toBe(errorMessage);
      expect(mockContext.failed).toBe(true);
      expect(mockContext.completed).toBe(false);
    });

    it('should preserve existing state when failing', () => {
      mockContext.state['existingData'] = 'preserved';
      
      fail(mockContext, 'Test error');
      
      expect(mockContext.failed).toBe(true);
      expect(mockContext.state['existingData']).toBe('preserved');
    });

    it('should not affect output when failing', () => {
      const testOutput: TestOutput = { result: 'test', value: 123 };
      mockContext.output = testOutput;
      
      fail(mockContext, 'Test error');
      
      expect(mockContext.failed).toBe(true);
      expect(mockContext.output).toBe(testOutput);
    });

    it('should allow multiple fail calls (last error wins)', () => {
      const firstError = new Error('First error');
      const secondError = new Error('Second error');
      
      fail(mockContext, firstError);
      expect(mockContext.error).toBe(firstError);
      
      fail(mockContext, secondError);
      expect(mockContext.error).toBe(secondError);
      expect(mockContext.failed).toBe(true);
    });
  });

  describe('complete() helper function', () => {
    it('should set output and mark as completed', () => {
      const testOutput: TestOutput = { result: 'success', value: 456 };
      
      complete(mockContext, testOutput);
      
      expect(mockContext.output).toBe(testOutput);
      expect(mockContext.completed).toBe(true);
      expect(mockContext.failed).toBe(false);
    });

    it('should preserve existing state when completing', () => {
      mockContext.state['processedData'] = 'important';
      const testOutput: TestOutput = { result: 'done', value: 789 };
      
      complete(mockContext, testOutput);
      
      expect(mockContext.completed).toBe(true);
      expect(mockContext.output).toBe(testOutput);
      expect(mockContext.state['processedData']).toBe('important');
    });

    it('should allow multiple complete calls (last output wins)', () => {
      const firstOutput: TestOutput = { result: 'first', value: 100 };
      const secondOutput: TestOutput = { result: 'second', value: 200 };
      
      complete(mockContext, firstOutput);
      expect(mockContext.output).toBe(firstOutput);
      
      complete(mockContext, secondOutput);
      expect(mockContext.output).toBe(secondOutput);
      expect(mockContext.completed).toBe(true);
    });

    it('should not affect error state when completing', () => {
      const testError = new Error('Existing error');
      mockContext.error = testError;
      const testOutput: TestOutput = { result: 'test', value: 300 };
      
      complete(mockContext, testOutput);
      
      expect(mockContext.completed).toBe(true);
      expect(mockContext.output).toBe(testOutput);
      expect(mockContext.error).toBe(testError);
      expect(mockContext.failed).toBe(true); // should remain failed
    });

    it('should handle complex output objects', () => {
      const complexOutput: TestOutput = {
        result: 'complex result with special chars: äöü',
        value: Number.MAX_SAFE_INTEGER
      };
      
      complete(mockContext, complexOutput);
      
      expect(mockContext.output).toEqual(complexOutput);
      expect(mockContext.output).toBe(complexOutput); // same reference
      expect(mockContext.completed).toBe(true);
    });
  });

  describe('isCompleted() helper function', () => {
    it('should return false for new context', () => {
      const result = isCompleted(mockContext);
      
      expect(result).toBe(false);
      expect(mockContext.completed).toBe(false);
    });

    it('should return true when output is set', () => {
      mockContext.output = { result: 'test', value: 123 };
      
      const result = isCompleted(mockContext);
      
      expect(result).toBe(true);
      expect(mockContext.completed).toBe(true);
    });

    it('should return true when complete() helper is used', () => {
      complete(mockContext, { result: 'via helper', value: 456 });
      
      const result = isCompleted(mockContext);
      
      expect(result).toBe(true);
    });

    it('should remain true after output is set multiple times', () => {
      mockContext.output = { result: 'first', value: 1 };
      expect(isCompleted(mockContext)).toBe(true);
      
      mockContext.output = { result: 'second', value: 2 };
      expect(isCompleted(mockContext)).toBe(true);
    });

    it('should not be affected by error state', () => {
      mockContext.output = { result: 'completed', value: 123 };
      mockContext.error = new Error('Some error');
      
      const result = isCompleted(mockContext);
      
      expect(result).toBe(true);
      expect(mockContext.failed).toBe(true);
      expect(mockContext.completed).toBe(true);
    });

    it('should not mutate context', () => {
      const originalCompleted = mockContext.completed;
      const originalFailed = mockContext.failed;
      const originalOutput = mockContext.output;
      const originalError = mockContext.error;
      
      isCompleted(mockContext);
      
      expect(mockContext.completed).toBe(originalCompleted);
      expect(mockContext.failed).toBe(originalFailed);
      expect(mockContext.output).toBe(originalOutput);
      expect(mockContext.error).toBe(originalError);
    });
  });

  describe('isFailed() helper function', () => {
    it('should return false for new context', () => {
      const result = isFailed(mockContext);
      
      expect(result).toBe(false);
      expect(mockContext.failed).toBe(false);
    });

    it('should return true when error is set', () => {
      mockContext.error = new Error('Test error');
      
      const result = isFailed(mockContext);
      
      expect(result).toBe(true);
      expect(mockContext.failed).toBe(true);
    });

    it('should return true when fail() helper is used', () => {
      fail(mockContext, 'Via helper error');
      
      const result = isFailed(mockContext);
      
      expect(result).toBe(true);
    });

    it('should remain true after error is set multiple times', () => {
      mockContext.error = new Error('First error');
      expect(isFailed(mockContext)).toBe(true);
      
      mockContext.error = new Error('Second error');
      expect(isFailed(mockContext)).toBe(true);
    });

    it('should not be affected by completion state', () => {
      mockContext.error = new Error('Failed');
      mockContext.output = { result: 'but completed', value: 123 };
      
      const result = isFailed(mockContext);
      
      expect(result).toBe(true);
      expect(mockContext.completed).toBe(true);
      expect(mockContext.failed).toBe(true);
    });

    it('should not mutate context', () => {
      const originalCompleted = mockContext.completed;
      const originalFailed = mockContext.failed;
      const originalOutput = mockContext.output;
      const originalError = mockContext.error;
      
      isFailed(mockContext);
      
      expect(mockContext.completed).toBe(originalCompleted);
      expect(mockContext.failed).toBe(originalFailed);
      expect(mockContext.output).toBe(originalOutput);
      expect(mockContext.error).toBe(originalError);
    });
  });

  describe('Helper Functions Integration', () => {
    it('should work together in typical workflow', () => {
      // Initial state
      expect(isCompleted(mockContext)).toBe(false);
      expect(isFailed(mockContext)).toBe(false);
      
      // Add some processing state
      mockContext.state['step1'] = 'processed';
      
      // Complete successfully
      complete(mockContext, { result: 'final result', value: 999 });
      
      expect(isCompleted(mockContext)).toBe(true);
      expect(isFailed(mockContext)).toBe(false);
      expect(mockContext.output?.result).toBe('final result');
      expect(mockContext.state['step1']).toBe('processed');
    });

    it('should handle failure workflow', () => {
      // Initial state
      expect(isCompleted(mockContext)).toBe(false);
      expect(isFailed(mockContext)).toBe(false);
      
      // Add some processing state
      mockContext.state['attemptedStep'] = 'step2';
      
      // Fail with error
      fail(mockContext, 'Processing failed at step2');
      
      expect(isCompleted(mockContext)).toBe(false);
      expect(isFailed(mockContext)).toBe(true);
      expect(mockContext.error?.message).toBe('Processing failed at step2');
      expect(mockContext.state['attemptedStep']).toBe('step2');
    });

    it('should handle mixed completion and failure states', () => {
      // Complete first
      complete(mockContext, { result: 'done', value: 100 });
      expect(isCompleted(mockContext)).toBe(true);
      expect(isFailed(mockContext)).toBe(false);
      
      // Then fail (both flags should be true)
      fail(mockContext, 'Something went wrong after completion');
      expect(isCompleted(mockContext)).toBe(true);
      expect(isFailed(mockContext)).toBe(true);
      
      // Output should be preserved
      expect(mockContext.output).toEqual({ result: 'done', value: 100 });
      expect(mockContext.error?.message).toBe('Something went wrong after completion');
    });

    it('should support type safety with different input/output types', () => {
      interface StringInput { text: string; }
      interface NumberOutput { count: number; }
      
      const stringContext = createMockContext<StringInput, NumberOutput>({ text: 'hello' });
      
      // Type-safe operations
      complete(stringContext, { count: 5 });
      expect(isCompleted(stringContext)).toBe(true);
      expect(stringContext.output?.count).toBe(5);
      
      fail(stringContext, 'Type-safe error');
      expect(isFailed(stringContext)).toBe(true);
    });
  });
});