import { 
  UnifiedInternalService,
  UnifiedInternalClient,
  UnifiedInternalError,
  UnifiedInternalCallResult
} from '../unified-internal.service';
import type { UnifiedRouteHandler } from '../../types/unified-middleware';

describe('UnifiedInternalService', () => {
  let service: UnifiedInternalService;

  beforeEach(() => {
    service = new UnifiedInternalService({
      serviceName: 'test-service',
      version: '1.0.0'
    });
  });

  describe('Basic Functionality', () => {
    test('should create service with global registry', () => {
      const globalRegistry = { version: '1.0.0', serviceName: 'test' };
      const serviceWithRegistry = new UnifiedInternalService(globalRegistry);
      
      expect(serviceWithRegistry).toBeDefined();
    });

    test('should register and find handlers', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ message: 'test' });
      };
      
      service.registerHandler('/api/test', handler);
      
      expect(service.hasHandler('/api/test')).toBe(true);
      expect(service.getRegisteredRoutes()).toContain('/api/test');
    });

    test('should unregister handlers', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ message: 'test' });
      };
      
      service.registerHandler('/api/test', handler);
      expect(service.hasHandler('/api/test')).toBe(true);
      
      const removed = service.unregisterHandler('/api/test');
      expect(removed).toBe(true);
      expect(service.hasHandler('/api/test')).toBe(false);
    });

    test('should return false when unregistering non-existent handler', () => {
      const removed = service.unregisterHandler('/api/nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('Route Matching', () => {
    test('should match exact routes', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ route: 'exact' });
      };
      
      service.registerHandler('/api/documents', handler);
      expect(service.hasHandler('/api/documents')).toBe(true);
    });

    test('should match parameterized routes', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ id: ctx.request.params['id'] });
      };
      
      service.registerHandler('/api/documents/:id', handler);
      expect(service.hasHandler('/api/documents/123')).toBe(true);
    });

    test('should match multiple parameters', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          userId: ctx.request.params['userId'],
          documentId: ctx.request.params['documentId'] 
        });
      };
      
      service.registerHandler('/api/users/:userId/documents/:documentId', handler);
      expect(service.hasHandler('/api/users/123/documents/456')).toBe(true);
    });

    test('should not match routes with different segment count', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ id: ctx.request.params['id'] });
      };
      
      service.registerHandler('/api/documents/:id', handler);
      expect(service.hasHandler('/api/documents/123/extra')).toBe(false);
    });
  });

  describe('Request Processing', () => {
    test('should process simple GET request', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ message: 'Hello World', method: ctx.request.method });
      };
      
      service.registerHandler('/api/hello', handler);
      
      const result = await service.processRequest({
        route: '/api/hello',
        method: 'GET'
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ message: 'Hello World', method: 'GET' });
    });

    test('should process POST request with body', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        const { name } = ctx.request.body as { name: string };
        ctx.response.status(201).json({ 
          message: `Hello ${name}`, 
          received: ctx.request.body 
        });
      };
      
      service.registerHandler('/api/greet', handler);
      
      const result = await service.processRequest({
        route: '/api/greet',
        method: 'POST',
        body: { name: 'John' }
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual({ 
        message: 'Hello John', 
        received: { name: 'John' }
      });
    });

    test('should extract parameters from route', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          id: ctx.request.params['id'],
          action: ctx.request.params['action']
        });
      };
      
      service.registerHandler('/api/documents/:id/:action', handler);
      
      const result = await service.processRequest({
        route: '/api/documents/123/edit',
        method: 'GET'
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ id: '123', action: 'edit' });
    });

    test('should merge extracted params with provided params', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          params: ctx.request.params 
        });
      };
      
      service.registerHandler('/api/users/:userId/posts/:postId', handler);
      
      const result = await service.processRequest({
        route: '/api/users/123/posts/456',
        method: 'GET',
        params: { extra: 'value' }
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ 
        params: { 
          userId: '123', 
          postId: '456', 
          extra: 'value' 
        }
      });
    });

    test('should handle query parameters', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ query: ctx.request.query });
      };
      
      service.registerHandler('/api/search', handler);
      
      const result = await service.processRequest({
        route: '/api/search',
        method: 'GET',
        query: { q: 'test', limit: '10' }
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ query: { q: 'test', limit: '10' } });
    });

    test('should handle custom headers', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          userAgent: ctx.request.userAgent,
          customHeader: ctx.request.headers['x-custom']
        });
      };
      
      service.registerHandler('/api/headers', handler);
      
      const result = await service.processRequest({
        route: '/api/headers',
        method: 'GET',
        headers: { 'x-custom': 'test-value' }
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ 
        userAgent: 'UnifiedInternalAdapter/1.0',
        customHeader: 'test-value'
      });
    });

    test('should use global registry', async () => {
      const globalRegistry = { dbConnection: 'mock-db', config: { timeout: 5000 } };
      const serviceWithRegistry = new UnifiedInternalService(globalRegistry);
      
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          registry: ctx.registry
        });
      };
      
      serviceWithRegistry.registerHandler('/api/registry', handler);
      
      const result = await serviceWithRegistry.processRequest({
        route: '/api/registry',
        method: 'GET'
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ registry: globalRegistry });
    });

    test('should merge global and local registry', async () => {
      const globalRegistry = { global: 'value' };
      const serviceWithRegistry = new UnifiedInternalService(globalRegistry);
      
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ registry: ctx.registry });
      };
      
      serviceWithRegistry.registerHandler('/api/registry', handler);
      
      const result = await serviceWithRegistry.processRequest({
        route: '/api/registry',
        method: 'GET',
        registry: { local: 'value' }
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({ 
        registry: { global: 'value', local: 'value' }
      });
    });
  });

  describe('Error Handling', () => {
    test('should throw error for non-existent route', async () => {
      await expect(service.processRequest({
        route: '/api/nonexistent',
        method: 'GET'
      })).rejects.toThrow('No handler found for route: /api/nonexistent');
    });

    test('should handle handler errors gracefully', async () => {
      const handler: UnifiedRouteHandler = async () => {
        throw new Error('Handler error');
      };
      
      service.registerHandler('/api/error', handler);
      
      const result = await service.processRequest({
        route: '/api/error',
        method: 'GET'
      });
      
      expect(result.isSuccess()).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.data).toEqual({ error: 'Handler error', code: 500 });
    });

    test('should handle handlers that do not send response', async () => {
      const handler: UnifiedRouteHandler = async () => {
        // Handler that doesn't send response
      };
      
      service.registerHandler('/api/no-response', handler);
      
      const result = await service.processRequest({
        route: '/api/no-response',
        method: 'GET'
      });
      
      expect(result.isSuccess()).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.data).toEqual({ error: 'Handler did not send response', code: 500 });
    });

    test('should respect custom status codes in errors', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.status(404);
        throw new Error('Not found');
      };
      
      service.registerHandler('/api/custom-error', handler);
      
      const result = await service.processRequest({
        route: '/api/custom-error',
        method: 'GET'
      });
      
      expect(result.isSuccess()).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.data).toEqual({ error: 'Not found', code: 404 });
    });
  });
});

describe('UnifiedInternalClient', () => {
  let service: UnifiedInternalService;
  let client: UnifiedInternalClient;

  beforeEach(() => {
    service = new UnifiedInternalService();
    client = new UnifiedInternalClient(service);
  });

  describe('Basic Operations', () => {
    test('should check if route exists', () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ message: 'test' });
      };
      
      service.registerHandler('/api/test', handler);
      
      expect(client.hasRoute('/api/test')).toBe(true);
      expect(client.hasRoute('/api/nonexistent')).toBe(false);
    });

    test('should make generic call', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          method: ctx.request.method,
          route: ctx.request.route,
          body: ctx.request.body
        });
      };
      
      service.registerHandler('/api/generic', handler);
      
      const result = await client.call({
        route: '/api/generic',
        method: 'POST',
        body: { data: 'test' }
      });
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({
        method: 'POST',
        route: '/api/generic',
        body: { data: 'test' }
      });
    });
  });

  describe('HTTP Method Helpers', () => {
    beforeEach(() => {
      // Register handlers for different HTTP methods
      const getHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          method: 'GET',
          params: ctx.request.params,
          query: ctx.request.query
        });
      };
      
      const postHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.status(201).json({ 
          method: 'POST',
          body: ctx.request.body
        });
      };
      
      const putHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          method: 'PUT',
          params: ctx.request.params,
          body: ctx.request.body
        });
      };
      
      const deleteHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.status(204).json({ 
          method: 'DELETE',
          params: ctx.request.params
        });
      };
      
      service.registerHandler('/api/documents/:id', getHandler);
      service.registerHandler('/api/documents', postHandler);
      service.registerHandler('/api/documents/:id/update', putHandler);
      service.registerHandler('/api/documents/:id/delete', deleteHandler);
    });

    test('should make GET request', async () => {
      const result = await client.get('/api/documents/:id', 
        { id: '123' },
        { 
          query: { include: 'metadata' },
          userId: 'user-001' 
        }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({
        method: 'GET',
        params: { id: '123' },
        query: { include: 'metadata' }
      });
    });

    test('should make POST request', async () => {
      const result = await client.post('/api/documents', 
        { title: 'New Document', content: 'Content here' },
        { userId: 'user-001' }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual({
        method: 'POST',
        body: { title: 'New Document', content: 'Content here' }
      });
    });

    test('should make PUT request', async () => {
      const result = await client.put('/api/documents/:id/update',
        { title: 'Updated Title' },
        { 
          params: { id: '123' },
          userId: 'user-001'
        }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({
        method: 'PUT',
        params: { id: '123' },
        body: { title: 'Updated Title' }
      });
    });

    test('should make DELETE request', async () => {
      const result = await client.delete('/api/documents/:id/delete',
        { id: '123' },
        { userId: 'user-001' }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.statusCode).toBe(204);
      expect(result.data).toEqual({
        method: 'DELETE',
        params: { id: '123' }
      });
    });
  });

  describe('Advanced Features', () => {
    test('should pass correlation ID and user ID', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({
          correlationId: ctx.request.headers['x-correlation-id'],
          userId: ctx.request.headers['x-user-id']
        });
      };
      
      service.registerHandler('/api/tracking', handler);
      
      const result = await client.get('/api/tracking', 
        {},
        { 
          correlationId: 'test-correlation-123',
          userId: 'user-456'
        }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({
        correlationId: 'test-correlation-123',
        userId: 'user-456'
      });
    });

    test('should pass custom headers', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({
          customHeader: ctx.request.headers['x-custom'],
          source: ctx.request.headers['x-source']
        });
      };
      
      service.registerHandler('/api/headers', handler);
      
      const result = await client.get('/api/headers',
        {},
        {
          headers: { 'x-custom': 'test-value' }
        }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({
        customHeader: 'test-value',
        source: 'unified-internal'
      });
    });

    test('should pass registry data', async () => {
      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({
          registry: ctx.registry
        });
      };
      
      service.registerHandler('/api/registry', handler);
      
      const result = await client.get('/api/registry',
        {},
        {
          registry: { 
            dbConnection: 'mock-db',
            userSession: { userId: 'user-123' }
          }
        }
      );
      
      expect(result.isSuccess()).toBe(true);
      expect(result.data).toEqual({
        registry: {
          dbConnection: 'mock-db',
          userSession: { userId: 'user-123' }
        }
      });
    });
  });

  describe('Error Scenarios', () => {
    test('should handle service errors through client', async () => {
      // For non-existent routes, the service throws an error directly
      await expect(client.get('/api/nonexistent')).rejects.toThrow('No handler found for route: /api/nonexistent');
    });

    test('should handle handler errors through client', async () => {
      const handler: UnifiedRouteHandler = async () => {
        throw new Error('Handler failed');
      };
      
      service.registerHandler('/api/failing', handler);
      
      const result = await client.get('/api/failing');
      
      expect(result.isSuccess()).toBe(false);
      expect(result.data).toEqual({ error: 'Handler failed', code: 500 });
    });
  });
});

describe('UnifiedInternalCallResult', () => {
  test('should identify successful results', () => {
    const successResult = new UnifiedInternalCallResult(
      { message: 'success' },
      200,
      {},
      true
    );
    
    expect(successResult.isSuccess()).toBe(true);
  });

  test('should identify failed results', () => {
    const failedResult = new UnifiedInternalCallResult(
      { error: 'failed' },
      500,
      {},
      false
    );
    
    expect(failedResult.isSuccess()).toBe(false);
  });

  test('should unwrap successful results', () => {
    const result = new UnifiedInternalCallResult(
      { data: 'test' },
      200,
      {},
      true
    );
    
    expect(result.unwrap()).toEqual({ data: 'test' });
  });

  test('should throw error when unwrapping failed results', () => {
    const result = new UnifiedInternalCallResult(
      { error: 'failed' },
      500,
      {},
      false
    );
    
    expect(() => result.unwrap()).toThrow(UnifiedInternalError);
  });

  test('should provide access to result properties', () => {
    const headers = { 'content-type': 'application/json' };
    const data = { test: 'data' };
    
    const result = new UnifiedInternalCallResult(
      data,
      201,
      headers,
      true
    );
    
    expect(result.data).toBe(data);
    expect(result.statusCode).toBe(201);
    expect(result.headers).toEqual(headers);
    expect(result.success).toBe(true);
  });
});

describe('UnifiedInternalError', () => {
  test('should create error with message and code', () => {
    const error = new UnifiedInternalError('Test error', 'TEST_CODE');
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('UnifiedInternalError');
    expect(error.data).toBeUndefined();
  });

  test('should create error with additional data', () => {
    const errorData = { details: 'Additional info' };
    const error = new UnifiedInternalError('Test error', 'TEST_CODE', errorData);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.data).toBe(errorData);
  });
});
