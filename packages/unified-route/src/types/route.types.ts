/**
 * Route types for unified app
 */

import type { UnifiedMiddleware, UnifiedRouteHandler } from './unified-middleware';

/**
 * Unified Route definition interface
 */
export interface UnifiedRouteDefinition {
  method: string;
  path: string;
  handler: UnifiedRouteHandler;
  middlewares: UnifiedMiddleware[];
}

/**
 * Unified Route match result
 */
export interface UnifiedRouteMatchResult {
  params: Record<string, string>;
}

/**
 * Unified Path pattern parsing result
 */
export interface UnifiedPathPattern {
  pattern: RegExp;
  paramNames: string[];
}
