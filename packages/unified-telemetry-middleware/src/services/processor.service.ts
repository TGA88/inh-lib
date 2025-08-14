import { TelemetryAttributes, TelemetryLayerType, TelemetryMiddlewareService, TelemetryOperationType,TELEMETRY_OPERATION_TYPES,TELEMETRY_LAYERS } from "@inh-lib/unified-telemetry-middleware";
import { UnifiedHttpContext } from "@inh-lib/unified-route";



// Import your telemetry types and constants
// import { TelemetryOperationType, TelemetryLayerType, TELEMETRY_LAYERS, TELEMETRY_OPERATION_TYPES } from './telemetry-types';

export type UnifiedProcessorFunction<Args extends readonly [UnifiedHttpContext, ...unknown[]], R> = 
    (...args: Args) => R | Promise<R>;

export interface UnifiedProcessorOptions {
    operationType?: TelemetryOperationType;
    layer?: TelemetryLayerType;
    attributes?: TelemetryAttributes;
}

export class UnifiedTelemetryProcessor<
    Args extends readonly [UnifiedHttpContext, ...unknown[]],
    R
> {
    constructor(
        private readonly telemetryService: TelemetryMiddlewareService,
        private readonly fn: UnifiedProcessorFunction<Args, R>,
        private readonly operationName: string,
        private readonly options: UnifiedProcessorOptions = {}
    ) {}

    async process(...args: Args): Promise<R> {
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
            const result = await this.fn(...args);
            
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
export function createProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName);
}

// Create database processor (database operation with data layer)
export function createDatabaseProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string,
    tableName?: string
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.DATABASE,
        layer: TELEMETRY_LAYERS.DATA,
        attributes: {
            'db.table': tableName || 'unknown'
        }
    });
}

// Create service query processor (query operation with service layer)
export function createServiceQueryProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.QUERY,
        layer: TELEMETRY_LAYERS.SERVICE
    });
}

// Create service command processor (command operation with service layer)
export function createServiceCommandProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.COMMAND,
        layer: TELEMETRY_LAYERS.SERVICE
    });
}

// Create API endpoint processor (endpoint operation with api layer)
export function createApiProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.ENDPOINT,
        layer: TELEMETRY_LAYERS.API
    });
}

// Create integration processor (integration operation with integration layer)
export function createIntegrationProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.INTEGRATION,
        layer: TELEMETRY_LAYERS.INTEGRATION
    });
}

// Create logic processor (logic operation - can be used with any layer)
export function createLogicProcessor<Args extends readonly [UnifiedHttpContext, ...unknown[]], R>(
    telemetryService: TelemetryMiddlewareService,
    fn: UnifiedProcessorFunction<Args, R>,
    operationName: string,
    layer: TelemetryLayerType = TELEMETRY_LAYERS.CORE
) {
    return new UnifiedTelemetryProcessor(telemetryService, fn, operationName, {
        operationType: TELEMETRY_OPERATION_TYPES.LOGIC,
        layer: layer
    });
}