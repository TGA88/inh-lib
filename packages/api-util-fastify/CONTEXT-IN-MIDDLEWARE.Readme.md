# Context in Middleware - Complete Guide

## Overview

เมื่อใช้ unified context ใน Fastify middleware คุณต้องมั่นใจว่า context instance เดียวกันถูกแชร์ระหว่าง middleware และ route handlers

⚠️ **ปัญหาที่พบบ่อย**: การสร้าง context หลายครั้งทำให้ registry data หายไป

## วิธีที่ 1: Share Context ผ่าน Request Object

### ภาพรวม
- สร้าง context ครั้งเดียวใน middleware
- เก็บไว้ใน `request.businessLogicContext`
- ใช้ context ตัวเดียวกันใน route handler

### ตัวอย่างการใช้งาน

#### Setup Context Middleware
```typescript
import { createUnifiedContext } from '@inh-lib/api-util-fastify';
import { 
  addRegistryItem, 
  getRegistryItem,
  getHeaders,
  sendError 
} from '@inh-lib/unified-route';
import { FastifyRequest, FastifyReply } from 'fastify';

// สร้าง context ครั้งเดียวและเก็บใน request
const setupContextMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.businessLogicContext) {
    request.businessLogicContext = createUnifiedContext(request, reply);
  }
};
```

#### Authentication Middleware
```typescript
const authenticationMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const context = request.businessLogicContext;
  
  if (!context) {
    return reply.status(500).send({ error: 'Context not initialized' });
  }
  
  const headers = getHeaders(context);
  const authHeader = headers.authorization;
  
  if (!authHeader) {
    return sendError(context, 'Authorization header required', 401);
  }
  
  try {
    const user = await validateToken(authHeader);
    // เก็บข้อมูลใน shared context
    addRegistryItem(context, 'currentUser', user);
    addRegistryItem(context, 'isAuthenticated', true);
    addRegistryItem(context, 'permissions', user.permissions || []);
  } catch (error) {
    return sendError(context, 'Invalid token', 401);
  }
};
```

#### Validation Middleware
```typescript
import { getRequestBody } from '@inh-lib/unified-route';

const validationMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const context = request.businessLogicContext;
  
  if (!context) {
    return reply.status(500).send({ error: 'Context not initialized' });
  }
  
  const body = getRequestBody(context);
  
  // เพิ่ม validation metadata
  addRegistryItem(context, 'validationPassed', true);
  addRegistryItem(context, 'validatedAt', Date.now());
  
  if (!isValidRequestBody(body)) {
    addRegistryItem(context, 'validationPassed', false);
    return sendError(context, 'Invalid request body', 400);
  }
};
```

#### Setup Middleware Chain
```typescript
// ลำดับสำคัญ: setup context ก่อน
fastify.addHook('preHandler', setupContextMiddleware);
fastify.addHook('preHandler', authenticationMiddleware);
fastify.addHook('preHandler', validationMiddleware);
```

#### Route Handler
```typescript
import { getParams, sendResponse } from '@inh-lib/unified-route';

fastify.get('/protected', async (request, reply) => {
  const context = request.businessLogicContext;
  
  if (!context) {
    return reply.status(500).send({ error: 'Context not initialized' });
  }
  
  // ใช้ข้อมูลจาก middleware
  const isAuthenticated = getRegistryItem(context, 'isAuthenticated');
  const currentUser = getRegistryItem(context, 'currentUser');
  const validationPassed = getRegistryItem(context, 'validationPassed');
  
  if (!isAuthenticated || isAuthenticated instanceof Error) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  if (!validationPassed || validationPassed instanceof Error) {
    return reply.status(400).send({ error: 'Validation failed' });
  }
  
  return { 
    message: 'Protected data',
    user: currentUser instanceof Error ? null : currentUser,
    validatedAt: getRegistryItem(context, 'validatedAt')
  };
});

// POST route with body validation
fastify.post('/create-resource', async (request, reply) => {
  const context = request.businessLogicContext!;
  
  const user = getRegistryItem(context, 'currentUser');
  const body = getRequestBody(context);
  
  if (user instanceof Error) {
    return sendError(context, 'User not found', 401);
  }
  
  // Business logic
  const resource = await createResource(body, user);
  
  sendResponse(context, { resource }, 201);
});
```

### Pros & Cons

**✅ Pros:**
- ใช้ได้กับ Fastify routes และ unified handlers
- Context sharing ที่ชัดเจน
- สามารถใช้ telemetry utilities ได้
- เหมาะสำหรับ migration จาก Fastify แบบเดิม

**❌ Cons:**
- ต้อง setup context manually
- ต้องเช็ค context existence ในทุก middleware
- Code ดูซับซ้อนกว่าวิธีอื่น

---

## วิธีที่ 2: ใช้ Fastify Request Object โดยตรง

### ภาพรวม
- เก็บข้อมูลง่ายๆ ใน request object
- แบบ traditional Fastify approach
- ไม่ต้องพึ่ง unified context

### ตัวอย่างการใช้งาน

#### Simple Authentication Middleware
```typescript
interface AuthenticatedRequest extends FastifyRequest {
  user?: User;
  isAuthenticated?: boolean;
  permissions?: string[];
  sessionData?: SessionData;
}

const simpleAuthMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    return reply.status(401).send({ error: 'Authorization header required' });
  }
  
  try {
    const user = await validateToken(authHeader);
    
    // เก็บข้อมูลโดยตรงใน request object
    (request as AuthenticatedRequest).user = user;
    (request as AuthenticatedRequest).isAuthenticated = true;
    (request as AuthenticatedRequest).permissions = user.permissions || [];
    (request as AuthenticatedRequest).sessionData = user.session;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};
```

#### Rate Limiting Middleware
```typescript
interface RateLimitedRequest extends FastifyRequest {
  rateLimit?: {
    remaining: number;
    resetTime: Date;
    exceeded: boolean;
  };
}

const rateLimitMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const clientId = request.ip;
  const rateLimit = await checkRateLimit(clientId);
  
  // เก็บข้อมูล rate limit
  (request as RateLimitedRequest).rateLimit = {
    remaining: rateLimit.remaining,
    resetTime: rateLimit.resetTime,
    exceeded: rateLimit.exceeded
  };
  
  if (rateLimit.exceeded) {
    reply.header('X-Rate-Limit-Remaining', '0');
    reply.header('X-Rate-Limit-Reset', rateLimit.resetTime.toISOString());
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }
  
  reply.header('X-Rate-Limit-Remaining', rateLimit.remaining.toString());
};
```

#### Setup Middleware
```typescript
fastify.addHook('preHandler', simpleAuthMiddleware);
fastify.addHook('preHandler', rateLimitMiddleware);
```

#### Route Handlers
```typescript
// Type-safe route handler
fastify.get('/simple-protected', async (request: AuthenticatedRequest, reply) => {
  const { user, isAuthenticated, permissions } = request;
  
  if (!isAuthenticated) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  // Check permissions
  if (!permissions?.includes('read:data')) {
    return reply.status(403).send({ error: 'Insufficient permissions' });
  }
  
  return { 
    message: 'Protected data',
    user: {
      id: user!.id,
      name: user!.name,
      role: user!.role
    },
    permissions
  };
});

// Rate limit aware route
fastify.get('/limited-resource', async (request: RateLimitedRequest, reply) => {
  const { user } = request as AuthenticatedRequest;
  const { rateLimit } = request;
  
  // ใช้ข้อมูลจาก multiple middleware
  const resource = await fetchLimitedResource(user!.id);
  
  return {
    resource,
    rateLimit: {
      remaining: rateLimit!.remaining,
      resetTime: rateLimit!.resetTime
    }
  };
});
```

#### Advanced Pattern with Custom Request Interface
```typescript
interface AppRequest extends FastifyRequest {
  // Authentication
  user?: User;
  isAuthenticated?: boolean;
  
  // Authorization
  permissions?: Permission[];
  roles?: Role[];
  
  // Session
  sessionData?: SessionData;
  
  // Rate limiting
  rateLimit?: RateLimitInfo;
  
  // Request metadata
  requestMetadata?: {
    startTime: number;
    requestId: string;
    userAgent: string;
    clientIP: string;
  };
}

const metadataMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  (request as AppRequest).requestMetadata = {
    startTime: Date.now(),
    requestId: generateRequestId(),
    userAgent: request.headers['user-agent'] || 'unknown',
    clientIP: request.ip
  };
};

const fullAuthMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const appRequest = request as AppRequest;
  
  // ... authentication logic
  
  appRequest.user = user;
  appRequest.isAuthenticated = true;
  appRequest.permissions = await getUserPermissions(user.id);
  appRequest.roles = await getUserRoles(user.id);
};

// Type-safe route with all data
fastify.get('/full-featured', async (request: AppRequest, reply) => {
  const { 
    user, 
    permissions, 
    roles, 
    requestMetadata, 
    rateLimit 
  } = request;
  
  return {
    message: 'Full featured endpoint',
    user: user?.name,
    permissions: permissions?.map(p => p.name),
    roles: roles?.map(r => r.name),
    processingTime: Date.now() - requestMetadata!.startTime,
    requestId: requestMetadata!.requestId,
    rateLimit: rateLimit?.remaining
  };
});
```

### Pros & Cons

**✅ Pros:**
- เรียบง่าย ไม่ซับซ้อน
- Performance ดี (ไม่มี overhead จาก context)
- Type-safe กับ TypeScript
- เหมาะสำหรับข้อมูลง่ายๆ

**❌ Cons:**
- จำกัดแค่ Fastify framework
- ไม่ได้ประโยชน์จาก registry system
- ไม่สามารถใช้ unified route utilities
- ต้องจัดการ type casting เอง

---

## วิธีที่ 3: Unified Route Middleware Pattern (แนะนำ)

### ภาพรวม
- ใช้ `UnifiedMiddleware` และ `composeMiddleware`
- Context จะถูกส่งต่อระหว่าง middleware และ handler อัตโนมัติ
- เป็นวิธีที่ unified-route ออกแบบมาจริงๆ

### ตัวอย่างการใช้งาน

#### Define Unified Middlewares
```typescript
import { 
  UnifiedMiddleware,
  composeMiddleware,
  UnifiedRouteHandler,
  getHeaders,
  getRequestBody,
  getParams,
  addRegistryItem,
  getRegistryItem,
  sendResponse,
  sendError
} from '@inh-lib/unified-route';
import { createUnifiedFastifyHandler } from '@inh-lib/api-util-fastify';

// Authentication Middleware
const unifiedAuthMiddleware: UnifiedMiddleware = async (context, next) => {
  const headers = getHeaders(context);
  const token = headers.authorization;
  
  if (!token) {
    return sendError(context, 'Authorization required', 401);
  }
  
  try {
    const user = await validateToken(token);
    
    // เก็บข้อมูลใน context registry
    addRegistryItem(context, 'currentUser', user);
    addRegistryItem(context, 'isAuthenticated', true);
    addRegistryItem(context, 'permissions', user.permissions);
    addRegistryItem(context, 'authTime', Date.now());
    
    await next(); // ส่งต่อไปยัง middleware ถัดไป
  } catch (error) {
    return sendError(context, 'Invalid token', 401);
  }
};

// Validation Middleware
const unifiedValidationMiddleware: UnifiedMiddleware = async (context, next) => {
  const body = getRequestBody(context);
  
  if (!body || Object.keys(body).length === 0) {
    return sendError(context, 'Request body is required', 400);
  }
  
  // Validate และเก็บผลลัพธ์
  const validationResult = await validateRequestBody(body);
  
  addRegistryItem(context, 'validationResult', validationResult);
  addRegistryItem(context, 'validatedBody', validationResult.sanitizedData);
  
  if (!validationResult.isValid) {
    return sendError(context, `Validation failed: ${validationResult.errors.join(', ')}`, 400);
  }
  
  await next();
};

// Permission Check Middleware
const unifiedPermissionMiddleware: UnifiedMiddleware = async (context, next) => {
  const user = getRegistryItem(context, 'currentUser');
  const permissions = getRegistryItem(context, 'permissions');
  
  if (user instanceof Error || permissions instanceof Error) {
    return sendError(context, 'Authentication required', 401);
  }
  
  // ตรวจสอบ permissions ตาม route
  const params = getParams(context);
  const requiredPermission = getRequiredPermission(context.request.method, context.request.route);
  
  if (!hasPermission(permissions as Permission[], requiredPermission)) {
    return sendError(context, 'Insufficient permissions', 403);
  }
  
  addRegistryItem(context, 'permissionChecked', true);
  addRegistryItem(context, 'requiredPermission', requiredPermission);
  
  await next();
};

// Audit Log Middleware
const unifiedAuditMiddleware: UnifiedMiddleware = async (context, next) => {
  const user = getRegistryItem(context, 'currentUser');
  const startTime = Date.now();
  
  addRegistryItem(context, 'auditStartTime', startTime);
  
  try {
    await next();
    
    // Log successful operation
    if (!(user instanceof Error)) {
      await logAuditEvent({
        userId: user.id,
        action: `${context.request.method} ${context.request.route}`,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true
      });
    }
  } catch (error) {
    // Log failed operation
    if (!(user instanceof Error)) {
      await logAuditEvent({
        userId: user.id,
        action: `${context.request.method} ${context.request.route}`,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    throw error; // Re-throw error
  }
};
```

#### Define Route Handlers
```typescript
// Simple Protected Handler
const protectedHandler: UnifiedRouteHandler = async (context) => {
  const user = getRegistryItem(context, 'currentUser');
  const authTime = getRegistryItem(context, 'authTime');
  
  if (user instanceof Error) {
    return sendError(context, 'Unauthorized', 401);
  }
  
  sendResponse(context, {
    message: 'Protected data',
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    },
    authenticatedAt: authTime instanceof Error ? null : new Date(authTime).toISOString(),
    serverTime: new Date().toISOString()
  });
};

// Create Resource Handler
const createResourceHandler: UnifiedRouteHandler = async (context) => {
  const user = getRegistryItem(context, 'currentUser');
  const validatedBody = getRegistryItem(context, 'validatedBody');
  const permissionChecked = getRegistryItem(context, 'permissionChecked');
  
  if (user instanceof Error) {
    return sendError(context, 'Unauthorized', 401);
  }
  
  if (validatedBody instanceof Error) {
    return sendError(context, 'Invalid request body', 400);
  }
  
  if (!permissionChecked || permissionChecked instanceof Error) {
    return sendError(context, 'Permission check failed', 403);
  }
  
  try {
    // Business logic
    const resource = await createResource(validatedBody, user);
    
    addRegistryItem(context, 'createdResource', resource);
    
    sendResponse(context, {
      message: 'Resource created successfully',
      resource: {
        id: resource.id,
        name: resource.name,
        createdBy: user.name,
        createdAt: resource.createdAt
      }
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return sendError(context, `Failed to create resource: ${errorMessage}`, 500);
  }
};

// Get Resource Handler
const getResourceHandler: UnifiedRouteHandler = async (context) => {
  const user = getRegistryItem(context, 'currentUser');
  const params = getParams(context);
  const resourceId = params.id;
  
  if (user instanceof Error) {
    return sendError(context, 'Unauthorized', 401);
  }
  
  try {
    const resource = await getResourceById(resourceId);
    
    if (!resource) {
      return sendError(context, 'Resource not found', 404);
    }
    
    // Check if user can access this resource
    if (!canAccessResource(user, resource)) {
      return sendError(context, 'Access denied to this resource', 403);
    }
    
    sendResponse(context, {
      resource,
      accessedBy: user.name,
      accessTime: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return sendError(context, `Failed to get resource: ${errorMessage}`, 500);
  }
};
```

#### Compose Middleware Chains
```typescript
// Basic protected route
const basicProtectedChain = composeMiddleware([
  unifiedAuthMiddleware
])(protectedHandler);

// Full featured route with all middleware
const fullFeaturedChain = composeMiddleware([
  unifiedAuthMiddleware,
  unifiedValidationMiddleware,
  unifiedPermissionMiddleware,
  unifiedAuditMiddleware
])(createResourceHandler);

// Read-only route
const readOnlyChain = composeMiddleware([
  unifiedAuthMiddleware,
  unifiedPermissionMiddleware,
  unifiedAuditMiddleware
])(getResourceHandler);

// Custom middleware chain for specific needs
const customChain = composeMiddleware([
  unifiedAuthMiddleware,
  unifiedValidationMiddleware,
  // Custom middleware for this route only
  async (context, next) => {
    addRegistryItem(context, 'customFlag', true);
    await next();
  }
])(createResourceHandler);
```

#### Register Routes with Fastify
```typescript
// Register composed handlers
fastify.get('/protected', createUnifiedFastifyHandler(basicProtectedChain));
fastify.post('/resources', createUnifiedFastifyHandler(fullFeaturedChain));
fastify.get('/resources/:id', createUnifiedFastifyHandler(readOnlyChain));
fastify.put('/resources/:id', createUnifiedFastifyHandler(customChain));

// Multiple routes with same middleware chain
const adminRoutes = [
  { method: 'GET', path: '/admin/users', handler: getUsersHandler },
  { method: 'POST', path: '/admin/users', handler: createUserHandler },
  { method: 'DELETE', path: '/admin/users/:id', handler: deleteUserHandler }
];

const adminMiddleware = [
  unifiedAuthMiddleware,
  unifiedPermissionMiddleware,
  unifiedAuditMiddleware
];

adminRoutes.forEach(route => {
  const composedHandler = composeMiddleware(adminMiddleware)(route.handler);
  fastify.route({
    method: route.method as any,
    url: route.path,
    handler: createUnifiedFastifyHandler(composedHandler)
  });
});
```

#### Advanced Middleware Patterns
```typescript
// Conditional Middleware
const conditionalMiddleware: UnifiedMiddleware = async (context, next) => {
  const headers = getHeaders(context);
  const skipValidation = headers['x-skip-validation'] === 'true';
  
  if (skipValidation) {
    addRegistryItem(context, 'validationSkipped', true);
    return await next();
  }
  
  // Run normal validation
  return await unifiedValidationMiddleware(context, next);
};

// Caching Middleware
const cachingMiddleware: UnifiedMiddleware = async (context, next) => {
  const cacheKey = generateCacheKey(context.request);
  const cached = await getFromCache(cacheKey);
  
  if (cached) {
    addRegistryItem(context, 'cacheHit', true);
    return sendResponse(context, cached);
  }
  
  addRegistryItem(context, 'cacheHit', false);
  addRegistryItem(context, 'cacheKey', cacheKey);
  
  await next();
  
  // Cache the response after handler completes
  const result = getRegistryItem(context, 'responseData');
  if (!(result instanceof Error)) {
    await setCache(cacheKey, result, 300); // 5 minutes TTL
  }
};

// Error Recovery Middleware
const errorRecoveryMiddleware: UnifiedMiddleware = async (context, next) => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await next();
      return; // Success, exit
    } catch (error) {
      retryCount++;
      addRegistryItem(context, 'retryCount', retryCount);
      
      if (retryCount >= maxRetries) {
        addRegistryItem(context, 'finalError', error);
        throw error; // Max retries reached
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
};
```

### Pros & Cons

**✅ Pros:**
- Framework agnostic (ใช้ได้กับ Express, Koa, etc.)
- Context sharing อัตโนมัติ
- Middleware composition ที่สะอาด
- Type-safe และ testable
- Reusable middleware
- สามารถใช้ telemetry utilities

**❌ Cons:**
- ต้องเรียนรู้ unified-route patterns
- Overhead เล็กน้อยจาก composition
- ต้องใช้ createUnifiedFastifyHandler

---

## สรุปและแนวทางการเลือกใช้

### เปรียบเทียบ 3 วิธี

| ลักษณะ | วิธีที่ 1 | วิธีที่ 2 | วิธีที่ 3 |
|--------|----------|----------|----------|
| **ความซับซ้อน** | ปานกลาง | ง่าย | ปานกลาง |
| **Performance** | ดี | ดีที่สุด | ดี |
| **Type Safety** | ดี | ดีที่สุด | ดี |
| **Framework Agnostic** | บางส่วน | ไม่ | ใช่ |
| **Testability** | ดี | ปานกลาง | ดีที่สุด |
| **Reusability** | ดี | จำกัด | ดีที่สุด |
| **Learning Curve** | ปานกลาง | ต่ำ | สูง |

### การเลือกใช้

#### 🎯 **ใช้วิธีที่ 1 เมื่อ:**
- มี Fastify application อยู่แล้ว
- ต้องการ migrate ไปใช้ unified context ทีละขั้น
- ต้องการใช้ทั้ง traditional Fastify และ unified patterns
- ต้องการควบคุม context lifecycle แบบ manual

#### 🎯 **ใช้วิธีที่ 2 เมื่อ:**
- สร้าง Fastify application ใหม่แบบ traditional
- ไม่ต้องการ framework abstraction
- ต้องการ performance สูงสุด
- มี middleware ง่ายๆ เท่านั้น

#### 🎯 **ใช้วิธีที่ 3 เมื่อ (แนะนำ):**
- สร้าง application ใหม่
- ต้องการ framework portability
- มี middleware ซับซ้อน
- ต้องการ reusable components
- ทีมพร้อมเรียนรู้ unified patterns

### Migration Path

#### จาก Traditional Fastify (วิธีที่ 2) → Unified Context (วิธีที่ 1)
```typescript
// Before: Traditional
(request as any).user = user;

// After: Unified Context
const context = request.businessLogicContext!;
addRegistryItem(context, 'user', user);
```

#### จาก Shared Context (วิธีที่ 1) → Pure Unified (วิธีที่ 3)
```typescript
// Before: Manual context management
const middleware = async (request, reply) => {
  const context = request.businessLogicContext!;
  // ... logic
};

// After: Unified middleware
const middleware: UnifiedMiddleware = async (context, next) => {
  // ... same logic
  await next();
};
```

### Best Practices for All Methods

#### ✅ **Do:**
- เช็ค Error return จาก getRegistryItem เสมอ
- ใช้ TypeScript interfaces สำหรับ type safety
- เก็บข้อมูลเล็กๆ ใน registry เท่านั้น
- Test middleware แยกจาก route handlers
- ใช้ consistent naming conventions

#### ❌ **Don't:**
- สร้าง context หลายครั้งในคำขอเดียว
- เก็บ large objects ใน registry
- ข้าม error handling
- ผสม patterns ในโปรเจกต์เดียว
- ลืม cleanup resources

---

## ตัวอย่าง Testing

### Testing วิธีที่ 1 (Shared Context)
```typescript
import { createUnifiedContext } from '@inh-lib/api-util-fastify';
import { addRegistryItem, getRegistryItem } from '@inh-lib/unified-route';

describe('Shared Context Middleware', () => {
  const mockRequest = {
    headers: { authorization: 'Bearer valid-token' },
    businessLogicContext: null
  } as any;
  
  const mockReply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn()
  } as any;
  
  beforeEach(() => {
    mockRequest.businessLogicContext = createUnifiedContext(mockRequest, mockReply);
  });
  
  it('should share context between middlewares', async () => {
    // First middleware
    addRegistryItem(mockRequest.businessLogicContext, 'testData', 'value');
    
    // Second middleware should access same data
    const testData = getRegistryItem(mockRequest.businessLogicContext, 'testData');
    
    expect(testData).toBe('value');
  });
});
```

### Testing วิธีที่ 2 (Traditional)
```typescript
describe('Traditional Middleware', () => {
  const mockRequest = {
    headers: { authorization: 'Bearer valid-token' }
  } as any;
  
  const mockReply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn()
  } as any;
  
  it('should attach user to request', async () => {
    await simpleAuthMiddleware(mockRequest, mockReply);
    
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.isAuthenticated).toBe(true);
  });
});
```

### Testing วิธีที่ 3 (Unified)
```typescript
import { composeMiddleware } from '@inh-lib/unified-route';

describe('Unified Middleware', () => {
  it('should compose middleware correctly', async () => {
    const mockContext = createMockContext();
    
    const composed = composeMiddleware([
      unifiedAuthMiddleware,
      unifiedValidationMiddleware
    ])(mockHandler);
    
    await composed(mockContext);
    
    const user = getRegistryItem(mockContext, 'currentUser');
    expect(user).toBeDefined();
  });
});
```

---

## สรุป

การเลือกใช้วิธีจัดการ context ใน middleware ขึ้นอยู่กับความต้องการของโปรเจกต์:

- **วิธีที่ 1** เหมาะสำหรับการ migrate และ mixed usage
- **วิธีที่ 2** เหมาะสำหรับ simple traditional Fastify apps  
- **วิธีที่ 3** เหมาะสำหรับ modern, scalable applications

เลือกวิธีที่เหมาะสมกับทีมและโปรเจกต์ของคุณ และปฏิบัติตาม best practices เพื่อให้โค้ดมีคุณภาพและง่ายต่อการดูแลรักษา