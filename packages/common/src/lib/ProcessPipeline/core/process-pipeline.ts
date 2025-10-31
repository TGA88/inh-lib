// core/process-pipeline.ts

import {  Result } from '../../ResultV2';
import {BaseFailure} from '../../Failure/BaseFailure';

import {
  ProcessContext,
  ProcessStepFn,
  ProcessActionFn
} from '../types/process-pipeline';
import { CommonFailures } from '../../Failure/CommonFailures';

export class ProcessPipeline<TInput = unknown, TOutput = unknown> {
  private readonly middlewares: ProcessStepFn<TInput, TOutput>[] = [];
  private handler: ProcessActionFn<TInput, TOutput> | null = null;

  // ========================================
  // Builder Methods
  // ========================================

  use(middleware: ProcessStepFn<TInput, TOutput>): this {
    this.middlewares.push(middleware);
    return this;
  }

  useMany(middlewares: ProcessStepFn<TInput, TOutput>[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  setHandler(handler: ProcessActionFn<TInput, TOutput>): this {
    this.handler = handler;
    return this;
  }

  // ========================================
  // Execution
  // ========================================

  async execute(input: TInput): Promise<Result<TOutput,BaseFailure>> {
    // Create context
    const ctx = this.createContext(input);

    try {
      // Execute middlewares
      for (const middleware of this.middlewares) {
        // ✅ ไม่ break เมื่อมี output - ให้ทำงานต่อ
        if (ctx.failed || ctx.completed) {
          break; // หยุดเมื่อ fail เท่านั้น
        }

        await middleware(ctx);
      }

      // // Execute handler ถ้ายังไม่ fail
      // if (!ctx.failed && this.handler) {
      //   await this.handler(ctx);
      // }

      // Return result
      // return {
      //   success: !ctx.failed,
      //   output: ctx.output,
      //   error: ctx.error,
      //   state: ctx.state
      // };
      if (ctx.failed) {
        return Result.fail(ctx.error as BaseFailure);
      }
      return Result.ok(ctx.output);

    } catch (error) {
      // Handle unexpected errors
      const err = error instanceof Error ? error : new Error(String(error));
      
      // return {
      //   success: false,
      //   error: err,
      //   state: ctx.state
      // };
      return Result.fail(new CommonFailures.InternalFail(err.message));
    }
  }

  // ========================================
  // Context Creation
  // ========================================

  private createContext(input: TInput): ProcessContext<TInput, TOutput> {
    let isCompleted = false;
    let isFailed = false;
    let contextError: Error | undefined;
    let contextOutput: TOutput | undefined;

    return {
      input,
      
      get output(): TOutput | undefined {
        return contextOutput;
      },
      
      set output(value: TOutput | undefined) {
        contextOutput = value;
        if (value !== undefined) {
          isCompleted = true;
        }
      },

      state: {},

      get completed(): boolean {
        return isCompleted;
      },

      get failed(): boolean {
        return isFailed;
      },

      get error(): Error | undefined {
        return contextError;
      },

      set error(err: Error | undefined) {
        contextError = err;
        if (err) {
          isFailed = true;
        }
      }
    };
  }
}