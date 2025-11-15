// Example: Document Internal Client Implementation 
// libs/api-service/document-api/clients/document-internal.client.ts

import { UnifiedInternalClient } from '../../unified-internal.service';
import { getDocumentInternalService } from '../document-internal.service';
import type { 
  IDocumentApiClient, 
  Document, 
  CreateDocumentInput, 
  SearchDocumentsInput, 
  DocumentMetadata, 
  DocumentAnalytics 
} from '../interfaces';

/**
 * 🚀 DocumentInternalClient - High Performance Internal Implementation
 * 
 * ✅ Use Cases:
 * - Monolith applications (same process)
 * - Container deployments (same pod/container)  
 * - Lambda functions with all logic in one function
 * - Development environment for fast iteration
 * 
 * ✅ Benefits:
 * - ⚡ Fastest performance (direct memory access)
 * - 🔒 Type safety with compile-time checking
 * - 💾 Can implement sophisticated caching
 * - 🛡️ No network failures or timeouts
 * - 💰 Lowest resource usage
 * 
 * ❌ Limitations:
 * - Only works within same process
 * - Cannot call external services
 * - Tight coupling between services
 */
export class DocumentInternalClient implements IDocumentApiClient {
  private client: UnifiedInternalClient;
  private cache = new Map<string, { data: any; expiry: number }>();
  
  constructor() {
    // Get the internal service instance (registered handlers)
    const service = getDocumentInternalService();
    this.client = new UnifiedInternalClient(service);
    
    console.log('📦 DocumentInternalClient initialized - High performance mode');
  }
  
  // ✅ Core Operations - Blazing Fast
  async getDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    // Internal clients can afford smart caching
    const cacheKey = `document:${id}`;
    const cached = this.getCached<Document>(cacheKey);
    if (cached) {
      console.debug('📋 Cache hit for document:', id);
      return cached;
    }
    
    console.debug('🔍 Fetching document internally:', id);
    const startTime = performance.now();
    
    const document = await this.client.get(`/api/documents/${id}`);
    
    const duration = performance.now() - startTime;
    console.debug(`✅ Document fetched in ${duration.toFixed(2)}ms`);
    
    // Cache for 5 minutes (internal calls are cheap to refresh)
    this.setCache(cacheKey, document, 300000);
    
    return document;
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    this.validateCreateInput(input);
    
    console.debug('📝 Creating document:', input.title);
    const startTime = performance.now();
    
    const document = await this.client.post('/api/documents', input);
    
    const duration = performance.now() - startTime;
    console.debug(`✅ Document created in ${duration.toFixed(2)}ms:`, document.id);
    
    // Invalidate user's document cache
    this.invalidateUserCache(input.author);
    
    // Cache the new document
    this.setCache(`document:${document.id}`, document);
    
    return document;
  }
  
  async updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    console.debug('✏️ Updating document:', id, updates);
    const document = await this.client.put(`/api/documents/${id}`, updates);
    
    // Update cache immediately (internal calls are reliable)
    this.setCache(`document:${id}`, document);
    
    return document;
  }
  
  async deleteDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    console.debug('🗑️ Deleting document:', id);
    await this.client.delete(`/api/documents/${id}`);
    
    // Remove from cache immediately
    this.cache.delete(`document:${id}`);
    console.debug('✅ Document deleted and cache cleared:', id);
  }
  
  // ✅ Query Operations - Optimized Caching
  async searchDocuments(input: SearchDocumentsInput = {}): Promise<Document[]> {
    const queryKey = this.createQueryKey('search', input);
    
    // Check cache first (search results change less frequently)
    const cached = this.getCached<Document[]>(queryKey);
    if (cached) {
      console.debug('📋 Cache hit for search:', input);
      return cached;
    }
    
    const params = this.buildSearchParams(input);
    console.debug('🔍 Searching documents internally:', input);
    
    const documents = await this.client.get(`/api/documents/search?${params}`);
    
    console.debug(`✅ Found ${documents.length} documents`);
    
    // Cache search results for 1 minute (they change more frequently)
    this.setCache(queryKey, documents, 60000);
    
    return documents;
  }
  
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    this.validateId(userId, 'User ID');
    
    // Optimized: use cached search
    return this.searchDocuments({ userId, limit: 100 });
  }
  
  // ✅ Metadata Operations - Super Fast Internal Calls
  async getMetadata(id: string): Promise<DocumentMetadata> {
    this.validateId(id, 'Document ID');
    
    console.debug('📊 Fetching metadata internally:', id);
    return this.client.get(`/api/documents/${id}/metadata`);
  }
  
  async getAnalytics(id: string): Promise<DocumentAnalytics> {
    this.validateId(id, 'Document ID');
    
    console.debug('📈 Fetching analytics internally:', id);
    return this.client.get(`/api/documents/${id}/analytics`);
  }
  
  // ✅ Business Operations
  async publishDocument(id: string): Promise<Document> {
    this.validateId(id, 'Document ID');
    
    console.debug('🚀 Publishing document:', id);
    const document = await this.client.post(`/api/documents/${id}/publish`);
    
    // Update cache with new published status
    this.setCache(`document:${id}`, document);
    
    console.debug('✅ Document published successfully:', id);
    return document;
  }
  
  async archiveDocument(id: string): Promise<void> {
    this.validateId(id, 'Document ID');
    
    console.debug('📦 Archiving document:', id);
    await this.client.post(`/api/documents/${id}/archive`);
    
    // Remove from cache (archived documents rarely accessed)
    this.cache.delete(`document:${id}`);
    
    console.debug('✅ Document archived:', id);
  }
  
  // ✅ Composite Operations - Leverage Internal Speed
  async getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }> {
    this.validateId(id, 'Document ID');
    
    console.debug('🔄 Fetching document with metadata:', id);
    const startTime = performance.now();
    
    // Internal calls are so fast we can do them in parallel without worry
    const [document, metadata] = await Promise.all([
      this.getDocument(id),
      this.getMetadata(id)
    ]);
    
    const duration = performance.now() - startTime;
    console.debug(`✅ Document with metadata fetched in ${duration.toFixed(2)}ms`);
    
    return { ...document, metadata };
  }
  
  async bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]> {
    this.validateBulkInput(documents);
    
    console.debug(`📝 Creating ${documents.length} documents in bulk`);
    const startTime = performance.now();
    
    // Internal client can handle parallel operations efficiently
    const results = await Promise.all(
      documents.map((doc, index) => {
        console.debug(`📝 Creating document ${index + 1}/${documents.length}:`, doc.title);
        return this.createDocument(doc);
      })
    );
    
    const duration = performance.now() - startTime;
    const avgTimePerDoc = duration / documents.length;
    
    console.debug(`✅ Bulk creation completed: ${documents.length} documents in ${duration.toFixed(2)}ms (${avgTimePerDoc.toFixed(2)}ms per doc)`);
    
    return results;
  }
  
  // ✅ Performance Monitoring (Internal clients can afford detailed monitoring)
  getPerformanceMetrics(): {
    cacheSize: number;
    cacheHitRate: number;
    totalCalls: number;
    averageResponseTime: number;
  } {
    // This is an example - you'd implement actual metrics tracking
    return {
      cacheSize: this.cache.size,
      cacheHitRate: 0.85, // Would track actual hit rate
      totalCalls: 0, // Would track actual calls
      averageResponseTime: 2.5 // Would track actual response times
    };
  }
  
  // Clear all caches (useful for development/testing)
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.debug(`🧹 Cleared ${size} items from cache`);
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
    documents.forEach((doc, index) => {
      try {
        this.validateCreateInput(doc);
      } catch (error) {
        throw new Error(`Document at index ${index}: ${error.message}`);
      }
    });
  }
  
  private buildSearchParams(input: SearchDocumentsInput): string {
    const params = new URLSearchParams();
    
    if (input.query) params.set('query', input.query);
    if (input.userId) params.set('userId', input.userId);
    if (input.status) params.set('status', input.status);
    if (input.tags && input.tags.length > 0) params.set('tags', input.tags.join(','));
    if (input.limit) params.set('limit', input.limit.toString());
    if (input.offset) params.set('offset', input.offset.toString());
    if (input.sortBy) params.set('sortBy', input.sortBy);
    if (input.sortOrder) params.set('sortOrder', input.sortOrder);
    
    return params.toString();
  }
  
  private createQueryKey(operation: string, params: any): string {
    // Create deterministic cache key
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as any);
    
    return `${operation}:${JSON.stringify(sortedParams)}`;
  }
  
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data as T;
    }
    
    // Remove expired entry
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }
  
  private setCache(key: string, data: any, ttl = 300000): void {
    // Limit cache size to prevent memory issues
    if (this.cache.size >= 1000) {
      // Remove oldest entries (simple LRU simulation)
      const keysToRemove = Array.from(this.cache.keys()).slice(0, 100);
      keysToRemove.forEach(k => this.cache.delete(k));
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
  
  private invalidateUserCache(userId: string): void {
    // Remove all cache entries related to this user
    const keysToRemove: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`userId=${userId}`) || key.includes(`"userId":"${userId}"`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.cache.delete(key));
    
    if (keysToRemove.length > 0) {
      console.debug(`🧹 Invalidated ${keysToRemove.length} cache entries for user:`, userId);
    }
  }
}

// ✅ Singleton Pattern - Recommended for Internal Clients
let documentInternalClientInstance: DocumentInternalClient | null = null;

export function getDocumentInternalClient(): DocumentInternalClient {
  if (!documentInternalClientInstance) {
    documentInternalClientInstance = new DocumentInternalClient();
  }
  return documentInternalClientInstance;
}

// ✅ Factory method for testing
export function createDocumentInternalClient(): DocumentInternalClient {
  return new DocumentInternalClient();
}