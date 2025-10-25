/**
 * Public types for telemetry middleware
 * Types that consumer projects can use
 */

import { LogLayerType, LogOperationType, UnifiedTelemetryLogger, UnifiedTelemetrySpan } from "@inh-lib/unified-telemetry-core";
import { getPerformanceData } from "../internal/utils/context.utils";
import { UnifiedHttpContext } from "@inh-lib/unified-route";
import { TelemetryMiddlewareService } from "../services/telemetry-middleware.service";

/**
 * Valid operation types for telemetry spans
 * endpoint - represents an API endpoint operation with http or api layer
 * middleware - represents a middleware operation with http or api layer
 * produce - represents a message production operation with api or service layer
 * consume - represents a message consumption operation with api or service layer
 * database - represents a database operation with data layer
 * logic - represents a business logic operation with http, api, service, data, core layer
 * integration - represents an integration operation (e.g. external API calls) with integration layer
 * auth - represents an authentication operation with http or api layer
 * custom - represents a custom operation defined by the user with custom layer
 */
export type TelemetryOperationType = LogOperationType

/**
 * Valid layer types for telemetry spans
 * http - represent to Framework HTTP layer (e.g. Fastify, Express)
 * api - represent to Unified Route
 * service - represent to Service layer
 * data - represent to Data layer
 * core - represent to Core layer
 * integration - represent to Integration layer like message broker, external API requests
 * custom - represent to Custom layer defined by user
 */
export type TelemetryLayerType = LogLayerType

/**
 * Type aliases for telemetry configuration
 */
export type TelemetryAttributeValue = string | number | boolean;
export type TelemetryAttributes = Record<string, TelemetryAttributeValue>;

export type InitializeTelemetryContextResult = ReturnType<typeof getPerformanceData>;


export type UnifiedHttpTelemetryContext = UnifiedHttpContext & {
    telemetryService: TelemetryMiddlewareService;
    telemetrySpan: UnifiedTelemetrySpan; // Replace 'unknown' with actual span type by Processor
    telemetryLogger: UnifiedTelemetryLogger; // Replace 'unknown' with actual logger type by Processor
};