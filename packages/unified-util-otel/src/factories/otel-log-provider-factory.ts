
// src/factories/otel-log-provider-factory.ts

import {
  UnifiedLogProvider,
  ObservabilityConfig
} from '@inh-lib/unified-observe-ability-core';
import { OtelLogProviderAdapter } from '../adapters/logging';
import { OtelLoggingConfig } from '../types';

export class OtelLogProviderFactory {
  static create(config: ObservabilityConfig): UnifiedLogProvider {
    const loggingConfig = config.logging as OtelLoggingConfig;
    
    if (!loggingConfig) {
      throw new Error('Logging configuration is required');
    }

    // In a real implementation, would set up OpenTelemetry Logs API
    // For now, create a simple adapter
    return new OtelLogProviderAdapter(config.serviceName);
  }
}
