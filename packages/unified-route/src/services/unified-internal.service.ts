import {
  UnifiedRequestContext,
  UnifiedResponseContext,
  UnifiedHttpContext
} from '../types/unified-context';
import { UnifiedRouteHandler } from '../types/unified-middleware';

/**
 * Unified Internal Request Context
 * สำหรับการเรียกใช้ API ข้ามกันภายใน service เดียวกัน
 */
export class UnifiedInternalRequestContext implements UnifiedRequestContext {
  public body: Record<string, unknown>;
  public params: Record<string, string>;
  public query: Record<string, string | string[]>;
  public headers: Record<string, string>;
  public method: string;
  public url: string;
  public route: string;
  public ip: string;
  public userAgent?: string;

  constructor(options: {
    method?: string;
    route: string;
    actualRoute?: string; // The actual route pattern from handler registration
    params?: Record<string, string>;
    query?: Record<string, string | string[]>;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    userId?: string;
    correlationId?: string;
  }) {
    this.method = options.method || 'POST';
    this.route = options.actualRoute || options.route;
    this.url = this.buildUrl(options.route, options.params);
    this.params = options.params || {};
    this.query = options.query || {};
    this.body = options.body || {};
    this.headers = {
      'content-type': 'application/json',
      'x-source': 'unified-internal',
      'x-correlation-id': options.correlationId || this.generateCorrelationId(),
      'x-user-id': options.userId || 'system',
      ...options.headers
    };
    this.ip = '127.0.0.1'; // Internal call
    this.userAgent = 'UnifiedInternalAdapter/1.0';
  }

  private buildUrl(route: string, params?: Record<string, string>): string {
    let url = route;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, value);
      });
    }
    return url;
  }

  private generateCorrelationId(): string {
    return `internal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Unified Internal Response Context
 * จัดการ response สำหรับการเรียกใช้ internal
 */
export class UnifiedInternalResponseContext implements UnifiedResponseContext {
  private _sent = false;
  private _statusCode = 200;
  private _headers: Record<string, string> = {};
  private _data: unknown = null;

  get sent(): boolean {
    return this._sent;
  }

  get statusCode(): number {
    return this._statusCode;
  }

  get data(): unknown {
    return this._data;
  }

  get headers(): Record<string, string> {
    return { ...this._headers };
  }

  status(code: number): UnifiedResponseContext {
    this._statusCode = code;
    return this;
  }

  header(name: string, value: string): UnifiedResponseContext {
    this._headers[name] = value;
    return this;
  }

  json<T>(data: T): void {
    this._data = data;
    this._sent = true;
    this.header('content-type', 'application/json');
  }

  send(data: unknown): unknown {
    this._data = data;
    this._sent = true;
    return data;
  }

  redirect(url: string): void {
    this._statusCode = 302;
    this.header('location', url);
    this._sent = true;
  }
}

/**
 * Unified Internal HTTP Context
 * รวม request และ response สำหรับ internal calls
 */
export class UnifiedInternalHttpContext implements UnifiedHttpContext {
  public request: UnifiedRequestContext;
  public response: UnifiedInternalResponseContext;
  public registry: Record<string, unknown>;

  constructor(
    request: UnifiedRequestContext,
    response: UnifiedInternalResponseContext,
    registry: Record<string, unknown> = {}
  ) {
    this.request = request;
    this.response = response;
    this.registry = registry;
  }
}

/**
 * Unified Internal Service
 * จัดการ handlers และให้บริการ internal routing (Mediator Pattern)
 */
export class UnifiedInternalService {
  private handlers: Map<string, UnifiedRouteHandler> = new Map();
  private globalRegistry: Record<string, unknown>;

  constructor(globalRegistry: Record<string, unknown> = {}) {
    this.globalRegistry = globalRegistry;
  }

  /**
   * ลงทะเบียน handler สำหรับ route
   */
  registerHandler(route: string, handler: UnifiedRouteHandler): void {
    this.handlers.set(route, handler);
  }

  /**
   * ลบ handler ออกจาก route
   */
  unregisterHandler(route: string): boolean {
    return this.handlers.delete(route);
  }

  /**
   * ดู handlers ทั้งหมดที่ลงทะเบียนไว้
   */
  getRegisteredRoutes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * ตรวจสอบว่า route มี handler หรือไม่
   */
  hasHandler(route: string): boolean {
    return this.findHandler(route) !== undefined;
  }

  /**
   * ประมวลผล request ภายใน (called by UnifiedInternalClient)
   */
  async processRequest<TResponse = unknown>(options: {
    route: string;
    method?: string;
    params?: Record<string, string>;
    query?: Record<string, string | string[]>;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    userId?: string;
    correlationId?: string;
    registry?: Record<string, unknown>;
  }): Promise<UnifiedInternalCallResult<TResponse>> {
    const { route } = options;
    
    // หา handler ที่ตรงกับ route
    const matchResult = this.findHandlerWithMatch(route);
    if (!matchResult) {
      throw new UnifiedInternalError(`No handler found for route: ${route}`, 'HANDLER_NOT_FOUND');
    }

    const { handler, matchedRoute, extractedParams } = matchResult;

    // รวม params ที่ extract จาก URL กับ params ที่ส่งมา
    const allParams = { ...extractedParams, ...options.params };

    // สร้าง context
    const request = new UnifiedInternalRequestContext({
      ...options,
      actualRoute: matchedRoute,
      params: allParams
    });
    const response = new UnifiedInternalResponseContext();
    const registry = { ...this.globalRegistry, ...options.registry };
    const context = new UnifiedInternalHttpContext(request, response, registry);

    try {
      // เรียกใช้ handler
      await handler(context);

      // ตรวจสอบว่า response ถูกส่งแล้วหรือไม่
      if (!response.sent) {
        throw new UnifiedInternalError('Handler did not send response', 'NO_RESPONSE');
      }

      return new UnifiedInternalCallResult<TResponse>(
        response.data as TResponse,
        response.statusCode,
        response.headers,
        true
      );
    } catch (error) {
      const statusCode = response.statusCode !== 200 ? response.statusCode : 500;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return new UnifiedInternalCallResult<TResponse>(
        { error: errorMessage, code: statusCode } as TResponse,
        statusCode,
        response.headers,
        false
      );
    }
  }

  /**
   * หา handler โดย route matching (legacy method)
   */
  private findHandler(route: string): UnifiedRouteHandler | undefined {
    const result = this.findHandlerWithMatch(route);
    return result ? result.handler : undefined;
  }

  /**
   * หา handler พร้อมกับ match information
   */
  private findHandlerWithMatch(route: string): {
    handler: UnifiedRouteHandler;
    matchedRoute: string;
    extractedParams: Record<string, string>;
  } | undefined {
    // ลองหา exact match ก่อน
    const exactMatch = this.handlers.get(route);
    if (exactMatch) {
      return {
        handler: exactMatch,
        matchedRoute: route,
        extractedParams: {}
      };
    }

    // ถ้าไม่เจอ ลอง pattern matching (สำหรับ parameterized routes)
    for (const [registeredRoute, handler] of this.handlers.entries()) {
      const extractedParams = this.extractParams(registeredRoute, route);
      if (extractedParams !== null) {
        return {
          handler,
          matchedRoute: registeredRoute,
          extractedParams
        };
      }
    }

    return undefined;
  }

  /**
   * ตรวจสอบว่า route ตรงกับ pattern หรือไม่ (legacy method)
   */
  private matchRoute(pattern: string, actual: string): boolean {
    return this.extractParams(pattern, actual) !== null;
  }

  /**
   * Extract parameters จาก URL ตาม pattern
   * Returns null ถ้าไม่ match, หรือ object ของ parameters ถ้า match
   */
  private extractParams(pattern: string, actual: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const actualParts = actual.split('/');

    if (patternParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const actualPart = actualParts[i];

      // ถ้าเป็น parameter (เริ่มด้วย :)
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.substring(1); // เอา : ออก
        params[paramName] = actualPart;
      } else {
        // ต้องตรงกันทุกตัวอักษร
        if (patternPart !== actualPart) {
          return null;
        }
      }
    }

    return params;
  }
}

/**
 * Unified Internal Client
 * สำหรับเรียกใช้ internal services ผ่าน UnifiedInternalService
 */
export class UnifiedInternalClient {
  private service: UnifiedInternalService;

  constructor(service: UnifiedInternalService) {
    this.service = service;
  }

  /**
   * เรียกใช้ API แบบ internal (ไม่ผ่าน HTTP)
   */
  async call<TResponse = unknown>(options: {
    route: string;
    method?: string;
    params?: Record<string, string>;
    query?: Record<string, string | string[]>;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    userId?: string;
    correlationId?: string;
    registry?: Record<string, unknown>;
  }): Promise<UnifiedInternalCallResult<TResponse>> {
    return this.service.processRequest<TResponse>(options);
  }

  /**
   * เรียกใช้ GET request
   */
  async get<TResponse = unknown>(
    route: string,
    params?: Record<string, string>,
    options?: {
      query?: Record<string, string | string[]>;
      headers?: Record<string, string>;
      userId?: string;
      correlationId?: string;
      registry?: Record<string, unknown>;
    }
  ): Promise<UnifiedInternalCallResult<TResponse>> {
    return this.call<TResponse>({
      route,
      method: 'GET',
      params,
      ...options
    });
  }

  /**
   * เรียกใช้ POST request
   */
  async post<TResponse = unknown>(
    route: string,
    body?: Record<string, unknown>,
    options?: {
      params?: Record<string, string>;
      query?: Record<string, string | string[]>;
      headers?: Record<string, string>;
      userId?: string;
      correlationId?: string;
      registry?: Record<string, unknown>;
    }
  ): Promise<UnifiedInternalCallResult<TResponse>> {
    return this.call<TResponse>({
      route,
      method: 'POST',
      body,
      ...options
    });
  }

  /**
   * เรียกใช้ PUT request
   */
  async put<TResponse = unknown>(
    route: string,
    body?: Record<string, unknown>,
    options?: {
      params?: Record<string, string>;
      query?: Record<string, string | string[]>;
      headers?: Record<string, string>;
      userId?: string;
      correlationId?: string;
      registry?: Record<string, unknown>;
    }
  ): Promise<UnifiedInternalCallResult<TResponse>> {
    return this.call<TResponse>({
      route,
      method: 'PUT',
      body,
      ...options
    });
  }

  /**
   * เรียกใช้ DELETE request
   */
  async delete<TResponse = unknown>(
    route: string,
    params?: Record<string, string>,
    options?: {
      query?: Record<string, string | string[]>;
      headers?: Record<string, string>;
      userId?: string;
      correlationId?: string;
      registry?: Record<string, unknown>;
    }
  ): Promise<UnifiedInternalCallResult<TResponse>> {
    return this.call<TResponse>({
      route,
      method: 'DELETE',
      params,
      ...options
    });
  }

  /**
   * ตรวจสอบว่า route มี handler หรือไม่
   */
  hasRoute(route: string): boolean {
    return this.service.hasHandler(route);
  }
}



/**
 * ผลลัพธ์จากการเรียกใช้ Unified Internal Service
 */
export class UnifiedInternalCallResult<T> {
  constructor(
    public readonly data: T,
    public readonly statusCode: number,
    public readonly headers: Record<string, string>,
    public readonly success: boolean
  ) {}

  /**
   * ตรวจสอบว่าสำเร็จหรือไม่
   */
  isSuccess(): boolean {
    return this.success && this.statusCode >= 200 && this.statusCode < 300;
  }

  /**
   * ดึงข้อมูลถ้าสำเร็จ หรือ throw error ถ้าไม่สำเร็จ
   */
  unwrap(): T {
    if (!this.isSuccess()) {
      throw new UnifiedInternalError(
        `Internal service call failed with status ${this.statusCode}`,
        'CALL_FAILED',
        this.data
      );
    }
    return this.data;
  }
}

/**
 * Error สำหรับ Unified Internal Service
 */
export class UnifiedInternalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'UnifiedInternalError';
  }
}