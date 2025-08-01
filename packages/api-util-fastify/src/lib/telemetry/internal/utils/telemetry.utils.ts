// src/internal/utils/telemetry.utils.ts

/**
 * Internal telemetry utilities
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyRequest } from 'fastify';
import { HttpRequestAttributes } from '../types/telemetry.types';

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Extract HTTP attributes from Fastify request
 */
export function extractHttpAttributes(request: FastifyRequest): HttpRequestAttributes {
  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    remoteAddress: request.ip,
    routePath: request.routeOptions?.url,
  };
}

/**
 * Calculate response time in milliseconds
 */
export function calculateResponseTime(startTime: Date): number {
  return Date.now() - startTime.getTime();
}

/**
 * Sanitize route path for metrics
 */
export function sanitizeRoutePath(routePath: string): string {
  return routePath
    .replace(/\/:\w+/g, '/{id}') // Replace :id with {id}
    .replace(/\/\*/g, '/{wildcard}') // Replace /* with {wildcard}
    .replace(/[^a-zA-Z0-9\/\-_{}]/g, '_'); // Replace special chars
}

/**
 * Extract trace ID from request headers
 */
export function extractTraceIdFromHeaders(request: FastifyRequest): string | undefined {
  const headers = [
    'x-trace-id',
    'x-request-id',
    'traceparent',
    'x-correlation-id'
  ];

  for (const header of headers) {
    const value = request.headers[header] as string;
    if (value) {
      if (header === 'traceparent') {
        const parts = value.split('-');
        if (parts.length >= 2) {
          return parts[1];
        }
      }
      return value;
    }
  }

  return undefined;
}

/**
 * Check if request should be logged
 */
export function shouldLogRequest(request: FastifyRequest, skipRoutes: string[]): boolean {
  const routePath = request.routeOptions?.url || request.url;
  return !skipRoutes.some(route => {
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(routePath);
    }
    return routePath === route;
  });
}

/**
 * Get content length from request or response
 */
export function getContentLength(headers: Record<string, string | string[] | undefined>): number | undefined {
  const contentLength = headers['content-length'];
  if (typeof contentLength === 'string') {
    const length = parseInt(contentLength, 10);
    return isNaN(length) ? undefined : length;
  }
  return undefined;
}

/**
 * Extract error information for logging
 */
export function extractErrorInfo(error: Error): Record<string, string | number | boolean> {
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack || 'No stack trace available',
  };
}
