import { UnifiedHttpContext } from "../types/unified-context";

// services/unified-base-service.ts
export function getRequestBody<T = Record<string, unknown>>(context: UnifiedHttpContext): T {
  return context.request.body as T;
}

export function getParams(context: UnifiedHttpContext): Record<string, string> {
  return context.request.params;
}

export function getQuery(context: UnifiedHttpContext): Record<string, string | string[]> {
  return context.request.query;
}

export function getHeaders(context: UnifiedHttpContext): Record<string, string> {
  return context.request.headers;
}

export function sendResponse<T>(context: UnifiedHttpContext, data: T, statusCode = 200): void {
  context.response.status(statusCode).json(data);
}

export function sendError(context: UnifiedHttpContext, message: string, statusCode = 400): void {
  context.response.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
  });
}
export function getRegistryItem<T>(context: UnifiedHttpContext, key: string): T | Error{
  try {
    if (!context.registry || !(key in context.registry)) {
      return new Error(`Registry item "${key}" not found`);
    }
    return context.registry[key] as T;
  } catch (error) {
    return new Error(`Error accessing registry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function addRegistryItem<T>(context: UnifiedHttpContext, key: string, value: T): void {
  if (!context.registry) {
    context.registry = {};
  }
  context.registry[key] = value;
} 
