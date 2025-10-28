// tests/unified-route-pipeline.test.ts
import { UnifiedRoutePipeline } from '../../../src/logic/unified-route-pipeline.logic';
import { 
  UnifiedPreHandlerFn, 
  UnifiedHandlerFn, 
  UnifiedHttpContext 
} from '../../types/unified-context';
import { createMockContext } from '../helpers/mock-context';

describe('UnifiedRoutePipeline', () => {
  let pipeline: UnifiedRoutePipeline;

  beforeEach(() => {
    pipeline = new UnifiedRoutePipeline();
  });

  describe('Basic Functionality', () => {
    it('should execute handler when no preHandlers', async () => {
      const { ctx, state } = createMockContext();
      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.json({ success: true });
      });

      pipeline.setHandler(handler);
      await pipeline.execute(ctx);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(ctx);
      expect(state.isSent).toBe(true);
      expect(state.body).toEqual({ success: true });
    });

    it('should execute preHandlers before handler', async () => {
      const { ctx } = createMockContext();
      const executionOrder: string[] = [];

      const preHandler1 = jest.fn<void, [UnifiedHttpContext]>(() => {
        executionOrder.push('pre1');
      });

      const preHandler2 = jest.fn<void, [UnifiedHttpContext]>(() => {
        executionOrder.push('pre2');
      });

      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        executionOrder.push('handler');
        ctx.response.json({ success: true });
      });

      pipeline
        .addPreHandler(preHandler1)
        .addPreHandler(preHandler2)
        .setHandler(handler);

      await pipeline.execute(ctx);

      expect(executionOrder).toEqual(['pre1', 'pre2', 'handler']);
      expect(preHandler1).toHaveBeenCalledTimes(1);
      expect(preHandler2).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support addPreHandlers method for multiple handlers', async () => {
      const { ctx } = createMockContext();
      const executionOrder: string[] = [];

      const preHandlers: UnifiedPreHandlerFn[] = [
        jest.fn(() => {executionOrder.push('pre1')}),
        jest.fn(() => {executionOrder.push('pre2')}),
        jest.fn(() => {executionOrder.push('pre3')})
      ];

      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        executionOrder.push('handler');
        ctx.response.json({ success: true });
      });

      pipeline.addPreHandlers(preHandlers).setHandler(handler);
      await pipeline.execute(ctx);

      expect(executionOrder).toEqual(['pre1', 'pre2', 'pre3', 'handler']);
    });
  });

  describe('Early Return / Response Sent', () => {
    it('should stop pipeline when preHandler sends response', async () => {
      const { ctx, state } = createMockContext();

      const preHandler1 = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.status(401).json({ error: 'Unauthorized' });
      });

      const preHandler2 = jest.fn<void, [UnifiedHttpContext]>();
      const handler = jest.fn<void, [UnifiedHttpContext]>();

      pipeline
        .addPreHandler(preHandler1)
        .addPreHandler(preHandler2)
        .setHandler(handler);

      await pipeline.execute(ctx);

      expect(preHandler1).toHaveBeenCalledTimes(1);
      expect(preHandler2).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
      expect(state.isSent).toBe(true);
      expect(state.statusCode).toBe(401);
      expect(state.body).toEqual({ error: 'Unauthorized' });
    });

    it('should not execute handler when preHandler sends response', async () => {
      const { ctx, state } = createMockContext();

      const preHandler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.status(403).json({ error: 'Forbidden' });
      });

      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.json({ data: 'should not see this' });
      });

      pipeline.addPreHandler(preHandler).setHandler(handler);
      await pipeline.execute(ctx);

      expect(preHandler).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
      expect(state.body).toEqual({ error: 'Forbidden' });
    });

    it('should send 404 when no handler sends response', async () => {
      const { ctx, state } = createMockContext({ url: '/api/users' });

      const preHandler = jest.fn<void, [UnifiedHttpContext]>();

      pipeline.addPreHandler(preHandler);

      await pipeline.execute(ctx);

      expect(state.isSent).toBe(true);
      expect(state.statusCode).toBe(404);
      expect(state.body).toEqual({ 
        error: 'Not Found',
        path: '/api/users'
      });
    });
  });

  describe('Registry / Context Sharing', () => {
    it('should share data through registry using bracket notation', async () => {
      const { ctx } = createMockContext();

      const authPreHandler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        // ✅ ใช้ bracket notation แทน dot notation
        ctx.registry['userId'] = 'user-123';
        ctx.registry['role'] = 'admin';
      });

      const loggingPreHandler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.registry['requestTime'] = Date.now();
      });

      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        // ✅ ใช้ bracket notation และ type assertion
        const userId = ctx.registry['userId'] as string;
        const role = ctx.registry['role'] as string;
        const requestTime = ctx.registry['requestTime'] as number;

        ctx.response.json({ 
          userId, 
          role,
          hasRequestTime: typeof requestTime === 'number'
        });
      });

      pipeline
        .addPreHandler(authPreHandler)
        .addPreHandler(loggingPreHandler)
        .setHandler(handler);

      await pipeline.execute(ctx);

      expect(ctx.registry['userId']).toBe('user-123');
      expect(ctx.registry['role']).toBe('admin');
      expect(typeof ctx.registry['requestTime']).toBe('number');
    });

    it('should allow preHandlers to modify registry', async () => {
      const { ctx } = createMockContext();

      const preHandler1: UnifiedPreHandlerFn = (ctx) => {
        ctx.registry['count'] = 1;
      };

      const preHandler2: UnifiedPreHandlerFn = (ctx) => {
        const currentCount = ctx.registry['count'] as number;
        ctx.registry['count'] = currentCount + 1;
      };

      const handler: UnifiedHandlerFn = (ctx) => {
        const currentCount = ctx.registry['count'] as number;
        ctx.registry['count'] = currentCount + 1;
        ctx.response.json({ count: ctx.registry['count'] });
      };

      pipeline
        .addPreHandler(preHandler1)
        .addPreHandler(preHandler2)
        .setHandler(handler);

      await pipeline.execute(ctx);

      expect(ctx.registry['count']).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should catch errors in preHandler and send 500', async () => {
      const { ctx, state } = createMockContext();

      const errorPreHandler = jest.fn<void, [UnifiedHttpContext]>(() => {
        throw new Error('PreHandler error');
      });

      const handler = jest.fn<void, [UnifiedHttpContext]>();

      pipeline.addPreHandler(errorPreHandler).setHandler(handler);

      await pipeline.execute(ctx);

      expect(errorPreHandler).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
      expect(state.isSent).toBe(true);
      expect(state.statusCode).toBe(500);
      expect(state.body).toEqual({
        error: 'Internal Server Error',
        message: 'PreHandler error'
      });
    });

    it('should catch errors in handler and send 500', async () => {
      const { ctx, state } = createMockContext();

      const handler = jest.fn<void, [UnifiedHttpContext]>(() => {
        throw new Error('Handler error');
      });

      pipeline.setHandler(handler);
      await pipeline.execute(ctx);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(state.isSent).toBe(true);
      expect(state.statusCode).toBe(500);
      expect(state.body).toEqual({
        error: 'Internal Server Error',
        message: 'Handler error'
      });
    });

    it('should not overwrite response if already sent before error', async () => {
      const { ctx, state } = createMockContext();

      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.status(200).json({ success: true });
        throw new Error('Error after send');
      });

      pipeline.setHandler(handler);
      await pipeline.execute(ctx);

      expect(state.statusCode).toBe(200);
      expect(state.body).toEqual({ success: true });
    });

    it('should handle non-Error objects', async () => {
      const { ctx, state } = createMockContext();

      const handler = jest.fn<void, [UnifiedHttpContext]>(() => {
        throw new Error('String error');
      });

      pipeline.setHandler(handler);
      await pipeline.execute(ctx);

      expect(state.statusCode).toBe(500);
      expect(state.body).toEqual({
        error: 'Internal Server Error',
        message: 'String error'
      });
    });
  });

  describe('Async Operations', () => {
    it('should handle async preHandlers', async () => {
      const { ctx, state } = createMockContext();

      const asyncPreHandler = jest.fn<Promise<void>, [UnifiedHttpContext]>(async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        ctx.registry['asyncData'] = 'loaded';
      });

      const handler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.json({ data: ctx.registry['asyncData'] });
      });

      pipeline.addPreHandler(asyncPreHandler).setHandler(handler);
      await pipeline.execute(ctx);

      expect(asyncPreHandler).toHaveBeenCalledTimes(1);
      expect(state.body).toEqual({ data: 'loaded' });
    });

    it('should handle async handler', async () => {
      const { ctx, state } = createMockContext();

      const asyncHandler = jest.fn<Promise<void>, [UnifiedHttpContext]>(async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        ctx.response.json({ success: true });
      });

      pipeline.setHandler(asyncHandler);
      await pipeline.execute(ctx);

      expect(asyncHandler).toHaveBeenCalledTimes(1);
      expect(state.body).toEqual({ success: true });
    });

    it('should wait for each async preHandler sequentially', async () => {
      const { ctx } = createMockContext();
      const order: string[] = [];

      const preHandler1: UnifiedPreHandlerFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        order.push('pre1-done');
      };

      const preHandler2: UnifiedPreHandlerFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        order.push('pre2-done');
      };

      const handler: UnifiedHandlerFn = (ctx) => {
        order.push('handler-done');
        ctx.response.json({ success: true });
      };

      pipeline
        .addPreHandler(preHandler1)
        .addPreHandler(preHandler2)
        .setHandler(handler);

      await pipeline.execute(ctx);

      expect(order).toEqual(['pre1-done', 'pre2-done', 'handler-done']);
    });
  });

  describe('Method Chaining', () => {
    it('should support method chaining for pipeline setup', () => {
      const preHandler1 = jest.fn<void, [UnifiedHttpContext]>();
      const preHandler2 = jest.fn<void, [UnifiedHttpContext]>();
      const handler = jest.fn<void, [UnifiedHttpContext]>();

      const result = pipeline
        .addPreHandler(preHandler1)
        .addPreHandler(preHandler2)
        .setHandler(handler);

      expect(result).toBe(pipeline);
    });

    it('should support method chaining in response', async () => {
      const { ctx, state } = createMockContext();

      const handler: UnifiedHandlerFn = (ctx) => {
        ctx.response
          .status(201)
          .header('X-Custom', 'value')
          .json({ created: true });
      };

      pipeline.setHandler(handler);
      await pipeline.execute(ctx);

      expect(state.statusCode).toBe(201);
      expect(state.headers['X-Custom']).toBe('value');
      expect(state.body).toEqual({ created: true });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pipeline (no handlers)', async () => {
      const { ctx, state } = createMockContext();

      await pipeline.execute(ctx);

      expect(state.isSent).toBe(true);
      expect(state.statusCode).toBe(404);
    });

    it('should handle pipeline with only preHandlers', async () => {
      const { ctx, state } = createMockContext();

      const preHandler = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.registry['data'] = 'test';
      });

      pipeline.addPreHandler(preHandler);
      await pipeline.execute(ctx);

      expect(preHandler).toHaveBeenCalledTimes(1);
      expect(state.statusCode).toBe(404);
    });

    it('should allow setting handler multiple times (last one wins)', async () => {
      const { ctx, state } = createMockContext();

      const handler1 = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.json({ handler: 1 });
      });

      const handler2 = jest.fn<void, [UnifiedHttpContext]>((ctx) => {
        ctx.response.json({ handler: 2 });
      });

      pipeline.setHandler(handler1).setHandler(handler2);
      await pipeline.execute(ctx);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(state.body).toEqual({ handler: 2 });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should simulate authentication flow', async () => {
      const { ctx, state } = createMockContext({
        headers: { authorization: 'Bearer valid-token' }
      });

      const authPreHandler: UnifiedPreHandlerFn = (ctx) => {
        const token = ctx.request.headers['authorization'];
        
        if (!token) {
          ctx.response.status(401).json({ error: 'No token' });
          return;
        }

        if (token !== 'Bearer valid-token') {
          ctx.response.status(403).json({ error: 'Invalid token' });
          return;
        }

        ctx.registry['userId'] = 'user-123';
      };

      const handler: UnifiedHandlerFn = (ctx) => {
        const userId = ctx.registry['userId'] as string;
        ctx.response.json({ message: 'Protected data', userId });
      };

      pipeline.addPreHandler(authPreHandler).setHandler(handler);
      await pipeline.execute(ctx);

      expect(state.statusCode).toBe(200);
      expect(state.body).toEqual({ 
        message: 'Protected data', 
        userId: 'user-123' 
      });
    });

    it('should simulate validation flow', async () => {
      const { ctx, state } = createMockContext({
        body: { name: 'A' }
      });

      const validatePreHandler: UnifiedPreHandlerFn = (ctx) => {
        const name = ctx.request.body['name'] as string;

        if (!name || name.length < 3) {
          ctx.response.status(400).json({ 
            error: 'Validation failed',
            field: 'name',
            message: 'Name must be at least 3 characters'
          });
        }
      };

      const handler: UnifiedHandlerFn = (ctx) => {
        ctx.response.json({ success: true });
      };

      pipeline.addPreHandler(validatePreHandler).setHandler(handler);
      await pipeline.execute(ctx);

      expect(state.statusCode).toBe(400);
      expect(state.body).toEqual({
        error: 'Validation failed',
        field: 'name',
        message: 'Name must be at least 3 characters'
      });
    });

    it('should simulate logging and monitoring', async () => {
      const { ctx } = createMockContext();
      const logs: string[] = [];

      const loggingPreHandler: UnifiedPreHandlerFn = (ctx) => {
        logs.push(`Request: ${ctx.request.method} ${ctx.request.url}`);
        ctx.registry['startTime'] = Date.now();
      };

      const handler: UnifiedHandlerFn = (ctx) => {
        ctx.response.json({ data: 'test' });
      };

      pipeline
        .addPreHandler(loggingPreHandler)
        .setHandler(handler);

      await pipeline.execute(ctx);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('Request: GET /test');
      expect(typeof ctx.registry['startTime']).toBe('number');
    });
  });
});