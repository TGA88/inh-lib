
// types/unified-context.ts
export interface UnifiedRequestContext {
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  method: string;
  url: string; // actual URL requested
  route: string; // route path, e.g. "/api/users/:id"
  ip: string;
  userAgent?: string;
}

export interface UnifiedResponseContext {
  readonly sent: boolean;
  status(code: number): UnifiedResponseContext;
  json<T>(data: T): unknown;
  send(data: unknown): unknown;
  header(name: string, value: string): UnifiedResponseContext;
  redirect(url: string): void;
  
}

export interface UnifiedHttpContext {
  request: UnifiedRequestContext;
  response: UnifiedResponseContext;
  registry: Record<string, unknown>;
}

// ========================================
// Handler Types
// ========================================

export type UnifiedPreHandlerFn = (
  ctx: UnifiedHttpContext
) => Promise<void> | void;

export type UnifiedHandlerFn = (
  ctx: UnifiedHttpContext
) => Promise<void> | void;