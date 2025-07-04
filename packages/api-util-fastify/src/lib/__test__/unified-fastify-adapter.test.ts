// __tests__/adapters/unified-fastify-adapter.test.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  adaptFastifyRequest,
  adaptFastifyResponse,
  createFastifyContext
} from '../unified-fastify-adapter';


// Type-safe mock interfaces
interface MockFastifyRequest extends Partial<FastifyRequest> {
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string | string[]>;
  method: string;
  url: string;
  ip: string;
}

// Create a mock type that matches FastifyReply's method signatures
type MockFastifyReply = {
  status: jest.Mock<FastifyReply, [number]>;
  send: jest.Mock<FastifyReply, [unknown]>;
  header: jest.Mock<FastifyReply, [string, string | number | string[]]>;
  redirect: jest.Mock<FastifyReply, [string, number?]>;
}

// Test data interfaces
interface UserRequestBody {
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
}

interface ProductRequestBody {
  name: string;
  price: number;
  category: string;
  tags: string[];
}

// Helper functions for creating type-safe mock objects
const createMockFastifyRequest = (overrides: Partial<MockFastifyRequest> = {}): MockFastifyRequest => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/',
  ip: '127.0.0.1',
  ...overrides,
});

const createMockFastifyReply = (): MockFastifyReply => ({
  status: jest.fn().mockReturnThis() as jest.Mock<FastifyReply, [number]>,
  send: jest.fn().mockReturnThis() as jest.Mock<FastifyReply, [unknown]>,
  header: jest.fn().mockReturnThis() as jest.Mock<FastifyReply, [string, string | number | string[]]>,
  redirect: jest.fn() as jest.Mock<FastifyReply, [string, number?]>,
});

const createUserRequestBody = (overrides: Partial<UserRequestBody> = {}): UserRequestBody => ({
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  age: 25,
  ...overrides,
});

const createProductRequestBody = (overrides: Partial<ProductRequestBody> = {}): ProductRequestBody => ({
  name: 'Test Product',
  price: 99.99,
  category: 'electronics',
  tags: ['new', 'featured'],
  ...overrides,
});

// Custom Jest matchers for better assertions
expect.extend({
  toBeValidUnifiedRequestContext(received: unknown): jest.CustomMatcherResult {
    const isValid = received &&
      typeof received === 'object' &&
      'body' in received &&
      'params' in received &&
      'query' in received &&
      'headers' in received &&
      'method' in received &&
      'url' in received &&
      'ip' in received;

    return {
      message: () => `expected ${received} to ${isValid ? 'not ' : ''}be a valid UnifiedRequestContext`,
      pass: Boolean(isValid),
    };
  },

  toBeValidUnifiedResponseContext(received: unknown): jest.CustomMatcherResult {
    const isValid = received &&
      typeof received === 'object' &&
      'status' in received &&
      'json' in received &&
      'send' in received &&
      'header' in received &&
      'redirect' in received &&
      typeof (received as Record<string, unknown>)['status'] === 'function' &&
      typeof (received as Record<string, unknown>)['json'] === 'function';

    return {
      message: () => `expected ${received} to ${isValid ? 'not ' : ''}be a valid UnifiedResponseContext`,
      pass: Boolean(isValid),
    };
  },
});

// Extend Jest matchers interface using global namespace (compatible with Nx 15)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidUnifiedRequestContext(): R;
      toBeValidUnifiedResponseContext(): R;
    }
  }
}

describe('Unified Fastify Adapter', () => {
  describe('adaptFastifyRequest', () => {
    describe('Basic request adaptation', () => {
      it('should adapt minimal fastify request correctly', () => {
        const mockRequest = createMockFastifyRequest({
          method: 'GET',
          url: '/api/test',
          ip: '192.168.1.1',
        });

        const result = adaptFastifyRequest(mockRequest as unknown as FastifyRequest);

        expect(result).toBeValidUnifiedRequestContext();
        expect(result.method).toBe('GET');
        expect(result.url).toBe('/api/test');
        expect(result.ip).toBe('192.168.1.1');
        expect(result.body).toEqual({});
        expect(result.params).toEqual({});
        expect(result.query).toEqual({});
        expect(result.headers).toEqual({});
      });

      it('should adapt complete fastify request with all properties', () => {
        const userBody = createUserRequestBody();
        const mockRequest = createMockFastifyRequest({
          body: userBody,
          params: { id: '123', category: 'users' },
          query: { page: '1', limit: '10', sort: ['name', 'email'] },
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer token123',
            'user-agent': 'test-client/1.0',
          },
          method: 'POST',
          url: '/api/users/123',
          ip: '10.0.0.1',
        });

        const result = adaptFastifyRequest<UserRequestBody>(mockRequest as unknown as FastifyRequest);

        expect(result).toBeValidUnifiedRequestContext();
        expect(result.body).toEqual(userBody);
        expect(result.params).toEqual({ id: '123', category: 'users' });
        expect(result.query).toEqual({ page: '1', limit: '10', sort: ['name', 'email'] });
        expect(result.headers['content-type']).toBe('application/json');
        expect(result.userAgent).toBe('test-client/1.0');
      });
    });

    describe('Type safety with different body types', () => {
      it('should handle typed user request body', () => {
        const userBody = createUserRequestBody({
          email: 'typed@example.com',
          firstName: 'TypeScript',
          lastName: 'User',
        });

        const mockRequest = createMockFastifyRequest({ body: userBody });
        const result = adaptFastifyRequest<UserRequestBody>(mockRequest as unknown as FastifyRequest);

        expect(result.body.email).toBe('typed@example.com');
        expect(result.body.firstName).toBe('TypeScript');
        expect(result.body.lastName).toBe('User');
        expect(typeof result.body.age).toBe('number');
      });

      it('should handle typed product request body', () => {
        const productBody = createProductRequestBody({
          name: 'Laptop',
          price: 1299.99,
          category: 'computers',
          tags: ['bestseller', 'premium'],
        });

        const mockRequest = createMockFastifyRequest({ body: productBody });
        const result = adaptFastifyRequest<ProductRequestBody>(mockRequest as unknown as FastifyRequest);

        expect(result.body.name).toBe('Laptop');
        expect(result.body.price).toBe(1299.99);
        expect(result.body.tags).toEqual(['bestseller', 'premium']);
        expect(Array.isArray(result.body.tags)).toBe(true);
      });

      it('should handle array body types', () => {
        interface ItemBody {
          id: string;
          name: string;
        }

        const arrayBody: ItemBody[] = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ];

        const mockRequest = createMockFastifyRequest({ body: arrayBody });
        const result = adaptFastifyRequest<ItemBody[]>(mockRequest as unknown as FastifyRequest);

        expect(Array.isArray(result.body)).toBe(true);
        expect(result.body).toHaveLength(2);
        expect(result.body[0].name).toBe('Item 1');
      });
    });

    describe('Edge cases and error handling', () => {
      it('should handle undefined body with empty object fallback', () => {
        const mockRequest = createMockFastifyRequest({ body: undefined });
        const result = adaptFastifyRequest(mockRequest as unknown as FastifyRequest);

        expect(result.body).toEqual({});
      });

      it('should handle null body gracefully', () => {
        const mockRequest = createMockFastifyRequest({ body: null });
        const result = adaptFastifyRequest(mockRequest as unknown as FastifyRequest);

        expect(result.body).toEqual({});
      });

      it('should handle missing user-agent header', () => {
        const mockRequest = createMockFastifyRequest({
          headers: { 'content-type': 'application/json' },
        });

        const result = adaptFastifyRequest(mockRequest as unknown as FastifyRequest);

        expect(result.userAgent).toBeUndefined();
      });

      it('should handle complex query parameters', () => {
        const complexQuery = {
          search: 'typescript testing',
          filters: ['active', 'verified', 'premium'],
          sort: 'created_desc',
          include: ['profile', 'settings'],
          page: '1',
          limit: '20',
        };

        const mockRequest = createMockFastifyRequest({ query: complexQuery });
        const result = adaptFastifyRequest(mockRequest as unknown as FastifyRequest);

        expect(result.query['search']).toBe('typescript testing');
        expect(result.query['filters']).toEqual(['active', 'verified', 'premium']);
        expect(result.query['sort']).toBe('created_desc');
      });
    });
  });

  describe('adaptFastifyResponse', () => {
    let mockReply: MockFastifyReply;

    beforeEach(() => {
      mockReply = createMockFastifyReply();
    });

    describe('Basic response adaptation', () => {
      it('should create valid unified response context', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);

        expect(result).toBeValidUnifiedResponseContext();
      });

      it('should handle status method correctly', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);

        const returnedContext = result['status'](201);

        expect(mockReply.status).toHaveBeenCalledWith(201);
        expect(returnedContext).toBeValidUnifiedResponseContext();
      });

      it('should handle json method with typed data', () => {
        interface ApiResponse {
          success: boolean;
          data: { id: string; name: string };
          message: string;
        }

        const responseData: ApiResponse = {
          success: true,
          data: { id: '123', name: 'Test' },
          message: 'Operation successful',
        };

        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);
        result['json'](responseData);

        expect(mockReply.send).toHaveBeenCalledWith(responseData);
      });

      it('should handle send method with string data', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);
        const textData = 'Plain text response';

        result['send'](textData);

        expect(mockReply.send).toHaveBeenCalledWith(textData);
      });
    });

    describe('Header management', () => {
      it('should set single header correctly', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);

        const returnedContext = result['header']('Content-Type', 'application/json');

        expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(returnedContext).toBeValidUnifiedResponseContext();
      });

      it('should support method chaining with headers', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);

        result['status'](201)['header']('Content-Type', 'application/json')['header']('X-Custom-Header', 'custom-value');

        expect(mockReply.status).toHaveBeenCalledWith(201);
        expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(mockReply.header).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
      });
    });

    describe('Redirection', () => {
      it('should handle redirect correctly', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);

        result['redirect']('/success');

        expect(mockReply.redirect).toHaveBeenCalledWith('/success');
      });
    });

    describe('Complex response scenarios', () => {
      it('should handle complete response workflow', () => {
        const result = adaptFastifyResponse(mockReply as unknown as FastifyReply);
        const responseData = {
          id: '123',
          status: 'created',
          timestamp: new Date().toISOString(),
        };

        result['status'](201)['header']('Location', '/api/items/123')['header']('X-Request-ID', 'req-456')['json'](responseData);

        expect(mockReply.status).toHaveBeenCalledWith(201);
        expect(mockReply.header).toHaveBeenCalledWith('Location', '/api/items/123');
        expect(mockReply.header).toHaveBeenCalledWith('X-Request-ID', 'req-456');
        expect(mockReply.send).toHaveBeenCalledWith(responseData);
      });
    });
  });

  describe('createFastifyContext', () => {
    let mockRequest: MockFastifyRequest;
    let mockReply: MockFastifyReply;

    beforeEach(() => {
      mockRequest = createMockFastifyRequest();
      mockReply = createMockFastifyReply();
    });

    describe('Context creation', () => {
      it('should create unified context with default types', () => {
        const context = createFastifyContext(
          mockRequest as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply
        );

        expect(context.request).toBeValidUnifiedRequestContext();
        expect(context.response).toBeValidUnifiedResponseContext();
      });

      it('should create context with typed request body', () => {
        const userBody = createUserRequestBody();
        mockRequest.body = userBody;

        const context = createFastifyContext<UserRequestBody>(
          mockRequest as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply
        );

        expect(context.request.body.email).toBe(userBody.email);
        expect(context.request.body.firstName).toBe(userBody.firstName);
        expect(typeof context.request.body.age).toBe('number');
      });
    });

    describe('Integration scenarios', () => {
      it('should handle complete CRUD operation flow', () => {
        // Setup for PUT /api/users/123
        const updateBody = createUserRequestBody({
          email: 'updated@example.com',
          firstName: 'Updated',
        });

        mockRequest = createMockFastifyRequest({
          body: updateBody,
          params: { id: '123' },
          query: { include: ['profile', 'settings'] },
          headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer valid-token',
          },
          method: 'PUT',
          url: '/api/users/123',
        });

        const context = createFastifyContext<UserRequestBody>(
          mockRequest as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply
        );

        // Simulate processing
        const updatedUser = {
          id: context.request.params['id'],
          ...context.request.body,
          updatedAt: new Date().toISOString(),
        };

        // Send response
        context.response['status'](200)['header']('X-Updated-By', 'api-service')['json'](updatedUser);

        // Verify request data
        expect(context.request.body.email).toBe('updated@example.com');
        expect(context.request.params['id']).toBe('123');
        expect(context.request.query['include']).toEqual(['profile', 'settings']);

        // Verify response calls
        expect(mockReply.status).toHaveBeenCalledWith(200);
        expect(mockReply.header).toHaveBeenCalledWith('X-Updated-By', 'api-service');
        expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
          id: '123',
          email: 'updated@example.com',
        }));
      });

      it('should handle error response scenario', () => {
        mockRequest = createMockFastifyRequest({
          body: { invalid: 'data' },
          method: 'POST',
          url: '/api/users',
        });

        const context = createFastifyContext(
          mockRequest as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply
        );

        // Simulate validation error
        const errorResponse = {
          error: 'Validation failed',
          details: ['email is required', 'firstName is required'],
          timestamp: new Date().toISOString(),
        };

        context.response['status'](422)['json'](errorResponse);

        expect(mockReply.status).toHaveBeenCalledWith(422);
        expect(mockReply.send).toHaveBeenCalledWith(errorResponse);
      });

      it('should handle redirect scenario', () => {
        mockRequest = createMockFastifyRequest({
          method: 'POST',
          url: '/api/auth/login',
        });

        const context = createFastifyContext(
          mockRequest as unknown as FastifyRequest,
          mockReply as unknown as FastifyReply
        );

        // Simulate successful login redirect
        context.response['status'](302)['header']('Set-Cookie', 'session=abc123; HttpOnly')['redirect']('/dashboard');

        expect(mockReply.status).toHaveBeenCalledWith(302);
        expect(mockReply.header).toHaveBeenCalledWith('Set-Cookie', 'session=abc123; HttpOnly');
        expect(mockReply.redirect).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Type safety and edge cases', () => {
    describe('Request body type variations', () => {
      it('should handle optional properties correctly', () => {
        interface OptionalPropsBody {
          required: string;
          optional?: string;
          nested?: {
            value?: number;
          };
        }

        const body: OptionalPropsBody = {
          required: 'value',
          nested: {},
        };

        const mockRequest = createMockFastifyRequest({ body });
        const result = adaptFastifyRequest<OptionalPropsBody>(mockRequest as unknown as FastifyRequest);

        expect(result.body.required).toBe('value');
        expect(result.body.optional).toBeUndefined();
        expect(result.body.nested?.value).toBeUndefined();
      });

      it('should handle union types in request body', () => {
        interface TextMessage {
          type: 'text';
          content: string;
        }

        interface ImageMessage {
          type: 'image';
          url: string;
          alt?: string;
        }

        type Message = TextMessage | ImageMessage;

        const textMessage: TextMessage = {
          type: 'text',
          content: 'Hello, world!',
        };

        const mockRequest = createMockFastifyRequest({ body: textMessage });
        const result = adaptFastifyRequest<Message>(mockRequest as unknown as FastifyRequest);

        expect(result.body.type).toBe('text');
        if (result.body.type === 'text') {
          expect(result.body.content).toBe('Hello, world!');
        }
      });
    });

    describe('Performance and memory considerations', () => {
      it('should not create excessive function instances', () => {
        const mockReply = createMockFastifyReply();
        const context1 = adaptFastifyResponse(mockReply as unknown as FastifyReply);
        const context2 = adaptFastifyResponse(mockReply as unknown as FastifyReply);

        // These should be different instances but have the same structure
        expect(context1).not.toBe(context2);
        expect(typeof context1['status']).toBe('function');
        expect(typeof context2['status']).toBe('function');
      });
    });
  });
});