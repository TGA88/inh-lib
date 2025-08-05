// Services - Main API
export { TelemetryPluginService } from './services/telemetry-plugin.service';

// Constants - Public constants that consumers can use
export { 
  TELEMETRY_REGISTRY_KEYS, 
  DEFAULT_TELEMETRY_PLUGIN_OPTIONS 
} from './constants/telemetry.const';

// Note: Types are not re-exported to avoid performance issues
// Consumers should import types directly:
// import { TelemetryPluginOptions, EnhancedUnifiedHttpContext } from '@inh-lib/api-util-fastify/src/telemetry.types';