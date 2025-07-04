// 🎯 Cross-Cutting Concerns: ความหมายและตัวอย่าง

// ================================
// 1. Cross-Cutting Concerns คืออะไร?
// ================================

/*
Cross-Cutting Concerns = ฟีเจอร์ที่ "ตัดผ่าน" หลายๆ ส่วนของระบบ

🔍 ลักษณะสำคัญ:
1. ไม่ใช่ core business logic หลัก
2. ต้องใช้ในหลายๆ จุดของระบบ 
3. ถ้าไม่จัดการให้ดี จะเกิด code duplication
4. มักเป็นเรื่องของ infrastructure, monitoring, security

🎯 ตัวอย่างทั่วไป:
- Logging (บันทึกการทำงาน)
- Authentication & Authorization (ตรวจสอบสิทธิ์)
- Error Handling (จัดการข้อผิดพลาด)  
- Caching (เก็บข้อมูลชั่วคราว)
- Rate Limiting (จำกัดการเรียกใช้)
- Monitoring & Metrics (เฝาระวังระบบ)
- Transaction Management (จัดการ database transactions)
- CORS (Cross-Origin Resource Sharing)
- Security Headers (ป้องกันการโจมตี)

💡 เปรียบเทียบง่ายๆ:
Business Logic = เนื้อหาหลักของบทความ
Cross-Cutting Concerns = การจัดรูปแบบ, เลขหน้า, header/footer ที่ปรากฏทุกหน้า
*/

// ================================
// 2. ปัญหาถ้าไม่จัดการ Cross-Cutting Concerns
// ================================

// ❌ ตัวอย่างปัญหา: Code Duplication
class UserController {
  async createUser(req: any, res: any) {
    // 🔄 Logging - ซ้ำทุก method
    console.log(`[${new Date().toISOString()}] POST /users`, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    try {
      // 🔄 Authentication - ซ้ำทุก method
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }
      
      const user = await this.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // 🔄 Rate limiting - ซ้ำทุก method
      const clientIp = req.ip;
      const requestCount = await this.getRequestCount(clientIp);
      if (requestCount > 100) {
        return res.status(429).json({ error: 'Too many requests' });
      }

      // ✅ Business logic เริ่มที่นี่
      const userData = req.body;
      const newUser = await this.userService.createUser(userData);
      
      // 🔄 Response logging - ซ้ำทุก method
      console.log(`[${new Date().toISOString()}] POST /users - Success`, {
        userId: newUser.id,
        duration: Date.now() - startTime
      });

      res.status(201).json(newUser);

    } catch (error) {
      // 🔄 Error handling - ซ้ำทุก method
      console.error(`[${new Date().toISOString()}] POST /users - Error`, error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req: any, res: any) {
    // 🔄 เริ่มต้นด้วย logging เหมือนเดิม
    console.log(`[${new Date().toISOString()}] PUT /users/:id`, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    try {
      // 🔄 Authentication เหมือนเดิม - DUPLICATE CODE!
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }
      
      const user = await this.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // 🔄 Rate limiting เหมือนเดิม - DUPLICATE CODE!
      const clientIp = req.ip;
      const requestCount = await this.getRequestCount(clientIp);
      if (requestCount > 100) {
        return res.status(429).json({ error: 'Too many requests' });
      }

      // ✅ Business logic ที่ต่างกัน
      const userId = req.params.id;
      const updateData = req.body;
      const updatedUser = await this.userService.updateUser(userId, updateData);
      
      res.json(updatedUser);

    } catch (error) {
      // 🔄 Error handling เหมือนเดิม - DUPLICATE CODE!
      console.error(`[${new Date().toISOString()}] PUT /users/:id - Error`, error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req: any, res: any) {
    // 🔄 เหมือนเดิมอีกครั้ง... 😫
    // Logging, Authentication, Rate limiting, Error handling ซ้ำๆ
  }
}

// 😫 ปัญหาที่เกิดขึ้น:
// 1. Code duplication มากมาย
// 2. แก้ไขยาก (ต้องแก้หลายที่)
// 3. ลืมใส่ใน method ใหม่ได้ง่าย
// 4. Business logic ถูกฝังอยู่ใน infrastructure code
// 5. ทดสอบยาก
// 6. Maintenance nightmare

// ================================
// 3. การแก้ปัญหาด้วย BasicMiddleware
// ================================

// ✅ แยก Cross-Cutting Concerns ออกเป็น Middleware
interface UnifiedHttpContext {
  request: {
    method: string;
    url: string;
    headers: Record<string, string | undefined>;
    body: unknown;
    ip: string;
  };
  response: {
    status(code: number): UnifiedHttpContext['response'];
    json<T>(data: T): void;
  };
  user?: { id: string; email: string; roles: string[] };
  startTime?: number;
}

type Middleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;

// 🔧 1. Logging Middleware
const createLoggingMiddleware = (): Middleware => {
  return async (context, next) => {
    const startTime = Date.now();
    context.startTime = startTime;
    
    console.log(`[${new Date().toISOString()}] → ${context.request.method} ${context.request.url}`, {
      ip: context.request.ip,
      userAgent: context.request.headers['user-agent']
    });

    try {
      await next();
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ← ${context.request.method} ${context.request.url} - Success (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] ← ${context.request.method} ${context.request.url} - Error (${duration}ms)`, error);
      throw error;
    }
  };
};

// 🔒 2. Authentication Middleware
const createAuthMiddleware = (): Middleware => {
  return async (context, next) => {
    const authHeader = context.request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      context.response.status(401).json({ error: 'Bearer token required' });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const user = await verifyToken(token);
      if (!user) {
        context.response.status(401).json({ error: 'Invalid token' });
        return;
      }
      
      context.user = user;
      await next();
    } catch (error) {
      context.response.status(401).json({ error: 'Token verification failed' });
    }
  };
};

// ⏱️ 3. Rate Limiting Middleware
const createRateLimitMiddleware = (options: {
  maxRequests: number;
  windowMs: number;
}): Middleware => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return async (context, next) => {
    const clientIp = context.request.ip;
    const now = Date.now();
    
    let clientData = requestCounts.get(clientIp);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + options.windowMs
      };
      requestCounts.set(clientIp, clientData);
    }

    clientData.count++;

    if (clientData.count > options.maxRequests) {
      context.response.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
      return;
    }

    await next();
  };
};

// 🛡️ 4. Error Handling Middleware
const createErrorHandlingMiddleware = (): Middleware => {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Request error:', error);
      
      if (error instanceof ValidationError) {
        context.response.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      } else if (error instanceof AuthorizationError) {
        context.response.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      } else {
        context.response.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    }
  };
};

// 📊 5. Performance Monitoring Middleware
const createPerformanceMiddleware = (): Middleware => {
  return async (context, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    await next();

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    // Send metrics to monitoring system
    recordMetrics({
      route: `${context.request.method} ${context.request.url}`,
      duration: endTime - startTime,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      timestamp: startTime
    });
  };
};

// ================================
// 4. สร้าง Middleware Composition
// ================================

const composeMiddleware = (middlewares: Middleware[]) => {
  return (handler: (context: UnifiedHttpContext) => Promise<void>) => {
    return async (context: UnifiedHttpContext) => {
      let index = 0;
      
      const dispatch = async (): Promise<void> => {
        if (index >= middlewares.length) {
          await handler(context);
          return;
        }
        
        const middleware = middlewares[index++];
        await middleware(context, dispatch);
      };
      
      await dispatch();
    };
  };
};

// ✅ Pre-composed middleware stacks
const withApiMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),     // ← Handle errors
  createLoggingMiddleware(),           // ← Log requests
  createPerformanceMiddleware(),       // ← Monitor performance
  createAuthMiddleware(),              // ← Authenticate users
  createRateLimitMiddleware({          // ← Rate limiting
    maxRequests: 100,
    windowMs: 60000
  })
]);

const withPublicMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createRateLimitMiddleware({
    maxRequests: 50,
    windowMs: 60000
  })
]);

// ================================
// 5. Clean Business Logic
// ================================

// ✅ Controller ที่สะอาด - เฉพาะ business logic
class CleanUserController {
  
  // ✅ Create User - เฉพาะ business logic
  static createUser = withApiMiddleware(async (context: UnifiedHttpContext) => {
    // ✅ Middleware จัดการ logging, auth, rate limiting ให้แล้ว
    // ✅ เหลือแค่ business logic ที่สะอาด
    
    const userData = context.request.body as CreateUserInput;
    const userService = container.get<UserService>('userService');
    
    const newUser = await userService.createUser(userData);
    context.response.status(201).json(newUser);
  });

  // ✅ Update User - เฉพาะ business logic
  static updateUser = withApiMiddleware(async (context: UnifiedHttpContext) => {
    // ✅ Middleware จัดการทุกอย่างให้แล้ว
    
    const userId = context.request.params?.id as string;
    const updateData = context.request.body as UpdateUserInput;
    const userService = container.get<UserService>('userService');
    
    const updatedUser = await userService.updateUser(userId, updateData);
    context.response.json(updatedUser);
  });

  // ✅ Delete User - เฉพาะ business logic
  static deleteUser = withApiMiddleware(async (context: UnifiedHttpContext) => {
    const userId = context.request.params?.id as string;
    const userService = container.get<UserService>('userService');
    
    await userService.deleteUser(userId);
    context.response.status(204).json({});
  });

  // ✅ Get User (Public endpoint) - ใช้ middleware ต่างกัน
  static getUser = withPublicMiddleware(async (context: UnifiedHttpContext) => {
    const userId = context.request.params?.id as string;
    const userService = container.get<UserService>('userService');
    
    const user = await userService.findById(userId);
    if (!user) {
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    context.response.json(user);
  });
}

// ================================
// 6. ประโยชน์ที่ได้จาก Cross-Cutting Concerns Management
// ================================

/*
✅ ข้อดีที่ได้:

1. 🔄 DRY Principle:
   - เขียน cross-cutting logic ครั้งเดียว
   - ใช้ได้หลายที่
   - ไม่มี code duplication

2. 🧹 Clean Business Logic:
   - Controller/Route มีแค่ business logic
   - แยก concerns ชัดเจน
   - อ่านและเข้าใจง่าย

3. 🔧 Easy Maintenance:
   - แก้ไข logging logic ที่เดียว
   - เปลี่ยน authentication strategy ที่เดียว
   - เพิ่ม security header ที่เดียว

4. 🧪 Better Testing:
   - Test middleware แยกจาก business logic
   - Mock middleware สำหรับ unit test
   - Integration test ครบถ้วน

5. 🔀 Flexible Composition:
   - Mix and match middleware ตามต้องการ
   - API routes ใช้ auth + rate limiting
   - Public routes ใช้แค่ rate limiting

6. 📊 Consistent Behavior:
   - Logging format เหมือนกันทุก endpoint
   - Error handling consistent
   - Security policy ครอบคลุมทั้งระบบ

7. ⚡ Performance:
   - ไม่มี redundant code
   - Middleware composition efficient
   - Easy to optimize hot paths
*/

// ================================
// 7. ตัวอย่าง Cross-Cutting Concerns อื่นๆ
// ================================

// 💾 Caching Middleware
const createCacheMiddleware = (ttl: number): Middleware => {
  const cache = new Map<string, { data: any; expiry: number }>();
  
  return async (context, next) => {
    if (context.request.method !== 'GET') {
      await next();
      return;
    }

    const cacheKey = `${context.request.method}:${context.request.url}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      context.response.json(cached.data);
      return;
    }

    // Capture response data
    const originalJson = context.response.json;
    let responseData: any;
    
    context.response.json = function<T>(data: T) {
      responseData = data;
      cache.set(cacheKey, {
        data,
        expiry: Date.now() + ttl
      });
      return originalJson.call(this, data);
    };

    await next();
  };
};

// 🔒 CORS Middleware
const createCorsMiddleware = (options: {
  origin?: string | string[];
  methods?: string[];
}): Middleware => {
  return async (context, next) => {
    const origin = Array.isArray(options.origin) 
      ? options.origin.join(',') 
      : options.origin || '*';
    
    context.response.headers = {
      ...context.response.headers,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': (options.methods || ['GET', 'POST', 'PUT', 'DELETE']).join(','),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (context.request.method === 'OPTIONS') {
      context.response.status(200).json({});
      return;
    }

    await next();
  };
};

// 📏 Request Validation Middleware
const createValidationMiddleware = <T>(schema: {
  parse(input: unknown): T;
}): Middleware => {
  return async (context, next) => {
    try {
      const validated = schema.parse(context.request.body);
      context.request.body = validated;
      await next();
    } catch (error) {
      context.response.status(422).json({
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Invalid input'
      });
    }
  };
};

// 🔐 Security Headers Middleware
const createSecurityHeadersMiddleware = (): Middleware => {
  return async (context, next) => {
    // Add security headers
    context.response.headers = {
      ...context.response.headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    await next();
  };
};

// ================================
// 8. Real-World Example: E-commerce API
// ================================

// ✅ ตัวอย่างการใช้งานจริง
const ecommerceApiRoutes = {
  // Public routes (minimal middleware)
  'GET /products': withPublicMiddleware(ProductController.getProducts),
  'GET /products/:id': withPublicMiddleware(ProductController.getProduct),
  
  // API routes (full middleware stack)
  'POST /orders': composeMiddleware([
    createErrorHandlingMiddleware(),
    createLoggingMiddleware(),
    createSecurityHeadersMiddleware(),
    createAuthMiddleware(),
    createRateLimitMiddleware({ maxRequests: 50, windowMs: 60000 }),
    createValidationMiddleware(CreateOrderSchema),
    createCacheMiddleware(0) // No caching for orders
  ])(OrderController.createOrder),

  // Admin routes (enhanced security)
  'GET /admin/users': composeMiddleware([
    createErrorHandlingMiddleware(),
    createLoggingMiddleware(),
    createSecurityHeadersMiddleware(),
    createAuthMiddleware(),
    createAdminAuthMiddleware(), // Additional admin check
    createAuditLogMiddleware(),  // Audit admin actions
    createRateLimitMiddleware({ maxRequests: 200, windowMs: 60000 })
  ])(AdminController.getUsers),

  // Health check (minimal middleware)
  'GET /health': composeMiddleware([
    createLoggingMiddleware()
  ])(HealthController.check)
};

/*
🎯 สรุป Cross-Cutting Concerns:

Cross-cutting concerns คือ functionality ที่:
✅ ไม่ใช่ core business logic
✅ ต้องใช้หลายๆ ที่ในระบบ  
✅ ถ้าไม่จัดการดีจะเกิด code duplication
✅ ตัวอย่าง: logging, auth, error handling, caching, CORS, security

โดยการใช้ BasicMiddleware เราสามารถ:
✅ แยก cross-cutting concerns ออกจาก business logic
✅ Reuse code ได้มาก
✅ Maintain ง่าย
✅ Test ได้ดี
✅ Compose ตามความต้องการ

นี่คือเหตุผลว่าทำไม BasicMiddleware ถึงสำคัญมากใน framework-agnostic architecture!
*/

// Helper types and classes (for completeness)
class ValidationError extends Error {}
class AuthorizationError extends Error {}

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
}

const container = {
  get: <T>(key: string): T => ({} as T)
};

const verifyToken = async (token: string) => ({ id: '1', email: 'user@example.com', roles: ['user'] });

const recordMetrics = (metrics: any) => {
  console.log('📊 Metrics recorded:', metrics);
};