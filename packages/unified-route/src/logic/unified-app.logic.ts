/**
 * Unified App - Simple HTTP application builder
 * Provides Express-like API for building HTTP applications
 */

import type { UnifiedHttpContext, UnifiedRequestContext, UnifiedResponseContext } from '../types/unified-context';
import type { UnifiedMiddleware, UnifiedRouteHandler } from '../types/unified-middleware';
import type { 
  UnifiedHttpRequest, 
  UnifiedHttpResponse, 
  UnifiedNodeHttpRequest, 
  UnifiedNodeHttpResponse 
} from '../types/http.types';
import type { UnifiedRouteDefinition } from '../types/route.types';
import { composeMiddleware } from './unified-middleware.logic';

/**
 * Simple path matcher for routes
 */
class PathMatcher {
  private static parseRoute(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const pattern = path
      .replace(/\/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '/([^/]+)';
      })
      .replace(/\*/g, '.*');
    
    return {
      pattern: new RegExp(`^${pattern}$`),
      paramNames
    };
  }

  static match(routePath: string, requestPath: string): { params: Record<string, string> } | null {
    const { pattern, paramNames } = this.parseRoute(routePath);
    const match = pattern.exec(requestPath);
    
    if (!match) {
      return null;
    }
    
    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    
    return { params };
  }
}

/**
 * Response builder for unified context
 */
class ResponseBuilder {
  private readonly response: UnifiedHttpResponse;
  
  constructor() {
    this.response = {
      statusCode: 200,
      headers: {},
      sent: false
    };
  }

  status(code: number): UnifiedResponseContext {
    this.response.statusCode = code;
    return this.createResponseContext();
  }

  json<T>(data: T): void {
    if (!this.response.sent) {
      this.response.headers['Content-Type'] = 'application/json';
      this.response.body = JSON.stringify(data);
      this.response.sent = true;
    }
  }

  send(data: string): void {
    if (!this.response.sent) {
      this.response.headers['Content-Type'] = 'text/plain';
      this.response.body = data;
      this.response.sent = true;
    }
  }

  header(name: string, value: string): UnifiedResponseContext {
    this.response.headers[name] = value;
    return this.createResponseContext();
  }

  redirect(url: string): void {
    if (!this.response.sent) {
      this.response.statusCode = 302;
      this.response.headers['Location'] = url;
      this.response.sent = true;
    }
  }

  getResponse(): UnifiedHttpResponse {
    return this.response;
  }

  createResponseContext(): UnifiedResponseContext {
    return {
      status: this.status.bind(this),
      json: this.json.bind(this),
      send: this.send.bind(this),
      header: this.header.bind(this),
      redirect: this.redirect.bind(this),
    };
  }
}

/**
 * Unified App class
 */
export class UnifiedApp {
  private readonly routes: UnifiedRouteDefinition[] = [];
  private readonly globalMiddlewares: UnifiedMiddleware[] = [];

  /**
   * Add global middleware
   */
  use(middleware: UnifiedMiddleware): void {
    this.globalMiddlewares.push(middleware);
  }

  /**
   * Add GET route
   */
  get(path: string, ...handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    this.addRoute('GET', path, handlers);
  }

  /**
   * Add POST route
   */
  post(path: string, ...handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    this.addRoute('POST', path, handlers);
  }

  /**
   * Add PUT route
   */
  put(path: string, ...handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    this.addRoute('PUT', path, handlers);
  }

  /**
   * Add DELETE route
   */
  delete(path: string, ...handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    this.addRoute('DELETE', path, handlers);
  }

  /**
   * Add PATCH route
   */
  patch(path: string, ...handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    this.addRoute('PATCH', path, handlers);
  }

  /**
   * Add route with any method
   */
  route(method: string, path: string, ...handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    this.addRoute(method.toUpperCase(), path, handlers);
  }

  /**
   * Handle HTTP request (framework agnostic)
   */
  async handle(request: UnifiedHttpRequest): Promise<UnifiedHttpResponse> {
    // Create response builder
    const responseBuilder = new ResponseBuilder();
    
    // Create unified context
    const context = this.createContext(request, responseBuilder);
    
    try {
      // Find matching route
      const route = this.findRoute(request.method, this.getPathFromUrl(request.url));
      
      if (!route) {
        // 404 Not Found
        responseBuilder.status(404).json({ error: 'Not Found' });
        return responseBuilder.getResponse();
      }

      // Update context with route params
      const matchResult = PathMatcher.match(route.path, this.getPathFromUrl(request.url));
      if (matchResult) {
        context.request.params = matchResult.params;
      }

      // Compose all middlewares (global + route-specific) with the route handler
      const allMiddlewares = [...this.globalMiddlewares, ...route.middlewares];
      const composedHandler = composeMiddleware(allMiddlewares)(route.handler);
      
      // Execute the composed handler
      await composedHandler(context);
      
    } catch (error) {
      console.error('Unhandled error:', error);
      if (!responseBuilder.getResponse().sent) {
        responseBuilder.status(500).json({ error: 'Internal Server Error' });
      }
    }
    
    return responseBuilder.getResponse();
  }

  /**
   * Start HTTP server using Node.js built-in (optional)
   * This is a convenience method - you can also use handle() with any HTTP framework
   */
  listen(port: number, callback?: () => void): void {
    try {
      // Dynamic import to avoid compilation issues
      const http = eval('require')('http');
      
      const server = http.createServer(async (req: unknown, res: unknown) => {
        try {
          const nodeReq = req as UnifiedNodeHttpRequest;
          const nodeRes = res as UnifiedNodeHttpResponse;
          
          // Convert Node.js request to UnifiedHttpRequest
          const request: UnifiedHttpRequest = {
            method: nodeReq.method || 'GET',
            url: nodeReq.url || '/',
            headers: nodeReq.headers || {},
            body: nodeReq.body,
            ip: nodeReq.ip || nodeReq.connection?.remoteAddress || '127.0.0.1',
          };
          
          // Handle request
          const response = await this.handle(request);
          
          // Send response
          nodeRes.statusCode = response.statusCode;
          Object.entries(response.headers).forEach(([key, value]) => {
            nodeRes.setHeader(key, value);
          });
          
          if (response.body !== undefined) {
            nodeRes.end(response.body);
          } else {
            nodeRes.end();
          }
          
        } catch (error) {
          console.error('Server error:', error);
          const nodeRes = res as UnifiedNodeHttpResponse;
          if (!nodeRes.headersSent) {
            nodeRes.statusCode = 500;
            nodeRes.end('Internal Server Error');
          }
        }
      });

      server.listen(port, callback);
    } catch (error) {
      console.error('Failed to start HTTP server:', error);
      throw new Error('Node.js HTTP server not available. Use handle() method with your preferred HTTP framework.');
    }
  }

  /**
   * Create unified context from HTTP request
   */
  private createContext(request: UnifiedHttpRequest, responseBuilder: ResponseBuilder): UnifiedHttpContext {
    // Parse request body
    let body: Record<string, unknown> = {};
    if (request.body) {
      body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body as Record<string, unknown>;
    }

    // Parse query parameters
    const url = new URL(request.url, 'http://localhost');
    const query: Record<string, string | string[]> = {};
    url.searchParams.forEach((value, key) => {
      const existing = query[key];
      if (existing) {
        // Convert to array if multiple values
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          query[key] = [existing, value];
        }
      } else {
        query[key] = value;
      }
    });

    const unifiedRequest: UnifiedRequestContext = {
      body,
      params: {}, // Will be populated by route matching
      query,
      headers: request.headers || {},
      method: request.method || 'GET',
      url: request.url || '/',
      ip: request.ip || '127.0.0.1',
      userAgent: request.headers['user-agent'],
    };

    const unifiedResponse = responseBuilder.createResponseContext();

    return {
      request: unifiedRequest,
      response: unifiedResponse,
      registry: {},
    };
  }

  /**
   * Add route to the routes array
   */
  private addRoute(method: string, path: string, handlers: (UnifiedMiddleware | UnifiedRouteHandler)[]): void {
    if (handlers.length === 0) {
      throw new Error('At least one handler is required');
    }

    // Last handler is the route handler, rest are middlewares
    const middlewares = handlers.slice(0, -1) as UnifiedMiddleware[];
    const handler = handlers[handlers.length - 1] as UnifiedRouteHandler;

    this.routes.push({
      method,
      path,
      handler,
      middlewares,
    });
  }

  /**
   * Find matching route
   */
  private findRoute(method: string, path: string): UnifiedRouteDefinition | null {
    return this.routes.find(route => 
      route.method === method && PathMatcher.match(route.path, path) !== null
    ) || null;
  }

  /**
   * Extract path from URL (remove query string)
   */
  private getPathFromUrl(url: string): string {
    return url.split('?')[0];
  }
}

/**
 * Create new unified app instance
 */
export function createUnifiedApp(): UnifiedApp {
  return new UnifiedApp();
}
