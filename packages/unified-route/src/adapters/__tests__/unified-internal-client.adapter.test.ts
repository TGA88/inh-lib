/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnifiedInternalService, UnifiedInternalClient } from '../../services/unified-internal.service';
import { UnifiedInternalClientAdapter, createInhHttpClient } from '../unified-internal-client.adapter';
import { InhHttpClient } from '@inh-lib/common';
import { UnifiedRouteHandler } from '../../types/unified-middleware';

describe('UnifiedInternalClientAdapter', () => {
  let service: UnifiedInternalService;
  let internalClient: UnifiedInternalClient;
  let httpClient: InhHttpClient;

  beforeEach(() => {
    service = new UnifiedInternalService();
    internalClient = new UnifiedInternalClient(service);
  });

  afterEach(() => {
    // Clear all registered handlers
    const routes = service.getRegisteredRoutes();
    routes.forEach(route => service.unregisterHandler(route));
  });

  describe('Basic Adapter Functionality', () => {
    beforeEach(() => {
      httpClient = new UnifiedInternalClientAdapter(internalClient, {
        userId: 'test-user',
        correlationId: 'test-correlation'
      });
    });

    test('should implement InhHttpClient interface', () => {
      expect(httpClient).toBeDefined();
      expect(typeof httpClient.get).toBe('function');
      expect(typeof httpClient.post).toBe('function');
      expect(typeof httpClient.put).toBe('function');
      expect(typeof httpClient.delete).toBe('function');
      expect(typeof httpClient.patch).toBe('function');
    });

    test('should convert UnifiedInternalCallResult to InhHttpResponse', async () => {
      const handler: UnifiedRouteHandler = async (ctx: any) => {
        ctx.response.json({ message: 'Hello World', userId: ctx.request.headers['x-user-id'] });
      };

      service.registerHandler('/api/test', handler);

      const response = await httpClient.get<{ message: string; userId: string }>('/api/test');

      expect(response.data).toEqual({ 
        message: 'Hello World', 
        userId: 'test-user' 
      });
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.headers).toBeDefined();
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      httpClient = new UnifiedInternalClientAdapter(internalClient);

      // Setup handlers
      const getHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ method: 'GET', route: ctx.request.route });
      };

      const postHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.status(201).json({ 
          method: 'POST', 
          body: ctx.request.body,
          route: ctx.request.route 
        });
      };

      const putHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          method: 'PUT', 
          body: ctx.request.body,
          route: ctx.request.route 
        });
      };

      const deleteHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.status(204).json({ method: 'DELETE', route: ctx.request.route });
      };

      const patchHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ 
          method: 'PATCH', 
          body: ctx.request.body,
          route: ctx.request.route 
        });
      };

      service.registerHandler('/api/get', getHandler);
      service.registerHandler('/api/post', postHandler);  
      service.registerHandler('/api/put', putHandler);
      service.registerHandler('/api/delete', deleteHandler);
      service.registerHandler('/api/patch', patchHandler);
    });

    test('GET request should work correctly', async () => {
      const response = await httpClient.get<{ method: string }>('/api/get');

      expect(response.status).toBe(200);
      expect(response.data.method).toBe('GET');
    });

    test('POST request should work correctly', async () => {
      const postData = { name: 'Test', value: 123 };
      const response = await httpClient.post<{ method: string; body: unknown }>('/api/post', postData);

      expect(response.status).toBe(201);
      expect(response.statusText).toBe('Created');
      expect(response.data.method).toBe('POST');
      expect(response.data.body).toEqual(postData);
    });

    test('PUT request should work correctly', async () => {
      const putData = { id: 1, name: 'Updated' };
      const response = await httpClient.put<{ method: string; body: unknown }>('/api/put', putData);

      expect(response.status).toBe(200);
      expect(response.data.method).toBe('PUT');
      expect(response.data.body).toEqual(putData);
    });

    test('DELETE request should work correctly', async () => {
      const response = await httpClient.delete<{ method: string }>('/api/delete');

      expect(response.status).toBe(204);
      expect(response.statusText).toBe('No Content');
      expect(response.data.method).toBe('DELETE');
    });

    test('PATCH request should work correctly', async () => {
      const patchData = { status: 'updated' };
      const response = await httpClient.patch<{ method: string; body: unknown }>('/api/patch', patchData);

      expect(response.status).toBe(200);
      expect(response.data.method).toBe('PATCH');
      expect(response.data.body).toEqual(patchData);
    });
  });

  describe('Configuration and Headers', () => {
    beforeEach(() => {
      const headerHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({
          headers: ctx.request.headers,
          userId: ctx.request.headers['x-user-id'],
          correlationId: ctx.request.headers['x-correlation-id']
        });
      };

      service.registerHandler('/api/headers', headerHandler);
    });

    test('should pass default options correctly', async () => {
      httpClient = new UnifiedInternalClientAdapter(internalClient, {
        userId: 'default-user',
        correlationId: 'default-correlation',
        headers: { 'x-custom': 'default-value' }
      });

      const response = await httpClient.get<{ 
        userId: string; 
        correlationId: string;
        headers: Record<string, string>;
      }>('/api/headers');

      expect(response.data.userId).toBe('default-user');
      expect(response.data.correlationId).toBe('default-correlation');
      expect(response.data.headers['x-custom']).toBe('default-value');
    });

    test('should merge request config with defaults', async () => {
      httpClient = new UnifiedInternalClientAdapter(internalClient, {
        userId: 'default-user',
        headers: { 'x-default': 'default' }
      });

      const response = await httpClient.get<{ headers: Record<string, string> }>('/api/headers', {
        headers: { 'x-request': 'request-value' }
      });

      expect(response.data.headers['x-default']).toBe('default');
      expect(response.data.headers['x-request']).toBe('request-value');
    });

    test('should update defaults correctly', async () => {
      const adapter = new UnifiedInternalClientAdapter(internalClient, {
        userId: 'initial-user'
      });

      adapter.updateDefaults({
        userId: 'updated-user',
        correlationId: 'new-correlation'
      });

      const response = await adapter.get<{ 
        userId: string; 
        correlationId: string;
      }>('/api/headers');

      expect(response.data.userId).toBe('updated-user');
      expect(response.data.correlationId).toBe('new-correlation');
    });
  });

  describe('Factory Function', () => {
    test('createInhHttpClient should create working adapter', async () => {
      const factoryClient = createInhHttpClient(internalClient, {
        userId: 'factory-user'
      });

      const handler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({ userId: ctx.request.headers['x-user-id'] });
      };

      service.registerHandler('/api/factory', handler);

      const response = await factoryClient.get<{ userId: string }>('/api/factory');

      expect(response.data.userId).toBe('factory-user');
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      httpClient = new UnifiedInternalClientAdapter(internalClient);

      const errorHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.status(400).json({ error: 'Bad Request' });
      };

      service.registerHandler('/api/error', errorHandler);
    });

    test('should handle error responses correctly', async () => {
      const response = await httpClient.get<{ error: string }>('/api/error');

      expect(response.status).toBe(400);
      expect(response.statusText).toBe('Bad Request');
      expect(response.data.error).toBe('Bad Request');
    });

    test('should handle missing routes', async () => {
      try {
        await httpClient.get('/api/nonexistent');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Advanced Features', () => {
    test('should provide access to internal client', () => {
      const adapter = new UnifiedInternalClientAdapter(internalClient);
      
      expect(adapter.getInternalClient()).toBe(internalClient);
    });

    test('should work with registry', async () => {
      const registryHandler: UnifiedRouteHandler = async (ctx) => {
        const config = ctx.registry['config'] as { timeout: number };
        ctx.response.json({ timeout: config.timeout });
      };

      service.registerHandler('/api/registry', registryHandler);

      httpClient = new UnifiedInternalClientAdapter(internalClient, {
        registry: { config: { timeout: 5000 } }
      });

      const response = await httpClient.get<{ timeout: number }>('/api/registry');

      expect(response.data.timeout).toBe(5000);
    });
  });
});