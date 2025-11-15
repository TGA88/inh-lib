# Unified Internal Service System (Enterprise Architecture)

## ภาพรวม

Unified Internal Service System เป็น **Enterprise-level Architecture** ที่ออกแบบมาสำหรับการสื่อสารระหว่าง services ทั้งภายในและข้าม services โดยใช้ **Interface-based Design** ที่รองรับทั้ง **Internal calls** และ **HTTP calls** ผ่าน configuration เดียว

### 🏗️ **Architecture Layers**

1. **Interface Layer** (`IApiClient`) - Contract สำหรับ API communication
2. **Implementation Layer** - Internal, Axios, Fetch clients  
3. **Factory Layer** - Client creation และ dependency injection
4. **Service Layer** - Business logic และ handler registration
5. **Entry Point Layer** - Lambda handlers, Container services

### 🎯 **Key Benefits**

- **🔄 Deployment Flexibility**: เปลี่ยนจาก Monolith → Microservices ไม่ต้องแก้ business logic
- **🚀 Performance Optimized**: Internal calls สำหรับ same server, HTTP calls สำหรับ distributed
- **🔒 Type Safety**: Full TypeScript support ทุก layer
- **🧪 Testability**: Mock interfaces ได้ง่าย
- **📈 Scalable**: รองรับ Lambda, Container, Kubernetes deployment
- **🛡️ Future Proof**: เพิ่ม client implementations ใหม่ได้ไม่ต้องแก้โค้ดเก่า

## 🚀 **Quick Start Guide**

### 1. Interface-First Design (Recommended Pattern)

```typescript
// Step 1: Define API Contract
export interface IDocumentApiClient {
  getDocument(id: string): Promise<Document>;
  createDocument(input: CreateDocumentInput): Promise<Document>;
  updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  searchDocuments(input?: SearchDocumentsInput): Promise<Document[]>;
  getMetadata(id: string): Promise<DocumentMetadata>;
}

// Step 2: Configure Client at Entry Point
import { createDocumentClient } from '@inh/api-service/document-api';

// Internal deployment (Same server)
const documentClient = createDocumentClient({
  type: 'internal'
});

// Distributed deployment (Different servers)  
const documentClient = createDocumentClient({
  type: 'axios',
  http: {
    baseURL: 'https://document-service.example.com',
    auth: { apiKey: process.env.DOCUMENT_API_KEY }
  }
});

// Step 3: Use Same Interface Everywhere
const document = await documentClient.getDocument('doc-123');
const documents = await documentClient.searchDocuments({ userId: 'user-123' });
```

### 2. Basic UnifiedInternalService Setup

```typescript
import { 
  UnifiedInternalService, 
  UnifiedInternalClient 
} from '@inh/unified-route';

// สร้าง Service (จัดการ handlers)
const service = new UnifiedInternalService();

// สร้าง Client (เรียกใช้ services)
const client = new UnifiedInternalClient(service);
```

### 3. API-Specific Client Implementation

```typescript
// libs/api-service/document-api/document.client.ts
import { UnifiedRouteHandler } from '@inh/unified-route';

// Business Logic Handlers (Reusable)
export const getDocumentHandler: UnifiedRouteHandler = async (ctx) => {
  const { id } = ctx.request.params;
  
  // Business logic here...
  const document = await documentRepository.findById(id);
  
  if (!document) {
    ctx.response.status(404).json({ error: 'Document not found' });
    return;
  }

  ctx.response.json(document);
};

export const createDocumentHandler: UnifiedRouteHandler = async (ctx) => {
  const { title, content, author } = ctx.request.body;
  
  const newDocument = await documentRepository.create({
    title,
    content, 
    author,
    createdAt: new Date()
  });

  ctx.response.status(201).json(newDocument);
};

// Type-Safe Client Implementation
export class DocumentInternalClient implements IDocumentApiClient {
  private client: UnifiedInternalClient;
  
  constructor() {
    const service = getDocumentInternalService();
    this.client = new UnifiedInternalClient(service);
  }
  
  async getDocument(id: string): Promise<Document> {
    if (!id) throw new Error('Document ID is required');
    return this.client.get(`/api/documents/${id}`);
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    this.validateInput(input);
    return this.client.post('/api/documents', input);
  }
  
  async searchDocuments(input: SearchDocumentsInput = {}): Promise<Document[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    
    return this.client.get(`/api/documents/search?${params}`);
  }
  
  private validateInput(input: CreateDocumentInput): void {
    if (!input.title?.trim()) throw new Error('Title is required');
    if (!input.content?.trim()) throw new Error('Content is required');
  }
}
```

### 4. Service Registration Pattern

```typescript
// libs/api-service/document-api/document-internal.service.ts
import { createApiInternalService } from '../shared/create-api-internal-service';
import * as handlers from './handlers';

const DOCUMENT_ROUTES = {
  'GET /api/documents/:id': 'getDocumentHandler',
  'POST /api/documents': 'createDocumentHandler', 
  'PUT /api/documents/:id': 'updateDocumentHandler',
  'DELETE /api/documents/:id': 'deleteDocumentHandler',
  'GET /api/documents/search': 'searchDocumentsHandler',
  'GET /api/documents/:id/metadata': 'getMetadataHandler',
  'POST /api/documents/:id/publish': 'publishDocumentHandler',
} as const;

const documentInternalService = createApiInternalService(
  'document-api',
  handlers,
  DOCUMENT_ROUTES
);

export const getDocumentInternalService = documentInternalService.getService;
export const getDocumentInternalClient = documentInternalService.getClient;
```

## 🎯 **Usage Patterns**

### 1. Lambda Function (1 Function = 1 API)

```typescript
// lambda/document-api/handler.ts
import { getDocumentInternalService } from '@inh/api-service/document-api';
import { createContextFromEvent } from '@inh/unified-route/lambda-utils';

// Singleton service instance (outside handler for container reuse)
const documentService = getDocumentInternalService();

export const handler = async (event: APIGatewayEvent) => {
  try {
    const route = `${event.httpMethod} ${event.path}`;
    const context = createContextFromEvent(event);
    
    // Direct call for optimal performance
    const result = await documentService.call(route, context);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### 2. Cross-Service Communication

```typescript
// ใน user-api เรียก document-api และ process-setting-api
import { getDocumentClient, getUserClient, getProcessSettingClient } from '@inh/api-service';

export const getUserProfileHandler: UnifiedRouteHandler = async (ctx) => {
  const userId = ctx.request.params.id;
  
  // ใช้ Interface - ไม่สนใจ implementation (Internal vs HTTP)
  const documentClient = getDocumentClient();
  const userClient = getUserClient();
  const processClient = getProcessSettingClient();
  
  try {
    // Parallel calls
    const [user, documents, settings] = await Promise.all([
      userClient.getUser(userId),
      documentClient.searchDocuments({ userId, limit: 10 }),
      processClient.getUserSettings(userId)
    ]);
    
    ctx.response.json({
      ...user,
      recentDocuments: documents,
      settings,
      profileCompleteness: calculateCompleteness(user, documents)
    });
    
  } catch (error) {
    ctx.response.status(500).json({ error: error.message });
  }
};
```

### 3. Container Deployment (All Services in One)

```typescript
// apps/monolith-service/src/main.ts
import { InternalClientFactory } from '@inh/api-service/shared';

async function startMonolithService() {
  // Configure all clients as Internal
  const clients = InternalClientFactory.createAllClients({
    document: { type: 'internal' },
    user: { type: 'internal' },
    processSetting: { type: 'internal' }
  });
  
  // Register with DI container
  container.register('clients', clients);
  
  // Start HTTP server with all APIs
  const app = fastify();
  app.register(documentApiRoutes);
  app.register(userApiRoutes);
  app.register(processSettingApiRoutes);
  
  await app.listen({ port: 3000 });
  console.log('Monolith service started on port 3000');
}
```

### 4. Microservices Deployment

```typescript
// apps/user-service/src/main.ts (Only User API)
async function startUserService() {
  // Configure clients: User=Internal, Others=HTTP
  const clients = InternalClientFactory.createAllClients({
    user: { type: 'internal' },
    document: { 
      type: 'axios',
      http: {
        baseURL: process.env.DOCUMENT_SERVICE_URL!,
        auth: { apiKey: process.env.DOCUMENT_API_KEY }
      }
    },
    processSetting: {
      type: 'fetch', 
      http: {
        baseURL: process.env.PROCESS_SERVICE_URL!,
        auth: { token: process.env.PROCESS_TOKEN }
      }
    }
  });
  
  container.register('clients', clients);
  
  // Start only User API
  const app = fastify();
  app.register(userApiRoutes);
  
  await app.listen({ port: 3001 });
  console.log('User service started on port 3001');
}
```

## 🏭 **Configuration & Factory Patterns**

### 1. Environment-Based Configuration

```typescript
// libs/api-service/shared/client-config.ts
export function createServiceClientConfig(): ServiceClientConfig {
  const deploymentMode = process.env.DEPLOYMENT_MODE || 'monolith';
  
  switch (deploymentMode) {
    case 'monolith':
    case 'container':
      return {
        document: { type: 'internal' },
        user: { type: 'internal' },
        processSetting: { type: 'internal' }
      };
      
    case 'microservices':
      return {
        document: {
          type: 'axios',
          http: {
            baseURL: process.env.DOCUMENT_SERVICE_URL!,
            auth: { apiKey: process.env.DOCUMENT_API_KEY }
          }
        },
        user: {
          type: 'axios', 
          http: {
            baseURL: process.env.USER_SERVICE_URL!,
            auth: { apiKey: process.env.USER_API_KEY }
          }
        },
        processSetting: {
          type: 'fetch',
          http: {
            baseURL: process.env.PROCESS_SETTING_SERVICE_URL!,
            timeout: 10000,
            auth: { token: process.env.PROCESS_SETTING_TOKEN }
          }
        }
      };
      
    case 'lambda':
      // Per-function configuration
      return {
        document: { type: 'internal' }, // Same Lambda
        user: { 
          type: 'axios',
          http: { baseURL: 'https://user-lambda.aws.com' }
        },
        processSetting: { 
          type: 'fetch',
          http: { baseURL: 'https://process-lambda.aws.com' }
        }
      };
      
    default:
      throw new Error(`Unknown deployment mode: ${deploymentMode}`);
  }
}
```

### 2. Client Factory with Dependency Injection

```typescript
// libs/api-service/shared/client-factory.ts
export class InternalClientFactory {
  private static instances = new Map<string, any>();
  
  static createAllClients(config: ServiceClientConfig): {
    document: IDocumentApiClient;
    user: IUserApiClient;  
    processSetting: IProcessSettingApiClient;
  } {
    return {
      document: this.createDocumentClient(config.document),
      user: this.createUserClient(config.user),
      processSetting: this.createProcessSettingClient(config.processSetting)
    };
  }
  
  static createDocumentClient(config: DocumentClientConfig): IDocumentApiClient {
    const key = `document-${JSON.stringify(config)}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, DocumentClientFactory.create(config));
    }
    return this.instances.get(key);
  }
  
  // Lazy initialization for Lambda
  static lazy = {
    document(): IDocumentApiClient {
      return this.createDocumentClient({ type: 'internal' });
    },
    
    user(httpConfig?: HttpClientConfig): IUserApiClient {
      const config = httpConfig 
        ? { type: 'axios' as const, http: httpConfig }
        : { type: 'internal' as const };
      return this.createUserClient(config);
    }
  };
}
```

### 3. Selective Registration (Performance Optimization)

```typescript
// libs/api-service/document-api/document-registry.ts
export interface DocumentRegistryOptions {
  endpoints?: Array<'get' | 'create' | 'update' | 'delete' | 'search' | 'metadata'>;
  readOnly?: boolean;
  features?: Array<'analytics' | 'versioning' | 'publishing'>;
}

export function registerDocumentHandlers(
  service: UnifiedInternalService,
  options: DocumentRegistryOptions = {}
): void {
  const { 
    endpoints = ['get', 'create', 'update', 'delete', 'search'],
    readOnly = false,
    features = []
  } = options;
  
  // Core endpoints
  if (endpoints.includes('get')) {
    service.registerHandler('GET /api/documents/:id', getDocumentHandler);
  }
  
  if (endpoints.includes('search')) {
    service.registerHandler('GET /api/documents/search', searchDocumentsHandler);
  }
  
  // Write operations (skip if readOnly)
  if (!readOnly) {
    if (endpoints.includes('create')) {
      service.registerHandler('POST /api/documents', createDocumentHandler);
    }
    if (endpoints.includes('update')) {
      service.registerHandler('PUT /api/documents/:id', updateDocumentHandler);
    }
    if (endpoints.includes('delete')) {
      service.registerHandler('DELETE /api/documents/:id', deleteDocumentHandler);
    }
  }
  
  // Optional features
  if (features.includes('analytics')) {
    service.registerHandler('GET /api/documents/:id/analytics', getAnalyticsHandler);
  }
  
  if (features.includes('versioning')) {
    service.registerHandler('GET /api/documents/:id/versions', getVersionsHandler);
  }
  
  if (features.includes('publishing')) {
    service.registerHandler('POST /api/documents/:id/publish', publishHandler);
  }
}

// Usage in Lambda (minimal registration)
const service = new UnifiedInternalService();
registerDocumentHandlers(service, {
  endpoints: ['get'], // เฉพาะ GET
  readOnly: true,     // ไม่มี write operations
  features: []        // ไม่มี advanced features
});
```

## 🔧 **Development & Testing**

### 1. Type-Safe Development

```typescript
// Define types for better DX
export interface Document {
  id: string;
  title: string;
  content: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  metadata: DocumentMetadata;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  author: string;
  tags?: string[];
}

// Type-safe client usage
const documentClient: IDocumentApiClient = getDocumentClient();

// TypeScript จะ validate input/output
const document = await documentClient.getDocument('doc-123'); // Returns Document
const newDoc = await documentClient.createDocument({
  title: 'New Document',
  content: 'Content here...',
  author: 'john@example.com'
} satisfies CreateDocumentInput); // Compile-time validation
```

### 2. Testing Strategy

```typescript
// Mock interface for testing
class MockDocumentClient implements IDocumentApiClient {
  private mockDocuments = new Map<string, Document>();
  
  async getDocument(id: string): Promise<Document> {
    const doc = this.mockDocuments.get(id);
    if (!doc) throw new Error('Document not found');
    return doc;
  }
  
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const doc: Document = {
      id: `mock-${Date.now()}`,
      ...input,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: input.tags || [],
      metadata: {}
    };
    this.mockDocuments.set(doc.id, doc);
    return doc;
  }
  
  // ... other methods
}

// Test example
describe('UserProfileHandler', () => {
  let mockDocumentClient: MockDocumentClient;
  
  beforeEach(() => {
    mockDocumentClient = new MockDocumentClient();
    
    // Override factory to return mock
    jest.spyOn(ClientFactory, 'getDocumentClient')
        .mockReturnValue(mockDocumentClient);
  });
  
  test('should get user profile with documents', async () => {
    // Setup mock data
    await mockDocumentClient.createDocument({
      title: 'Test Doc',
      content: 'Content',
      author: 'user-123'
    });
    
    const ctx = createMockContext({ params: { id: 'user-123' } });
    await getUserProfileHandler(ctx);
    
    expect(ctx.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        recentDocuments: expect.arrayContaining([
          expect.objectContaining({ title: 'Test Doc' })
        ])
      })
    );
  });
});
```

### 3. Performance Monitoring

```typescript
// Add monitoring to clients
export class DocumentInternalClient implements IDocumentApiClient {
  private metrics = {
    calls: 0,
    errors: 0,
    totalTime: 0
  };
  
  async getDocument(id: string): Promise<Document> {
    const startTime = Date.now();
    this.metrics.calls++;
    
    try {
      const result = await this.client.get(`/api/documents/${id}`);
      this.metrics.totalTime += Date.now() - startTime;
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      avgTime: this.metrics.calls > 0 ? this.metrics.totalTime / this.metrics.calls : 0,
      errorRate: this.metrics.calls > 0 ? this.metrics.errors / this.metrics.calls : 0
    };
  }
}
```

## 🚦 **Error Handling & Monitoring**

### 1. Graceful Error Handling

```typescript
// Client-level error handling
export class DocumentAxiosClient implements IDocumentApiClient {
  async getDocument(id: string): Promise<Document> {
    try {
      return await this.client.get(`/api/documents/${id}`);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new DocumentNotFoundError(`Document ${id} not found`);
      }
      if (error.response?.status === 403) {
        throw new DocumentAccessDeniedError(`Access denied to document ${id}`);
      }
      throw new DocumentServiceError('Failed to get document', error);
    }
  }
}

// Application-level error handling
export const getDocumentWithFallback = async (
  documentClient: IDocumentApiClient,
  id: string
): Promise<Document | null> => {
  try {
    return await documentClient.getDocument(id);
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      console.warn(`Document ${id} not found, returning null`);
      return null;
    }
    
    // Log error and rethrow for critical issues
    logger.error('Failed to get document', { id, error: error.message });
    throw error;
  }
};
```

### 2. Circuit Breaker Pattern

```typescript
// libs/api-service/shared/circuit-breaker-client.ts
export class CircuitBreakerClient<T extends IApiClient> implements IApiClient {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private client: T,
    private threshold = 5,
    private timeout = 60000
  ) {}
  
  async getDocument(id: string): Promise<Document> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await this.client.getDocument(id);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 3. Request Tracing & Correlation

```typescript
// Enhanced context with tracing
export interface TracedApiCall {
  correlationId: string;
  traceId: string;
  spanId: string;
  userId?: string;
  requestId: string;
}

export class TracedDocumentClient implements IDocumentApiClient {
  constructor(
    private client: IDocumentApiClient,
    private tracer: Tracer
  ) {}
  
  async getDocument(id: string, context?: TracedApiCall): Promise<Document> {
    const span = this.tracer.startSpan('document.getDocument', {
      tags: {
        documentId: id,
        correlationId: context?.correlationId,
        userId: context?.userId
      }
    });
    
    try {
      const result = await this.client.getDocument(id);
      span.setTag('status', 'success');
      return result;
    } catch (error) {
      span.setTag('status', 'error');
      span.setTag('error', error.message);
      throw error;
    } finally {
      span.finish();
    }
  }
}
```

## 📋 **Best Practices & Guidelines**

### 1. Deployment Decision Matrix

| Scenario | Recommended Pattern | Configuration | Benefits |
|----------|-------------------|---------------|----------|
| **Development** | Monolith + Internal | All `type: 'internal'` | Fast iteration, easy debugging |
| **Lambda Single Function** | 1 API per Lambda | Minimal registration | Optimal cold start |
| **Lambda Multi-Function** | Grouped endpoints | Strategic grouping | Balance performance/cost |
| **Container Monolith** | All Internal | All `type: 'internal'` | High performance, shared resources |
| **Microservices** | Mixed Internal/HTTP | Per-service configuration | Independent scaling |
| **Hybrid Cloud** | HTTP with fallback | Circuit breaker pattern | Resilience, flexibility |

### 2. Performance Optimization Guidelines

```typescript
// ✅ DO: Lazy initialization for Lambda
let documentClient: IDocumentApiClient | null = null;

export function getDocumentClient(): IDocumentApiClient {
  if (!documentClient) {
    documentClient = DocumentClientFactory.create({
      type: process.env.NODE_ENV === 'production' ? 'axios' : 'internal',
      http: process.env.DOCUMENT_SERVICE_URL ? {
        baseURL: process.env.DOCUMENT_SERVICE_URL,
        timeout: 5000
      } : undefined
    });
  }
  return documentClient;
}

// ✅ DO: Selective endpoint registration for Lambda
export function createLambdaOptimizedService(endpoints: string[]): UnifiedInternalService {
  const service = new UnifiedInternalService();
  
  // Register only required endpoints
  endpoints.forEach(endpoint => {
    if (HANDLER_MAP.has(endpoint)) {
      service.registerHandler(endpoint, HANDLER_MAP.get(endpoint)!);
    }
  });
  
  return service;
}

// ❌ DON'T: Register all endpoints in Lambda
const service = new UnifiedInternalService();
registerAllDocumentHandlers(service); // Bloats Lambda bundle
```

### 3. Error Resilience Patterns

```typescript
// ✅ DO: Implement retry with exponential backoff
export class ResilientDocumentClient implements IDocumentApiClient {
  constructor(
    private client: IDocumentApiClient,
    private maxRetries = 3,
    private baseDelay = 1000
  ) {}
  
  async getDocument(id: string): Promise<Document> {
    return this.withRetry(
      () => this.client.getDocument(id),
      (error) => error.status >= 500 // Retry on server errors
    );
  }
  
  private async withRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean
  ): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === this.maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

### 4. Configuration Management

```typescript
// ✅ DO: Environment-driven configuration
export interface DeploymentConfig {
  mode: 'monolith' | 'microservices' | 'lambda' | 'hybrid';
  services: {
    [key: string]: {
      type: 'internal' | 'axios' | 'fetch';
      endpoint?: string;
      timeout?: number;
      retries?: number;
    };
  };
}

export function loadConfig(): DeploymentConfig {
  const mode = process.env.DEPLOYMENT_MODE as DeploymentConfig['mode'] || 'monolith';
  
  return {
    mode,
    services: {
      document: {
        type: mode === 'monolith' ? 'internal' : 'axios',
        endpoint: process.env.DOCUMENT_SERVICE_URL,
        timeout: parseInt(process.env.DOCUMENT_TIMEOUT || '5000'),
        retries: parseInt(process.env.DOCUMENT_RETRIES || '3')
      },
      // ... other services
    }
  };
}
```

## 🔄 **Migration & Deployment Guide**

### 1. Migration Path: Monolith → Microservices

```typescript
// Phase 1: Monolith with Interface preparation
const clients = InternalClientFactory.createAllClients({
  document: { type: 'internal' },
  user: { type: 'internal' },
  processSetting: { type: 'internal' }
});

// Phase 2: Extract one service (e.g., Document Service)
const clients = InternalClientFactory.createAllClients({
  document: { 
    type: 'axios',
    http: { baseURL: 'http://document-service:3000' }
  },
  user: { type: 'internal' },
  processSetting: { type: 'internal' }
});

// Phase 3: Full microservices
const clients = InternalClientFactory.createAllClients({
  document: { type: 'axios', http: { baseURL: 'http://document-service:3000' } },
  user: { type: 'axios', http: { baseURL: 'http://user-service:3001' } },
  processSetting: { type: 'fetch', http: { baseURL: 'http://process-service:3002' } }
});
```

### 2. Lambda Deployment Strategy

```typescript
// Strategy A: One Lambda per API (10 endpoints)
// λ document-api: All document endpoints (recommended for related operations)
export const documentApiHandler = createLambdaHandler({
  service: 'document',
  endpoints: 'all'
});

// Strategy B: One Lambda per endpoint (for heavy operations)
// λ document-create: Only creation endpoint
export const documentCreateHandler = createLambdaHandler({
  service: 'document', 
  endpoints: ['POST /api/documents']
});

// Strategy C: Grouped by usage pattern
// λ document-read: All read operations
export const documentReadHandler = createLambdaHandler({
  service: 'document',
  endpoints: [
    'GET /api/documents/:id',
    'GET /api/documents/search',
    'GET /api/documents/:id/metadata'
  ]
});
```

### 3. Containerized Deployment (Docker/Kubernetes)

```yaml
# docker-compose.yml
services:
  monolith:
    image: my-app:monolith
    environment:
      - DEPLOYMENT_MODE=monolith
      - NODE_ENV=production
    ports:
      - "3000:3000"

  document-service:
    image: my-app:document-service  
    environment:
      - DEPLOYMENT_MODE=microservices
      - SERVICE_NAME=document
    ports:
      - "3001:3000"

  user-service:
    image: my-app:user-service
    environment:
      - DEPLOYMENT_MODE=microservices
      - SERVICE_NAME=user
      - DOCUMENT_SERVICE_URL=http://document-service:3000
    ports:
      - "3002:3000"
```

## 🔧 **Development Workflow**

### 1. Local Development Setup

```bash
# Install dependencies
npm install @inh/unified-route @inh/api-service

# Start development environment
DEPLOYMENT_MODE=monolith npm run dev

# Test with different modes
DEPLOYMENT_MODE=microservices npm run dev
DEPLOYMENT_MODE=lambda npm run dev
```

### 2. Testing Strategy

```typescript
// Unit tests: Mock interfaces
describe('DocumentService', () => {
  let mockDocumentClient: jest.Mocked<IDocumentApiClient>;
  
  beforeEach(() => {
    mockDocumentClient = createMockDocumentClient();
    DocumentClientFactory.setInstance(mockDocumentClient);
  });
});

// Integration tests: Use real internal clients
describe('DocumentAPI Integration', () => {
  let documentService: UnifiedInternalService;
  
  beforeEach(() => {
    documentService = createDocumentService();
  });
});

// E2E tests: Test different deployment modes
describe('E2E Deployment Modes', () => {
  test('monolith mode', async () => {
    process.env.DEPLOYMENT_MODE = 'monolith';
    // Test full workflow
  });
  
  test('microservices mode', async () => {
    process.env.DEPLOYMENT_MODE = 'microservices';
    // Test with HTTP calls
  });
});
```

## 📚 **Reference Links**

- [UnifiedInternalService API Reference](./unified-internal.service.ts)
- [Client Interface Definitions](./interfaces/)
- [Example Implementations](./examples/)
- [Migration Guide](./MIGRATION.md)
- [Performance Benchmarks](./BENCHMARKS.md)

## 🆘 **Troubleshooting**

### Common Issues

1. **Cold Start Performance**: Use selective endpoint registration
2. **Network Timeouts**: Configure retry policies and circuit breakers  
3. **Type Mismatches**: Ensure interface consistency across implementations
4. **Memory Usage**: Monitor client instance creation and reuse singletons
5. **CORS Issues**: Configure proper headers in HTTP client implementations

### Debug Mode

```typescript
// Enable debug logging
process.env.UNIFIED_SERVICE_DEBUG = 'true';

// Monitor performance
const client = getDocumentClient();
console.log('Client metrics:', client.getMetrics());
```