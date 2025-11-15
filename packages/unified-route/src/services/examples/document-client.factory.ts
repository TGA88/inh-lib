// Example: Complete Client Factory Implementation
// libs/api-service/document-api/document-client.factory.ts

import type { IDocumentApiClient, ClientConfig, HttpClientConfig } from './interfaces';
import { DocumentInternalClient } from './clients/document-internal.client';
import { DocumentAxiosClient } from './clients/document-axios.client';
import { DocumentFetchClient } from './clients/document-fetch.client';

/**
 * 🏭 DocumentClientFactory - Smart Client Selection & Creation
 * 
 * This factory implements the Strategy Pattern, allowing you to:
 * - Switch between client implementations without code changes
 * - Configure clients based on environment
 * - Implement client caching and reuse
 * - Auto-detect the best client for current runtime
 * 
 * 🎯 Key Benefits:
 * - 🔄 Seamless migration from monolith to microservices
 * - 🎯 Environment-specific optimization
 * - 🧪 Easy testing with different implementations
 * - 📈 Performance tuning per deployment scenario
 */
export class DocumentClientFactory {
  private static readonly instances = new Map<string, IDocumentApiClient>();
  
  /**
   * Create a document client based on configuration
   */
  static create(config: ClientConfig): IDocumentApiClient {
    // Use configuration as cache key
    const cacheKey = this.createCacheKey(config);
    
    // Return cached instance if exists
    const cached = this.instances.get(cacheKey);
    if (cached) {
      console.debug('📋 Returning cached DocumentClient:', config.type);
      return cached;
    }
    
    // Create new client instance
    const client = this.createClient(config);
    this.instances.set(cacheKey, client);
    
    console.log(`✨ Created new DocumentClient: ${config.type} (${config.http?.baseURL || 'internal'})`);
    return client;
  }
  
  private static createClient(config: ClientConfig): IDocumentApiClient {
    switch (config.type) {
      case 'internal':
        return new DocumentInternalClient();
        
      case 'axios':
        if (!config.http) {
          throw new Error('HTTP configuration required for axios client');
        }
        return new DocumentAxiosClient(config.http);
        
      case 'fetch':
        if (!config.http) {
          throw new Error('HTTP configuration required for fetch client');
        }
        return new DocumentFetchClient(config.http);
        
      default:
        throw new Error(`Unsupported client type: ${(config as ClientConfig).type}`);
    }
  }
  
  /**
   * 🎯 Convenience Methods for Common Scenarios
   */
  
  // For monolith/container deployments
  static createInternal(): IDocumentApiClient {
    return this.create({ type: 'internal' });
  }
  
  // For microservices (Node.js environments)
  static createMicroservice(
    baseURL: string, 
    options: {
      auth?: { apiKey?: string; token?: string };
      timeout?: number;
      retries?: number;
    } = {}
  ): IDocumentApiClient {
    return this.create({
      type: 'axios',
      http: {
        baseURL,
        timeout: options.timeout || 10000,
        retries: options.retries || 3,
        auth: options.auth || {}
      }
    });
  }
  
  // For browser/edge environments
  static createBrowser(
    baseURL: string,
    options: {
      auth?: { apiKey?: string; token?: string };
      timeout?: number;
    } = {}
  ): IDocumentApiClient {
    return this.create({
      type: 'fetch',
      http: {
        baseURL,
        timeout: options.timeout || 15000,
        retries: 2, // Lower retries for browser
        auth: options.auth || {}
      }
    });
  }
  
  /**
   * 🤖 Auto-Detection Based on Environment
   */
  static createAuto(httpConfig?: HttpClientConfig): IDocumentApiClient {
    // If no HTTP config provided, assume internal
    if (!httpConfig) {
      console.log('🤖 Auto-detected: Internal client (no HTTP config)');
      return this.createInternal();
    }
    
    // Detect runtime environment
    const environment = this.detectEnvironment();
    
    switch (environment) {
      case 'browser':
        console.log('🤖 Auto-detected: Browser environment → Fetch client');
        return this.create({ type: 'fetch', http: httpConfig });
        
      case 'node':
        console.log('🤖 Auto-detected: Node.js environment → Axios client');
        return this.create({ type: 'axios', http: httpConfig });
        
      case 'edge':
        console.log('🤖 Auto-detected: Edge environment → Fetch client');
        return this.create({ type: 'fetch', http: httpConfig });
        
      default:
        console.log('🤖 Auto-detected: Unknown environment → Fetch client (fallback)');
        return this.create({ type: 'fetch', http: httpConfig });
    }
  }
  
  /**
   * 📊 Environment-Based Configuration
   */
  static createFromEnvironment(): IDocumentApiClient {
    const deploymentMode = process.env.DEPLOYMENT_MODE;
    const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL;
    const apiKey = process.env.DOCUMENT_API_KEY;
    const token = process.env.DOCUMENT_TOKEN;
    
    console.log(`🌍 Creating client for deployment mode: ${deploymentMode || 'auto'}`);
    
    switch (deploymentMode) {
      case 'monolith':
      case 'container':
        return this.createInternal();
        
      case 'microservices':
      case 'lambda':
        if (!documentServiceUrl) {
          throw new Error('DOCUMENT_SERVICE_URL required for microservices deployment');
        }
        
        return this.createMicroservice(documentServiceUrl, {
          auth: { apiKey, token }
        });
        
      case 'edge':
      case 'browser':
        if (!documentServiceUrl) {
          throw new Error('DOCUMENT_SERVICE_URL required for edge deployment');
        }
        
        return this.createBrowser(documentServiceUrl, {
          auth: { apiKey, token }
        });
        
      default:
        // Auto-detect based on available configuration
        if (!documentServiceUrl) {
          return this.createInternal();
        }
        
        return this.createAuto({
          baseURL: documentServiceUrl,
          auth: { apiKey, token }
        });
    }
  }
  
  /**
   * 🧪 Testing Utilities
   */
  static createMock(): IDocumentApiClient {
    // Return a mock implementation for testing
    return {
      async getDocument(id: string) {
        return {
          id,
          title: `Mock Document ${id}`,
          content: 'Mock content',
          author: 'mock-author',
          status: 'draft' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['mock']
        };
      },
      
      async createDocument(input) {
        return {
          id: `mock-${Date.now()}`,
          ...input,
          status: 'draft' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: input.tags || []
        };
      },
      
      async updateDocument(id, updates) {
        return {
          id,
          title: updates.title || `Mock Document ${id}`,
          content: updates.content || 'Mock content',
          author: updates.author || 'mock-author',
          status: 'draft' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: updates.tags || []
        };
      },
      
      async deleteDocument() {
        // Mock implementation - no action needed
      },
      
      async searchDocuments() {
        return [];
      },
      
      async getDocumentsByUser() {
        return [];
      },
      
      async getMetadata(id) {
        return {
          wordCount: 100,
          readingTime: 1,
          lastModifiedBy: 'mock-user',
          version: 1,
          checksum: `mock-checksum-${id}`
        };
      },
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async getAnalytics(_id: string) {
        return {
          views: 10,
          downloads: 5,
          shares: 2,
          avgRating: 4.5,
          lastAccessed: new Date(),
          topReferrers: ['mock-referrer']
        };
      },
      
      async publishDocument(id) {
        return {
          id,
          title: `Mock Document ${id}`,
          content: 'Mock content',
          author: 'mock-author',
          status: 'published' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: []
        };
      },
      
      async archiveDocument() {
        // Mock implementation - no action needed
      },
      
      async getDocumentWithMetadata(id) {
        const document = await this.getDocument(id);
        const metadata = await this.getMetadata(id);
        return { ...document, metadata };
      },
      
      async bulkCreateDocuments(documents) {
        return documents.map((doc, index) => ({
          id: `mock-bulk-${index}`,
          ...doc,
          status: 'draft' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: doc.tags || []
        }));
      }
    };
  }
  
  /**
   * 🔧 Management Methods
   */
  static clearCache(): void {
    const size = this.instances.size;
    this.instances.clear();
    console.log(`🧹 Cleared ${size} cached client instances`);
  }
  
  static getCacheStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.instances.size,
      keys: Array.from(this.instances.keys())
    };
  }
  
  /**
   * 🔍 Private Utilities
   */
  private static detectEnvironment(): 'browser' | 'node' | 'edge' | 'unknown' {
    // Browser environment
    if (typeof globalThis.window !== 'undefined' && typeof document !== 'undefined') {
      return 'browser';
    }
    
    // Node.js environment
    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'node';
    }
    
    // Edge runtime (has global fetch but no window/process)
    if (typeof fetch !== 'undefined' && typeof globalThis.window === 'undefined') {
      return 'edge';
    }
    
    return 'unknown';
  }
  
  private static createCacheKey(config: ClientConfig): string {
    // Create deterministic cache key from configuration
    const keyObject = {
      type: config.type,
      baseURL: config.http?.baseURL,
      timeout: config.http?.timeout,
      retries: config.http?.retries,
      hasAuth: !!(config.http?.auth?.apiKey || config.http?.auth?.token)
    };
    
    return JSON.stringify(keyObject);
  }
}

/**
 * 🚀 Convenient Export Functions
 */

// Simple factory functions for common use cases
export const createDocumentClient = {
  
  // Internal (same process)
  internal: (): IDocumentApiClient => 
    DocumentClientFactory.createInternal(),
  
  // HTTP-based (different services)
  microservice: (baseURL: string, auth?: { apiKey?: string; token?: string }): IDocumentApiClient =>
    DocumentClientFactory.createMicroservice(baseURL, { auth }),
  
  // Browser-optimized
  browser: (baseURL: string, auth?: { apiKey?: string; token?: string }): IDocumentApiClient =>
    DocumentClientFactory.createBrowser(baseURL, { auth }),
  
  // Auto-detection
  auto: (baseURL?: string, auth?: { apiKey?: string; token?: string }): IDocumentApiClient => {
    if (!baseURL) {
      return DocumentClientFactory.createInternal();
    }
    return DocumentClientFactory.createAuto({ baseURL, auth: auth || {} });
  },
  
  // Environment-based
  fromEnvironment: (): IDocumentApiClient =>
    DocumentClientFactory.createFromEnvironment(),
  
  // Testing
  mock: (): IDocumentApiClient =>
    DocumentClientFactory.createMock()
};

/**
 * 📋 Usage Examples:
 * 
 * // Monolith deployment
 * const client = createDocumentClient.internal();
 * 
 * // Microservices deployment
 * const client = createDocumentClient.microservice(
 *   'https://document-service.example.com',
 *   { apiKey: 'your-api-key' }
 * );
 * 
 * // Browser application
 * const client = createDocumentClient.browser(
 *   'https://api.example.com',
 *   { token: userSession.token }
 * );
 * 
 * // Auto-detection
 * const client = createDocumentClient.auto(
 *   process.env.DOCUMENT_SERVICE_URL,
 *   { apiKey: process.env.API_KEY }
 * );
 * 
 * // Environment-based
 * const client = createDocumentClient.fromEnvironment();
 * 
 * // Testing
 * const client = createDocumentClient.mock();
 */

export { DocumentClientFactory };