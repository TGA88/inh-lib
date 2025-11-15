# UnifiedInternalClient Decision Guide & Implementation Patterns

## 🎯 **Decision Matrix: เมื่อไหร่ใช้ Client ประเภทไหน**

### **1. Client Selection Decision Tree**

```
📋 Question 1: ระบบอยู่ที่เดียวกันมั้ย?
├─ ✅ YES → Same Process/Container
│   ├─ 📋 Question 2: ต้องการ Performance สูงสุด?
│   │   ├─ ✅ YES → **InternalClient** (Direct Memory Access)
│   │   └─ ❌ NO → **InternalClient** (Still best choice)
│   └─ 💡 Decision: **Use InternalClient**
│
└─ ❌ NO → Different Servers/Services  
    ├─ 📋 Question 3: Infrastructure มี HTTP Client Library มั้ย?
    │   ├─ ✅ YES (Node.js/Backend) → **AxiosClient** (Full Features)
    │   └─ ❌ NO (Browser/Edge) → **FetchClient** (Native Browser)
    └─ 📋 Question 4: ต้องการ Advanced Features?
        ├─ ✅ YES (Retry, Interceptors, etc.) → **AxiosClient**
        └─ ❌ NO (Simple HTTP) → **FetchClient**
```

### **2. Use Case Matrix**

| Scenario | Client Type | Reason | Performance | Complexity |
|----------|-------------|--------|-------------|------------|
| **Monolith App** | Internal | Same process | ⚡ Fastest | 🟢 Simple |
| **Container (Same Pod)** | Internal | Shared memory | ⚡ Fastest | 🟢 Simple |
| **Microservices** | Axios/Fetch | Network calls | 🟡 HTTP overhead | 🟡 Medium |
| **Lambda → Lambda** | Axios/Fetch | AWS network | 🟡 HTTP + Cold start | 🟡 Medium |
| **Frontend → Backend** | Fetch | Browser limitation | 🟡 HTTP | 🟢 Simple |
| **Node.js → External API** | Axios | Rich ecosystem | 🟡 HTTP | 🔴 Complex |
| **Edge Functions** | Fetch | Runtime constraint | 🟡 HTTP | 🟢 Simple |

## 🏗️ **Implementation Patterns**

### **Pattern 1: Facade Pattern with Interface**

```typescript
// 1. Define API Contract (Interface)
export interface IDocumentApiClient {
  // Core Operations
  getDocument(id: string): Promise<Document>;
  createDocument(input: CreateDocumentInput): Promise<Document>;
  updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Query Operations  
  searchDocuments(input?: SearchDocumentsInput): Promise<Document[]>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  
  // Metadata Operations
  getMetadata(id: string): Promise<DocumentMetadata>;
  getAnalytics(id: string): Promise<DocumentAnalytics>;
  
  // Business Operations
  publishDocument(id: string): Promise<Document>;
  archiveDocument(id: string): Promise<void>;
  
  // Composite Operations
  getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }>;
  bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]>;
}

// 2. Shared Types
export interface Document {
  id: string;
  title: string;
  content: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  author: string;
  tags?: string[];
}

export interface SearchDocumentsInput {
  query?: string;
  userId?: string;
  status?: Document['status'];
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentMetadata {
  wordCount: number;
  readingTime: number;
  lastModifiedBy: string;
  version: number;
  checksum: string;
}

export interface DocumentAnalytics {
  views: number;
  downloads: number;
  shares: number;
  avgRating: number;
  lastAccessed: Date;
  topReferrers: string[];
}
```

### **Pattern 2: InternalClient Implementation**

```typescript
// libs/api-service/document-api/clients/document-internal.client.ts
import { UnifiedInternalClient } from '@inh/unified-route';
import { getDocumentInternalService } from '../document-internal.service';
import type { IDocumentApiClient, Document, CreateDocumentInput, SearchDocumentsInput, DocumentMetadata, DocumentAnalytics } from '../interfaces';

export class DocumentInternalClient implements IDocumentApiClient {
  private client: UnifiedInternalClient;
  private cache = new Map<string, { data: any; expiry: number }>();
  
  constructor() {
    const service = getDocumentInternalService();
    this.client = new UnifiedInternalClient(service);
  }
  
  // ✅ Core Operations - High Performance
  async getDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    // Check cache first (Internal calls can afford caching)
    const cached = this.getCached(`document:${id}`);
    if (cached) return cached;
    
    const document = await this.client.get(`/api/documents/${id}`);
    this.setCache(`document:${id}`, document, 300000); // 5 min cache
    return document;
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    this.validateCreateInput(input);
    const document = await this.client.post('/api/documents', input);
    
    // Invalidate related caches
    this.invalidateUserCache(input.author);
    return document;
  }
  
  async updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document> {
    this.validateId(id, 'Document ID');
    const document = await this.client.put(`/api/documents/${id}`, updates);
    
    // Update cache
    this.setCache(`document:${id}`, document);
    return document;
  }
  
  async deleteDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    await this.client.delete(`/api/documents/${id}`);
    
    // Clear cache
    this.cache.delete(`document:${id}`);
  }
  
  // ✅ Query Operations - Optimized for Internal Use
  async searchDocuments(input: SearchDocumentsInput = {}): Promise<Document[]> {
    const queryKey = this.createQueryKey('search', input);
    const cached = this.getCached(queryKey);
    if (cached) return cached;
    
    const params = this.buildSearchParams(input);
    const documents = await this.client.get(`/api/documents/search?${params}`);
    
    this.setCache(queryKey, documents, 60000); // 1 min cache for search
    return documents;
  }
  
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    this.validateId(userId, 'User ID');
    return this.searchDocuments({ userId, limit: 100 });
  }
  
  // ✅ Metadata Operations - Fast Internal Access
  async getMetadata(id: string): Promise<DocumentMetadata> {
    this.validateId(id, 'Document ID');
    return this.client.get(`/api/documents/${id}/metadata`);
  }
  
  async getAnalytics(id: string): Promise<DocumentAnalytics> {
    this.validateId(id, 'Document ID');
    return this.client.get(`/api/documents/${id}/analytics`);
  }
  
  // ✅ Business Operations
  async publishDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    const document = await this.client.post(`/api/documents/${id}/publish`);
    
    // Update cache with new status
    this.setCache(`document:${id}`, document);
    return document;
  }
  
  async archiveDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    await this.client.post(`/api/documents/${id}/archive`);
    
    // Remove from cache (archived documents rarely accessed)
    this.cache.delete(`document:${id}`);
  }
  
  // ✅ Composite Operations - Leverage Internal Performance
  async getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }> {
    // Parallel calls - very fast with internal client
    const [document, metadata] = await Promise.all([
      this.getDocument(id),
      this.getMetadata(id)
    ]);
    
    return { ...document, metadata };
  }
  
  async bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]> {
    this.validateBulkInput(documents);
    
    // Internal client can handle bulk operations efficiently
    const results = await Promise.all(
      documents.map(doc => this.createDocument(doc))
    );
    
    return results;
  }
  
  // ✅ Private Helper Methods
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
    documents.forEach(doc => this.validateCreateInput(doc));
  }
  
  private buildSearchParams(input: SearchDocumentsInput): string {
    const params = new URLSearchParams();
    
    if (input.query) params.set('query', input.query);
    if (input.userId) params.set('userId', input.userId);
    if (input.status) params.set('status', input.status);
    if (input.tags) params.set('tags', input.tags.join(','));
    if (input.limit) params.set('limit', input.limit.toString());
    if (input.offset) params.set('offset', input.offset.toString());
    if (input.sortBy) params.set('sortBy', input.sortBy);
    if (input.sortOrder) params.set('sortOrder', input.sortOrder);
    
    return params.toString();
  }
  
  private createQueryKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }
  
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  private setCache(key: string, data: any, ttl = 300000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
  
  private invalidateUserCache(userId: string): void {
    // Remove all user-related caches
    for (const key of this.cache.keys()) {
      if (key.includes(`userId=${userId}`) || key.includes(`user:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton Pattern
let documentInternalClientInstance: DocumentInternalClient | null = null;

export function getDocumentInternalClient(): DocumentInternalClient {
  if (!documentInternalClientInstance) {
    documentInternalClientInstance = new DocumentInternalClient();
  }
  return documentInternalClientInstance;
}
```

### **Pattern 3: AxiosClient Implementation**

```typescript
// libs/api-service/document-api/clients/document-axios.client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { IDocumentApiClient, Document, CreateDocumentInput, SearchDocumentsInput, DocumentMetadata, DocumentAnalytics } from '../interfaces';

export interface DocumentAxiosClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  auth?: {
    type: 'api-key' | 'bearer' | 'basic';
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
  };
  rateLimit?: {
    requests: number;
    per: number; // milliseconds
  };
}

export class DocumentAxiosClient implements IDocumentApiClient {
  private client: AxiosInstance;
  private rateLimiter: Map<string, number[]> = new Map();
  
  constructor(private config: DocumentAxiosClientConfig) {
    this.client = this.createAxiosClient();
    this.setupInterceptors();
  }
  
  private createAxiosClient(): AxiosInstance {
    const { baseURL, timeout = 30000, headers = {} } = this.config;
    
    return axios.create({
      baseURL: baseURL.replace(/\/$/, ''),
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
        ...this.getAuthHeaders()
      }
    });
  }
  
  private getAuthHeaders(): Record<string, string> {
    const { auth } = this.config;
    if (!auth) return {};
    
    switch (auth.type) {
      case 'api-key':
        return auth.apiKey ? { 'X-API-Key': auth.apiKey } : {};
      case 'bearer':
        return auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          return { 'Authorization': `Basic ${credentials}` };
        }
        return {};
      default:
        return {};
    }
  }
  
  private setupInterceptors(): void {
    // Request interceptor - Rate limiting
    this.client.interceptors.request.use(async (config) => {
      if (this.config.rateLimit) {
        await this.checkRateLimit();
      }
      
      // Add request ID for tracing
      config.headers['X-Request-ID'] = this.generateRequestId();
      config.metadata = { startTime: Date.now() };
      
      return config;
    });
    
    // Response interceptor - Error handling & Retry logic
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata?.startTime;
        console.debug(`API Call: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
        
        return response.data; // Return only data
      },
      async (error) => {
        const config = error.config;
        
        // Retry logic for network errors and 5xx errors
        if (this.shouldRetry(error) && !config._retry) {
          config._retry = (config._retry || 0) + 1;
          
          if (config._retry <= (this.config.retries || 3)) {
            const delay = this.calculateRetryDelay(config._retry);
            console.warn(`Retrying request (${config._retry}/${this.config.retries}) after ${delay}ms`);
            
            await this.sleep(delay);
            return this.client.request(config);
          }
        }
        
        throw this.transformError(error);
      }
    );
  }
  
  // ✅ Core Operations - With Retry & Error Handling
  async getDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.client.get(`/api/documents/${id}`);
    } catch (error) {
      throw this.handleDocumentError(error, 'getDocument', { id });
    }
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    this.validateCreateInput(input);
    
    try {
      return await this.client.post('/api/documents', input);
    } catch (error) {
      throw this.handleDocumentError(error, 'createDocument', { input });
    }
  }
  
  async updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.client.put(`/api/documents/${id}`, updates);
    } catch (error) {
      throw this.handleDocumentError(error, 'updateDocument', { id, updates });
    }
  }
  
  async deleteDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    try {
      await this.client.delete(`/api/documents/${id}`);
    } catch (error) {
      throw this.handleDocumentError(error, 'deleteDocument', { id });
    }
  }
  
  // ✅ Query Operations - With Pagination Support
  async searchDocuments(input: SearchDocumentsInput = {}): Promise<Document[]> {
    try {
      return await this.client.get('/api/documents/search', { 
        params: this.cleanParams(input) 
      });
    } catch (error) {
      throw this.handleDocumentError(error, 'searchDocuments', { input });
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
      return await this.client.get(`/api/documents/${id}/metadata`);
    } catch (error) {
      throw this.handleDocumentError(error, 'getMetadata', { id });
    }
  }
  
  async getAnalytics(id: string): Promise<DocumentAnalytics> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.client.get(`/api/documents/${id}/analytics`);
    } catch (error) {
      throw this.handleDocumentError(error, 'getAnalytics', { id });
    }
  }
  
  // ✅ Business Operations
  async publishDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.client.post(`/api/documents/${id}/publish`);
    } catch (error) {
      throw this.handleDocumentError(error, 'publishDocument', { id });
    }
  }
  
  async archiveDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    try {
      await this.client.post(`/api/documents/${id}/archive`);
    } catch (error) {
      throw this.handleDocumentError(error, 'archiveDocument', { id });
    }
  }
  
  // ✅ Composite Operations - With Parallel HTTP Calls
  async getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }> {
    try {
      const [document, metadata] = await Promise.all([
        this.getDocument(id),
        this.getMetadata(id)
      ]);
      
      return { ...document, metadata };
    } catch (error) {
      throw this.handleDocumentError(error, 'getDocumentWithMetadata', { id });
    }
  }
  
  async bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]> {
    this.validateBulkInput(documents);
    
    try {
      // For HTTP, better to use batch endpoint if available
      return await this.client.post('/api/documents/bulk', { documents });
    } catch (error) {
      // Fallback to individual calls
      if (error.status === 404) {
        console.warn('Bulk endpoint not available, falling back to individual calls');
        const results = [];
        for (const doc of documents) {
          results.push(await this.createDocument(doc));
        }
        return results;
      }
      throw this.handleDocumentError(error, 'bulkCreateDocuments', { documents });
    }
  }
  
  // ✅ Private Helper Methods - HTTP Specific
  private async checkRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;
    
    const { requests, per } = this.config.rateLimit;
    const now = Date.now();
    const key = 'default';
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }
    
    const timestamps = this.rateLimiter.get(key)!;
    
    // Remove old timestamps
    const cutoff = now - per;
    const validTimestamps = timestamps.filter(t => t > cutoff);
    
    if (validTimestamps.length >= requests) {
      const oldestValidTime = validTimestamps[0];
      const waitTime = oldestValidTime + per - now;
      
      if (waitTime > 0) {
        console.debug(`Rate limit hit, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
    
    validTimestamps.push(now);
    this.rateLimiter.set(key, validTimestamps);
  }
  
  private shouldRetry(error: any): boolean {
    // Retry on network errors
    if (!error.response) return true;
    
    // Retry on 5xx server errors
    if (error.response.status >= 500) return true;
    
    // Retry on rate limits (429)
    if (error.response.status === 429) return true;
    
    // Don't retry on 4xx client errors (except 429)
    return false;
  }
  
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private cleanParams(params: any): any {
    const cleaned: any = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleaned[key] = Array.isArray(value) ? value.join(',') : value;
      }
    });
    return cleaned;
  }
  
  private transformError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || `HTTP ${status} Error`;
      
      const customError = new Error(message);
      (customError as any).status = status;
      (customError as any).data = data;
      return customError;
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Network error: Service unavailable');
    }
    
    return error;
  }
  
  private handleDocumentError(error: any, operation: string, context: any): Error {
    console.error(`DocumentAxiosClient.${operation} failed:`, {
      error: error.message,
      status: error.status,
      context
    });
    
    return error;
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
    documents.forEach(doc => this.validateCreateInput(doc));
  }
}
```

### **Pattern 4: FetchClient Implementation**

```typescript
// libs/api-service/document-api/clients/document-fetch.client.ts
import type { IDocumentApiClient, Document, CreateDocumentInput, SearchDocumentsInput, DocumentMetadata, DocumentAnalytics } from '../interfaces';

export interface DocumentFetchClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  auth?: {
    type: 'api-key' | 'bearer';
    apiKey?: string;
    token?: string;
  };
}

export class DocumentFetchClient implements IDocumentApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  
  constructor(private config: DocumentFetchClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
      ...this.getAuthHeaders()
    };
  }
  
  private getAuthHeaders(): Record<string, string> {
    const { auth } = this.config;
    if (!auth) return {};
    
    switch (auth.type) {
      case 'api-key':
        return auth.apiKey ? { 'X-API-Key': auth.apiKey } : {};
      case 'bearer':
        return auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
      default:
        return {};
    }
  }
  
  // ✅ Core HTTP Method with Retry Logic
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      signal: controller.signal
    };
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.text();
          let errorMessage: string;
          
          try {
            const parsedError = JSON.parse(errorData);
            errorMessage = parsedError.message || parsedError.error || `HTTP ${response.status}`;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          const error = new Error(errorMessage);
          (error as any).status = response.status;
          (error as any).response = response;
          
          // Don't retry on 4xx errors (except 429)
          if (response.status < 500 && response.status !== 429) {
            throw error;
          }
          
          lastError = error;
          
          if (attempt < this.retries) {
            const delay = this.calculateRetryDelay(attempt + 1);
            console.warn(`Request failed (${response.status}), retrying in ${delay}ms... (${attempt + 1}/${this.retries})`);
            await this.sleep(delay);
            continue;
          }
          
          throw error;
        }
        
        const contentType = response.headers.get('Content-Type') || '';
        
        if (contentType.includes('application/json')) {
          return await response.json();
        }
        
        // For DELETE operations or other non-JSON responses
        return undefined as T;
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          lastError = new Error(`Request timeout after ${this.timeout}ms`);
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          lastError = new Error('Network error: Unable to connect to server');
        } else {
          lastError = error;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === this.retries) {
          throw lastError;
        }
        
        // Only retry on network errors and timeouts
        if (lastError.name === 'AbortError' || lastError.message.includes('Network error')) {
          const delay = this.calculateRetryDelay(attempt + 1);
          console.warn(`Network error, retrying in ${delay}ms... (${attempt + 1}/${this.retries})`);
          await this.sleep(delay);
          continue;
        }
        
        // For other errors, don't retry
        throw lastError;
      }
    }
    
    throw lastError!;
  }
  
  // ✅ Core Operations - Simple & Reliable
  async getDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.request<Document>(`/api/documents/${id}`);
    } catch (error) {
      throw this.enhanceError(error, 'getDocument', { id });
    }
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    this.validateCreateInput(input);
    
    try {
      return await this.request<Document>('/api/documents', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch (error) {
      throw this.enhanceError(error, 'createDocument', { input });
    }
  }
  
  async updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.request<Document>(`/api/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      throw this.enhanceError(error, 'updateDocument', { id, updates });
    }
  }
  
  async deleteDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    try {
      await this.request<void>(`/api/documents/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw this.enhanceError(error, 'deleteDocument', { id });
    }
  }
  
  // ✅ Query Operations - Browser Friendly
  async searchDocuments(input: SearchDocumentsInput = {}): Promise<Document[]> {
    try {
      const params = this.buildQueryString(input);
      return await this.request<Document[]>(`/api/documents/search${params ? '?' + params : ''}`);
    } catch (error) {
      throw this.enhanceError(error, 'searchDocuments', { input });
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
      return await this.request<DocumentMetadata>(`/api/documents/${id}/metadata`);
    } catch (error) {
      throw this.enhanceError(error, 'getMetadata', { id });
    }
  }
  
  async getAnalytics(id: string): Promise<DocumentAnalytics> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.request<DocumentAnalytics>(`/api/documents/${id}/analytics`);
    } catch (error) {
      throw this.enhanceError(error, 'getAnalytics', { id });
    }
  }
  
  // ✅ Business Operations
  async publishDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    try {
      return await this.request<Document>(`/api/documents/${id}/publish`, {
        method: 'POST'
      });
    } catch (error) {
      throw this.enhanceError(error, 'publishDocument', { id });
    }
  }
  
  async archiveDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    try {
      await this.request<void>(`/api/documents/${id}/archive`, {
        method: 'POST'
      });
    } catch (error) {
      throw this.enhanceError(error, 'archiveDocument', { id });
    }
  }
  
  // ✅ Composite Operations - Parallel Fetch Calls
  async getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }> {
    try {
      const [document, metadata] = await Promise.all([
        this.getDocument(id),
        this.getMetadata(id)
      ]);
      
      return { ...document, metadata };
    } catch (error) {
      throw this.enhanceError(error, 'getDocumentWithMetadata', { id });
    }
  }
  
  async bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]> {
    this.validateBulkInput(documents);
    
    try {
      // Try batch endpoint first
      return await this.request<Document[]>('/api/documents/bulk', {
        method: 'POST',
        body: JSON.stringify({ documents })
      });
    } catch (error) {
      // Fallback to individual requests if batch not supported
      if ((error as any).status === 404) {
        console.warn('Bulk endpoint not available, falling back to individual requests');
        
        const results: Document[] = [];
        // Sequential to avoid overwhelming the server
        for (const doc of documents) {
          const result = await this.createDocument(doc);
          results.push(result);
        }
        return results;
      }
      
      throw this.enhanceError(error, 'bulkCreateDocuments', { documents });
    }
  }
  
  // ✅ Private Helper Methods - Fetch Specific
  private buildQueryString(params: any): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }
  
  private calculateRetryDelay(attempt: number): number {
    return this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private enhanceError(error: any, operation: string, context: any): Error {
    // Add context to error for debugging
    const enhancedError = new Error(error.message);
    (enhancedError as any).originalError = error;
    (enhancedError as any).operation = operation;
    (enhancedError as any).context = context;
    (enhancedError as any).status = error.status;
    
    // Log error for debugging (can be disabled in production)
    if (process.env.NODE_ENV !== 'production') {
      console.error(`DocumentFetchClient.${operation} failed:`, {
        message: error.message,
        status: error.status,
        context
      });
    }
    
    return enhancedError;
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
    documents.forEach(doc => this.validateCreateInput(doc));
  }
}
```

## 🎯 **Factory & Configuration Patterns**

### **Pattern 5: Unified Factory with Smart Selection**

```typescript
// libs/api-service/document-api/document-client.factory.ts
import type { IDocumentApiClient } from './interfaces';
import { DocumentInternalClient } from './clients/document-internal.client';
import { DocumentAxiosClient, DocumentAxiosClientConfig } from './clients/document-axios.client';
import { DocumentFetchClient, DocumentFetchClientConfig } from './clients/document-fetch.client';

export type DocumentClientType = 'internal' | 'axios' | 'fetch' | 'auto';

export interface DocumentClientConfig {
  type: DocumentClientType;
  http?: DocumentAxiosClientConfig | DocumentFetchClientConfig;
  environment?: 'browser' | 'node' | 'edge' | 'lambda';
}

export class DocumentClientFactory {
  private static instances = new Map<string, IDocumentApiClient>();
  
  static create(config: DocumentClientConfig): IDocumentApiClient {
    const cacheKey = JSON.stringify(config);
    
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }
    
    const client = this.createClient(config);
    this.instances.set(cacheKey, client);
    return client;
  }
  
  private static createClient(config: DocumentClientConfig): IDocumentApiClient {
    const clientType = config.type === 'auto' ? this.detectBestClient(config) : config.type;
    
    switch (clientType) {
      case 'internal':
        return new DocumentInternalClient();
        
      case 'axios':
        if (!config.http) {
          throw new Error('HTTP configuration required for axios client');
        }
        return new DocumentAxiosClient(config.http as DocumentAxiosClientConfig);
        
      case 'fetch':
        if (!config.http) {
          throw new Error('HTTP configuration required for fetch client');
        }
        return new DocumentFetchClient(config.http as DocumentFetchClientConfig);
        
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }
  
  private static detectBestClient(config: DocumentClientConfig): Exclude<DocumentClientType, 'auto'> {
    // Environment-based detection
    if (config.environment === 'browser') return 'fetch';
    if (config.environment === 'edge') return 'fetch';
    if (config.environment === 'lambda' && !config.http) return 'internal';
    if (config.environment === 'node' && config.http) return 'axios';
    
    // Runtime detection
    if (typeof window !== 'undefined') return 'fetch'; // Browser
    if (typeof process !== 'undefined' && process.versions?.node) {
      return config.http ? 'axios' : 'internal'; // Node.js
    }
    
    // Default fallback
    return config.http ? 'fetch' : 'internal';
  }
  
  // Convenience methods
  static createInternal(): IDocumentApiClient {
    return this.create({ type: 'internal' });
  }
  
  static createAxios(config: DocumentAxiosClientConfig): IDocumentApiClient {
    return this.create({ type: 'axios', http: config });
  }
  
  static createFetch(config: DocumentFetchClientConfig): IDocumentApiClient {
    return this.create({ type: 'fetch', http: config });
  }
  
  static createAuto(config: Omit<DocumentClientConfig, 'type'>): IDocumentApiClient {
    return this.create({ ...config, type: 'auto' });
  }
  
  static reset(): void {
    this.instances.clear();
  }
}

// Environment-specific helpers
export const createDocumentClient = {
  // For monolith/container deployments
  internal(): IDocumentApiClient {
    return DocumentClientFactory.createInternal();
  },
  
  // For microservices with Node.js
  microservice(baseURL: string, auth?: { apiKey?: string; token?: string }): IDocumentApiClient {
    return DocumentClientFactory.createAxios({
      baseURL,
      timeout: 10000,
      retries: 3,
      auth: auth ? { 
        type: auth.apiKey ? 'api-key' : 'bearer',
        ...auth 
      } : undefined
    });
  },
  
  // For browser/edge deployments
  browser(baseURL: string, auth?: { apiKey?: string; token?: string }): IDocumentApiClient {
    return DocumentClientFactory.createFetch({
      baseURL,
      timeout: 15000,
      retries: 2,
      auth: auth ? {
        type: auth.apiKey ? 'api-key' : 'bearer',
        ...auth
      } : undefined
    });
  },
  
  // Smart auto-detection
  auto(baseURL?: string, auth?: { apiKey?: string; token?: string }): IDocumentApiClient {
    if (!baseURL) {
      return DocumentClientFactory.createInternal();
    }
    
    return DocumentClientFactory.createAuto({
      http: {
        baseURL,
        timeout: 10000,
        retries: 3,
        auth: auth ? {
          type: auth.apiKey ? 'api-key' : 'bearer',
          ...auth
        } : undefined
      }
    });
  }
};
```

## 🎯 **Real-World Use Cases & Decision Rationale**

### **Use Case 1: E-commerce Platform Evolution**

```typescript
// Phase 1: Monolith (All Internal)
const documentClient = createDocumentClient.internal();
const userClient = createUserClient.internal();
const orderClient = createOrderClient.internal();

// Phase 2: Extract Document Service (Mixed)
const documentClient = createDocumentClient.microservice(
  'https://document-service.company.com',
  { apiKey: process.env.DOCUMENT_API_KEY }
);
const userClient = createUserClient.internal(); // Still internal
const orderClient = createOrderClient.internal(); // Still internal

// Phase 3: Full Microservices (All HTTP)
const documentClient = createDocumentClient.microservice('https://document-service.company.com');
const userClient = createUserClient.microservice('https://user-service.company.com');
const orderClient = createOrderClient.microservice('https://order-service.company.com');

// Phase 4: Edge/CDN Integration (Browser + API)
const documentClient = createDocumentClient.browser(
  'https://api.company.com/documents',
  { token: userSession.token }
);
```

**Why This Approach Works:**

1. **🔄 Zero Code Changes**: Business logic remains identical across all phases
2. **📈 Gradual Migration**: Can extract services one by one
3. **🎯 Performance Optimization**: Use best client for each environment
4. **🛡️ Risk Mitigation**: Can rollback by changing client type only
5. **💰 Cost Control**: Start with cheap monolith, scale to expensive microservices only when needed

### **Use Case 2: Serverless Platform (AWS Lambda)**

```typescript
// Lambda Function 1: Document Processing (Heavy CPU)
export const processDocumentHandler = async (event: APIGatewayEvent) => {
  // Internal for same-function calls, Axios for external services
  const documentClient = createDocumentClient.auto(); // Auto-detects internal
  const aiClient = createAiClient.microservice('https://ai-service.aws.com');
  
  const document = await documentClient.getDocument(event.pathParameters!.id);
  const analysis = await aiClient.analyzeDocument(document.content);
  
  return await documentClient.updateDocument(document.id, {
    ...document,
    analysis: analysis.summary
  });
};

// Lambda Function 2: API Gateway (Lightweight)
export const documentApiHandler = async (event: APIGatewayEvent) => {
  // All HTTP calls to other Lambda functions
  const documentClient = createDocumentClient.microservice(
    process.env.DOCUMENT_SERVICE_URL!
  );
  
  switch (event.httpMethod) {
    case 'GET':
      return documentClient.getDocument(event.pathParameters!.id);
    case 'POST':
      return documentClient.createDocument(JSON.parse(event.body!));
  }
};
```

**Performance Impact:**

| Client Type | Cold Start | Memory | Bundle Size | Network | Total Latency |
|-------------|------------|---------|-------------|---------|---------------|
| **Internal** | 200ms | 64MB | 2MB | 0ms | **200ms** |
| **Axios** | 350ms | 96MB | 8MB | 50ms | **400ms** |
| **Fetch** | 250ms | 72MB | 3MB | 50ms | **300ms** |

### **Use Case 3: Multi-Region Deployment**

```typescript
// Primary Region (us-east-1) - All Internal
const config = {
  document: createDocumentClient.internal(),
  user: createUserClient.internal(),
  payment: createPaymentClient.internal()
};

// Secondary Region (eu-west-1) - Cross-region calls
const config = {
  document: createDocumentClient.internal(), // Local service
  user: createUserClient.internal(), // Local service  
  payment: createPaymentClient.microservice( // Cross-region for compliance
    'https://payment-us-east-1.company.com',
    { token: process.env.CROSS_REGION_TOKEN }
  )
};

// Edge Region (ap-south-1) - Hybrid approach
const config = {
  document: createDocumentClient.browser( // CDN cached
    'https://documents-cdn.company.com',
    { token: userToken }
  ),
  user: createUserClient.microservice( // Real-time from main region
    'https://users-us-east-1.company.com'
  ),
  payment: createPaymentClient.microservice( // Compliance region
    'https://payment-singapore.company.com'
  )
};
```

## 💡 **Benefits of Client Swapping**

### **1. Business Continuity**

```typescript
// Production: Use reliable Axios client
const documentClient = createDocumentClient.microservice(primaryServiceUrl);

try {
  const result = await documentClient.getDocument(id);
  return result;
} catch (error) {
  // Fallback to backup service with Fetch (different infrastructure)
  console.warn('Primary service failed, falling back to backup');
  
  const backupClient = createDocumentClient.browser(backupServiceUrl);
  return await backupClient.getDocument(id);
}
```

### **2. Performance Testing**

```typescript
// A/B test different client types
const clientType = Math.random() > 0.5 ? 'axios' : 'fetch';
const documentClient = clientType === 'axios' 
  ? createDocumentClient.microservice(serviceUrl)
  : createDocumentClient.browser(serviceUrl);

// Measure performance
const startTime = performance.now();
const result = await documentClient.getDocument(id);
const duration = performance.now() - startTime;

// Log metrics for analysis
analytics.track('client_performance', {
  clientType,
  operation: 'getDocument',
  duration,
  success: true
});
```

### **3. Environment Adaptation**

```typescript
// Development: Fast internal calls
if (process.env.NODE_ENV === 'development') {
  return createDocumentClient.internal();
}

// Staging: Test HTTP integration
if (process.env.NODE_ENV === 'staging') {
  return createDocumentClient.microservice(stagingUrl);
}

// Production: Optimized for reliability
return createDocumentClient.microservice(productionUrl, {
  retries: 5,
  timeout: 30000,
  rateLimit: { requests: 100, per: 60000 }
});
```

### **4. Cost Optimization**

```typescript
// Peak hours: Use fast internal clients (higher compute cost, lower latency)
const isPeakHour = new Date().getHours() >= 9 && new Date().getHours() <= 17;

if (isPeakHour) {
  return createDocumentClient.internal(); // Faster, more expensive
} else {
  return createDocumentClient.microservice(serviceUrl); // Slower, cheaper
}
```

---

**🏆 Key Takeaways:**

1. **Interface-first design** = Future-proof architecture
2. **Client swapping** = Deployment flexibility without code changes  
3. **Performance tuning** = Choose optimal client per environment
4. **Risk mitigation** = Easy fallback and rollback strategies
5. **Cost control** = Scale complexity only when needed

This pattern ทำให้ระบบของคุณ **adaptable, resilient, และ cost-effective** ในทุกสถานการณ์ครับ! 🚀