
// src/utils/otel-exporter.utils.ts

import { OtelMetricsExporterType, OtelTracingExporterType } from '../types';

export function buildMetricsExporterConfig(
  type: OtelMetricsExporterType,
  endpoint?: string,
  headers?: Record<string, string>
): Record<string, unknown> {
  const baseConfig: Record<string, unknown> = {};

  switch (type) {
    case 'prometheus':
      return {
        port: extractPortFromEndpoint(endpoint) || 9090,
        endpoint: extractPathFromEndpoint(endpoint) || '/metrics',
        ...baseConfig
      };

    case 'otlp-http':
      return {
        url: endpoint || 'http://localhost:4318/v1/metrics',
        headers: headers || {},
        ...baseConfig
      };

    case 'otlp-grpc':
      return {
        url: endpoint || 'http://localhost:4317',
        headers: headers || {},
        ...baseConfig
      };

    case 'console':
    default:
      return baseConfig;
  }
}

export function buildTracingExporterConfig(
  type: OtelTracingExporterType,
  endpoint?: string,
  headers?: Record<string, string>
): Record<string, unknown> {
  const baseConfig: Record<string, unknown> = {};

  switch (type) {
    case 'jaeger':
      return {
        endpoint: endpoint || 'http://localhost:14268/api/traces',
        headers: headers || {},
        ...baseConfig
      };

    case 'otlp-http':
      return {
        url: endpoint || 'http://localhost:4318/v1/traces',
        headers: headers || {},
        ...baseConfig
      };

    case 'otlp-grpc':
      return {
        url: endpoint || 'http://localhost:4317',
        headers: headers || {},
        ...baseConfig
      };

    case 'console':
    default:
      return baseConfig;
  }
}

export function extractPortFromEndpoint(endpoint?: string): number | undefined {
  if (!endpoint) return undefined;
  
  try {
    const url = new URL(endpoint);
    return url.port ? parseInt(url.port, 10) : undefined;
  } catch {
    return undefined;
  }
}

export function extractPathFromEndpoint(endpoint?: string): string | undefined {
  if (!endpoint) return undefined;
  
  try {
    const url = new URL(endpoint);
    return url.pathname;
  } catch {
    return undefined;
  }
}

export function extractHostFromEndpoint(endpoint?: string): string | undefined {
  if (!endpoint) return undefined;
  
  try {
    const url = new URL(endpoint);
    return url.hostname;
  } catch {
    return undefined;
  }
}
