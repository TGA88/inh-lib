# Unified Internal Service และ Client (Mediator Pattern)

## ภาพรวม

Unified Internal Service และ Client ใช้สำหรับการสื่อสารข้าม services ภายใน domain เดียวกันโดยไม่ต้องผ่าน HTTP เป็นการใช้ Mediator Pattern ที่แยกความรับผิดชอบชัดเจน:

- **UnifiedInternalService**: จัดการ handlers และประมวลผล requests
- **UnifiedInternalClient**: เรียกใช้ services ผ่าน UnifiedInternalService

## ข้อดีของ Mediator Pattern

1. **Separation of Concerns**: แยกการจัดการ handlers กับการเรียกใช้
2. **Easy to Test**: สามารถ test แต่ละส่วนแยกกันได้
3. **Maintainable**: โค้ดชัดเจน เข้าใจง่าย ดูแลง่าย
4. **Type Safety**: TypeScript support เต็มรูปแบบ
5. **Better API**: Client มี convenience methods (get, post, put, delete)

## การใช้งาน

### 1. Basic Setup

```typescript
import { 
  UnifiedInternalService, 
  UnifiedInternalClient 
} from '@inh/unified-route';

// สร้าง Service (จัดการ handlers)
const service = new UnifiedInternalService({
  version: '1.0.0',
  serviceName: 'document-service'
});

// สร้าง Client (เรียกใช้ services)
const client = new UnifiedInternalClient(service);
```

### 2. Register Handlers

```typescript
import { UnifiedRouteHandler } from '@inh/unified-route';

// Handler สำหรับ GET /api/documents/:id
const getDocumentHandler: UnifiedRouteHandler = async (ctx) => {
  const { id } = ctx.request.params;
  
  const document = {
    id,
    title: `Document ${id}`,
    content: 'Lorem ipsum...',
    createdAt: new Date().toISOString()
  };

  ctx.response.json({ success: true, data: document });
};

// Handler สำหรับ POST /api/documents
const createDocumentHandler: UnifiedRouteHandler = async (ctx) => {
  const { title, content } = ctx.request.body;
  
  const newDocument = {
    id: `doc_${Date.now()}`,
    title: title as string,
    content: content as string,
    createdAt: new Date().toISOString()
  };

  ctx.response.status(201).json({ success: true, data: newDocument });
};

// ลงทะเบียน handlers
service.registerHandler('/api/documents/:id', getDocumentHandler);
service.registerHandler('/api/documents', createDocumentHandler);
```

### 3. Call Services ด้วย Client

```typescript
// GET request
const documentResult = await client.get<{
  success: boolean;
  data: { id: string; title: string; content: string; }
}>('/api/documents/:id', 
  { id: '123' }, 
  {
    userId: 'user-001',
    correlationId: 'req-123'
  }
);

console.log(documentResult.unwrap().data);

// POST request
const createResult = await client.post('/api/documents', 
  {
    title: 'New Document',
    content: 'Document content here...'
  },
  {
    userId: 'user-001',
    correlationId: 'req-124'
  }
);

console.log(createResult.unwrap().data);

// PUT request
const updateResult = await client.put('/api/documents/:id/update',
  { title: 'Updated Title' },
  { 
    params: { id: '123' },
    userId: 'user-001'
  }
);

// DELETE request
const deleteResult = await client.delete('/api/documents/:id',
  { id: '123' },
  { userId: 'user-001' }
);
```

### 4. Cross-Service Communication

```typescript
// Handler ที่เรียกใช้ services อื่น
const combinedHandler: UnifiedRouteHandler = async (ctx) => {
  const { documentId, processId } = ctx.request.params;
  
  // ดึง client จาก registry
  const internalClient = ctx.registry['internalClient'] as UnifiedInternalClient;
  
  try {
    // เรียกใช้ document service
    const documentResult = await internalClient.get('/api/documents/:id', 
      { id: documentId }
    );

    // เรียกใช้ process service
    const processResult = await internalClient.get('/api/processes/:id', 
      { id: processId }
    );

    // รวมข้อมูล
    ctx.response.json({
      success: true,
      data: {
        document: documentResult.unwrap().data,
        process: processResult.unwrap().data,
        combinedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    ctx.response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal error'
    });
  }
};

// Register handler พร้อม client ใน registry
service.registerHandler('/api/documents/:documentId/with-process/:processId', combinedHandler);

// เรียกใช้พร้อม client ใน registry
const result = await client.get('/api/documents/:documentId/with-process/:processId',
  { documentId: '123', processId: 'proc-456' },
  {
    registry: { internalClient: client },
    userId: 'user-001'
  }
);
```

### 5. Service Management

```typescript
// ตรวจสอบ handlers
console.log('Registered routes:', service.getRegisteredRoutes());
console.log('Has route:', service.hasHandler('/api/documents/:id'));

// ลบ handler
const removed = service.unregisterHandler('/api/documents/:id');
console.log('Handler removed:', removed);

// ตรวจสอบผ่าน client
console.log('Client has route:', client.hasRoute('/api/documents'));
```

## Error Handling

```typescript
import { UnifiedInternalError } from '@inh/unified-route';

try {
  const result = await client.get('/api/nonexistent');
  console.log(result.unwrap());
} catch (error) {
  if (error instanceof UnifiedInternalError) {
    console.error('Internal error:', error.message, error.code, error.data);
  } else {
    console.error('Unknown error:', error);
  }
}

// หรือตรวจสอบผ่าน result
const result = await client.get('/api/documents/:id', { id: '123' });
if (result.isSuccess()) {
  console.log('Success:', result.data);
} else {
  console.error('Failed:', result.statusCode, result.data);
}
```

## Type Safety

```typescript
// Define response types
interface DocumentResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  };
}

interface CreateDocumentRequest {
  title: string;
  content: string;
}

// Type-safe calls
const result = await client.get<DocumentResponse>('/api/documents/:id', { id: '123' });
const document = result.unwrap(); // Type is DocumentResponse

const createResult = await client.post<DocumentResponse>('/api/documents', {
  title: 'New Doc',
  content: 'Content...'
} satisfies CreateDocumentRequest);
```

## Best Practices

### 1. Service Registration Pattern

```typescript
export class DocumentInternalService {
  constructor(
    private service: UnifiedInternalService,
    private client: UnifiedInternalClient
  ) {}

  registerHandlers(): void {
    this.service.registerHandler('/api/documents/:id', this.getDocumentHandler.bind(this));
    this.service.registerHandler('/api/documents', this.createDocumentHandler.bind(this));
  }

  private getDocumentHandler: UnifiedRouteHandler = async (ctx) => {
    // Implementation...
  };

  private createDocumentHandler: UnifiedRouteHandler = async (ctx) => {
    // Implementation...
  };
}
```

### 2. Factory Pattern

```typescript
export function createDocumentService(): {
  service: UnifiedInternalService;
  client: UnifiedInternalClient;
} {
  const service = new UnifiedInternalService({
    serviceName: 'document-service',
    version: '1.0.0'
  });

  const client = new UnifiedInternalClient(service);
  
  const documentService = new DocumentInternalService(service, client);
  documentService.registerHandlers();

  return { service, client };
}
```

### 3. Dependency Injection

```typescript
export class ApplicationService {
  constructor(
    private documentClient: UnifiedInternalClient,
    private processClient: UnifiedInternalClient
  ) {}

  async getCombinedData(documentId: string, processId: string) {
    const [docResult, procResult] = await Promise.all([
      this.documentClient.get('/api/documents/:id', { id: documentId }),
      this.processClient.get('/api/processes/:id', { id: processId })
    ]);

    return {
      document: docResult.unwrap().data,
      process: procResult.unwrap().data
    };
  }
}
```

## Legacy Compatibility

สำหรับ backward compatibility, `UnifiedInternalAdapter` ยังคงใช้ได้:

```typescript
import { UnifiedInternalAdapter } from '@inh/unified-route';

// Legacy usage (deprecated แต่ยังใช้ได้)
const adapter = new UnifiedInternalAdapter();
adapter.registerHandler('/api/test', handler);
const result = await adapter.call({ route: '/api/test' });
```

แต่แนะนำให้เปลี่ยนไปใช้ `UnifiedInternalService` และ `UnifiedInternalClient` แทน เพื่อความชัดเจนและ maintainable ยิ่งขึ้น