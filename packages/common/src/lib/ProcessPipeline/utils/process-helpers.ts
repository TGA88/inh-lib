// utils/process-helpers.ts

import { ProcessContext, ProcessResult } from '../types/process-pipeline';
import { Either, left, right } from '../../Either';
import {Result } from '../../ResultV2';
import { BaseFailure } from '../../Failure/BaseFailure';
import { toBaseFailure } from '../../Failure/failureHelper';



// ========================================
// Fail Context (หยุด pipeline)
// ========================================

export function fail<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>,
  error: string | Error | BaseFailure
): void {
  ctx.error = toBaseFailure(error);
}

// ========================================
// Complete Context (set output)
// ========================================

export function complete<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>,
  output: TOutput
): void {
  ctx.output = output;
}

// ========================================
// Check if completed
// ========================================

export function isCompleted<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>
): boolean {
  return ctx.completed;
}

// ========================================
// Check if failed
// ========================================

export function isFailed<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>
): boolean {
  return ctx.failed;
}

export function processContextToEither<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>
): Either<BaseFailure, TOutput> {
  if (isFailed(ctx)) {
    return left(ctx.error as BaseFailure);
  }
  return right(ctx.output as TOutput);
} 

export function processContextToResult<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>
): Result<TOutput, BaseFailure> {
  if (isFailed(ctx)) {
    return Result.fail(ctx.error as BaseFailure);
  }
  return Result.ok(ctx.output as TOutput);
}

export function processResultToEither<TOutput>(
  result: ProcessResult<TOutput>
): Either<BaseFailure, TOutput> {
  if (!result.success) {
 
    return left(result.error as BaseFailure);
  }
  return right(result.output as TOutput);
}

export function processResultToResult<TOutput>(
  result: ProcessResult<TOutput>
): Result<TOutput, BaseFailure> {
  if (!result.success) {
    return Result.fail(result.error as BaseFailure);
  }
  return Result.ok(result.output as TOutput);
}


