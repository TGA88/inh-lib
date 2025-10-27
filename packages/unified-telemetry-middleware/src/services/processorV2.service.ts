import { TelemetryAttributes, TelemetryLayerType, TelemetryMiddlewareService, TelemetryOperationType,TELEMETRY_OPERATION_TYPES,TELEMETRY_LAYERS } from "../index";
import { UnifiedHttpContext } from "@inh-lib/unified-route";
import { UnifiedHttpTelemetryContext } from "../types/telemetry.types";



// Import your telemetry types and constants
// import { TelemetryOperationType, TelemetryLayerType, TELEMETRY_LAYERS, TELEMETRY_OPERATION_TYPES } from './telemetry-types';

// export type UnifiedProcessorFunction<Args extends readonly [UnifiedHttpContext, ...unknown[]], R> = 
//     (...args: Args) => R | Promise<R>;

export type UnifiedTelemetryProcessorFunction<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R> = 
    (...args: Args) => R | Promise<R>;

// export type UnifiedTelemetryProcessorHOF = (fn: UnifiedTelemetryProcessorFunction) => UnifiedProcessorFunction;

export interface UnifiedProcessorOptionsV2 {
    operationType?: TelemetryOperationType;
    layer?: TelemetryLayerType;
    attributes?: TelemetryAttributes;
}




export class UnifiedTelemetryProcessorV2<
    TArgs extends readonly [UnifiedHttpTelemetryContext, ...unknown[]],
    R
> {
    constructor(
        private readonly telemetryService: TelemetryMiddlewareService,
        private readonly fn: UnifiedTelemetryProcessorFunction<TArgs, R>,
        private readonly operationName: string,
        private readonly options: UnifiedProcessorOptionsV2 = {}
    ) {}

    async process(...args: readonly [UnifiedHttpContext, ...unknown[]]): Promise<R> {
        // Validate function
        if (typeof this.fn !== 'function') {
            throw new Error('Provided fn is not a function');
        }

        const [context] = args;
        const startTime = process.hrtime.bigint();

        // Create span with safe attributes
        const { span, logger, finish } = this.telemetryService.createActiveSpan(
            context,
            this.operationName,
            {
                operationType: this.options.operationType || TELEMETRY_OPERATION_TYPES.CUSTOM,
                layer: this.options.layer || TELEMETRY_LAYERS.CUSTOM,
                attributes: {
                    'processer.operation': this.operationName,
                    'processer.args_count': args.length,
                    ...this.safeAttributes(this.options.attributes)
                }
            }
        );

        // Log start
        logger.info(`${this.operationName} started`);

        try {
            logger.debug(`Processing ${this.operationName} with args:`, { args });
            // Execute function

            const tContext: UnifiedHttpTelemetryContext = {
                ...context,
                telemetryService: this.telemetryService,
                telemetrySpan: span,
                telemetryLogger: logger
            };

            // Build telemetry args tuple; cast via unknown to satisfy generic safety
            const withTelemetryArgs = [tContext, ...args.slice(1)] as unknown as TArgs;

            const result = await this.fn(...withTelemetryArgs);

            // Log success
            const durationMs = Number(process.hrtime.bigint() - startTime) / 1000000;
            logger.info(`${this.operationName} completed`, { 
                durationMs: Math.round(durationMs * 100) / 100 
            });
            
            // Set success status
            span.setStatus({ code: 'ok' });
            span.setTag('operation.success', true);
            span.setTag('operation.duration_ms', Math.round(durationMs * 100) / 100);
            
            return result;
            
        } catch (error) {
            // Handle error
            const err = error instanceof Error ? error : new Error(String(error));
            const durationMs = Number(process.hrtime.bigint() - startTime) / 1000000;
            
            // Log error
            logger.error(`${this.operationName} failed`, err, {
                errorType: err.constructor.name,
                durationMs: Math.round(durationMs * 100) / 100
            });
            
            // Set error status
            span.recordException(err);
            span.setStatus({ code: 'error', message: err.message });
            span.setTag('operation.success', false);
            span.setTag('error.type', err.constructor.name);
            
            throw err; // Re-throw instead of returning error
            
        } finally {
            finish();
        }
    }

    // Safe attributes - filter out problematic values
    private safeAttributes(attrs?: Record<string, unknown>): Record<string, string | number | boolean> {
        if (!attrs) return {};
        
        const safe: Record<string, string | number | boolean> = {};
        
        for (const [key, value] of Object.entries(attrs)) {
            try {
                if (value === null || value === undefined) {
                    safe[key] = String(value);
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    safe[key] = value;
                } else if (typeof value === 'object' && value !== null) {
                    // Try to stringify simple objects, fallback to string representation
                    try {
                        const stringified = JSON.stringify(value);
                        safe[key] = stringified.length > 1000 ? '[Large Object]' : stringified;
                    } catch {
                        safe[key] = '[Object]';
                    }
                } else {
                    safe[key] = String(value);
                }
            } catch {
                safe[key] = '[Unsafe Value]';
            }
        }
        
        return safe;
    }
}

// === Helper Functions for easier usage ===

// Create processor without options
export function createProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName);
}

// Create database processor (database operation with data layer)
export function createDatabaseProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string,
    tableName?: string
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.DATABASE,
        layer: TELEMETRY_LAYERS.DATA,
        attributes: {
            'db.table': tableName || 'unknown'
        }
    });
}

// Create service query processor (query operation with service layer)
export function createServiceQueryProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.QUERY,
        layer: TELEMETRY_LAYERS.SERVICE
    });
}

// Create service command processor (command operation with service layer)
export function createServiceCommandProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.COMMAND,
        layer: TELEMETRY_LAYERS.SERVICE
    });
}

// Create API endpoint processor (endpoint operation with api layer)
export function createApiProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.ENDPOINT,
        layer: TELEMETRY_LAYERS.API
    });
}

// Create integration processor (integration operation with integration layer)
export function createIntegrationProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.INTEGRATION,
        layer: TELEMETRY_LAYERS.INTEGRATION
    });
}

// Create logic processor (logic operation - can be used with any layer)
export function createLogicProcessorV2<Args extends readonly [UnifiedHttpTelemetryContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedTelemetryProcessorFunction<Args, R>,
    operationName: string,
    layer: TelemetryLayerType = TELEMETRY_LAYERS.CORE
) {
    return new UnifiedTelemetryProcessorV2(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.LOGIC,
        layer: layer
    });
}