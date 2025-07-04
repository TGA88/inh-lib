/**
 * Example: Business Logic Steps with Telemetry Middleware
 * 
 * This example shows how to use TelemetryMiddlewareService with
 * multiple business logic steps, each creating child spans for
 * detailed distributed tracing.
 */

import { 
  UnifiedHttpContext, 
  UnifiedMiddleware, 
  composeMiddleware 
} from '@inh-lib/unified-route';
import { OpenTelemetryProvider } from '@inh-lib/unified-telemetry-otel';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

// Setup telemetry
const telemetryProvider = new OpenTelemetryProvider({
  serviceName: 'user-api',
  serviceVersion: '1.0.0',
  environment: 'production'
});

const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'user-api',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true,
  customAttributes: {
    'service.team': 'backend',
    'service.domain': 'user-management'
  }
});

// Create business logic middlewares for different steps
const validationStep1 = telemetryService.createValidationMiddleware('input-validation', {
  layer: 'service',
  logValidationDetails: true,
  attributes: {
    'validation.step': '1',
    'validation.scope': 'input'
  }
});

const businessStep1 = telemetryService.createBusinessLogicMiddleware('user-lookup', {
  operationType: 'business',
  layer: 'service',
  attributes: {
    'business.step': '1',
    'business.operation': 'lookup'
  }
});

const validationStep2 = telemetryService.createValidationMiddleware('permission-check', {
  layer: 'service',
  attributes: {
    'validation.step': '2',
    'validation.scope': 'authorization'
  }
});

const businessStep2 = telemetryService.createBusinessLogicMiddleware('user-update', {
  operationType: 'business',
  layer: 'data',
  attributes: {
    'business.step': '2',
    'business.operation': 'update'
  }
});

// Example: Composed middleware chain for PUT /users/:id
const updateUserMiddlewares = [
  // Main telemetry middleware (should be first)
  telemetryService.createMiddleware(),
  
  // Step 1: Input validation
  validationStep1,
  async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const { logger } = telemetryService.createChildSpan(context, 'validate-user-input', {
      operationType: 'validation',
      layer: 'service'
    });
    
    try {
      const userId = context.request.params.id;
      const userData = context.request.body;
      
      // Validate input
      if (!userId || !userData) {
        throw new Error('Missing required parameters');
      }
      
      logger.info('Input validation passed', { userId, hasUserData: !!userData });
      await next();
    } catch (error) {
      logger.error('Input validation failed', error);
      throw error;
    }
  },
  
  // Step 2: Business logic - User lookup
  businessStep1,
  async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const { span, logger, finish } = telemetryService.createChildSpan(context, 'lookup-existing-user', {
      operationType: 'business',
      layer: 'service'
    });
    
    try {
      const userId = context.request.params.id;
      
      // Simulate user lookup
      logger.info('Looking up user', { userId });
      
      // Add custom attributes to span
      span.setTag('user.id', userId);
      span.setTag('operation.type', 'lookup');
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Store user in registry for next steps
      context.registry.user = { id: userId, name: 'John Doe' };
      
      logger.info('User lookup completed', { found: true });
      await next();
    } catch (error) {
      logger.error('User lookup failed', error);
      throw error;
    } finally {
      finish();
    }
  },
  
  // Step 3: Permission validation  
  validationStep2,
  async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const { span, logger, finish } = telemetryService.createChildSpan(context, 'check-user-permissions', {
      operationType: 'validation',
      layer: 'service'
    });
    
    try {
      const user = context.registry.user as { id: string; name: string };
      
      logger.info('Checking user permissions', { userId: user.id });
      
      // Simulate permission check
      const hasPermission = true; // Simulate permission logic
      
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }
      
      span.setTag('permission.granted', hasPermission);
      logger.info('Permission check passed', { userId: user.id });
      
      await next();
    } catch (error) {
      logger.error('Permission check failed', error);
      throw error;
    } finally {
      finish();
    }
  },
  
  // Step 4: Business logic - User update
  businessStep2, 
  async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const { span, logger, finish } = telemetryService.createChildSpan(context, 'update-user-data', {
      operationType: 'business',
      layer: 'data'
    });
    
    try {
      const user = context.registry.user as { id: string; name: string };
      const updateData = context.request.body as Record<string, unknown>;
      
      logger.info('Updating user data', { userId: user.id, updateFields: Object.keys(updateData) });
      
      // Simulate database update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      span.setTag('database.operation', 'update');
      span.setTag('database.table', 'users');
      span.setTag('update.fields_count', Object.keys(updateData).length);
      
      logger.info('User data updated successfully', { userId: user.id });
      
      await next();
    } catch (error) {
      logger.error('User update failed', error);
      throw error;
    } finally {
      finish();
    }
  },
];

// Final route handler
const updateUserHandler = async (context: UnifiedHttpContext) => {
  // Get current logger for final response
  const logger = telemetryService.getCurrentLogger(context);
  const span = telemetryService.getCurrentSpan(context);
  
  if (logger && span) {
    logger.info('Request processing completed successfully');
    span.setTag('response.success', true);
  }
  
  context.response.json({ 
    message: 'User updated successfully',
    userId: context.request.params.id,
    timestamp: new Date().toISOString()
  });
};

// Compose the complete handler
const composedUpdateUserHandler = composeMiddleware(updateUserMiddlewares)(updateUserHandler);

// Health check example (simpler telemetry)
const healthCheckMiddlewares = [
  telemetryService.createMiddleware()
];

const healthCheckHandler = async (context: UnifiedHttpContext) => {
  const logger = telemetryService.getCurrentLogger(context);
  
  if (logger) {
    logger.info('Health check requested');
  }
  
  context.response.json({ status: 'ok', timestamp: new Date().toISOString() });
};

const composedHealthCheckHandler = composeMiddleware(healthCheckMiddlewares)(healthCheckHandler);

// Integration Examples:

// Express.js Integration
/*
import express from 'express';
const app = express();

app.put('/users/:id', async (req, res) => {
  const context = createExpressContext(req, res);
  await composedUpdateUserHandler(context);
});

app.get('/health', async (req, res) => {
  const context = createExpressContext(req, res);  
  await composedHealthCheckHandler(context);
});
*/

// Fastify Integration
/*
import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

fastify.put('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await composedUpdateUserHandler(context);
});

fastify.get('/health', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await composedHealthCheckHandler(context);
});
*/

// Using the new UnifiedApp (if available)
/*
import { createUnifiedApp } from '@inh-lib/unified-route';

const app = createUnifiedApp();

// Apply handlers
app.put('/users/:id', ...updateUserMiddlewares, updateUserHandler);
app.get('/health', ...healthCheckMiddlewares, healthCheckHandler);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
*/

/* 
 * Expected Trace Structure:
 * 
 * Root Span: HTTP PUT /users/:id
 * ├── Child Span: validation:input-validation
 * ├── Child Span: validate-user-input
 * ├── Child Span: user-lookup 
 * │   └── Child Span: lookup-existing-user
 * ├── Child Span: validation:permission-check
 * │   └── Child Span: check-user-permissions  
 * ├── Child Span: user-update
 * │   └── Child Span: update-user-data
 * └── Final response logging
 * 
 * Each span will have:
 * - Proper parent-child relationships
 * - Operation-specific attributes
 * - Performance metrics
 * - Error tracking if failures occur
 * - Structured logging with trace correlation
 */
