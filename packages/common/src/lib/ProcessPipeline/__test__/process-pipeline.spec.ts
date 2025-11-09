import { CommonFailures } from '../../Failure/CommonFailures';
import { createProcessContext, ProcessPipeline } from '../core/process-pipeline';
import { ProcessContext, ProcessStepFn, ProcessActionFn } from '../types/process-pipeline';

// Test interfaces
interface TestInput {
  value: number;
  name: string;
}

interface TestOutput {
  result: number;
  message: string;
}

// Helper function to avoid deep nesting
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

describe('ProcessPipeline Core Tests', () => {
  let pipeline: ProcessPipeline<TestInput, TestOutput>;

  beforeEach(() => {
    pipeline = new ProcessPipeline<TestInput, TestOutput>();
  });

  describe('CreateProcessContext', () => {
    it('should create context with correct initial values', () => {
      const input: TestInput = { value: 42, name: 'test' };

      // Use generics to get the correctly typed context without any casting
      const ctx = createProcessContext<TestInput, TestOutput>(input);

      expect(ctx).toBeDefined();
      expect(ctx.input).toBe(input);
      expect(ctx.output).toBeUndefined();
      expect(ctx.state).toEqual({});
      expect(ctx.completed).toBe(false);
      expect(ctx.failed).toBe(false);
      expect(ctx.error).toBeUndefined();
    });

    it('should update completed flag when output is set', () => {
      const input: TestInput = { value: 42, name: 'test' };
      const ctx = createProcessContext<TestInput, TestOutput>(input);

      expect(ctx.completed).toBe(false);

      const output: TestOutput = { result: 84, message: 'doubled' };
      ctx.output = output;

      expect(ctx.output).toBe(output);
      expect(ctx.completed).toBe(true);
    });

    it('should update failed flag when error is set', () => {
      const input: TestInput = { value: 42, name: 'test' };
      const ctx = createProcessContext<TestInput, TestOutput>(input);

      expect(ctx.failed).toBe(false);

      const testError = new CommonFailures.InternalFail('Test failure');
      ctx.error = testError;

      expect(ctx.error).toBe(testError);
      expect(ctx.failed).toBe(true);
    }); 
  });

  describe('Pipeline Construction', () => {
    it('should create empty pipeline', () => {
      expect(pipeline).toBeInstanceOf(ProcessPipeline);
    });

    it('should add single middleware', () => {
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn();
      
      const result = pipeline.use(middleware);
      
      expect(result).toBe(pipeline); // fluent interface
    });

    it('should add multiple middlewares', () => {
      const middleware1: ProcessStepFn<TestInput, TestOutput> = jest.fn();
      const middleware2: ProcessStepFn<TestInput, TestOutput> = jest.fn();
      const middlewares = [middleware1, middleware2];
      
      const result = pipeline.useMany(middlewares);
      
      expect(result).toBe(pipeline); // fluent interface
    });

    it('should set handler', () => {
      const handler: ProcessActionFn<TestInput, TestOutput> = jest.fn();
      
      const result = pipeline.setHandler(handler);
      
      expect(result).toBe(pipeline); // fluent interface
    });

    it('should chain method calls', () => {
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn();
      const handler: ProcessActionFn<TestInput, TestOutput> = jest.fn();
      
      const result = pipeline
        .use(middleware)
        .setHandler(handler);
      
      expect(result).toBe(pipeline);
    });
  });

  describe('Pipeline Execution - Success Cases', () => {
    it('should execute empty pipeline successfully', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(true);
      expect(result.output).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.state).toEqual({});
    });

    it('should execute single middleware', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const middlewareSpy = jest.fn<void, [ProcessContext<TestInput, TestOutput>]>();
      
      pipeline.use(middlewareSpy);
      
      const result = await pipeline.execute(input);
      
      expect(middlewareSpy).toHaveBeenCalledTimes(1);
      expect(middlewareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          input,
          output: undefined,
          state: {},
          completed: false,
          failed: false,
          error: undefined
        })
      );
      expect(result.success).toBe(true);
    });

    it('should execute multiple middlewares in order', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const executionOrder: number[] = [];
      
      const middleware1: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        executionOrder.push(1);
      });
      
      const middleware2: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        executionOrder.push(2);
      });
      
      const middleware3: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        executionOrder.push(3);
      });
      
      pipeline
        .use(middleware1)
        .use(middleware2)
        .use(middleware3);
      
      await pipeline.execute(input);
      
      expect(executionOrder).toEqual([1, 2, 3]);
      expect(middleware1).toHaveBeenCalledTimes(1);
      expect(middleware2).toHaveBeenCalledTimes(1);
      expect(middleware3).toHaveBeenCalledTimes(1);
    });

    it('should execute handler after middlewares', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const executionOrder: string[] = [];
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        executionOrder.push('middleware');
      });
      
      const handler: ProcessActionFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        executionOrder.push('handler');
      });
      
      pipeline
        .use(middleware)
        .setHandler(handler);
      
      await pipeline.execute(input);
      
      expect(executionOrder).toEqual(['middleware', 'handler']);
    });

    it('should share context between middlewares', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      let sharedContext: ProcessContext<TestInput, TestOutput> | null = null;
      
      const middleware1: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        ctx.state.counter = 1;
        ctx.state.logs = ['middleware1'];
        sharedContext = ctx;
      });
      
      const middleware2: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        expect(ctx).toBe(sharedContext); // same reference
        expect(ctx.state.counter).toBe(1);
        expect(ctx.state.logs).toEqual(['middleware1']);
        
        ctx.state.counter = 2;
        (ctx.state.logs as string[]).push('middleware2');
      });
      
      pipeline
        .use(middleware1)
        .use(middleware2);
      
      const result = await pipeline.execute(input);
      
      expect(result.state).toEqual({
        counter: 2,
        logs: ['middleware1', 'middleware2']
      });
    });

    it('should set output in middleware', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const expectedOutput: TestOutput = { result: 20, message: 'doubled' };
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        ctx.output = expectedOutput;
      });
      
      pipeline.use(middleware);
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual(expectedOutput);
    });

  });

  describe('Pipeline Execution - Error Cases', () => {
    it('should handle middleware failure', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const testError = new Error('Middleware failed');
      
      const middleware1: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        ctx.error = testError;
      });
      
      const middleware2: ProcessStepFn<TestInput, TestOutput> = jest.fn();
      const handler: ProcessActionFn<TestInput, TestOutput> = jest.fn();
      
      pipeline
        .use(middleware1)
        .use(middleware2)
        .setHandler(handler);
      
      const result = await pipeline.execute(input);
      
      expect(middleware1).toHaveBeenCalledTimes(1);
      expect(middleware2).not.toHaveBeenCalled(); // should stop execution
      expect(handler).not.toHaveBeenCalled(); // should not run handler
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(testError.message);
    });

    it('should handle handler failure', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const testError = new Error('Handler failed');
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn();
      const handler: ProcessActionFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        ctx.error = testError;
      });
      
      pipeline
        .use(middleware)
        .setHandler(handler);
      
      const result = await pipeline.execute(input);
      
      expect(middleware).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(testError.message);
    });

    it('should handle thrown exceptions', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const thrownError = new Error('Thrown error');
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        throw thrownError;
      });
      
      pipeline.use(middleware);
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(false);
      expect(result.error?.name).toBe("TryCatchFail");
    });

    it('should handle thrown non-Error exceptions', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const thrownValue = 'String error';
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(() => {
        throw thrownValue;
      });
      
      pipeline.use(middleware);
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('String error');
    });

    it('should preserve state even when failed', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const testError = new Error('Test error');
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        ctx.state.processedData = 'some data';
        ctx.error = testError;
      });
      
      pipeline.use(middleware);
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(testError.message);
      expect(result.state).toEqual({ processedData: 'some data' });
    });
  });

  describe('Async Middleware Support', () => {
    it('should support async middlewares', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const delayMs = 10;
      
      const asyncMiddleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation(async (ctx) => {
        await delay(delayMs);
        ctx.state.asyncProcessed = true;
      });
      
      const syncMiddleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        expect(ctx.state.asyncProcessed).toBe(true); // should execute after async
        ctx.state.syncProcessed = true;
      });
      
      pipeline
        .use(asyncMiddleware)
        .use(syncMiddleware);
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(true);
      expect(result.state).toEqual({
        asyncProcessed: true,
        syncProcessed: true
      });
    });

    it('should support async handlers', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const expectedOutput: TestOutput = { result: 42, message: 'async result' };
      
      const asyncHandler: ProcessActionFn<TestInput, TestOutput> = jest.fn().mockImplementation(async (ctx) => {
        await delay(10);
        ctx.output = expectedOutput;
      });
      
      pipeline.setHandler(asyncHandler);
      
      const result = await pipeline.execute(input);
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual(expectedOutput);
    });
  });

  describe('Context Properties', () => {
    it('should provide readonly access to context properties', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        // Test input access
        expect(ctx.input).toEqual(input);
        expect(ctx.input).toBe(input); // same reference
        
        // Test initial state
        expect(ctx.completed).toBe(false);
        expect(ctx.failed).toBe(false);
        expect(ctx.output).toBeUndefined();
        expect(ctx.error).toBeUndefined();
        expect(ctx.state).toEqual({});
        
        // Test state mutation
        ctx.state.testValue = 'test';
        expect(ctx.state.testValue).toBe('test');
      });
      
      pipeline.use(middleware);
      
      await pipeline.execute(input);
    });

    it('should update completed flag when output is set', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const output: TestOutput = { result: 20, message: 'test' };
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        expect(ctx.completed).toBe(false);
        
        ctx.output = output;
        
        expect(ctx.completed).toBe(true);
        expect(ctx.output).toBe(output);
      });
      
      pipeline.use(middleware);
      
      await pipeline.execute(input);
    });

    it('should update failed flag when error is set', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const testError = new Error('Test error');
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        expect(ctx.failed).toBe(false);
        
        ctx.error = testError;
        
        expect(ctx.failed).toBe(true);
        expect(ctx.error).toBe(testError);
      });
      
      pipeline.use(middleware);
      
      await pipeline.execute(input);
    });

    it('should allow clearing output by setting undefined', async () => {
      const input: TestInput = { value: 10, name: 'test' };
      const output: TestOutput = { result: 20, message: 'test' };
      
      const middleware: ProcessStepFn<TestInput, TestOutput> = jest.fn().mockImplementation((ctx) => {
        ctx.output = output;
        expect(ctx.completed).toBe(true);
        expect(ctx.output).toBe(output);
        
        ctx.output = undefined;
        expect(ctx.output).toBeUndefined();
        // Note: completed flag behavior when setting undefined may vary
      });
      
      pipeline.use(middleware);
      
      await pipeline.execute(input);
    });
  });
});