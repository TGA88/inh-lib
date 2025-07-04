import { UnifiedHttpContext } from "./type/endpoint/unified-context";

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