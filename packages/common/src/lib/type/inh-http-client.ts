// Generic HTTP response interface
export interface InhHttpResponse<TData> {
    data: TData;
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
  }
  
  // Generic HTTP request config interface
  export interface InhHttpRequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    timeout?: number;
    data?: unknown;
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  }
  
  // Main HTTP client interface
  export interface InhHttpClient {
    get<TResponse>(url: string, config?: InhHttpRequestConfig): Promise<InhHttpResponse<TResponse>>;
    post<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: InhHttpRequestConfig): Promise<InhHttpResponse<TResponse>>;
    put<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: InhHttpRequestConfig): Promise<InhHttpResponse<TResponse>>;
    delete<TResponse>(url: string, config?: InhHttpRequestConfig): Promise<InhHttpResponse<TResponse>>;
    patch<TResponse, TRequest = unknown>(url: string, data?: TRequest, config?: InhHttpRequestConfig): Promise<InhHttpResponse<TResponse>>;
  }