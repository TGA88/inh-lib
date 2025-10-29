// utils/process-helpers.ts

import { ProcessContext } from '../types/process-pipeline';

// ========================================
// Fail Context (หยุด pipeline)
// ========================================

export function fail<TInput, TOutput>(
  ctx: ProcessContext<TInput, TOutput>,
  error: string | Error
): void {
  ctx.error = error instanceof Error ? error : new Error(error);
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