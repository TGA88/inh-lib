/**
 * Example: Repository Pattern with Child Spans
 * 
 * แสดงวิธีการสร้าง child spans ในแต่ละ layer:
 * - Service Layer: Business logic spans
 * - Repository Layer: Database operation spans
 * - Cache Layer: Cache operation spans
 */

import { 
  UnifiedHttpContext, 
  composeMiddleware,
  addRegistryItem,
  getRegistryItem
} from '@inh-lib/unified-route';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

// Mock interfaces for example
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  exists(id: string): Promise<boolean>;
}

interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

// Repository implementation with telemetry
class UserRepositoryWithTelemetry implements UserRepository {
  constructor(
    private telemetryService: TelemetryMiddlewareService,
    private dbConnection: any // Your actual DB connection
  ) {}

  async findById(id: string): Promise<User | null> {
    // ไม่มี context ที่นี่ เพราะเป็น repository method
    // จะรับ context จาก service layer แทน
    throw new Error('Use findByIdWithContext instead');
  }

  async findByIdWithContext(context: UnifiedHttpContext, id: string): Promise<User | null> {
    // สร้าง child span สำหรับ database operation
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context, 
      'db-user-select-by-id', 
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'select',
          'db.table': 'users',
          'db.query_type': 'select_by_id',
          'user.id': id
        }
      }
    );

    try {
      logger.info('Executing user lookup query', { userId: id });
      
      // Add database-specific attributes
      span.setTag('db.statement', 'SELECT * FROM users WHERE id = ?');
      span.setTag('db.connection_string', 'postgresql://localhost:5432/mydb');
      
      // Simulate database query
      const startTime = Date.now();
      const user = await this.dbConnection.query(
        'SELECT * FROM users WHERE id = ?', 
        [id]
      );
      const duration = Date.now() - startTime;
      
      // Add performance metrics to span
      span.setTag('db.query_duration_ms', duration);
      span.setTag('db.rows_affected', user ? 1 : 0);
      
      if (user) {
        logger.info('User found in database', { 
          userId: id, 
          queryDuration: duration 
        });
        span.setTag('db.result', 'found');
      } else {
        logger.info('User not found in database', { 
          userId: id, 
          queryDuration: duration 
        });
        span.setTag('db.result', 'not_found');
      }
      
      return user;
      
    } catch (error) {
      logger.error('Database query failed', error, {
        userId: id,
        errorType: 'database_error'
      });
      throw error;
    } finally {
      finish();
    }
  }

  async updateWithContext(context: UnifiedHttpContext, id: string, data: Partial<User>): Promise<User> {
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db-user-update',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'update',
          'db.table': 'users',
          'user.id': id,
          'update.fields_count': Object.keys(data).length
        }
      }
    );

    try {
      logger.info('Executing user update query', { 
        userId: id, 
        updateFields: Object.keys(data) 
      });
      
      span.setTag('db.statement', 'UPDATE users SET ... WHERE id = ?');
      
      const startTime = Date.now();
      const updatedUser = await this.dbConnection.query(
        'UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING *',
        [data.name, data.email, id]
      );
      const duration = Date.now() - startTime;
      
      span.setTag('db.query_duration_ms', duration);
      span.setTag('db.rows_affected', 1);
      
      logger.info('User updated successfully', { 
        userId: id, 
        queryDuration: duration 
      });
      
      return updatedUser;
      
    } catch (error) {
      logger.error('User update failed', error, {
        userId: id,
        errorType: 'database_error'
      });
      throw error;
    } finally {
      finish();
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    throw new Error('Use updateWithContext instead');
  }

  async exists(id: string): Promise<boolean> {
    throw new Error('Use existsWithContext instead');
  }

  async existsWithContext(context: UnifiedHttpContext, id: string): Promise<boolean> {
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db-user-exists-check',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'select',
          'db.table': 'users',
          'db.query_type': 'exists_check',
          'user.id': id
        }
      }
    );

    try {
      logger.info('Checking if user exists', { userId: id });
      
      span.setTag('db.statement', 'SELECT COUNT(*) FROM users WHERE id = ?');
      
      const startTime = Date.now();
      const count = await this.dbConnection.query(
        'SELECT COUNT(*) as count FROM users WHERE id = ?',
        [id]
      );
      const duration = Date.now() - startTime;
      
      const exists = count.count > 0;
      
      span.setTag('db.query_duration_ms', duration);
      span.setTag('db.result', exists ? 'exists' : 'not_exists');
      
      logger.info('User existence check completed', { 
        userId: id, 
        exists, 
        queryDuration: duration 
      });
      
      return exists;
      
    } catch (error) {
      logger.error('User existence check failed', error, {
        userId: id,
        errorType: 'database_error'
      });
      throw error;
    } finally {
      finish();
    }
  }
}

// Cache service with telemetry
class CacheServiceWithTelemetry implements CacheService {
  constructor(
    private telemetryService: TelemetryMiddlewareService,
    private redisClient: any // Your Redis client
  ) {}

  async getWithContext<T>(context: UnifiedHttpContext, key: string): Promise<T | null> {
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'cache-get',
      {
        operationType: 'cache',
        layer: 'data',
        attributes: {
          'cache.operation': 'get',
          'cache.key': key,
          'cache.type': 'redis'
        }
      }
    );

    try {
      logger.info('Getting data from cache', { cacheKey: key });
      
      const startTime = Date.now();
      const value = await this.redisClient.get(key);
      const duration = Date.now() - startTime;
      
      span.setTag('cache.duration_ms', duration);
      span.setTag('cache.hit', value !== null);
      
      if (value) {
        logger.info('Cache hit', { cacheKey: key, duration });
        return JSON.parse(value);
      } else {
        logger.info('Cache miss', { cacheKey: key, duration });
        return null;
      }
      
    } catch (error) {
      logger.error('Cache get operation failed', error, {
        cacheKey: key,
        errorType: 'cache_error'
      });
      return null; // Don't throw for cache errors
    } finally {
      finish();
    }
  }

  async setWithContext<T>(
    context: UnifiedHttpContext, 
    key: string, 
    value: T, 
    ttl?: number
  ): Promise<void> {
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'cache-set',
      {
        operationType: 'cache',
        layer: 'data',
        attributes: {
          'cache.operation': 'set',
          'cache.key': key,
          'cache.ttl': ttl || 0,
          'cache.type': 'redis'
        }
      }
    );

    try {
      logger.info('Setting data in cache', { cacheKey: key, ttl });
      
      const startTime = Date.now();
      if (ttl) {
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
      } else {
        await this.redisClient.set(key, JSON.stringify(value));
      }
      const duration = Date.now() - startTime;
      
      span.setTag('cache.duration_ms', duration);
      span.setTag('cache.success', true);
      
      logger.info('Data cached successfully', { cacheKey: key, duration });
      
    } catch (error) {
      logger.error('Cache set operation failed', error, {
        cacheKey: key,
        errorType: 'cache_error'
      });
      // Don't throw for cache errors
    } finally {
      finish();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    throw new Error('Use getWithContext instead');
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    throw new Error('Use setWithContext instead');
  }
}

// Service layer with complete tracing
class UserService {
  constructor(
    private telemetryService: TelemetryMiddlewareService,
    private userRepository: UserRepositoryWithTelemetry,
    private cacheService: CacheServiceWithTelemetry
  ) {}

  async getUserById(context: UnifiedHttpContext, id: string): Promise<User | null> {
    // Service layer จะสร้าง business span
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'service-get-user-by-id',
      {
        operationType: 'business',
        layer: 'service',
        attributes: {
          'service.operation': 'get_user',
          'user.id': id
        }
      }
    );

    try {
      logger.info('Starting user lookup service', { userId: id });

      // Step 1: Check cache first - จะสร้าง child span ใน cache service
      const cacheKey = `user:${id}`;
      let user = await this.cacheService.getWithContext<User>(context, cacheKey);
      
      if (user) {
        span.setTag('data.source', 'cache');
        logger.info('User found in cache', { userId: id });
        return user;
      }

      // Step 2: Query database - จะสร้าง child span ใน repository
      user = await this.userRepository.findByIdWithContext(context, id);
      
      if (user) {
        span.setTag('data.source', 'database');
        
        // Step 3: Cache the result - จะสร้าง child span ใน cache service
        await this.cacheService.setWithContext(context, cacheKey, user, 1800); // 30 minutes
        
        logger.info('User found in database and cached', { userId: id });
      } else {
        span.setTag('data.source', 'none');
        logger.info('User not found', { userId: id });
      }

      span.setTag('service.result', user ? 'found' : 'not_found');
      return user;

    } catch (error) {
      logger.error('User lookup service failed', error, {
        userId: id,
        errorType: 'service_error'
      });
      throw error;
    } finally {
      finish();
    }
  }

  async updateUser(context: UnifiedHttpContext, id: string, data: Partial<User>): Promise<User> {
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'service-update-user',
      {
        operationType: 'business',
        layer: 'service',
        attributes: {
          'service.operation': 'update_user',
          'user.id': id,
          'update.fields': Object.keys(data).join(',')
        }
      }
    );

    try {
      logger.info('Starting user update service', { 
        userId: id, 
        updateFields: Object.keys(data) 
      });

      // Step 1: Check if user exists
      const exists = await this.userRepository.existsWithContext(context, id);
      if (!exists) {
        throw new Error(`User with id ${id} not found`);
      }

      // Step 2: Update user in database
      const updatedUser = await this.userRepository.updateWithContext(context, id, data);
      
      // Step 3: Invalidate cache
      const cacheKey = `user:${id}`;
      await this.cacheService.setWithContext(context, cacheKey, updatedUser, 1800);

      span.setTag('service.result', 'updated');
      logger.info('User updated successfully', { userId: id });

      return updatedUser;

    } catch (error) {
      logger.error('User update service failed', error, {
        userId: id,
        errorType: 'service_error'
      });
      throw error;
    } finally {
      finish();
    }
  }
}

// Setup dependencies
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'user-api',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true
});

const userRepository = new UserRepositoryWithTelemetry(telemetryService, dbConnection);
const cacheService = new CacheServiceWithTelemetry(telemetryService, redisClient);
const userService = new UserService(telemetryService, userRepository, cacheService);

// Updated middleware with repository integration
const userLookupBusinessLogic = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  try {
    const userId = context.request.params.id;
    
    // Use service layer which will create child spans for repo and cache
    const user = await userService.getUserById(context, userId);
    
    if (!user) {
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Store user in registry for next middleware
    addRegistryItem(context, 'user', user);
    
    await next();
    
  } catch (error) {
    console.error('User lookup failed:', error);
    context.response.status(500).json({ error: 'Internal server error' });
  }
};

const userUpdateBusinessLogic = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  try {
    const userId = context.request.params.id;
    const updateData = context.request.body as Partial<User>;
    
    // Use service layer which will create child spans for repo operations
    const updatedUser = await userService.updateUser(context, userId, updateData);
    
    // Store updated user in registry for next middleware
    addRegistryItem(context, 'updatedUser', updatedUser);
    
    await next();
    
  } catch (error) {
    console.error('User update failed:', error);
    context.response.status(500).json({ error: 'Internal server error' });
  }
};

// Complete middleware chain for GET /users/:id
const getUserMiddlewares = [
  telemetryService.createMiddleware(),
  telemetryService.createValidationMiddleware('input-validation'),
  telemetryService.createBusinessLogicMiddleware('user-lookup'),
  userLookupBusinessLogic, // This will create child spans for cache + database
];

const getUserHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<User>(context, 'user');
  
  if (user instanceof Error) {
    context.response.status(500).json({ error: 'User data not available' });
    return;
  }
  
  context.response.json({ user });
};

// Complete middleware chain for PUT /users/:id
const updateUserMiddlewares = [
  telemetryService.createMiddleware(),
  telemetryService.createValidationMiddleware('input-validation'),
  telemetryService.createValidationMiddleware('permission-check'),
  telemetryService.createBusinessLogicMiddleware('user-update'),
  userUpdateBusinessLogic, // This will create child spans for existence check + update + cache
];

const updateUserHandler = async (context: UnifiedHttpContext) => {
  const updatedUser = getRegistryItem<User>(context, 'updatedUser');
  
  if (updatedUser instanceof Error) {
    context.response.status(500).json({ error: 'User update failed' });
    return;
  }
  
  context.response.json({ 
    message: 'User updated successfully',
    user: updatedUser 
  });
};

// Composed handlers
const composedGetUserHandler = composeMiddleware(getUserMiddlewares)(getUserHandler);
const composedUpdateUserHandler = composeMiddleware(updateUserMiddlewares)(updateUserHandler);

/* 
 * Expected Trace Structure สำหรับ GET /users/:id:
 * 
 * Root Span: HTTP GET /users/:id
 * ├── Child Span: validation:input-validation
 * ├── Child Span: user-lookup (business middleware)
 * │   └── Child Span: service-get-user-by-id (service layer)
 * │       ├── Child Span: cache-get (cache check)
 * │       ├── Child Span: db-user-select-by-id (database query)
 * │       └── Child Span: cache-set (cache store)
 * └── Final response
 * 
 * Expected Trace Structure สำหรับ PUT /users/:id:
 * 
 * Root Span: HTTP PUT /users/:id
 * ├── Child Span: validation:input-validation
 * ├── Child Span: validation:permission-check
 * ├── Child Span: user-update (business middleware)
 * │   └── Child Span: service-update-user (service layer)
 * │       ├── Child Span: db-user-exists-check (existence check)
 * │       ├── Child Span: db-user-update (database update)
 * │       └── Child Span: cache-set (cache update)
 * └── Final response
 * 
 * แต่ละ span จะมี:
 * - Operation-specific attributes (db.table, cache.key, etc.)
 * - Performance metrics (duration, rows_affected, etc.)
 * - Error tracking และ status codes
 * - Layer และ operation type ที่ชัดเจน
 */

export { 
  UserService, 
  UserRepositoryWithTelemetry, 
  CacheServiceWithTelemetry,
  composedGetUserHandler,
  composedUpdateUserHandler
};
