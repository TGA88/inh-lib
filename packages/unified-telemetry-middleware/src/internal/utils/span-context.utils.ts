/**
 * Span context management utilities
 * For managing hierarchical spans across different layers
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import type { UnifiedTelemetrySpan } from '@inh-lib/unified-telemetry-core';
import { getRegistryItem, addRegistryItem } from '@inh-lib/unified-route';

const SPAN_STACK_KEY = 'telemetry:spanStack';
const CURRENT_SPAN_KEY = 'telemetry:currentSpan';

/**
 * Span stack for managing nested spans
 */
interface SpanStackItem {
  span: UnifiedTelemetrySpan;
  operationName: string;
  level: number;
}

/**
 * Push a new span to the stack (becomes the current active span)
 */
export function pushSpanToStack(
  context: UnifiedHttpContext, 
  span: UnifiedTelemetrySpan, 
  operationName: string
): void {
  const stack = getSpanStack(context);
  const level = stack.length;
  
  const newItem: SpanStackItem = {
    span,
    operationName,
    level
  };
  
  stack.push(newItem);
  
  // Update stack and current span in registry
  addRegistryItem(context, SPAN_STACK_KEY, stack);
  addRegistryItem(context, CURRENT_SPAN_KEY, span);
}

/**
 * Pop the current span from the stack (previous span becomes current)
 */
export function popSpanFromStack(context: UnifiedHttpContext): UnifiedTelemetrySpan | null {
  const stack = getSpanStack(context);
  
  if (stack.length === 0) {
    return null;
  }
  
  const removedItem = stack.pop();
  
  // Update current span to the previous one in stack
  const currentSpan = stack.length > 0 ? stack[stack.length - 1].span : null;
  addRegistryItem(context, CURRENT_SPAN_KEY, currentSpan);
  addRegistryItem(context, SPAN_STACK_KEY, stack);
  
  return removedItem?.span || null;
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
}
