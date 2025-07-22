
// src/adapters/tracing/otel-trace-provider-adapter.ts

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { trace } from '@opentelemetry/api';
import {
  UnifiedTraceProvider,
  UnifiedTracer,
  TracerOptions,
  TracersList
} from '@inh-lib/unified-observe-ability-core';
import { OtelTracerAdapter } from './otel-tracer-adapter';

export class OtelTraceProviderAdapter implements UnifiedTraceProvider {
  public readonly name = 'opentelemetry-tracing';
  public readonly isInitialized: boolean = true;

  readonly tracers: Map<string, OtelTracerAdapter> = new Map();

  constructor(
    readonly tracerProvider: NodeTracerProvider,
    readonly serviceName: string
  ) {}

  getTracer(name: string, version?: string): UnifiedTracer;
  getTracer(options: TracerOptions): UnifiedTracer;
  getTracer(nameOrOptions: string | TracerOptions, version?: string): UnifiedTracer {
    let tracerName: string;
    let tracerVersion: string | undefined;

    if (typeof nameOrOptions === 'string') {
      tracerName = nameOrOptions;
      tracerVersion = version;
    } else {
      tracerName = nameOrOptions.name;
      tracerVersion = nameOrOptions.version;
    }

    const tracerKey = createTracerKey(tracerName, tracerVersion);
    
    if (this.tracers.has(tracerKey)) {
      return this.tracers.get(tracerKey)!;
    }

    const otelTracer = this.tracerProvider.getTracer(tracerName, tracerVersion);
    const adapter = new OtelTracerAdapter(otelTracer, tracerName, tracerVersion);
    
    this.tracers.set(tracerKey, adapter);
    return adapter;
  }

  getActiveTracer(): UnifiedTracer {
    return this.getTracer(this.serviceName);
  }

  getAllTracers(): TracersList {
    return {
      tracers: Array.from(this.tracers.values())
    };
  }

  async shutdown(): Promise<void> {
    await this.tracerProvider.shutdown();
  }
}

function createTracerKey(name: string, version?: string): string {
  return version ? `${name}@${version}` : name;
}

