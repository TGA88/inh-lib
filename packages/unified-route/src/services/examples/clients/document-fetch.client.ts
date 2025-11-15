// Example: Browser-Optimized Fetch Client Implementation
// libs/api-service/document-api/clients/document-fetch.client.ts

import type { IDocumentApiClient, Document, CreateDocumentInput, UpdateDocumentInput, SearchFilters, DocumentMetadata, DocumentAnalytics, HttpClientConfig } from '../interfaces';

/**
 * 🌐 DocumentFetchClient - Browser & Edge Optimized Implementation
 * 
 * This client is designed for browser and edge runtime environments where:
 * - Fetch API is native and performant
 * - Bundle size matters (no external dependencies)
 * - Streaming and modern browser features are available
 * - CSP (Content Security Policy) restrictions may apply
 * 
 * 🎯 Key Features:
 * - 📦 Zero dependencies (uses native fetch)
 * - 🏃‍♂️ Optimized for browser performance
 * - 📱 Mobile-friendly with timeout handling
 * - 🔄 Smart retry with exponential backoff
 * - 🌊 Streaming support for large responses
 * - 🔒 CSP-compliant implementation
 * 
 * 🏆 Best For:
 * - React/Vue/Angular applications
 * - Static site generators (Next.js, Nuxt.js)
 * - Edge functions (Vercel, Cloudflare Workers)
 * - Progressive Web Apps (PWAs)
 * - Mobile applications (React Native, Ionic)
 */
export class DocumentFetchClient implements IDocumentApiClient {
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly auth: { apiKey?: string; token?: string };
  
  // Performance tracking
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  
  constructor(config: HttpClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 15000; // Browser-friendly timeout
    this.retries = config.retries || 2; // Lower retries for browser
    this.auth = config.auth || {};
    
    console.log('🌐 DocumentFetchClient initialized:', {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retries: this.retries,
      hasAuth: !!(this.auth.apiKey || this.auth.token)
    });
  }
  
  // 📊 Performance & Analytics Methods
  getPerformanceStats() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      successRate: this.requestCount > 0 ? (this.requestCount - this.errorCount) / this.requestCount : 0
    };
  }
  
  resetStats() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
  }
  
  // 🔧 Core HTTP Methods
  
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    
    // Prepare headers
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    
    // Add authentication
    if (this.auth.token) {
      headers.set('Authorization', `Bearer ${this.auth.token}`);
    } else if (this.auth.apiKey) {
      headers.set('X-API-Key', this.auth.apiKey);
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: controller.signal
    };
    
    let lastError: Error;
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        console.debug(`🌐 Fetch request (attempt ${attempt + 1}):`, {
          method: options.method || 'GET',
          url,
          hasAuth: !!(this.auth.apiKey || this.auth.token)
        });
        
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        // Track performance
        this.requestCount++;
        this.totalResponseTime += Date.now() - startTime;
        
        // Handle response
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        // Handle empty responses
        const contentLength = response.headers.get('content-length');
        if (contentLength === '0' || response.status === 204) {
          return undefined as T;
        }
        
        // Parse JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json() as T;
          console.debug('✅ Fetch request successful:', {
            status: response.status,
            responseTime: Date.now() - startTime,
            dataSize: JSON.stringify(data).length
          });
          return data;
        }
        
        // Handle non-JSON responses
        const text = await response.text();
        console.debug('✅ Fetch request successful (text):', {
          status: response.status,
          responseTime: Date.now() - startTime,
          textLength: text.length
        });
        return text as T;
        
      } catch (error) {
        clearTimeout(timeoutId);
        this.errorCount++;
        lastError = error as Error;
        
        // Don't retry on client errors (4xx) or abort signals
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn('⏰ Fetch request timeout:', url);
            throw new Error(`Request timeout after ${this.timeout}ms: ${endpoint}`);
          }
          
          // Parse HTTP status from error message
          const statusMatch = error.message.match(/HTTP (\d+):/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            if (status >= 400 && status < 500) {
              console.warn('❌ Client error, not retrying:', error.message);
              throw error;
            }
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.warn(`🔄 Fetch retry ${attempt + 1}/${this.retries} in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('❌ Fetch request failed after all retries:', lastError?.message);
    throw lastError;
  }
  
  // 📄 Document API Implementation
  
  async getDocument(id: string): Promise<Document> {
    return this.makeRequest(`/documents/${encodeURIComponent(id)}`);
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    return this.makeRequest('/documents', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
  
  async updateDocument(id: string, updates: UpdateDocumentInput): Promise<Document> {
    return this.makeRequest(`/documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  
  async deleteDocument(id: string): Promise<void> {
    await this.makeRequest(`/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
  
  async searchDocuments(filters: SearchFilters): Promise<Document[]> {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.author) params.set('author', filters.author);
    if (filters.status) params.set('status', filters.status);
    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        params.append('tags', tag);
      }
    }
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.offset) params.set('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/documents/search?${queryString}` : '/documents/search';
    
    return this.makeRequest(endpoint);
  }
  
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return this.makeRequest(`/documents/user/${encodeURIComponent(userId)}`);
  }
  
  // 📊 Metadata & Analytics
  
  async getMetadata(id: string): Promise<DocumentMetadata> {
    return this.makeRequest(`/documents/${encodeURIComponent(id)}/metadata`);
  }
  
  async getAnalytics(id: string): Promise<DocumentAnalytics> {
    return this.makeRequest(`/documents/${encodeURIComponent(id)}/analytics`);
  }
  
  // 🚀 Advanced Operations
  
  async publishDocument(id: string): Promise<Document> {
    return this.makeRequest(`/documents/${encodeURIComponent(id)}/publish`, {
      method: 'POST'
    });
  }
  
  async archiveDocument(id: string): Promise<void> {
    await this.makeRequest(`/documents/${encodeURIComponent(id)}/archive`, {
      method: 'POST'
    });
  }
  
  // 🔄 Composite Operations
  
  async getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }> {
    // Use Promise.all for parallel requests - faster in browser
    const [document, metadata] = await Promise.all([
      this.getDocument(id),
      this.getMetadata(id)
    ]);
    
    return { ...document, metadata };
  }
  
  async bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]> {
    // Browser-optimized: Use batch endpoint if available, otherwise parallel requests
    try {
      // Try batch endpoint first
      return await this.makeRequest('/documents/batch', {
        method: 'POST',
        body: JSON.stringify({ documents })
      });
    } catch (error) {
      // Fallback to parallel creation (but limit concurrency for browser)
      console.warn('🔄 Batch endpoint failed, using parallel requests:', (error as Error).message);
      
      const batchSize = 5; // Limit concurrent requests in browser
      const results: Document[] = [];
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchPromises = batch.map(doc => this.createDocument(doc));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to be nice to the server
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return results;
    }
  }
  
  // 🌊 Streaming Support (Browser-specific features)
  
  /**
   * Stream large document content for better UX
   */
  async streamDocument(id: string): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseURL}/documents/${encodeURIComponent(id)}/stream`, {
      headers: this.createHeaders(),
      signal: AbortSignal.timeout(this.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to stream document: ${response.status}`);
    }
    
    if (!response.body) {
      throw new Error('No stream available');
    }
    
    return response.body;
  }
  
  /**
   * Upload document with progress tracking
   */
  async uploadDocument(
    file: File,
    metadata: Omit<CreateDocumentInput, 'content'>,
    onProgress?: (progress: number) => void
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    // Use XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const document = JSON.parse(xhr.responseText) as Document;
            resolve(document);
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });
      
      xhr.open('POST', `${this.baseURL}/documents/upload`);
      xhr.timeout = this.timeout;
      
      // Add authentication headers
      const headers = this.createHeaders();
      for (const [key, value] of Object.entries(headers)) {
        if (key !== 'Content-Type') { // Let browser set Content-Type for FormData
          xhr.setRequestHeader(key, value);
        }
      }
      
      xhr.send(formData);
    });
  }
  
  // 🔧 Private Utilities
  
  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    
    if (this.auth.token) {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    } else if (this.auth.apiKey) {
      headers['X-API-Key'] = this.auth.apiKey;
    }
    
    return headers;
  }
}

/**
 * 📋 Usage Examples:
 * 
 * // Basic setup
 * const client = new DocumentFetchClient({
 *   baseURL: 'https://api.example.com',
 *   auth: { token: userSession.token }
 * });
 * 
 * // With progress tracking
 * const uploadedDoc = await client.uploadDocument(
 *   file,
 *   { title: 'My Document', author: 'user-123' },
 *   (progress) => console.log(`Upload: ${progress}%`)
 * );
 * 
 * // Stream large content
 * const stream = await client.streamDocument('doc-123');
 * const reader = stream.getReader();
 * 
 * // Performance monitoring
 * const stats = client.getPerformanceStats();
 * console.log('Client performance:', stats);
 * 
 * // Parallel operations (browser-optimized)
 * const [document, metadata] = await Promise.all([
 *   client.getDocument('doc-123'),
 *   client.getMetadata('doc-123')
 * ]);
 */

export { DocumentFetchClient };