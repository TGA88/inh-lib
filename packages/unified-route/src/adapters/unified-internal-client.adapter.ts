import { InhHttpClient, InhHttpResponse, InhHttpRequestConfig } from '@inh-lib/common';
import { UnifiedInternalClient, UnifiedInternalCallResult } from '../services/unified-internal.service';

/**
 * Adapter ที่แปลง UnifiedInternalClient ให้ทำงานเป็น InhHttpClient
 * 
 * ใช้เมื่อต้องการ interface มาตรฐานของ InhHttpClient 
 * แต่ยังต้องการประโยชน์ของ UnifiedInternalClient (internal routing, registry, etc.)
 * 
 * @example
 * ```typescript
 * const internalClient = new UnifiedInternalClient(service);
 * const httpClient: InhHttpClient = new UnifiedInternalClientAdapter(internalClient, {
 *   userId: 'user-123',
 *   correlationId: 'req-456',
 *   registry: { dbConnection: conn }
 * });
 * 
 * // ตอนนี้ใช้ได้เหมือน InhHttpClient ทั่วไป
 * const response = await httpClient.get<User[]>('/api/users');
 * ```
 */
export class UnifiedInternalClientAdapter implements InhHttpClient {
  private internalClient: UnifiedInternalClient;
  private defaultOptions: {
    userId?: string;
    correlationId?: string;
    registry?: Record<string, unknown>;
    headers?: Record<string, string>;
  };

  constructor(
    internalClient: UnifiedInternalClient,
    defaultOptions: {
      userId?: string;
      correlationId?: string;
      registry?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ) {
    this.internalClient = internalClient;
    this.defaultOptions = defaultOptions;
  }

  /**
   * แปลง UnifiedInternalCallResult เป็น InhHttpResponse
   */
  private convertResult<T>(result: UnifiedInternalCallResult<T>): InhHttpResponse<T> {
    return {
      data: result.data,
      status: result.statusCode,
      statusText: this.getStatusText(result.statusCode),
      headers: result.headers
    };
  }

  /**
   * แปลง InhHttpRequestConfig เป็น options สำหรับ UnifiedInternalClient
   */
  private convertConfig(config?: InhHttpRequestConfig) {
    return {
      headers: {
        ...this.defaultOptions.headers,
        ...config?.headers
      },
      userId: this.defaultOptions.userId,
      correlationId: this.defaultOptions.correlationId,
      registry: this.defaultOptions.registry,
      // Convert params to query for GET/DELETE or keep for route params
      ...(config?.params && { query: config.params as Record<string, string | string[]> })
    };
  }

  /**
   * แปลง status code เป็น status text
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };
    return statusTexts[statusCode] || 'Unknown';
  }

  /**
   * GET request
   */
  async get<TResponse>(
    url: string, 
    config?: InhHttpRequestConfig
  ): Promise<InhHttpResponse<TResponse>> {
    try {
      const result = await this.internalClient.get<TResponse>(
        url, 
        {}, // params (empty for now, could be extracted from URL)
        this.convertConfig(config)
      );
      
      return this.convertResult(result);
    } catch (error) {
      throw this.convertError(error);
    }
  }

  /**
   * POST request
   */
  async post<TResponse, TRequest = unknown>(
    url: string,
    data?: TRequest,
    config?: InhHttpRequestConfig
  ): Promise<InhHttpResponse<TResponse>> {
    try {
      const result = await this.internalClient.post<TResponse>(
        url,
        data as Record<string, unknown>,
        this.convertConfig(config)
      );
      
      return this.convertResult(result);
    } catch (error) {
      throw this.convertError(error);
    }
  }

  /**
   * PUT request
   */
  async put<TResponse, TRequest = unknown>(
    url: string,
    data?: TRequest,
    config?: InhHttpRequestConfig
  ): Promise<InhHttpResponse<TResponse>> {
    try {
      const result = await this.internalClient.put<TResponse>(
        url,
        data as Record<string, unknown>,
        this.convertConfig(config)
      );
      
      return this.convertResult(result);
    } catch (error) {
      throw this.convertError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<TResponse>(
    url: string,
    config?: InhHttpRequestConfig
  ): Promise<InhHttpResponse<TResponse>> {
    try {
      const result = await this.internalClient.delete<TResponse>(
        url,
        {}, // params (empty for now, could be extracted from URL)
        this.convertConfig(config)
      );
      
      return this.convertResult(result);
    } catch (error) {
      throw this.convertError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch<TResponse, TRequest = unknown>(
    url: string,
    data?: TRequest,
    config?: InhHttpRequestConfig
  ): Promise<InhHttpResponse<TResponse>> {
    try {
      const result = await this.internalClient.call<TResponse>({
        route: url,
        method: 'PATCH',
        body: data as Record<string, unknown>,
        ...this.convertConfig(config)
      });
      
      return this.convertResult(result);
    } catch (error) {
      throw this.convertError(error);
    }
  }

  /**
   * แปลง internal error เป็น standard error
   */
  private convertError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }

  /**
   * อัพเดท default options (สำหรับ context switching)
   */
  updateDefaults(options: {
    userId?: string;
    correlationId?: string;
    registry?: Record<string, unknown>;
    headers?: Record<string, string>;
  }): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * ดึง underlying UnifiedInternalClient (สำหรับ advanced usage)
   */
  getInternalClient(): UnifiedInternalClient {
    return this.internalClient;
  }
}

/**
 * Factory function สำหรับสร้าง InhHttpClient จาก UnifiedInternalClient
 * 
 * @example
 * ```typescript
 * const httpClient = createInhHttpClient(internalClient, {
 *   userId: 'user-123',
 *   registry: { config: appConfig }
 * });
 * ```
 */
export function createInhHttpClient(
  internalClient: UnifiedInternalClient,
  defaultOptions?: {
    userId?: string;
    correlationId?: string;
    registry?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): InhHttpClient {
  return new UnifiedInternalClientAdapter(internalClient, defaultOptions);
}