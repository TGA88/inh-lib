import { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedTelemetrySpan, UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import { ResourceUsageSnapshot, RequestResourceMetrics } from '../../types/telemetry.types';

export interface InternalPluginState {
  isEnabled: boolean;
  requestCounter: number;
  systemMetricsInterval?: NodeJS.Timeout;
}

export interface RequestTelemetryContext {
  span: UnifiedTelemetrySpan;
  startTime: number;
  requestId: string;
  logger: UnifiedTelemetryLogger;
  resourceSnapshot?: ResourceUsageSnapshot;
}

export interface InternalTelemetryDecoration {
  startRequestSpan: (request: FastifyRequest, reply: FastifyReply) => UnifiedTelemetrySpan;
  finishRequestSpan: (span: UnifiedTelemetrySpan, reply: FastifyReply) => void;
  shouldSkipRoute: (url: string) => boolean;
  captureResourceSnapshot: () => ResourceUsageSnapshot;
  calculateResourceMetrics: (start: ResourceUsageSnapshot, end: ResourceUsageSnapshot) => RequestResourceMetrics;
}

export interface SystemMetricsSnapshot {
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  timestamp: number;
  processId: number;
  instanceId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: {
      telemetry?: RequestTelemetryContext;
      requestId?: string;
    };
  }
}