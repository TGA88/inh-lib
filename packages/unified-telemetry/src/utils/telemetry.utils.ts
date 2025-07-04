// utils/telemetry.utils.ts
import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { UnifiedRequestTelemetryData, UnifiedResponseTelemetryData, UnifiedSpanStatusCode, UnifiedLogLevel } from '../types/unified-telemetry';
import { UnifiedTelemetryMiddlewareOptions } from '../types/unified-telemetry-context';

export function extractRequestTelemetryData(
  context: UnifiedHttpContext,
  traceId: string,
  spanId: string,
  options?: UnifiedTelemetryMiddlewareOptions
): UnifiedRequestTelemetryData {
  const startTime = new Date();
  const attributes: Record<string, string | number | boolean> = {
    'http.method': context.request.method,
    'http.url': context.request.url,
    'http.scheme': extractSchemeFromUrl(context.request.url),
    'http.host': context.request.headers['host'] || 'unknown',
    'http.user_agent': context.request.userAgent || context.request.headers['user-agent'] || 'unknown',
    'net.peer.ip': context.request.ip,
  };

  // Add custom attributes if provided
  if (options?.customAttributes) {
    const customAttrs = options.customAttributes(context);
    Object.assign(attributes, customAttrs);
  }

  // Add query parameters as attributes
  Object.entries(context.request.query).forEach(([key, value]) => {
    const attrValue = Array.isArray(value) ? value.join(',') : value;
    attributes[`http.query.${key}`] = attrValue;
  });

  // Add path parameters as attributes
  Object.entries(context.request.params).forEach(([key, value]) => {
    attributes[`http.param.${key}`] = value;
  });

  // Add headers if enabled
  if (options?.includeHeaders) {
    const excludeHeaders = new Set([
      'authorization',
      'cookie',
      'x-api-key',
      ...(options.excludeHeaders || [])
    ]);
    
    Object.entries(context.request.headers).forEach(([key, value]) => {
      if (!excludeHeaders.has(key.toLowerCase())) {
        attributes[`http.header.${key}`] = value;
      }
    });
  }

  return {
    traceId,
    spanId,
    method: context.request.method,
    url: context.request.url,
    userAgent: context.request.userAgent || context.request.headers['user-agent'],
    ip: context.request.ip,
    startTime,
    attributes,
  };
}

export function extractResponseTelemetryData(
  statusCode: number,
  startTime: Date,
  options?: UnifiedTelemetryMiddlewareOptions
): UnifiedResponseTelemetryData {
  const endTime = new Date();
  const responseTime = endTime.getTime() - startTime.getTime();

  const attributes: Record<string, string | number | boolean> = {
    'http.status_code': statusCode,
    'http.response_time_ms': responseTime,
  };

  return {
    statusCode,
    responseTime,
    endTime,
    attributes,
  };
}

export function getSpanStatusFromHttpStatus(statusCode: number): UnifiedSpanStatusCode {
  if (statusCode >= 200 && statusCode < 400) {
    return UnifiedSpanStatusCode.OK;
  }
  if (statusCode >= 400) {
    return UnifiedSpanStatusCode.ERROR;
  }
  return UnifiedSpanStatusCode.UNSET;
}

export function generateSpanName(method: string, url: string): string {
  const pathWithoutQuery = url.split('?')[0];
  return `${method} ${pathWithoutQuery}`;
}

export function extractSchemeFromUrl(url: string): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url).protocol.replace(':', '');
    }
    // For relative URLs, assume https in production-like environments
    return 'https';
  } catch {
    return 'http';
  }
}

export function shouldSkipTelemetry(
  context: UnifiedHttpContext,
  options?: UnifiedTelemetryMiddlewareOptions
): boolean {
  if (!options?.skipHealthChecks) {
    return false;
  }

  const healthCheckPaths = options.healthCheckPaths || ['/health', '/healthz', '/ping', '/status'];
  const path = context.request.url.split('?')[0];
  
  return healthCheckPaths.some(healthPath => 
    path === healthPath || path.endsWith(healthPath)
  );
}

export function maskSensitiveData(
  data: Record<string, unknown>,
  mask = '[REDACTED]'
): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'auth',
    'credential',
    'pin',
    'ssn',
    'social',
  ];

  const maskedData = { ...data };

  const maskRecursive = (obj: Record<string, unknown>): void => {
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );

      if (isSensitive) {
        obj[key] = mask;
      } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        maskRecursive(obj[key] as Record<string, unknown>);
      }
    });
  };

  maskRecursive(maskedData);
  return maskedData;
}

export function getLogLevelFromStatusCode(statusCode: number): UnifiedLogLevel {
  if (statusCode >= 500) {
    return UnifiedLogLevel.ERROR;
  }
  if (statusCode >= 400) {
    return UnifiedLogLevel.WARN;
  }
  return UnifiedLogLevel.INFO;
}

export function createRequestLogMessage(telemetryData: UnifiedRequestTelemetryData): string {
  return `Request started: ${telemetryData.method} ${telemetryData.url}`;
}

export function createResponseLogMessage(
  requestData: UnifiedRequestTelemetryData,
  responseData: UnifiedResponseTelemetryData
): string {
  return `Request completed: ${requestData.method} ${requestData.url} - ${responseData.statusCode} (${responseData.responseTime}ms)`;
}

export function createErrorLogMessage(
  requestData: UnifiedRequestTelemetryData,
  error: Error
): string {
  return `Request failed: ${requestData.method} ${requestData.url} - ${error.message}`;
}