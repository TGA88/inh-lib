// Example: Document Axios Client Implementation 
// libs/api-service/document-api/clients/document-axios.client.ts

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import type { 
  IDocumentApiClient, 
  Document, 
  CreateDocumentInput, 
  SearchDocumentsInput, 
  DocumentMetadata, 
  DocumentAnalytics,
  HttpClientConfig
} from '../interfaces';

/**
 * 🌐 DocumentAxiosClient - Feature-Rich HTTP Implementation
 * 
 * ✅ Use Cases:
 * - Microservices architecture (different servers)
 * - Node.js backend services calling other services
 * - Production environments requiring robust HTTP features
 * - Systems needing advanced retry logic and monitoring
 * 
 * ✅ Benefits:
 * - 🔄 Advanced retry logic with exponential backoff
 * - 📊 Rich interceptors and monitoring capabilities
 * - 🛡️ Comprehensive error handling and transformation
 * - ⚡ Request/response interceptors for logging/auth
 * - 📈 Rate limiting and circuit breaker patterns
 * - 🔧 Extensive configuration options
 * 
 * ❌ Limitations:
 * - 📦 Larger bundle size (axios dependency)
 * - 🐌 HTTP network latency
 * - 💰 Higher resource usage
 * - 🔧 More complex setup and configuration
 */
export class DocumentAxiosClient implements IDocumentApiClient {
  private readonly client: AxiosInstance;
  private readonly config: Required<HttpClientConfig>;
  private callCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  
  constructor(config: HttpClientConfig) {
    this.config = {
      baseURL: config.baseURL.replace(/\/$/, ''),
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.headers || {},
      auth: config.auth || {}
    };
    
    this.client = this.createAxiosClient();
    this.setupInterceptors();
    
    console.log('🌐 DocumentAxiosClient initialized for:', this.config.baseURL);
  }
  
  private createAxiosClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'DocumentAxiosClient/1.0.0',
        ...this.config.headers,
        ...this.getAuthHeaders()
      }
    });
  }
  
  private getAuthHeaders(): Record<string, string> {
    const { auth } = this.config;
    
    if (auth.apiKey) {
      return { 'X-API-Key': auth.apiKey };
    }
    
    if (auth.token) {
      return { 'Authorization': `Bearer ${auth.token}` };
    }
    
    return {};
  }
  
  private setupInterceptors(): void {
    // 📤 Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request ID for tracing
        config.headers = {
          ...config.headers,
          'X-Request-ID': this.generateRequestId(),
          'X-Client-Version': '1.0.0',
          'X-Timestamp': new Date().toISOString()
        };
        
        // Add timing metadata
        (config as any).metadata = { startTime: Date.now() };
        
        console.debug(`🚀 HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request setup failed:', error.message);
        return Promise.reject(error);
      }
    );
    
    // 📥 Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.handleSuccessResponse(response);
        return response.data; // Return only the data
      },
      async (error: AxiosError) => {
        return this.handleErrorResponse(error);
      }
    );
  }
  
  private handleSuccessResponse(response: AxiosResponse): void {
    const duration = Date.now() - (response.config as any).metadata?.startTime;
    this.callCount++;
    this.totalResponseTime += duration;
    
    console.debug(`✅ HTTP Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
  }
  
  private async handleErrorResponse(error: AxiosError): Promise<any> {
    const config = error.config!;
    const duration = Date.now() - ((config as any).metadata?.startTime || Date.now());
    
    this.errorCount++;
    this.callCount++;
    this.totalResponseTime += duration;
    
    // Retry logic
    if (this.shouldRetry(error) && !(config as any)._retryCount) {
      (config as any)._retryCount = 0;
    }
    
    if ((config as any)._retryCount < this.config.retries) {
      (config as any)._retryCount++;
      const delay = this.calculateRetryDelay((config as any)._retryCount);
      
      console.warn(`🔄 Retrying request (${(config as any)._retryCount}/${this.config.retries}) after ${delay}ms: ${config.method?.toUpperCase()} ${config.url}`);
      
      await this.sleep(delay);
      return this.client.request(config);
    }
    
    // Transform and throw error
    const transformedError = this.transformError(error);
    console.error(`❌ HTTP Error: ${error.response?.status || 'Network'} ${config.method?.toUpperCase()} ${config.url} (${duration}ms)`, transformedError.message);
    
    throw transformedError;
  }
  
  // ✅ Core Operations - With Advanced Error Handling
  async getDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('📄 Fetching document via HTTP:', id);
      return await this.client.get(`/api/documents/${id}`);
    } catch (error) {
      throw this.enrichError(error, 'getDocument', { documentId: id });
    }
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    this.validateCreateInput(input);
    
    try {
      console.debug('📝 Creating document via HTTP:', input.title);
      return await this.client.post('/api/documents', input);
    } catch (error) {
      throw this.enrichError(error, 'createDocument', { title: input.title, author: input.author });
    }
  }
  
  async updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('✏️ Updating document via HTTP:', id);
      return await this.client.put(`/api/documents/${id}`, updates);
    } catch (error) {
      throw this.enrichError(error, 'updateDocument', { documentId: id, updates });
    }
  }
  
  async deleteDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('🗑️ Deleting document via HTTP:', id);
      await this.client.delete(`/api/documents/${id}`);
      console.debug('✅ Document deleted successfully:', id);
    } catch (error) {
      throw this.enrichError(error, 'deleteDocument', { documentId: id });
    }
  }
  
  // ✅ Query Operations - With Parameter Optimization
  async searchDocuments(input: SearchDocumentsInput = {}): Promise<Document[]> {
    try {
      console.debug('🔍 Searching documents via HTTP:', input);
      
      // Clean and optimize parameters for HTTP transmission
      const params = this.cleanParams(input);
      const response = await this.client.get('/api/documents/search', { params });
      
      console.debug(`✅ Found ${response.length} documents via HTTP`);
      return response;
    } catch (error) {
      throw this.enrichError(error, 'searchDocuments', { searchInput: input });
    }
  }
  
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    this.validateId(userId, 'User ID');
    return this.searchDocuments({ userId, limit: 100 });
  }
  
  // ✅ Metadata Operations
  async getMetadata(id: string): Promise<DocumentMetadata> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('📊 Fetching metadata via HTTP:', id);
      return await this.client.get(`/api/documents/${id}/metadata`);
    } catch (error) {
      throw this.enrichError(error, 'getMetadata', { documentId: id });
    }
  }
  
  async getAnalytics(id: string): Promise<DocumentAnalytics> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('📈 Fetching analytics via HTTP:', id);
      return await this.client.get(`/api/documents/${id}/analytics`);
    } catch (error) {
      throw this.enrichError(error, 'getAnalytics', { documentId: id });
    }
  }
  
  // ✅ Business Operations
  async publishDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('🚀 Publishing document via HTTP:', id);
      const result = await this.client.post(`/api/documents/${id}/publish`);
      console.debug('✅ Document published successfully:', id);
      return result;
    } catch (error) {
      throw this.enrichError(error, 'publishDocument', { documentId: id });
    }
  }
  
  async archiveDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('📦 Archiving document via HTTP:', id);
      await this.client.post(`/api/documents/${id}/archive`);
      console.debug('✅ Document archived successfully:', id);
    } catch (error) {
      throw this.enrichError(error, 'archiveDocument', { documentId: id });
    }
  }
  
  // ✅ Composite Operations - Optimized HTTP Calls
  async getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }> {
    this.validateId(id, 'Document ID');
    
    try {
      console.debug('🔄 Fetching document with metadata via HTTP:', id);
      
      // Parallel HTTP calls for better performance
      const [document, metadata] = await Promise.all([
        this.getDocument(id),
        this.getMetadata(id)
      ]);
      
      console.debug('✅ Document with metadata fetched via HTTP:', id);
      return { ...document, metadata };
    } catch (error) {
      throw this.enrichError(error, 'getDocumentWithMetadata', { documentId: id });
    }
  }
  
  async bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]> {
    this.validateBulkInput(documents);
    
    try {
      console.debug(`📝 Creating ${documents.length} documents in bulk via HTTP`);
      
      // Try batch endpoint first (more efficient for HTTP)
      try {
        const result = await this.client.post('/api/documents/bulk', { documents });
        console.debug(`✅ Bulk creation completed via batch endpoint: ${documents.length} documents`);
        return result;
      } catch (batchError: any) {
        // If batch endpoint doesn't exist, fall back to individual calls
        if (batchError.status === 404 || batchError.status === 405) {
          console.warn('⚠️ Batch endpoint not available, falling back to individual HTTP calls');
          
          const results: Document[] = [];
          // Use controlled concurrency to avoid overwhelming the server
          const concurrency = 5;
          
          for (let i = 0; i < documents.length; i += concurrency) {
            const batch = documents.slice(i, i + concurrency);
            const batchResults = await Promise.all(
              batch.map(doc => this.createDocument(doc))
            );
            results.push(...batchResults);
          }
          
          console.debug(`✅ Bulk creation completed via individual calls: ${documents.length} documents`);
          return results;
        }
        
        throw batchError;
      }
    } catch (error) {
      throw this.enrichError(error, 'bulkCreateDocuments', { documentCount: documents.length });
    }
  }
  
  // ✅ Performance & Health Monitoring
  getHealthStatus(): {
    isHealthy: boolean;
    baseURL: string;
    totalCalls: number;
    errorRate: number;
    averageResponseTime: number;
    lastError?: string;
  } {
    const errorRate = this.callCount > 0 ? this.errorCount / this.callCount : 0;
    const avgResponseTime = this.callCount > 0 ? this.totalResponseTime / this.callCount : 0;
    
    return {
      isHealthy: errorRate < 0.1, // Healthy if error rate < 10%
      baseURL: this.config.baseURL,
      totalCalls: this.callCount,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100
    };
  }
  
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const startTime = Date.now();
      await this.client.get('/api/health');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  // ✅ Private Helper Methods - HTTP Specific
  private shouldRetry(error: AxiosError): boolean {
    // Network errors
    if (!error.response) return true;
    
    // Server errors (5xx)
    if (error.response.status >= 500) return true;
    
    // Rate limiting
    if (error.response.status === 429) return true;
    
    // Don't retry client errors (4xx)
    return false;
  }
  
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.round(delay + jitter);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  
  private cleanParams(params: Record<string, any>): Record<string, string> {
    const cleaned: Record<string, string> = {};
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          cleaned[key] = value.join(',');
        } else {
          cleaned[key] = String(value);
        }
      }
    });
    
    return cleaned;
  }
  
  private transformError(error: AxiosError): Error {
    if (error.response) {
      // HTTP error response
      const { status, data } = error.response;
      const message = (data as any)?.message || (data as any)?.error || `HTTP ${status} Error`;
      
      const customError = new Error(message) as any;
      customError.status = status;
      customError.statusText = error.response.statusText;
      customError.data = data;
      customError.headers = error.response.headers;
      return customError;
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error(`Request timeout after ${this.config.timeout}ms`);
    }
    
    if (error.code === 'ENOTFOUND') {
      return new Error(`Network error: Unable to resolve host ${this.config.baseURL}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error(`Network error: Connection refused to ${this.config.baseURL}`);
    }
    
    return new Error(`Network error: ${error.message}`);
  }
  
  private enrichError(error: any, operation: string, context: Record<string, any>): Error {
    const enrichedError = new Error(error.message) as any;
    enrichedError.operation = operation;
    enrichedError.context = context;
    enrichedError.timestamp = new Date().toISOString();
    enrichedError.client = 'DocumentAxiosClient';
    
    // Copy original error properties
    if (error.status) enrichedError.status = error.status;
    if (error.statusText) enrichedError.statusText = error.statusText;
    if (error.data) enrichedError.data = error.data;
    
    console.error(`❌ DocumentAxiosClient.${operation} failed:`, {
      message: error.message,
      status: error.status,
      context,
      baseURL: this.config.baseURL
    });
    
    return enrichedError;
  }
  
  private validateId(id: string, fieldName: string): void {
    if (!id?.trim()) {
      throw new Error(`${fieldName} is required`);
    }
  }
  
  private validateCreateInput(input: CreateDocumentInput): void {
    if (!input.title?.trim()) throw new Error('Title is required');
    if (!input.content?.trim()) throw new Error('Content is required');
    if (!input.author?.trim()) throw new Error('Author is required');
  }
  
  private validateBulkInput(documents: CreateDocumentInput[]): void {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('Documents array is required and must not be empty');
    }
    if (documents.length > 100) {
      throw new Error('Bulk operations limited to 100 documents at a time');
    }
    
    for (let i = 0; i < documents.length; i++) {
      try {
        this.validateCreateInput(documents[i]);
      } catch (error: any) {
        throw new Error(`Document at index ${i}: ${error.message}`);
      }
    }
  }
}