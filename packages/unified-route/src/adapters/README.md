# UnifiedInternalClient Adapter

Adapter ที่แปลง `UnifiedInternalClient` ให้ทำงานเป็น `InhHttpClient` มาตรฐาน

## 🎯 วัตถุประสงค์

- **Unified Interface**: ใช้ `InhHttpClient` interface เดียวกันทั้งสำหรับ internal calls และ external HTTP calls
- **Backward Compatible**: ไม่กระทบ code ที่มีอยู่
- **Flexible**: เลือกใช้ได้ตามความต้องการ

## 🚀 การใช้งาน

### Basic Usage

```typescript
import { 
  UnifiedInternalService, 
  UnifiedInternalClient,
  UnifiedInternalClientAdapter 
} from '@inh-lib/unified-route';
import { InhHttpClient } from '@inh-lib/common';

// สร้าง internal service และ client
const service = new UnifiedInternalService();
const internalClient = new UnifiedInternalClient(service);

// แปลงเป็น InhHttpClient
const httpClient: InhHttpClient = new UnifiedInternalClientAdapter(internalClient, {
  userId: 'user-123',
  correlationId: 'req-456',
  registry: { 
    dbConnection: dbConn,
    config: appConfig 
  }
});

// ใช้งานเหมือน InhHttpClient ทั่วไป
const users = await httpClient.get<User[]>('/api/users');
const newUser = await httpClient.post<User, CreateUserRequest>('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Factory Function

```typescript
import { createInhHttpClient } from '@inh-lib/unified-route';

const httpClient = createInhHttpClient(internalClient, {
  userId: 'user-123',
  registry: { config: appConfig }
});

const response = await httpClient.get<ApiResponse>('/api/data');
```

## 🔧 Advanced Features

### Context Switching

```typescript
const adapter = new UnifiedInternalClientAdapter(internalClient, {
  userId: 'initial-user'
});

// อัพเดท context สำหรับ request ถัดไป
adapter.updateDefaults({
  userId: 'new-user',
  correlationId: 'new-correlation-id',
  headers: { 'x-tenant': 'tenant-123' }
});

const response = await adapter.get('/api/tenant-data');
```

### Accessing Internal Client

```typescript
const adapter = new UnifiedInternalClientAdapter(internalClient);

// เข้าถึง internal client สำหรับ advanced features
const originalClient = adapter.getInternalClient();
const hasRoute = originalClient.hasRoute('/api/users');
```

### Mixed Usage Pattern

```typescript
class UserService {
  private httpClient: InhHttpClient;
  private internalClient: UnifiedInternalClient;

  constructor(internalService: UnifiedInternalService) {
    this.internalClient = new UnifiedInternalClient(internalService);
    
    // ใช้ adapter สำหรับ standard HTTP interface
    this.httpClient = new UnifiedInternalClientAdapter(this.internalClient, {
      userId: 'service-user',
      registry: { service: 'user-service' }
    });
  }

  // Standard HTTP method
  async getUsers(): Promise<User[]> {
    const response = await this.httpClient.get<User[]>('/api/users');
    return response.data;
  }

  // Advanced internal method (ใช้ original client)
  async getUsersWithAdvancedOptions(): Promise<User[]> {
    const result = await this.internalClient.get<User[]>('/api/users', {}, {
      registry: { includeDeleted: true },
      correlationId: 'advanced-req'
    });
    return result.data;
  }
}
```

## 🔀 Response Format Conversion

Adapter แปลง response formats อัตโนมัติ:

| UnifiedInternalCallResult | → | InhHttpResponse |
|--------------------------|---|-----------------|
| `data: T` | → | `data: T` |
| `statusCode: number` | → | `status: number` |
| `headers: Record<string, string>` | → | `headers: Record<string, string>` |
| `success: boolean` | → | *(implicit in status)* |
| `isSuccess(): boolean` | → | *(check status >= 200 && status < 300)* |
| - | → | `statusText: string` *(auto-generated)* |

## 🎛️ Configuration Options

```typescript
interface AdapterOptions {
  userId?: string;              // Default user ID สำหรับ requests
  correlationId?: string;       // Default correlation ID
  registry?: Record<string, unknown>;  // Default registry objects
  headers?: Record<string, string>;    // Default headers
}
```

## 🧪 Testing

```typescript
describe('UserService with Adapter', () => {
  let service: UnifiedInternalService;
  let httpClient: InhHttpClient;

  beforeEach(() => {
    service = new UnifiedInternalService();
    const internalClient = new UnifiedInternalClient(service);
    httpClient = createInhHttpClient(internalClient, {
      userId: 'test-user'
    });

    // Register test handlers
    service.registerHandler('/api/users', async (ctx) => {
      ctx.response.json([{ id: 1, name: 'Test User' }]);
    });
  });

  test('should work with standard interface', async () => {
    const response = await httpClient.get<User[]>('/api/users');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].name).toBe('Test User');
  });
});
```

## 💡 Best Practices

### 1. **Use Factory Function for Simple Cases**
```typescript
// ✅ Good
const httpClient = createInhHttpClient(internalClient, defaultOptions);

// ❌ Less preferred for simple cases
const httpClient = new UnifiedInternalClientAdapter(internalClient, defaultOptions);
```

### 2. **Keep Configuration Consistent**
```typescript
// ✅ Good: Centralized configuration
const defaultConfig = {
  userId: currentUser.id,
  correlationId: requestId,
  registry: { tenant: currentTenant }
};

const httpClient = createInhHttpClient(internalClient, defaultConfig);
```

### 3. **Use Type Safety**
```typescript
// ✅ Good: Strongly typed
interface ApiResponse<T> {
  data: T;
  meta: { total: number };
}

const response = await httpClient.get<ApiResponse<User[]>>('/api/users');
```

## 🤔 เมื่อไหร่ควรใช้ Adapter

### ใช้ Adapter เมื่อ:
- ต้องการ interface มาตรฐาน (`InhHttpClient`)
- มี code ที่ใช้ `InhHttpClient` อยู่แล้ว
- ต้องการ interoperability ระหว่าง internal/external calls
- ต้องการ simple API without advanced features

### ใช้ UnifiedInternalClient โดยตรงเมื่อ:
- ต้องการ advanced features (registry, context, etc.)
- ต้องการ performance สูงสุด
- ต้องการความยืดหยุ่นในการกำหนด options
- ใช้งาน internal routing เป็นหลัก