// types/process-pipeline.ts

// ========================================
// Process Context
// ========================================

export interface ProcessContext<TInput = unknown, TOutput = unknown> {
  // Input data
  input: TInput;
  
  // Output data (จะถูก set โดย middleware)
  output?: TOutput;
  
  // Shared data ระหว่าง middleware
  state: Record<string, unknown>;
  
  // Status flags
  readonly completed: boolean;
  readonly failed: boolean;
  
  // Error handling
  error?: Error;
}

// ========================================
// Process Middleware Types
// ========================================

export type ProcessStepFn<TInput = unknown, TOutput = unknown> = (
  ctx: ProcessContext<TInput, TOutput>
) => Promise<void> | void;

export type ProcessActionFn<TInput = unknown, TOutput = unknown> = (
  ctx: ProcessContext<TInput, TOutput>
) => Promise<void> | void;

// ========================================
// Process Result
// ========================================

export interface ProcessResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: Error;
  state: Record<string, unknown>;
}