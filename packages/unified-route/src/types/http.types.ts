/**
 * HTTP types for unified app
 */

/**
 * Unified HTTP Request interface (framework agnostic)
 */
export interface UnifiedHttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  ip?: string;
}

/**
 * Unified HTTP Response interface (framework agnostic)
 */
export interface UnifiedHttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: unknown;
  sent: boolean;
}

/**
 * Unified Node.js HTTP Request interface (for listen method)
 */
export interface UnifiedNodeHttpRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  ip?: string;
  connection?: { remoteAddress?: string };
}

/**
 * Unified Node.js HTTP Response interface (for listen method)
 */
export interface UnifiedNodeHttpResponse {
  statusCode: number;
  headersSent: boolean;
  setHeader(name: string, value: string): void;
  end(data?: unknown): void;
}
