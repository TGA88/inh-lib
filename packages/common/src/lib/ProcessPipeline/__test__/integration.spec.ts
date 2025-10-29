import { ProcessPipeline } from '../core/process-pipeline';
import { ProcessContext, ProcessStepFn, ProcessActionFn } from '../types/process-pipeline';
import { fail, complete, isCompleted, isFailed } from '../utils/process-helpers';

// Integration test interfaces
interface ValidationInput {
  email: string;
  age: number;
  name: string;
}

interface ProcessedUser {
  id: string;
  normalizedEmail: string;
  ageCategory: string;
  displayName: string;
  isValid: boolean;
}

describe('ProcessPipeline Integration Tests', () => {
  describe('Real-world User Validation Pipeline', () => {
    let pipeline: ProcessPipeline<ValidationInput, ProcessedUser>;

    // Helper function to create validation state
    const initValidationState = (ctx: ProcessContext<ValidationInput, ProcessedUser>): void => {
      ctx.state['emailValid'] = false;
      ctx.state['ageValid'] = false;
      ctx.state['nameValid'] = false;
      ctx.state['errors'] = [];
    };

    // Email validation middleware
    const emailValidationMiddleware: ProcessStepFn<ValidationInput, ProcessedUser> = (ctx) => {
      const email = ctx.input.email;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!email || !emailRegex.test(email)) {
        (ctx.state['errors'] as string[]).push('Invalid email format');
        return;
      }
      
      ctx.state['emailValid'] = true;
      ctx.state['normalizedEmail'] = email.toLowerCase().trim();
    };

    // Age validation middleware
    const ageValidationMiddleware: ProcessStepFn<ValidationInput, ProcessedUser> = (ctx) => {
      const age = ctx.input.age;
      
      if (age < 0 || age > 150) {
        (ctx.state['errors'] as string[]).push('Age must be between 0 and 150');
        return;
      }
      
      ctx.state['ageValid'] = true;
      
      // Categorize age
      if (age < 18) {
        ctx.state['ageCategory'] = 'minor';
      } else if (age < 65) {
        ctx.state['ageCategory'] = 'adult';
      } else {
        ctx.state['ageCategory'] = 'senior';
      }
    };

    // Name validation middleware
    const nameValidationMiddleware: ProcessStepFn<ValidationInput, ProcessedUser> = (ctx) => {
      const name = ctx.input.name;
      
      if (!name || name.trim().length < 2) {
        (ctx.state['errors'] as string[]).push('Name must be at least 2 characters');
        return;
      }
      
      ctx.state['nameValid'] = true;
      ctx.state['displayName'] = name.trim();
    };

    // Validation result middleware
    const validationResultMiddleware: ProcessStepFn<ValidationInput, ProcessedUser> = (ctx) => {
      const errors = ctx.state['errors'] as string[];
      
      if (errors.length > 0) {
        fail(ctx, `Validation failed: ${errors.join(', ')}`);
        return;
      }
      
      ctx.state['allValid'] = true;
    };

    // User creation handler
    const userCreationHandler: ProcessActionFn<ValidationInput, ProcessedUser> = (ctx) => {
      if (isFailed(ctx)) {
        return; // Skip if validation failed
      }

      const user: ProcessedUser = {
        id: `user_${Date.now()}`,
        normalizedEmail: ctx.state['normalizedEmail'] as string,
        ageCategory: ctx.state['ageCategory'] as string,
        displayName: ctx.state['displayName'] as string,
        isValid: true
      };

      complete(ctx, user);
    };

    beforeEach(() => {
      pipeline = new ProcessPipeline<ValidationInput, ProcessedUser>()
        .use(initValidationState)
        .use(emailValidationMiddleware)
        .use(ageValidationMiddleware)
        .use(nameValidationMiddleware)
        .use(validationResultMiddleware)
        .setHandler(userCreationHandler);
    });

    it('should successfully process valid user input', async () => {
      const validInput: ValidationInput = {
        email: 'John.Doe@Example.COM',
        age: 25,
        name: '  John Doe  '
      };

      const result = await pipeline.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.output).toBeDefined();
      expect(result.output?.normalizedEmail).toBe('john.doe@example.com');
      expect(result.output?.ageCategory).toBe('adult');
      expect(result.output?.displayName).toBe('John Doe');
      expect(result.output?.isValid).toBe(true);
      expect(result.output?.id).toMatch(/^user_\d+$/);
      
      // Verify state
      expect(result.state['emailValid']).toBe(true);
      expect(result.state['ageValid']).toBe(true);
      expect(result.state['nameValid']).toBe(true);
      expect(result.state['allValid']).toBe(true);
      expect(result.state['errors']).toEqual([]);
    });

    it('should fail with invalid email', async () => {
      const invalidInput: ValidationInput = {
        email: 'invalid-email',
        age: 25,
        name: 'John Doe'
      };

      const result = await pipeline.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid email format');
      expect(result.output).toBeUndefined();
      
      // Verify state shows which validations failed
      expect(result.state['emailValid']).toBe(false);
      expect(result.state['ageValid']).toBe(true);
      expect(result.state['nameValid']).toBe(true);
      expect(result.state['errors']).toContain('Invalid email format');
    });

    it('should fail with invalid age', async () => {
      const invalidInput: ValidationInput = {
        email: 'test@example.com',
        age: -5,
        name: 'John Doe'
      };

      const result = await pipeline.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Age must be between 0 and 150');
      expect(result.output).toBeUndefined();
      
      expect(result.state['emailValid']).toBe(true);
      expect(result.state['ageValid']).toBe(false);
      expect(result.state['nameValid']).toBe(true);
    });

    it('should fail with invalid name', async () => {
      const invalidInput: ValidationInput = {
        email: 'test@example.com',
        age: 25,
        name: ' '
      };

      const result = await pipeline.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Name must be at least 2 characters');
      expect(result.output).toBeUndefined();
    });

    it('should accumulate multiple validation errors', async () => {
      const invalidInput: ValidationInput = {
        email: 'bad-email',
        age: 200,
        name: 'X'
      };

      const result = await pipeline.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid email format');
      expect(result.error?.message).toContain('Age must be between 0 and 150');
      expect(result.error?.message).toContain('Name must be at least 2 characters');
      
      const errors = result.state['errors'] as string[];
      expect(errors).toHaveLength(3);
      expect(errors).toContain('Invalid email format');
      expect(errors).toContain('Age must be between 0 and 150');
      expect(errors).toContain('Name must be at least 2 characters');
    });

    it('should categorize ages correctly', async () => {
      const testCases = [
        { age: 10, expected: 'minor' },
        { age: 17, expected: 'minor' },
        { age: 18, expected: 'adult' },
        { age: 30, expected: 'adult' },
        { age: 64, expected: 'adult' },
        { age: 65, expected: 'senior' },
        { age: 80, expected: 'senior' }
      ];

      for (const testCase of testCases) {
        const input: ValidationInput = {
          email: 'test@example.com',
          age: testCase.age,
          name: 'Test User'
        };

        const result = await pipeline.execute(input);

        expect(result.success).toBe(true);
        expect(result.output?.ageCategory).toBe(testCase.expected);
      }
    });
  });

  describe('Early Exit Pipeline', () => {
    it('should support early completion in middleware', async () => {
      const pipeline = new ProcessPipeline<string, string>()
        .use((ctx) => {
          if (ctx.input === 'fast') {
            complete(ctx, 'fast result');
            return;
          }
          ctx.state['step1'] = 'completed';
        })
        .use((ctx) => {
          // This should still run even if completed
          ctx.state['step2'] = 'completed';
        })
        .setHandler((ctx) => {
          if (!isCompleted(ctx)) {
            complete(ctx, 'handler result');
          }
        });

      // Test early completion
      const fastResult = await pipeline.execute('fast');
      expect(fastResult.success).toBe(true);
      expect(fastResult.output).toBe('fast result');
      expect(fastResult.state['step1']).toBeUndefined();
      expect(fastResult.state['step2']).toBe('completed'); // Should still run

      // Test normal flow
      const normalResult = await pipeline.execute('normal');
      expect(normalResult.success).toBe(true);
      expect(normalResult.output).toBe('handler result');
      expect(normalResult.state['step1']).toBe('completed');
      expect(normalResult.state['step2']).toBe('completed');
    });

    it('should support early failure in middleware', async () => {
      const pipeline = new ProcessPipeline<number, number>()
        .use((ctx) => {
          if (ctx.input < 0) {
            fail(ctx, 'Negative numbers not allowed');
            return;
          }
          ctx.state['validated'] = true;
        })
        .use((ctx) => {
          // This should not run if failed
          ctx.state['processed'] = true;
        })
        .setHandler((ctx) => {
          // This should not run if failed
          complete(ctx, ctx.input * 2);
        });

      // Test early failure
      const failResult = await pipeline.execute(-5);
      expect(failResult.success).toBe(false);
      expect(failResult.error?.message).toBe('Negative numbers not allowed');
      expect(failResult.output).toBeUndefined();
      expect(failResult.state['validated']).toBeUndefined();
      expect(failResult.state['processed']).toBeUndefined();

      // Test normal flow
      const successResult = await pipeline.execute(5);
      expect(successResult.success).toBe(true);
      expect(successResult.output).toBe(10);
      expect(successResult.state['validated']).toBe(true);
      expect(successResult.state['processed']).toBe(true);
    });
  });

  describe('State Management Integration', () => {
    it('should handle complex state sharing between helpers and pipeline', async () => {
      const pipeline = new ProcessPipeline<string[], string>()
        .use((ctx) => {
          // Initialize complex state
          ctx.state['step'] = 1;
          ctx.state['data'] = [];
          ctx.state['metadata'] = { startTime: Date.now() };
        })
        .use((ctx) => {
          const data = ctx.state['data'] as unknown[];
          const step = ctx.state['step'] as number;
          
          // Process each item
          for (let index = 0; index < ctx.input.length; index++) {
            const item = ctx.input[index];
            data.push({ item, index, step });
          }
          
          ctx.state['step'] = step + 1;
          
          if (ctx.input.length === 0) {
            fail(ctx, 'Empty input not allowed');
          }
        })
        .use((ctx) => {
          if (isFailed(ctx)) {
            return; // Skip if failed
          }
          
          const metadata = ctx.state['metadata'] as Record<string, unknown>;
          metadata['processedAt'] = Date.now();
          metadata['itemCount'] = ctx.input.length;
          
          ctx.state['step'] = (ctx.state['step'] as number) + 1;
        })
        .setHandler((ctx) => {
          if (isFailed(ctx)) {
            return;
          }
          
          const data = ctx.state['data'] as unknown[];
          const metadata = ctx.state['metadata'] as Record<string, unknown>;
          
          const result = `Processed ${data.length} items at step ${ctx.state['step']}`;
          metadata['result'] = result;
          
          complete(ctx, result);
        });

      // Test successful processing
      const successResult = await pipeline.execute(['a', 'b', 'c']);
      expect(successResult.success).toBe(true);
      expect(successResult.output).toBe('Processed 3 items at step 3');
      expect(successResult.state['step']).toBe(3);
      expect(successResult.state['data']).toHaveLength(3);
      
      const metadata = successResult.state['metadata'] as Record<string, unknown>;
      expect(metadata['itemCount']).toBe(3);
      expect(metadata['result']).toBe('Processed 3 items at step 3');

      // Test failure case
      const failResult = await pipeline.execute([]);
      expect(failResult.success).toBe(false);
      expect(failResult.error?.message).toBe('Empty input not allowed');
      expect(failResult.state['step']).toBe(2); // Should stop at step 2
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle graceful error recovery scenarios', async () => {
      const pipeline = new ProcessPipeline<{ value: number; retryOnFail: boolean }, number>()
        .use((ctx) => {
          ctx.state['attempts'] = 0;
          ctx.state['maxAttempts'] = 3;
        })
        .use((ctx) => {
          const attempts = (ctx.state['attempts'] as number) + 1;
          ctx.state['attempts'] = attempts;
          
          if (ctx.input.value < 0 && attempts < (ctx.state['maxAttempts'] as number)) {
            if (ctx.input.retryOnFail) {
              // Simulate retry by adjusting the value
              ctx.state['adjustedValue'] = Math.abs(ctx.input.value);
              return;
            }
          }
          
          if (ctx.input.value < 0) {
            fail(ctx, `Negative value after ${attempts} attempts`);
            return;
          }
          
          ctx.state['adjustedValue'] = ctx.input.value;
        })
        .setHandler((ctx) => {
          if (isFailed(ctx)) {
            return;
          }
          
          const value = ctx.state['adjustedValue'] as number;
          complete(ctx, value * 2);
        });

      // Test successful retry
      const retryResult = await pipeline.execute({ value: -5, retryOnFail: true });
      expect(retryResult.success).toBe(true);
      expect(retryResult.output).toBe(10); // Math.abs(-5) * 2
      expect(retryResult.state['attempts']).toBe(1);

      // Test failure without retry
      const noRetryResult = await pipeline.execute({ value: -5, retryOnFail: false });
      expect(noRetryResult.success).toBe(false);
      expect(noRetryResult.error?.message).toBe('Negative value after 1 attempts');

      // Test normal success
      const normalResult = await pipeline.execute({ value: 5, retryOnFail: false });
      expect(normalResult.success).toBe(true);
      expect(normalResult.output).toBe(10);
      expect(normalResult.state['attempts']).toBe(1);
    });
  });
});