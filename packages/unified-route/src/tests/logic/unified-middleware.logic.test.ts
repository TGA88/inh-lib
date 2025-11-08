
import { composeMiddleware } from "../../logic/unified-middleware.logic";
import {  UnifiedPreHandlerFn, UnifiedHandlerFn, UnifiedResponseContext, UnifiedRequestContext, UnifiedHttpContext } from "../../types/unified-context";
import { UnifiedRoutePipeline } from "../../logic/unified-route-pipeline.logic";
import { UnifiedMiddleware, UnifiedRouteHandler } from "../../types/unified-middleware";



const getActiveTelemetryMiddleware = (name: string) => {
    const md: UnifiedMiddleware = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
        try {
            console.log(`start Middleware ${name}`);
            await next();
            console.log(`end Middleware ${name}`);
            if (context.response.sent) {
                console.log(`Response is sent by Middleware ${name}`);
            }
        } catch (error) {
            console.error(`Error in Middleware: ${name}`, error);
        }
    }
    return md;
}

const routeFail = (name: string): UnifiedRouteHandler => async (context: UnifiedHttpContext) => {
    console.log(`Route Handler Failed: ${name}`);
    return context.response.status(500).json({ error: `Route Handler Failed: ${name}` });
}
const routeSuccess = (name: string): UnifiedRouteHandler => async (context: UnifiedHttpContext) => {
    console.log(`Route Handler Succeeded: ${name}`);
    return context.response.status(200).json({ error: `Route Handler Succeeded: ${name}` });
}
const routePreFail = (name: string): UnifiedRouteHandler => async (context: UnifiedHttpContext) => {
    console.log(`Route preHandler Failed: ${name}`);
    return context.response.status(500).json({ error: `Route Handler Failed: ${name}` });

}
const routePreSuccess = (name: string): UnifiedRouteHandler => async (context: UnifiedHttpContext) => {
    console.log(`Route preHandler Succeeded: ${name}`);
    context.registry['preHandler'] = `Route preHandler Succeeded: ${name}`;
}



function createPreHandlerFail(name: string): UnifiedPreHandlerFn {
    const handler = composeMiddleware([getActiveTelemetryMiddleware(name)])(routePreFail(name));
    const preHandler: UnifiedPreHandlerFn = async (context: UnifiedHttpContext) => {
        await handler(context);
    };
    return preHandler;
}
function createPreHandlerSuccess(name: string): UnifiedPreHandlerFn {
    const handler = composeMiddleware([getActiveTelemetryMiddleware(name)])(routePreSuccess(name));
    const preHandler: UnifiedPreHandlerFn = async (context: UnifiedHttpContext) => {
        await handler(context);
    };
    return preHandler;
}

function createHandlerFail(name: string): UnifiedHandlerFn {
    const handler = composeMiddleware([getActiveTelemetryMiddleware(name)])(routeFail(name));
    const unifiedHandler: UnifiedHandlerFn = async (context: UnifiedHttpContext) => {
        await handler(context);
    };
    return unifiedHandler;
}
function createHandlerSuccess(name: string): UnifiedHandlerFn {
    const handler = composeMiddleware([getActiveTelemetryMiddleware(name)])(routeSuccess(name));
    const unifiedHandler: UnifiedHandlerFn = async (context: UnifiedHttpContext) => {
        await handler(context);
    };
    return unifiedHandler;
}

const testPreFail1: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .addPreHandler(createPreHandlerFail('pre-fail1'))
    .addPreHandler(createPreHandlerSuccess('pre-success1'))
    .setHandler(createHandlerSuccess('handler-success'));

const testPreFail2: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .addPreHandler(createPreHandlerSuccess('pre-success1'))
    .addPreHandler(createPreHandlerFail('pre-fail2'))
    .setHandler(createHandlerSuccess('handler-success'));

const testPreSuccess1: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .addPreHandler(createPreHandlerSuccess('pre-success1'))
    .addPreHandler(createPreHandlerFail('pre-fail2'))
    .setHandler(createHandlerSuccess('handler-success'));

const testPreSuccess2: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .addPreHandler(createPreHandlerSuccess('pre-success1'))
    .addPreHandler(createPreHandlerSuccess('pre-success2'))
    .setHandler(createHandlerSuccess('handler-success'));

const testHandlerFail: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .addPreHandler(createPreHandlerSuccess('pre-success1'))
    .addPreHandler(createPreHandlerSuccess('pre-success2'))
    .setHandler(createHandlerFail('handler-fail'));

const testOnlyHandlerSuccess: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .setHandler(createHandlerSuccess('handler-success'));

const testOnlyHandlerFail: UnifiedRoutePipeline = new UnifiedRoutePipeline()
    .setHandler(createHandlerFail('handler-fail'));


    
function mockContext(): UnifiedHttpContext {
    const response: any = {
        sent: false,
        status: (code: number) => ({
            json: (data: any) => {
                response.sent = true;
                console.log(`Response Sent with status ${code}:`, data);
                return response;
            }
        })
    };
    return {
        request: {} as unknown as UnifiedRequestContext,
        response: response as UnifiedResponseContext,
        registry: {}
    };
}



const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
describe('Unified Route Pipeline Middleware Execution Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

    });

    describe('test testPreFail1 Pipeline', () => {
        it('should stop at first preHandler fail', async () => {
            const context = mockContext();
            await testPreFail1.execute(context);
            expect(context.response.sent).toBe(true);
            
            expect(logSpy.mock.calls.flat().join(' ')).toContain('Route preHandler Failed: pre-fail1');
        });
    });
    describe('test testPreFail2 Pipeline', () => {
        it('should stop at second preHandler fail', async () => {
            const context = mockContext();
            await testPreFail2.execute(context);
            expect(context.response.sent).toBe(true);
            
            const sumLogs = logSpy.mock.calls.flat().join(' ');

            expect(sumLogs).toContain(`Route preHandler Succeeded: pre-success1`);
            expect(sumLogs).toContain(`end Middleware pre-success1`);
            expect(sumLogs).toContain('Route preHandler Failed: pre-fail2');
        })
    })
    describe('test testPreSuccess1 Pipeline', () => {
        it('should stop at second preHandler fail', async () => {
            const context = mockContext();
            await testPreSuccess1.execute(context);
            expect(context.response.sent).toBe(true);
            
            const sumLogs = logSpy.mock.calls.flat().join(' ');
            expect(sumLogs).toContain(`Route preHandler Succeeded: pre-success1`);
            expect(sumLogs).toContain('Route preHandler Failed: pre-fail2');
            expect(sumLogs).not.toContain(`Route Handler Succeeded: handler-success`);
        })
    })
    describe('test testPreSuccess2 Pipeline', () => {
        it('should stop at second preHandler fail', async () => {
            const context = mockContext();
            await testPreSuccess2.execute(context);
            expect(context.response.sent).toBe(true);
            
            const sumLogs = logSpy.mock.calls.flat().join(' ');
            expect(sumLogs).toContain(`Route preHandler Succeeded: pre-success1`);
            expect(sumLogs).toContain(`Route preHandler Succeeded: pre-success2`);
            expect(sumLogs).toContain(`Route Handler Succeeded: handler-success`);
        })
    })
    describe('test testHandlerFail Pipeline', () => {
        it('should stop at second preHandler fail', async () => {
            const context = mockContext();
            await testHandlerFail.execute(context);
            expect(context.response.sent).toBe(true);
            
            const sumLogs = logSpy.mock.calls.flat().join(' ');
            expect(sumLogs).toContain(`Route preHandler Succeeded: pre-success1`);
            expect(sumLogs).toContain(`Route preHandler Succeeded: pre-success2`);
            expect(sumLogs).toContain(`Route Handler Failed: handler-fail`);
        })
    })
    describe('test testOnlyHandlerFail Pipeline', () => {
        it('should stop at second preHandler fail', async () => {
            const context = mockContext();
            await testOnlyHandlerFail.execute(context);
            expect(context.response.sent).toBe(true);
            
            const sumLogs = logSpy.mock.calls.flat().join(' ');
            expect(sumLogs).not.toContain(`Route preHandler Succeeded: pre-success1`);
            expect(sumLogs).not.toContain(`Route preHandler Succeeded: pre-success2`);
            expect(sumLogs).toContain(`Route Handler Failed: handler-fail`);
        })
    })
    describe('test testOnlyHandlerSuccess Pipeline', () => {
        it('should stop at second preHandler fail', async () => {
            const context = mockContext();
            await testOnlyHandlerSuccess.execute(context);
            expect(context.response.sent).toBe(true);
            
            const sumLogs = logSpy.mock.calls.flat().join(' ');
            expect(sumLogs).not.toContain(`Route preHandler Succeeded: pre-success1`);
            expect(sumLogs).not.toContain(`Route preHandler Succeeded: pre-success2`);
            expect(sumLogs).toContain(`Route Handler Succeeded: handler-success`);
        })
    })
});

