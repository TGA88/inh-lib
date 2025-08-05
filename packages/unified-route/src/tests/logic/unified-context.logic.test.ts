// __tests__/services/unified-base-service.test.ts
import {
  getRequestBody,
  getParams,
  getQuery,
  getHeaders,
  sendResponse,
  sendError
} from '../../logic/unified-context.logic';
import { UnifiedHttpContext } from '../../types/unified-context';
// __tests__/services/unified-base-service.test.ts
describe('Unified Base Service Functions', () => {
  let mockContext: UnifiedHttpContext;

  beforeEach(() => {
    mockContext = {
      request: {
        body: { email: 'test@example.com', name: 'John Doe' },
        params: { id: '123', category: 'users' },
        query: { page: '1', limit: '10', sort: 'desc' },
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer token123',
          'user-agent': 'test-client/1.0'
        },
        method: 'POST',
        url: '/api/users/123',
        ip: '192.168.1.1',
        userAgent: 'test-client/1.0'
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        header: jest.fn().mockReturnThis(),
        redirect: jest.fn()
      },
      registry: {}
    };
  });

  describe('getRequestBody', () => {
    it('should return request body as generic type', () => {
      const body = getRequestBody(mockContext);
      
      expect(body).toEqual({
        email: 'test@example.com',
        name: 'John Doe'
      });
    });

    it('should return typed request body', () => {
      interface UserBody {
        email: string;
        name: string;
      }

      const body = getRequestBody<UserBody>(mockContext);
      
      expect(body.email).toBe('test@example.com');
      expect(body.name).toBe('John Doe');
      // TypeScript should enforce the correct type
      expect(typeof body.email).toBe('string');
      expect(typeof body.name).toBe('string');
    });

    it('should return empty object when body is empty', () => {
      mockContext.request.body = {};
      
      const body = getRequestBody(mockContext);
      
      expect(body).toEqual({});
    });

    it('should handle null/undefined body', () => {
      mockContext.request.body = null as unknown as Record<string, unknown>;
      
      const body = getRequestBody(mockContext);
      
      expect(body).toBeNull();
    });

    it('should handle complex nested body', () => {
      interface ComplexBody {
        user: {
          profile: {
            email: string;
            settings: {
              theme: string;
              notifications: boolean;
            };
          };
        };
        metadata: {
          source: string;
          timestamp: string;
        };
      }

      const complexBody: ComplexBody = {
        user: {
          profile: {
            email: 'nested@example.com',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          source: 'api',
          timestamp: new Date().toISOString()
        }
      };
      
      mockContext.request.body = complexBody as unknown as Record<string, unknown>;
      
      const body = getRequestBody<ComplexBody>(mockContext);
      
      expect(body).toEqual(complexBody);
      expect(body.user.profile.email).toBe('nested@example.com');
      expect(body.metadata.source).toBe('api');
    });

    it('should handle array body', () => {
      interface ArrayItem {
        id: number;
        name: string;
      }

      const arrayBody: ArrayItem[] = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      
      // Cast to Record<string, unknown> to match the body type
      mockContext.request.body = arrayBody as unknown as Record<string, unknown>;
      
      const body = getRequestBody<ArrayItem[]>(mockContext);
      
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
      expect(body[0].name).toBe('Item 1');
    });
  });

  describe('getParams', () => {
    it('should return request params', () => {
      const params = getParams(mockContext);
      
      expect(params).toEqual({
        id: '123',
        category: 'users'
      });
    });

    it('should return empty object when no params', () => {
      mockContext.request.params = {};
      
      const params = getParams(mockContext);
      
      expect(params).toEqual({});
    });

    it('should handle single param', () => {
      mockContext.request.params = { id: '456' };
      
      const params = getParams(mockContext);
      
      expect(params).toEqual({ id: '456' });
      expect(params['id']).toBe('456');
    });

    it('should handle multiple params', () => {
      mockContext.request.params = {
        userId: '123',
        postId: '456',
        commentId: '789'
      };
      
      const params = getParams(mockContext);
      
      expect(params).toEqual({
        userId: '123',
        postId: '456',
        commentId: '789'
      });
    });

    it('should handle params with special characters', () => {
      mockContext.request.params = {
        slug: 'hello-world',
        'category-id': 'tech-news',
        'user.id': '123'
      };
      
      const params = getParams(mockContext);
      
      expect(params['slug']).toBe('hello-world');
      expect(params['category-id']).toBe('tech-news');
      expect(params['user.id']).toBe('123');
    });
  });

  describe('getQuery', () => {
    it('should return request query parameters', () => {
      const query = getQuery(mockContext);
      
      expect(query).toEqual({
        page: '1',
        limit: '10',
        sort: 'desc'
      });
    });

    it('should return empty object when no query params', () => {
      mockContext.request.query = {};
      
      const query = getQuery(mockContext);
      
      expect(query).toEqual({});
    });

    it('should handle array query parameters', () => {
      mockContext.request.query = {
        tags: ['javascript', 'typescript', 'node'],
        categories: ['tech', 'programming'],
        sort: 'asc'
      };
      
      const query = getQuery(mockContext);
      
      expect(query['tags']).toEqual(['javascript', 'typescript', 'node']);
      expect(query['categories']).toEqual(['tech', 'programming']);
      expect(query['sort']).toBe('asc');
    });

    it('should handle mixed string and array query params', () => {
      mockContext.request.query = {
        q: 'search term',
        filters: ['active', 'verified'],
        page: '1',
        include: ['profile', 'settings']
      };
      
      const query = getQuery(mockContext);
      
      expect(query['q']).toBe('search term');
      expect(query['filters']).toEqual(['active', 'verified']);
      expect(query['page']).toBe('1');
      expect(query['include']).toEqual(['profile', 'settings']);
    });

    it('should handle boolean-like query strings', () => {
      mockContext.request.query = {
        active: 'true',
        deleted: 'false',
        verified: '1',
        premium: '0'
      };
      
      const query = getQuery(mockContext);
      
      expect(query['active']).toBe('true');
      expect(query['deleted']).toBe('false');
      expect(query['verified']).toBe('1');
      expect(query['premium']).toBe('0');
    });
  });

  describe('getHeaders', () => {
    it('should return request headers', () => {
      const headers = getHeaders(mockContext);
      
      expect(headers).toEqual({
        'content-type': 'application/json',
        'authorization': 'Bearer token123',
        'user-agent': 'test-client/1.0'
      });
    });

    it('should return empty object when no headers', () => {
      mockContext.request.headers = {};
      
      const headers = getHeaders(mockContext);
      
      expect(headers).toEqual({});
    });

    it('should handle case-insensitive headers', () => {
      mockContext.request.headers = {
        'Content-Type': 'application/json',
        'AUTHORIZATION': 'Bearer token456',
        'x-custom-header': 'custom-value'
      };
      
      const headers = getHeaders(mockContext);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['AUTHORIZATION']).toBe('Bearer token456');
      expect(headers['x-custom-header']).toBe('custom-value');
    });

    it('should handle standard HTTP headers', () => {
      mockContext.request.headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
        'host': 'api.example.com',
        'referer': 'https://example.com/page',
        'user-agent': 'Mozilla/5.0 (compatible; Test/1.0)'
      };
      
      const headers = getHeaders(mockContext);
      
      expect(headers['accept']).toBe('application/json, text/plain, */*');
      expect(headers['accept-language']).toBe('en-US,en;q=0.9');
      expect(headers['host']).toBe('api.example.com');
    });
  });

  describe('sendResponse', () => {
    it('should send response with default status 200', () => {
      const data = { id: 1, message: 'Success' };
      
      sendResponse(mockContext, data);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(data);
    });

    it('should send response with custom status code', () => {
      const data = { id: 1, created: true };
      
      sendResponse(mockContext, data, 201);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(201);
      expect(mockContext.response.json).toHaveBeenCalledWith(data);
    });

    it('should handle string response data', () => {
      const message = 'Operation completed successfully';
      
      sendResponse(mockContext, message, 200);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(message);
    });

    it('should handle array response data', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      
      sendResponse(mockContext, data, 200);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(data);
    });

    it('should handle null response data', () => {
      sendResponse(mockContext, null, 204);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(204);
      expect(mockContext.response.json).toHaveBeenCalledWith(null);
    });

    it('should handle complex object response', () => {
      const complexData = {
        user: {
          id: 123,
          profile: {
            email: 'user@example.com',
            settings: { theme: 'dark' }
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        },
        links: {
          self: '/api/users/123',
          edit: '/api/users/123/edit'
        }
      };
      
      sendResponse(mockContext, complexData, 200);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(complexData);
    });

    it('should handle different status codes', () => {
      const testCases = [
        { data: { created: true }, status: 201 },
        { data: { updated: true }, status: 200 },
        { data: null, status: 204 },
        { data: { accepted: true }, status: 202 }
      ];

      testCases.forEach(({ data, status }) => {
        jest.clearAllMocks();
        sendResponse(mockContext, data, status);
        
        expect(mockContext.response.status).toHaveBeenCalledWith(status);
        expect(mockContext.response.json).toHaveBeenCalledWith(data);
      });
    });
  });

  describe('sendError', () => {
    it('should send error with default status 400', () => {
      const message = 'Validation failed';
      
      sendError(mockContext, message);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(400);
      expect(mockContext.response.json).toHaveBeenCalledWith({
        error: message,
        timestamp: expect.any(String)
      });
    });

    it('should send error with custom status code', () => {
      const message = 'User not found';
      
      sendError(mockContext, message, 404);
      
      expect(mockContext.response.status).toHaveBeenCalledWith(404);
      expect(mockContext.response.json).toHaveBeenCalledWith({
        error: message,
        timestamp: expect.any(String)
      });
    });

    it('should include timestamp in ISO format', () => {
      const message = 'Server error';
      const beforeCall = new Date();
      
      sendError(mockContext, message, 500);
      
      const afterCall = new Date();
      const callArgs = (mockContext.response.json as jest.Mock).mock.calls[0][0];
      const timestamp = new Date(callArgs.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should handle different error status codes', () => {
      const errorTestCases = [
        { message: 'Bad Request', status: 400 },
        { message: 'Unauthorized', status: 401 },
        { message: 'Forbidden', status: 403 },
        { message: 'Not Found', status: 404 },
        { message: 'Method Not Allowed', status: 405 },
        { message: 'Conflict', status: 409 },
        { message: 'Unprocessable Entity', status: 422 },
        { message: 'Too Many Requests', status: 429 },
        { message: 'Internal Server Error', status: 500 },
        { message: 'Bad Gateway', status: 502 },
        { message: 'Service Unavailable', status: 503 }
      ];

      errorTestCases.forEach(({ message, status }) => {
        jest.clearAllMocks();
        sendError(mockContext, message, status);
        
        expect(mockContext.response.status).toHaveBeenCalledWith(status);
        expect(mockContext.response.json).toHaveBeenCalledWith({
          error: message,
          timestamp: expect.any(String)
        });
      });
    });

    it('should handle empty error message', () => {
      sendError(mockContext, '', 400);
      
      expect(mockContext.response.json).toHaveBeenCalledWith({
        error: '',
        timestamp: expect.any(String)
      });
    });

    it('should handle special characters in error message', () => {
      const message = 'Error with "quotes" and émojis 🚫 and new\nlines';
      
      sendError(mockContext, message, 400);
      
      expect(mockContext.response.json).toHaveBeenCalledWith({
        error: message,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete request processing workflow', () => {
      // Simulate a typical request workflow
      const body = getRequestBody(mockContext);
      const params = getParams(mockContext);
      const query = getQuery(mockContext);
      const headers = getHeaders(mockContext);

      // Verify all data is accessible
      expect(body).toBeDefined();
      expect(params).toBeDefined();
      expect(query).toBeDefined();
      expect(headers).toBeDefined();

      // Simulate successful processing
      const responseData = {
        id: params['id'],
        ...body,
        processedAt: new Date().toISOString()
      };

      sendResponse(mockContext, responseData, 200);

      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(responseData);
    });

    it('should handle error scenarios in workflow', () => {
      interface RequestBody {
        email?: string;
        name?: string;
      }

      const body = getRequestBody<RequestBody>(mockContext);
      
      // Simulate validation error
      if (!body.email) {
        sendError(mockContext, 'Email is required', 422);
      }

      // In this test case, email exists, so no error should be sent
      expect(mockContext.response.status).not.toHaveBeenCalled();
      expect(mockContext.response.json).not.toHaveBeenCalled();

      // Test the error case
      mockContext.request.body = {}; // Remove email
      const emptyBody = getRequestBody<RequestBody>(mockContext);
      
      if (!emptyBody.email) {
        sendError(mockContext, 'Email is required', 422);
      }

      expect(mockContext.response.status).toHaveBeenCalledWith(422);
      expect(mockContext.response.json).toHaveBeenCalledWith({
        error: 'Email is required',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Response chaining', () => {
    it('should work with method chaining from adapters', () => {
      // Test that the functions work with chained responses
      const data = { success: true };
      
      sendResponse(mockContext, data, 201);
      
      // Verify status was called first (should return the response object for chaining)
      expect(mockContext.response.status).toHaveBeenCalledWith(201);
      expect(mockContext.response.json).toHaveBeenCalledWith(data);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety for typed bodies', () => {
      interface UserCreateRequest {
        email: string;
        firstName: string;
        lastName: string;
        age?: number;
      }

      mockContext.request.body = {
        email: 'typed@example.com',
        firstName: 'Typed',
        lastName: 'User',
        age: 25
      };

      const typedBody = getRequestBody<UserCreateRequest>(mockContext);
      
      // TypeScript should enforce these properties exist
      expect(typedBody.email).toBe('typed@example.com');
      expect(typedBody.firstName).toBe('Typed');
      expect(typedBody.lastName).toBe('User');
      expect(typedBody.age).toBe(25);
    });

    it('should handle optional properties in typed interfaces', () => {
      interface PartialUpdateRequest {
        email?: string;
        name?: string;
        settings?: {
          theme?: string;
          notifications?: boolean;
        };
      }

      mockContext.request.body = {
        email: 'partial@example.com',
        settings: {
          theme: 'dark'
          // notifications is optional and not provided
        }
      };

      const typedBody = getRequestBody<PartialUpdateRequest>(mockContext);
      
      expect(typedBody.email).toBe('partial@example.com');
      expect(typedBody.name).toBeUndefined();
      expect(typedBody.settings?.theme).toBe('dark');
      expect(typedBody.settings?.notifications).toBeUndefined();
    });
  });
});