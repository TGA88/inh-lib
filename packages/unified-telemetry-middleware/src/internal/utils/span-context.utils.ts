/**
 * Span context management utilities
 * For managing hierarchical spans across different layers
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import {  type UnifiedTelemetryLogger, type UnifiedTelemetrySpan } from '@inh-lib/unified-telemetry-core';
import { getRegistryItem, addRegistryItem } from '@inh-lib/unified-route';
import { INTERNAL_REGISTRY_KEYS } from '../constants/telemetry.const';

const SPAN_STACK_KEY = 'telemetry:spanStack';
const CURRENT_SPAN_KEY = 'telemetry:currentSpan';
export const CURRENT_LOGGER_KEY =  INTERNAL_REGISTRY_KEYS.TELEMETRY_CURRENT_LOGGER

/**
 * Span stack for managing nested spans
 */
export interface SpanStackItem {
  span: UnifiedTelemetrySpan;
  logger: UnifiedTelemetryLogger;
  operationName: string;
  level: number;
}

/**
 * Push a new span to the stack (becomes the current active span)
 */
export function pushSpanToStack(
  context: UnifiedHttpContext, 
  span: UnifiedTelemetrySpan ,
  logger:UnifiedTelemetryLogger, 
  operationName: string
): void {
  const stack = getSpanStack(context);
  const level = stack.length;
  
  const newItem: SpanStackItem = {
    logger,
    span,
    operationName,
    level
  };
  
  stack.push(newItem);
  
  // Update stack and current span in registry
  addRegistryItem(context, SPAN_STACK_KEY, stack);
  addRegistryItem(context, CURRENT_SPAN_KEY, span);
  addRegistryItem(context, CURRENT_LOGGER_KEY, logger);
}

/**
 * Pop the current span from the stack (previous span becomes current)
 */
export function popSpanFromStack(context: UnifiedHttpContext):  SpanStackItem | null {
  const stack = getSpanStack(context);
  
  if (stack.length === 0) {
    return null;
  }
  
  const removedItem = stack.pop();
  
  // Update current span to the previous one in stack
  const currentSpan = stack.at(-1)?.span ?? null;
  const currentLogger = stack.at(-1)?.logger ?? null;
  addRegistryItem(context, CURRENT_SPAN_KEY, currentSpan);
  addRegistryItem(context, CURRENT_LOGGER_KEY, currentLogger);
  addRegistryItem(context, SPAN_STACK_KEY, stack);
  
  return removedItem || null;
}

/**
 * Get the current active span (top of stack)
 */
export function getCurrentSpan(context: UnifiedHttpContext): UnifiedTelemetrySpan | null {
  const currentSpan = getRegistryItem<UnifiedTelemetrySpan>(context, CURRENT_SPAN_KEY);
  return currentSpan instanceof Error ? null : currentSpan;
}

/**
 * Get the span stack
 */
export function getSpanStack(context: UnifiedHttpContext): SpanStackItem[] {
  const stack = getRegistryItem<SpanStackItem[]>(context, SPAN_STACK_KEY);
  return stack instanceof Error ? [] : stack;
}

/**
 * Get current nesting level
 */
export function getCurrentSpanLevel(context: UnifiedHttpContext): number {
  const stack = getSpanStack(context);
  return stack.length;
}

/**
 * Clear all spans from stack
 */
export function clearSpanStack(context: UnifiedHttpContext): void {
  addRegistryItem(context, SPAN_STACK_KEY, []);
  addRegistryItem(context, CURRENT_SPAN_KEY, null);
  addRegistryItem(context, CURRENT_LOGGER_KEY, null);
}
