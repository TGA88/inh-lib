// core/process-pipeline.ts




import {
  ProcessContext,
  ProcessStepFn,
  ProcessActionFn,
  ProcessResult
} from '../types/process-pipeline';

import { toBaseFailure } from '../../Failure/failureHelper';
import { BaseFailure } from '../../Failure/BaseFailure';
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

  async execute(input: TInput): Promise<ProcessResult<TOutput>> {
    // Create context
    const ctx = this.createContext(input);

    try {
      // Execute middlewares
      for (const middleware of this.middlewares) {
        // ✅ ไม่ break เมื่อมี output - ให้ทำงานต่อ
        if (ctx.failed) {
          break; // หยุดเมื่อ fail เท่านั้น
        }
        if (ctx.completed) {
          break; // หยุดเมื่อ completed เท่านั้น
        }

        await middleware(ctx);
      }

      // Execute handler ถ้ายังไม่ fail และไม่ completed
      if (!ctx.failed && !ctx.completed && this.handler) {
        await this.handler(ctx);
      }

      // Return ProcessResult
      const failed = ctx.failed ? toBaseFailure(ctx.error) : undefined;
      const processResult: ProcessResult<TOutput> = {
        success: !ctx.failed,
        output: ctx.output,
        error: failed,
        state: ctx.state
      };
      return processResult;

      // if (ctx.failed) {
      //   return Result.fail(ctx.error as BaseFailure);
      // }
      // return Result.ok(ctx.output);

    } catch (error) {
      // Handle unexpected errors
      const err = error instanceof Error ? error : new Error(String(error));

      const processResult: ProcessResult<TOutput> = {
        success: false,
        error: new CommonFailures.TryCatchFail(err.message, { error: err }),
        state: ctx.state
      };
      return processResult;
      // return Result.fail(new CommonFailures.InternalFail(err.message));
    }
  }

  // ========================================
  // Context Creation
  // ========================================

  // private createContext(input: TInput): ProcessContext<TInput, TOutput> {
  //   let isCompleted = false;
  //   let isFailed = false;
  //   let contextError: Error | undefined;
  //   let contextOutput: TOutput | undefined;

  //   return {
  //     input,

  //     get output(): TOutput | undefined {
  //       return contextOutput;
  //     },

  //     set output(value: TOutput | undefined) {
  //       contextOutput = value;
  //       if (value !== undefined) {
  //         isCompleted = true;
  //       }
  //     },

  //     state: {},

  //     get completed(): boolean {
  //       return isCompleted;
  //     },

  //     get failed(): boolean {
  //       return isFailed;
  //     },

  //     get error(): Error | undefined {
  //       return contextError;
  //     },

  //     set error(err: Error | undefined) {
  //       contextError = err;
  //       if (err) {
  //         isFailed = true;
  //       }
  //     }
  //   };
  // }

  private createContext(input: TInput): ProcessContext<TInput, TOutput> {
    return createProcessContext<TInput, TOutput>(input);
  }

}

export function createProcessContext<TInput, TOutput>(input: TInput): ProcessContext<TInput, TOutput> {
    let isCompleted = false;
    let isFailed = false;
    let contextError: BaseFailure | undefined;
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

      get error(): BaseFailure | undefined {
        return contextError;
      },

      set error(err: BaseFailure | undefined) {
        contextError = err;
        if (err) {
          isFailed = true;
        }
      }
    };
  }

  