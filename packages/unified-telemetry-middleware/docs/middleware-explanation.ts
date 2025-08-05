/**
 * อธิบายการทำงานของ createBusinessLogicMiddleware vs การเขียน business logic เอง
 */

import { 
  UnifiedHttpContext, 
  composeMiddleware 
} from '@inh-lib/unified-route';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

// ========================================
// วิธีที่ 1: ใช้ createBusinessLogicMiddleware (แค่ telemetry wrapper)
// ========================================

const telemetryWrapperOnly = telemetryService.createBusinessLogicMiddleware('user-lookup', {
  operationType: 'business',
  layer: 'service'
});

// ⚠️ middleware นี้จะทำแค่:
// 1. สร้าง child span ชื่อ 'user-lookup'
// 2. log "user-lookup started"
// 3. เรียก next() (middleware ตัวถัดไป)
// 4. log "user-lookup completed successfully" 
// 5. finish span
// 
// ❌ มันไม่มี business logic อะไรเลย!

// เราต้องเขียน middleware แยกสำหรับ business logic ของเราเอง:
const actualUserLookupLogic = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  try {
    const userId = context.request.params.id;
    
    // 🔥 นี่คือ business logic จริงๆ ของเรา
    const user = await userRepository.findById(userId);
    
    if (!user) {
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    // เก็บ user ไว้ใน registry สำหรับ middleware ตัวถัดไป
    context.registry.user = user;
    
    await next();
    
  } catch (error) {
    console.error('User lookup failed:', error);
    context.response.status(500).json({ error: 'Internal server error' });
  }
};

// ใช้งานแบบนี้:
const middlewares1 = [
  telemetryService.createMiddleware(),
  telemetryWrapperOnly,      // ✅ สร้าง span + log
  actualUserLookupLogic,     // ✅ business logic จริง
];

// ========================================
// วิธีที่ 2: เขียน business logic พร้อม telemetry เอง
// ========================================

const userLookupWithTelemetry = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  // สร้าง child span เอง
  const { span, logger, finish } = telemetryService.createChildSpan(context, 'user-lookup-business', {
    operationType: 'business',
    layer: 'service',
    attributes: {
      'business.operation': 'user_lookup',
      'user.id': context.request.params.id
    }
  });
  
  try {
    const userId = context.request.params.id;
    logger.info('Starting user lookup', { userId });
    
    // 🔥 business logic ของเรา
    const user = await userRepository.findByIdWithContext(context, userId); // สร้าง child span ใน repo
    
    if (!user) {
      logger.warn('User not found', { userId });
      span.setTag('user.found', false);
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    span.setTag('user.found', true);
    span.setTag('user.email', user.email);
    logger.info('User found successfully', { userId, userEmail: user.email });
    
    // เก็บ user ไว้ใน registry
    context.registry.user = user;
    
    await next();
    
  } catch (error) {
    logger.error('User lookup failed', error, { 
      userId: context.request.params.id,
      errorType: error.constructor.name 
    });
    span.recordException(error);
    context.response.status(500).json({ error: 'Internal server error' });
  } finally {
    finish(); // ต้อง finish span เสมอ
  }
};

// ใช้งานแบบนี้:
const middlewares2 = [
  telemetryService.createMiddleware(),
  userLookupWithTelemetry,  // ✅ business logic + telemetry ในที่เดียว
];

// ========================================
// วิธีที่ 3: แยก concerns แต่รวม telemetry
// ========================================

// Pure business logic (ไม่มี telemetry)
class UserService {
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }
  
  async getUserByIdWithTelemetry(context: UnifiedHttpContext, userId: string): Promise<User | null> {
    // สร้าง child span สำหรับ service layer
    const { span, logger, finish } = telemetryService.createChildSpan(context, 'service-get-user', {
      operationType: 'business',
      layer: 'service'
    });
    
    try {
      logger.info('Service: Getting user', { userId });
      
      // เรียก repository ที่จะสร้าง child span เอง
      const user = await this.userRepository.findByIdWithContext(context, userId);
      
      span.setTag('service.result', user ? 'found' : 'not_found');
      return user;
      
    } finally {
      finish();
    }
  }
}

// Middleware ที่ใช้ service
const userLookupMiddleware = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  try {
    const userId = context.request.params.id;
    
    // ใช้ service ที่มี telemetry built-in
    const user = await userService.getUserByIdWithTelemetry(context, userId);
    
    if (!user) {
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    context.registry.user = user;
    await next();
    
  } catch (error) {
    context.response.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// เปรียบเทียบ Trace Structure
// ========================================

/*
วิธีที่ 1: createBusinessLogicMiddleware + แยก middleware
Root Span: HTTP GET /users/:id
├── Child Span: user-lookup (จาก createBusinessLogicMiddleware - แค่ wrapper)
├── Child Span: ??? (จาก actualUserLookupLogic - ถ้าเราสร้าง child span เอง)
└── Response

วิธีที่ 2: เขียน telemetry เอง
Root Span: HTTP GET /users/:id  
├── Child Span: user-lookup-business (business logic + telemetry)
│   └── Child Span: db-user-select-by-id (จาก repository)
└── Response

วิธีที่ 3: แยก service layer
Root Span: HTTP GET /users/:id
├── Child Span: service-get-user (จาก service layer)
│   └── Child Span: db-user-select-by-id (จาก repository)
└── Response
*/

// ========================================
// สรุป: createBusinessLogicMiddleware ทำอะไร
// ========================================

/*
createBusinessLogicMiddleware('user-lookup') จะสร้าง middleware ที่:

async (context, next) => {
  const { span, logger, finish } = createChildSpan(context, 'user-lookup', options);
  
  try {
    logger.info('user-lookup started');
    await next(); // 🔥 เรียก middleware ตัวถัดไป (business logic ของเรา)
    logger.info('user-lookup completed successfully');
  } catch (error) {
    logger.error('user-lookup failed', error);
    throw error;
  } finally {
    finish();
  }
}

มันเป็นแค่ telemetry wrapper ไม่มี business logic!
*/

export {
  telemetryWrapperOnly,
  actualUserLookupLogic,
  userLookupWithTelemetry,
  userLookupMiddleware
};
