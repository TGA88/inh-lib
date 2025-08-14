export * from './lib/unified-fastify-adapter'

// Telemetry - Public interfaces and types for telemetry
export { TelemetryPluginService } from './lib/telemetry/services/telemetry-plugin.service';
export type { TelemetryDecorator } from './lib/telemetry/services/telemetry-plugin.service';
export { TelemetryRequestUtils } from './lib/telemetry/utils/telemetry-request.utils';

// Constants - Public constants that consumers can use
export { 
  TELEMETRY_REGISTRY_KEYS, 
  DEFAULT_TELEMETRY_PLUGIN_OPTIONS 
} from './lib/telemetry/constants/telemetry.const';
// ==========================