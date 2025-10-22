import { UnifiedHttpContext } from "./unified-context";

// foundations/middleware/types.ts
export type UnifiedMiddleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;

export type UnifiedRouteHandler = (context: UnifiedHttpContext) => Promise<unknown>;

// export type UnifiedMiddlewareOptions = {
//   order?: number;
//   condition?: (context: UnifiedHttpContext) => boolean;
//   skipOnError?: boolean;
//   timeout?: number;
// };

// export interface UnifiedMiddlewareContext {
//   startTime: number;
//   metadata: Record<string, unknown>;
//   skipRemainingMiddlewares?: boolean;
// }

// export interface UnifiedMiddlewareEntry {
//   middleware: UnifiedMiddleware;
//   options: UnifiedMiddlewareOptions;
// }

// // Extended context for middleware that need to track response state
// export interface MiddlewareResponseState {
//   statusCode?: number;
//   sent?: boolean;
//   headers: Record<string, string>;
// }

// export interface UnifiedHttpContextWithState extends UnifiedHttpContext {
//   __middlewareState?: MiddlewareResponseState;
// }