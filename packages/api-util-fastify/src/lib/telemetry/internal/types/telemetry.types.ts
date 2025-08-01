// src/internal/types/telemetry.types.ts

/**
 * Internal telemetry types
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyPluginOptions } from 'fastify';
import { 
  UnifiedTelemetryProvider,
  UnifiedLoggerContext,
  UnifiedBaseTelemetryLogger,
  ProviderInitOptions
} from '@inh-lib/unified-telemetry-core';

export interface TelemetryPluginOptions extends FastifyPluginOptions {
  providerOptions: ProviderInitOptions;
  baseLogger?: UnifiedBaseTelemetryLogger;
  enableRequestLogging?: boolean;
  enableErrorLogging?: boolean;
  enableMetrics?: boolean;
  skipRoutes?: string[];
  customAttributes?: Record<string, string | number | boolean>;
}

export interface FastifyTelemetryContext {
  provider: UnifiedTelemetryProvider;
  context: UnifiedLoggerContext;
  requestId: string;
  startTime: Date;
}

export interface HttpRequestAttributes {
  method: string;
  url: string;
  userAgent?: string;
  remoteAddress?: string;
  routePath?: string;
  statusCode?: number;
  contentLength?: number;
  responseTime?: number;
}

export interface LayerContextOptions {
  layer: string;
  operationName: string;
  operationType?: string;
  attributes?: Record<string, string | number | boolean>;
}

