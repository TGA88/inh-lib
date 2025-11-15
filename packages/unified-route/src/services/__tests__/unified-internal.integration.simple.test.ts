import { 
  UnifiedInternalService,
  UnifiedInternalClient
} from '../unified-internal.service';
import type { UnifiedRouteHandler } from '../../types/unified-middleware';

describe('UnifiedInternalService & UnifiedInternalClient Integration Tests', () => {
  let service: UnifiedInternalService;
  let client: UnifiedInternalClient;

  beforeEach(() => {
    service = new UnifiedInternalService({
      serviceName: 'integration-test-service',
      version: '1.0.0'
    });
    client = new UnifiedInternalClient(service);
  });

  describe('Real-World CRUD Workflow', () => {
    const documents = new Map<string, Record<string, unknown>>();
    let documentIdCounter = 1;

    beforeEach(() => {
      const createHandler: UnifiedRouteHandler = async (ctx) => {
        const body = ctx.request.body as Record<string, unknown>;
        const id = `doc_${documentIdCounter++}`;
        const document = { id, ...body, createdAt: new Date().toISOString() };
        documents.set(id, document);
        ctx.response.status(201).json({ success: true, data: document });
      };

      const getHandler: UnifiedRouteHandler = async (ctx) => {
        const { id } = ctx.request.params;
        const document = documents.get(id);
        
        if (!document) {
          ctx.response.status(404).json({ success: false, error: 'Not found' });
          return;
        }

        ctx.response.json({ success: true, data: document });
      };

      const updateHandler: UnifiedRouteHandler = async (ctx) => {
        const { id } = ctx.request.params;
        const updates = ctx.request.body as Record<string, unknown>;
        const document = documents.get(id);
        
        if (!document) {
          ctx.response.status(404).json({ success: false, error: 'Not found' });
          return;
        }

        const updatedDocument = { ...document, ...updates, updatedAt: new Date().toISOString() };
        documents.set(id, updatedDocument);
        ctx.response.json({ success: true, data: updatedDocument });
      };

      const deleteHandler: UnifiedRouteHandler = async (ctx) => {
        const { id } = ctx.request.params;
        
        if (!documents.has(id)) {
          ctx.response.status(404).json({ success: false, error: 'Not found' });
          return;
        }

        documents.delete(id);
        ctx.response.status(204).json({ success: true });
      };

      service.registerHandler('/api/documents', createHandler);
      service.registerHandler('/api/documents/:id', getHandler);
      service.registerHandler('/api/documents/:id/update', updateHandler);
      service.registerHandler('/api/documents/:id/delete', deleteHandler);

      documents.clear();
      documentIdCounter = 1;
    });

    test('should complete full CRUD workflow', async () => {
      // Create
      const createResult = await client.post('/api/documents', {
        title: 'Test Document',
        content: 'Test content'
      });

      expect(createResult.isSuccess()).toBe(true);
      expect(createResult.statusCode).toBe(201);
      
      const createData = createResult.data as Record<string, unknown>;
      const docData = createData['data'] as Record<string, unknown>;
      const documentId = docData['id'] as string;

      // Read
      const getResult = await client.get('/api/documents/:id', { id: documentId });
      expect(getResult.isSuccess()).toBe(true);

      // Update
      const updateResult = await client.put('/api/documents/:id/update', 
        { title: 'Updated Document' },
        { params: { id: documentId } }
      );
      expect(updateResult.isSuccess()).toBe(true);

      // Delete
      const deleteResult = await client.delete('/api/documents/:id/delete', { id: documentId });
      expect(deleteResult.isSuccess()).toBe(true);
      expect(deleteResult.statusCode).toBe(204);

      // Verify deletion
      const verifyResult = await client.get('/api/documents/:id', { id: documentId });
      expect(verifyResult.isSuccess()).toBe(false);
      expect(verifyResult.statusCode).toBe(404);
    });
  });

  describe('Cross-Service Communication', () => {
    beforeEach(() => {
      const userHandler: UnifiedRouteHandler = async (ctx) => {
        const { id } = ctx.request.params;
        ctx.response.json({
          id,
          name: `User ${id}`,
          email: `user${id}@example.com`
        });
      };

      const documentWithAuthorHandler: UnifiedRouteHandler = async (ctx) => {
        const { id } = ctx.request.params;
        const internalClient = ctx.registry['internalClient'] as UnifiedInternalClient;

        try {
          const document = { id, title: `Document ${id}`, authorId: '123' };
          
          const userResult = await internalClient.get('/api/users/:id', { id: document.authorId });
          
          if (!userResult.isSuccess()) {
            ctx.response.status(500).json({ error: 'Failed to fetch author' });
            return;
          }

          ctx.response.json({
            success: true,
            data: { ...document, author: userResult.data }
          });
        } catch (error) {
          ctx.response.status(500).json({
            error: error instanceof Error ? error.message : 'Internal error'
          });
        }
      };

      service.registerHandler('/api/users/:id', userHandler);
      service.registerHandler('/api/documents/:id/with-author', documentWithAuthorHandler);
    });

    test('should support service-to-service communication', async () => {
      const result = await client.get('/api/documents/:id/with-author', 
        { id: 'doc-123' },
        { registry: { internalClient: client } }
      );

      expect(result.isSuccess()).toBe(true);
      
      const data = result.data as Record<string, unknown>;
      expect(data['success']).toBe(true);
      
      const docData = data['data'] as Record<string, unknown>;
      expect(docData['id']).toBe('doc-123');
      expect(docData['author']).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      const resilientHandler: UnifiedRouteHandler = async (ctx) => {
        try {
          // Simulate calling external service that fails
          throw new Error('Simulated failure');
        } catch (error) {
          // Fallback logic
          ctx.response.json({
            success: true,
            source: 'fallback',
            message: 'Using fallback service',
            originalError: error instanceof Error ? error.message : 'Unknown'
          });
        }
      };

      service.registerHandler('/api/resilient', resilientHandler);
    });

    test('should handle failures with fallback', async () => {
      const result = await client.get('/api/resilient', {});

      expect(result.isSuccess()).toBe(true);
      
      const data = result.data as Record<string, unknown>;
      expect(data['success']).toBe(true);
      expect(data['source']).toBe('fallback');
      expect(data['originalError']).toContain('Simulated failure');
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(() => {
      const slowHandler: UnifiedRouteHandler = async (ctx) => {
        const query = ctx.request.query as Record<string, string | string[]>;
        const delay = parseInt(query['delay'] as string || '50', 10);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        ctx.response.json({
          success: true,
          processedAt: new Date().toISOString(),
          delay
        });
      };

      service.registerHandler('/api/slow', slowHandler);
    });

    test('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 3 }, (_, i) =>
        client.get('/api/slow', {}, {
          query: { delay: '30' },
          correlationId: `concurrent-${i}`
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results.every(result => result.isSuccess())).toBe(true);
      expect(totalTime).toBeLessThan(150); // Should be much less than 3 * 30ms
    });

    test('should maintain request isolation', async () => {
      const [result1, result2] = await Promise.all([
        client.get('/api/slow', {}, {
          query: { delay: '10' },
          correlationId: 'req-1'
        }),
        client.get('/api/slow', {}, {
          query: { delay: '20' },
          correlationId: 'req-2'
        })
      ]);

      expect(result1.isSuccess()).toBe(true);
      expect(result2.isSuccess()).toBe(true);

      const data1 = result1.data as Record<string, unknown>;
      const data2 = result2.data as Record<string, unknown>;

      expect(data1['delay']).toBe(10);
      expect(data2['delay']).toBe(20);
    });
  });

  describe('Context and Registry Propagation', () => {
    beforeEach(() => {
      const contextHandler: UnifiedRouteHandler = async (ctx) => {
        ctx.response.json({
          success: true,
          context: {
            registry: ctx.registry,
            headers: {
              correlationId: ctx.request.headers['x-correlation-id'],
              userId: ctx.request.headers['x-user-id']
            }
          }
        });
      };

      service.registerHandler('/api/context', contextHandler);
    });

    test('should propagate registry and headers correctly', async () => {
      const registry = {
        dbConnection: 'mock-db',
        config: { timeout: 5000 }
      };

      const result = await client.get('/api/context', {}, {
        registry,
        correlationId: 'test-123',
        userId: 'user-456'
      });

      expect(result.isSuccess()).toBe(true);
      
      const data = result.data as Record<string, unknown>;
      const context = data['context'] as Record<string, unknown>;
      
      // The registry should contain our provided registry plus any global registry properties
      const actualRegistry = context['registry'] as Record<string, unknown>;
      expect(actualRegistry['dbConnection']).toBe('mock-db');
      expect(actualRegistry['config']).toEqual({ timeout: 5000 });
      
      const headers = context['headers'] as Record<string, unknown>;
      expect(headers['correlationId']).toBe('test-123');
      expect(headers['userId']).toBe('user-456');
    });
  });
});