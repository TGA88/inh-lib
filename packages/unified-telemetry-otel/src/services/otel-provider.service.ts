// src/services/otel-provider.service.ts

import { 
  UnifiedTelemetryProvider, 
  UnifiedBaseTelemetryLogger,
  ProviderInitOptions 
} from '@inh-lib/unified-telemetry-core';
import { OtelProviderAdapter } from '../internal/adapters/otel-provider.adapter';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * OpenTelemetry Provider Service
 * 
 * Main service class for creating OpenTelemetry-backed telemetry providers.
 * This is the primary entry point for consumers of this package.
 */
export class OtelProviderService {
  /**
   * Create a new OpenTelemetry-backed telemetry provider with base logger
   */
  static createProvider(
    options: ProviderInitOptions, 
    baseLogger: UnifiedBaseTelemetryLogger,
    sdk: NodeSDK
  ): UnifiedTelemetryProvider {
    return new OtelProviderAdapter(options, baseLogger, sdk);
  }

  /**
   * Create a provider with default configuration and base logger
   */
  static createDefaultProvider(
    serviceName: string, 
    serviceVersion: string,
    baseLogger: UnifiedBaseTelemetryLogger,
    sdk: NodeSDK
  ): UnifiedTelemetryProvider {
    return new OtelProviderAdapter({
      config: {
        serviceName,
        serviceVersion,
        environment: 'development',
      },
    }, baseLogger,sdk);
  }

  /**
   * Create provider with console as base logger (convenience method)
   */
  static createProviderWithConsole(options: ProviderInitOptions,sdk:NodeSDK): UnifiedTelemetryProvider {
    const consoleLogger: UnifiedBaseTelemetryLogger = {
      debug: (message: string, attributes?: Record<string, unknown>) => {
        console.debug(message, attributes);
      },
      info: (message: string, attributes?: Record<string, unknown>) => {
        console.info(message, attributes);
      },
      warn: (message: string, attributes?: Record<string, unknown>) => {
        console.warn(message, attributes);
      },
      error: (message: string, attributes?: Record<string, unknown>) => {
        console.error(message, attributes);
      },
      createChildLogger: (scope: string, attributes?: Record<string, unknown>): UnifiedBaseTelemetryLogger => {
        return {
          debug: (message: string, attrs?: Record<string, unknown>) => {
            console.debug(`[${scope}] ${message}`, { ...attributes, ...attrs });
          },
          info: (message: string, attrs?: Record<string, unknown>) => {
            console.info(`[${scope}] ${message}`, { ...attributes, ...attrs });
          },
          warn: (message: string, attrs?: Record<string, unknown>) => {
            console.warn(`[${scope}] ${message}`, { ...attributes, ...attrs });
          },
          error: (message: string, attrs?: Record<string, unknown>) => {
            console.error(`[${scope}] ${message}`, { ...attributes, ...attrs });
          },
          createChildLogger: (childScope: string, childAttrs?: Record<string, unknown>): UnifiedBaseTelemetryLogger => {
            return consoleLogger.createChildLogger(`${scope}:${childScope}`, { ...attributes, ...childAttrs });
          },
        };
      },
    };

    return new OtelProviderAdapter(options, consoleLogger, sdk);
  }
}