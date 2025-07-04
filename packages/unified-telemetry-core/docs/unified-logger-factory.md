// =============================================================================
// 🏷️ RENAMED: Clear Interface vs Implementation Naming
// =============================================================================

// =============================================================================
// 📋 INTERFACES (types/logger.ts)
// =============================================================================

export interface UnifiedLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, error?: Error, attributes?: Record<string, unknown>): void;
  
  // Span integration methods
  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
  setSpanAttribute(key: string, value: string | number | boolean): void;
  finishSpan(): void;
  
  // Context management
  createChildContext(operationName: string): UnifiedLoggerContext;
  createChildLogger(childContext: UnifiedLoggerContext): UnifiedLogger;
  getSpanId(): string;
}

export interface UnifiedBaseTelemetryLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
}

// ✅ Context object - ชื่อเดิมเก็บไว้เพราะชัดเจนแล้ว
export interface UnifiedLoggerContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationType: 'http' | 'business' | 'database' | 'utility';
  operationName: string;
  layer: 'http' | 'service' | 'data' | 'core';
  attributes: Record<string, string | number | boolean>;
  startTime: Date;
}

// =============================================================================
// 🛠️ IMPLEMENTATIONS (services/default-unified-logger.ts)
// =============================================================================

// ✅ ชื่อใหม่: Default implementation ของ UnifiedLogger interface
export class DefaultUnifiedLogger implements UnifiedLogger {
  constructor(
    private baseLogger: UnifiedBaseTelemetryLogger,
    private context: UnifiedLoggerContext,
    private span?: UnifiedTelemetrySpan
  ) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('debug', message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('info', message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('warn', message, attributes);
    
    if (this.span) {
      this.span.addEvent('warning', { message, ...attributes });
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
    } : {};

    this.logWithSpan('error', message, { ...errorAttrs, ...attributes });
    
    if (this.span) {
      if (error) {
        this.span.recordException(error);
      }
      this.span.addEvent('error', { message, ...errorAttrs, ...attributes });
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    if (this.span) {
      this.span.addEvent(name, attributes);
    }
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    if (this.span) {
      this.span.setTag(key, value);
    }
  }

  finishSpan(): void {
    if (this.span) {
      this.span.finish();
    }
  }

  getSpanId(): string {
    return this.context.spanId;
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    return {
      ...this.context,
      parentSpanId: this.context.spanId,
      spanId: this.generateSpanId(),
      operationName,
      startTime: new Date(),
    };
  }

  createChildLogger(childContext: UnifiedLoggerContext): UnifiedLogger {
    return new DefaultUnifiedLogger(this.baseLogger, childContext);
  }

  private logWithSpan(level: string, message: string, attributes?: Record<string, unknown>): void {
    const enrichedAttrs = this.enrichAttributes(attributes);
    
    switch (level) {
      case 'debug':
        this.baseLogger.debug(message, enrichedAttrs);
        break;
      case 'info':
        this.baseLogger.info(message, enrichedAttrs);
        break;
      case 'warn':
        this.baseLogger.warn(message, enrichedAttrs);
        break;
      case 'error':
        this.baseLogger.error(message, enrichedAttrs);
        break;
    }

    if (this.span) {
      this.span.addEvent(`log.${level}`, {
        message,
        ...attributes,
      });
    }
  }

  private enrichAttributes(attributes?: Record<string, unknown>): Record<string, unknown> {
    return {
      // Trace context
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      parentSpanId: this.context.parentSpanId,
      
      // Operation context
      layer: this.context.layer,
      operationType: this.context.operationType,
      operationName: this.context.operationName,
      
      // Timing
      timestamp: new Date().toISOString(),
      operationDuration: Date.now() - this.context.startTime.getTime(),
      
      // Context attributes
      ...this.context.attributes,
      
      // Method attributes (highest priority)
      ...attributes,
    };
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

// =============================================================================
// 🏭 FACTORY (services/unified-logger-factory.ts)
// =============================================================================

export class UnifiedLoggerFactory {
  constructor(
    private telemetryService: UnifiedCoreTelemetryService,
    private provider: UnifiedTelemetryProvider
  ) {}

  // ✅ Return type ใช้ interface แทน implementation
  createDataLogger(
    traceId: string,
    operation: string,
    table: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    const span = this.telemetryService.createDatabaseSpan(operation, table);
    
    span.setTag('db.operation', operation);
    span.setTag('db.table', table);
    span.setTag('trace.id', traceId);
    
    if (additionalAttributes) {
      Object.entries(additionalAttributes).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.extractSpanId(span),
      operationType: 'database',
      operationName: operation,
      layer: 'data',
      attributes: {
        'db.table': table,
        'db.operation': operation,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    // ✅ สร้าง implementation แต่ return interface
    const logger = new DefaultUnifiedLogger(this.provider.baseLogger, context, span);

    return { logger, span };
  }

  createServiceLogger(
    traceId: string,
    operation: string,
    entityType: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    const span = this.telemetryService.createBusinessSpan(operation);
    
    span.setTag('business.operation', operation);
    span.setTag('business.entity', entityType);
    span.setTag('trace.id', traceId);
    
    if (additionalAttributes) {
      Object.entries(additionalAttributes).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.extractSpanId(span),
      operationType: 'business',
      operationName: operation,
      layer: 'service',
      attributes: {
        'business.entity': entityType,
        'business.operation': operation,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    const logger = new DefaultUnifiedLogger(this.provider.baseLogger, context, span);

    return { logger, span };
  }

  createCoreLogger(
    traceId: string,
    operation: string,
    utilityType: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    const span = this.telemetryService.createUtilitySpan(operation);
    
    span.setTag('utility.operation', operation);
    span.setTag('utility.type', utilityType);
    span.setTag('trace.id', traceId);
    
    if (additionalAttributes) {
      Object.entries(additionalAttributes).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.extractSpanId(span),
      operationType: 'utility',
      operationName: operation,
      layer: 'core',
      attributes: {
        'utility.type': utilityType,
        'utility.operation': operation,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    const logger = new DefaultUnifiedLogger(this.provider.baseLogger, context, span);

    return { logger, span };
  }

  createHttpLogger(
    traceId: string,
    method: string,
    url: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    const span = this.telemetryService.provider.tracer.startSpan(`http.${method} ${url}`, {
      kind: UnifiedSpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': url,
        'trace.id': traceId,
        ...additionalAttributes,
      },
    });

    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.extractSpanId(span),
      operationType: 'http',
      operationName: `${method} ${url}`,
      layer: 'http',
      attributes: {
        'http.method': method,
        'http.url': url,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    const logger = new DefaultUnifiedLogger(this.provider.baseLogger, context, span);

    return { logger, span };
  }

  createChildLogger(
    parentLogger: UnifiedLogger,
    operationName: string,
    operationType?: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    const childSpan = this.telemetryService.provider.tracer.startSpan(operationName, {
      attributes: {
        'parent.span.id': parentLogger.getSpanId(),
        'operation.name': operationName,
        ...additionalAttributes,
      },
    });

    const childContext = parentLogger.createChildContext(operationName);
    childContext.spanId = this.extractSpanId(childSpan);
    
    if (operationType) {
      childContext.operationType = operationType as any;
    }
    
    if (additionalAttributes) {
      Object.assign(childContext.attributes, additionalAttributes);
    }

    const childLogger = new DefaultUnifiedLogger(this.provider.baseLogger, childContext, childSpan);

    return { logger: childLogger, span: childSpan };
  }

  // ✅ NEW: Custom logger สำหรับ layer/operation ที่ไม่ standard
  createCustomLogger(
    traceId: string,
    operationName: string,
    layer: 'data' | 'service' | 'core' | 'http' | 'integration' | 'queue' | 'cache' | 'auth' | 'notification' | string,
    operationType: 'database' | 'business' | 'utility' | 'http' | 'queue' | 'cache' | 'auth' | 'notification' | 'integration' | 'external' | string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    // ✅ สร้าง generic span ผ่าน telemetryService
    const span = this.telemetryService.createSpan(operationType, operationName);
    
    // Set basic span attributes
    span.setTag('operation.name', operationName);
    span.setTag('operation.type', operationType);
    span.setTag('operation.layer', layer);
    span.setTag('trace.id', traceId);
    
    // Set additional attributes
    if (additionalAttributes) {
      Object.entries(additionalAttributes).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.extractSpanId(span),
      operationType: operationType as any,
      operationName,
      layer: layer as any,
      attributes: {
        'operation.name': operationName,
        'operation.type': operationType,
        'operation.layer': layer,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    const logger = new DefaultUnifiedLogger(this.provider.baseLogger, context, span);

    this.recordCustomLoggerMetrics(layer, operationType);

    return { logger, span };
  }

  // ✅ NEW: Custom logger แบบไม่สร้าง span (สำหรับ external libraries)
  createCustomLoggerWithoutSpan(
    traceId: string,
    operationName: string,
    layer: string,
    operationType: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): UnifiedLogger {
    
    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.generateSpanId(),
      operationType: operationType as any,
      operationName,
      layer: layer as any,
      attributes: {
        'operation.name': operationName,
        'operation.type': operationType,
        'operation.layer': layer,
        'span.created': false, // บอกว่าไม่ได้สร้าง span
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    // ไม่ส่ง span เข้าไป
    const logger = new DefaultUnifiedLogger(this.provider.baseLogger, context);

    this.recordCustomLoggerMetrics(layer, operationType);

    return logger;
  }

  // ✅ NEW: Custom logger with parent context (สำหรับ nested operations)
  createCustomChildLogger(
    parentLogger: UnifiedLogger,
    operationName: string,
    operationType: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    const childSpan = this.telemetryService.provider.tracer.startSpan(operationName, {
      attributes: {
        'parent.span.id': parentLogger.getSpanId(),
        'operation.name': operationName,
        'operation.type': operationType,
        ...additionalAttributes,
      },
    });

    const childContext = parentLogger.createChildContext(operationName);
    childContext.spanId = this.extractSpanId(childSpan);
    childContext.operationType = operationType as any;
    
    if (additionalAttributes) {
      Object.assign(childContext.attributes, additionalAttributes);
    }

    const childLogger = new DefaultUnifiedLogger(this.provider.baseLogger, childContext, childSpan);

    return { logger: childLogger, span: childSpan };
  }

  // ✅ NEW: Batch logger สำหรับ background jobs
  createBatchLogger(
    traceId: string,
    batchName: string,
    batchSize: number,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    return this.createCustomLogger(
      traceId,
      batchName,
      'integration',
      'queue',
      {
        'batch.name': batchName,
        'batch.size': batchSize,
        'batch.type': 'background_job',
        ...additionalAttributes,
      }
    );
  }

  // ✅ NEW: External API logger
  createExternalApiLogger(
    traceId: string,
    apiName: string,
    method: string,
    endpoint: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    return this.createCustomLogger(
      traceId,
      `${apiName}_${method}`,
      'integration',
      'external',
      {
        'external.api.name': apiName,
        'external.api.method': method,
        'external.api.endpoint': endpoint,
        'external.api.type': 'http_client',
        ...additionalAttributes,
      }
    );
  }

  // ✅ NEW: Cache operation logger
  createCacheLogger(
    traceId: string,
    operation: 'get' | 'set' | 'delete' | 'clear',
    key: string,
    cacheType: 'redis' | 'memory' | 'file' | string = 'redis',
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    return this.createCustomLogger(
      traceId,
      `cache_${operation}`,
      'integration',
      'cache',
      {
        'cache.operation': operation,
        'cache.key': key,
        'cache.type': cacheType,
        ...additionalAttributes,
      }
    );
  }

  // ✅ NEW: Queue operation logger
  createQueueLogger(
    traceId: string,
    operation: 'publish' | 'consume' | 'ack' | 'nack',
    queueName: string,
    messageId?: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    return this.createCustomLogger(
      traceId,
      `queue_${operation}`,
      'integration',
      'queue',
      {
        'queue.operation': operation,
        'queue.name': queueName,
        'queue.message.id': messageId || 'unknown',
        ...additionalAttributes,
      }
    );
  }

  // ✅ NEW: Authentication logger
  createAuthLogger(
    traceId: string,
    operation: 'login' | 'logout' | 'verify' | 'refresh',
    userId?: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    return this.createCustomLogger(
      traceId,
      `auth_${operation}`,
      'auth',
      'auth',
      {
        'auth.operation': operation,
        'auth.user.id': userId || 'anonymous',
        ...additionalAttributes,
      }
    );
  }

  // ✅ NEW: Notification logger
  createNotificationLogger(
    traceId: string,
    channel: 'email' | 'sms' | 'push' | 'webhook',
    recipientId: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): { logger: UnifiedLogger; span: UnifiedTelemetrySpan } {
    
    return this.createCustomLogger(
      traceId,
      `notification_${channel}`,
      'notification',
      'notification',
      {
        'notification.channel': channel,
        'notification.recipient.id': recipientId,
        ...additionalAttributes,
      }
    );
  }

  private extractSpanId(span: UnifiedTelemetrySpan): string {
    return this.generateSpanId();
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  // ✅ Helper method สำหรับ record custom logger metrics
  private recordCustomLoggerMetrics(layer: string, operationType: string): void {
    const counter = this.telemetryService.provider.metrics.createCounter(
      'telemetry_custom_loggers_created_total',
      'Total number of custom telemetry loggers created'
    );
    
    counter.add(1, {
      layer,
      operation_type: operationType,
      logger_type: 'custom',
    });
  }
}

// =============================================================================
// 🎯 ALTERNATIVE IMPLEMENTATIONS (เตรียมไว้สำหรับอนาคต)
// =============================================================================

// ✅ Console implementation สำหรับ development
export class ConsoleUnifiedLogger implements UnifiedLogger {
  constructor(private context: UnifiedLoggerContext) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${message}`, { ...this.getBaseAttributes(), ...attributes });
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, { ...this.getBaseAttributes(), ...attributes });
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, { ...this.getBaseAttributes(), ...attributes });
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? { error: error.message, stack: error.stack } : {};
    console.error(`[ERROR] ${message}`, { 
      ...this.getBaseAttributes(), 
      ...errorAttrs, 
      ...attributes 
    });
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    console.debug(`[SPAN-EVENT] ${name}`, attributes);
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    console.debug(`[SPAN-ATTR] ${key}=${value}`);
  }

  finishSpan(): void {
    console.debug(`[SPAN-FINISH] ${this.context.operationName}`);
  }

  getSpanId(): string {
    return this.context.spanId;
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    return {
      ...this.context,
      parentSpanId: this.context.spanId,
      spanId: Math.random().toString(36).substr(2, 16),
      operationName,
      startTime: new Date(),
    };
  }

  createChildLogger(childContext: UnifiedLoggerContext): UnifiedLogger {
    return new ConsoleUnifiedLogger(childContext);
  }

  private getBaseAttributes(): Record<string, unknown> {
    return {
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      layer: this.context.layer,
      operationType: this.context.operationType,
      timestamp: new Date().toISOString(),
    };
  }
}

// ✅ NoOp implementation สำหรับ disabled telemetry
export class NoOpUnifiedLogger implements UnifiedLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  addSpanEvent(): void {}
  setSpanAttribute(): void {}
  finishSpan(): void {}
  
  getSpanId(): string {
    return 'noop';
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    return {
      traceId: 'noop',
      spanId: 'noop',
      operationType: 'utility',
      operationName,
      layer: 'core',
      attributes: {},
      startTime: new Date(),
    };
  }

  createChildLogger(): UnifiedLogger {
    return new NoOpUnifiedLogger();
  }
}

// =============================================================================
// 📝 CUSTOM LOGGER USAGE EXAMPLES
// =============================================================================

// ================= CUSTOM LAYER EXAMPLES =================

// ✅ Example 1: Integration Layer - Third-party API calls
export class PaymentService {
  constructor(
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async processPayment(traceId: string, paymentData: PaymentData): Promise<PaymentResult> {
    // ✅ Custom logger สำหรับ integration layer
    const { logger, span } = this.loggerFactory.createCustomLogger(
      traceId,
      'process_payment',
      'integration',      // custom layer
      'external',         // operation type
      {
        'payment.amount': paymentData.amount,
        'payment.currency': paymentData.currency,
        'payment.provider': 'stripe',
      }
    );

    logger.info('Starting payment processing', {
      amount: paymentData.amount,
      currency: paymentData.currency,
    });

    try {
      // External API call with custom child logger
      const { logger: apiLogger, span: apiSpan } = this.loggerFactory.createExternalApiLogger(
        traceId,
        'stripe',
        'POST',
        '/v1/charges',
        { 'api.timeout': 30000 }
      );

      try {
        apiLogger.info('Calling Stripe API');
        const result = await this.callStripeAPI(paymentData);
        apiLogger.info('Stripe API call successful', { chargeId: result.id });
        return result;
      } finally {
        apiLogger.finishSpan();
      }

    } catch (error) {
      logger.error('Payment processing failed', error as Error);
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  private async callStripeAPI(paymentData: PaymentData): Promise<PaymentResult> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));
    return { id: 'ch_123', status: 'succeeded' };
  }
}

// ✅ Example 2: Queue/Background Job Processing
export class EmailQueueProcessor {
  constructor(
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async processBatch(traceId: string, emails: EmailData[]): Promise<void> {
    // ✅ Batch logger
    const { logger, span } = this.loggerFactory.createBatchLogger(
      traceId,
      'email_batch_processing',
      emails.length,
      {
        'batch.type': 'email_notifications',
        'batch.priority': 'normal',
      }
    );

    logger.info('Starting email batch processing', { 
      batchSize: emails.length 
    });

    try {
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        
        // ✅ Child logger สำหรับแต่ละ email
        const { logger: emailLogger, span: emailSpan } = this.loggerFactory.createCustomChildLogger(
          logger,
          `process_email_${i + 1}`,
          'notification',
          {
            'email.to': email.to,
            'email.template': email.template,
            'batch.item.index': i + 1,
          }
        );

        try {
          emailLogger.info('Processing individual email', { 
            to: email.to,
            template: email.template 
          });
          
          await this.sendEmail(email);
          emailLogger.info('Email sent successfully');
        } catch (error) {
          emailLogger.error('Failed to send email', error as Error);
          // Continue with next email
        } finally {
          emailLogger.finishSpan();
        }
      }

      logger.info('Batch processing completed');
    } catch (error) {
      logger.error('Batch processing failed', error as Error);
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  async processQueueMessage(traceId: string, message: QueueMessage): Promise<void> {
    // ✅ Queue logger
    const { logger, span } = this.loggerFactory.createQueueLogger(
      traceId,
      'consume',
      'email_notifications',
      message.id,
      {
        'queue.message.retry_count': message.retryCount,
        'queue.message.priority': message.priority,
      }
    );

    logger.info('Processing queue message', {
      messageId: message.id,
      retryCount: message.retryCount,
    });

    try {
      const emailData = JSON.parse(message.body);
      await this.sendEmail(emailData);
      
      logger.info('Queue message processed successfully');
    } catch (error) {
      logger.error('Queue message processing failed', error as Error);
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  private async sendEmail(email: EmailData): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// ✅ Example 3: Cache Layer
export class CacheService {
  constructor(
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async get<T>(traceId: string, key: string): Promise<T | null> {
    // ✅ Cache logger
    const { logger, span } = this.loggerFactory.createCacheLogger(
      traceId,
      'get',
      key,
      'redis',
      {
        'cache.ttl': 3600,
        'cache.namespace': 'user_sessions',
      }
    );

    logger.info('Cache get operation', { key });

    try {
      const startTime = Date.now();
      const value = await this.performCacheGet(key);
      const duration = Date.now() - startTime;

      logger.setSpanAttribute('cache.hit', !!value);
      logger.setSpanAttribute('cache.duration_ms', duration);

      if (value) {
        logger.info('Cache hit', { key, duration });
      } else {
        logger.info('Cache miss', { key, duration });
      }

      return value;
    } catch (error) {
      logger.error('Cache get failed', error as Error, { key });
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  async set(traceId: string, key: string, value: unknown, ttl: number = 3600): Promise<void> {
    const { logger, span } = this.loggerFactory.createCacheLogger(
      traceId,
      'set',
      key,
      'redis',
      {
        'cache.ttl': ttl,
        'cache.value.type': typeof value,
      }
    );

    logger.info('Cache set operation', { key, ttl });

    try {
      await this.performCacheSet(key, value, ttl);
      logger.info('Cache set successful', { key });
    } catch (error) {
      logger.error('Cache set failed', error as Error, { key });
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  private async performCacheGet(key: string): Promise<unknown> {
    await new Promise(resolve => setTimeout(resolve, 10));
    return Math.random() > 0.3 ? { data: 'cached_value' } : null;
  }

  private async performCacheSet(key: string, value: unknown, ttl: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

// ✅ Example 4: Authentication Service
export class AuthService {
  constructor(
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async login(traceId: string, credentials: LoginCredentials): Promise<AuthResult> {
    // ✅ Auth logger
    const { logger, span } = this.loggerFactory.createAuthLogger(
      traceId,
      'login',
      undefined, // ยังไม่รู้ userId
      {
        'auth.method': 'email_password',
        'auth.client_ip': credentials.clientIp,
        'auth.user_agent': credentials.userAgent,
      }
    );

    logger.info('User login attempt', {
      email: credentials.email,
      clientIp: credentials.clientIp,
    });

    try {
      // Validate credentials
      const { logger: validationLogger, span: validationSpan } = this.loggerFactory.createCustomChildLogger(
        logger,
        'validate_credentials',
        'auth',
        { 'validation.method': 'bcrypt' }
      );

      let user: User;
      try {
        validationLogger.info('Validating user credentials');
        user = await this.validateCredentials(credentials);
        validationLogger.info('Credentials validated successfully', { userId: user.id });
      } finally {
        validationLogger.finishSpan();
      }

      // Update logger with user info
      logger.setSpanAttribute('auth.user.id', user.id);
      logger.setSpanAttribute('auth.user.role', user.role);

      // Generate tokens
      const { logger: tokenLogger, span: tokenSpan } = this.loggerFactory.createCustomChildLogger(
        logger,
        'generate_tokens',
        'auth',
        { 'token.type': 'jwt' }
      );

      let tokens: AuthTokens;
      try {
        tokenLogger.info('Generating authentication tokens', { userId: user.id });
        tokens = await this.generateTokens(user);
        tokenLogger.info('Tokens generated successfully');
      } finally {
        tokenLogger.finishSpan();
      }

      logger.info('Login successful', {
        userId: user.id,
        userRole: user.role,
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Login failed', error as Error, {
        email: credentials.email,
        clientIp: credentials.clientIp,
      });
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  private async validateCredentials(credentials: LoginCredentials): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: '123', email: credentials.email, role: 'user' };
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { accessToken: 'jwt_token', refreshToken: 'refresh_token' };
  }
}

// ✅ Example 5: Notification Service
export class NotificationService {
  constructor(
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async sendNotification(
    traceId: string,
    notification: NotificationData
  ): Promise<void> {
    // ✅ Notification logger
    const { logger, span } = this.loggerFactory.createNotificationLogger(
      traceId,
      notification.channel,
      notification.recipientId,
      {
        'notification.type': notification.type,
        'notification.template': notification.template,
        'notification.priority': notification.priority,
      }
    );

    logger.info('Sending notification', {
      channel: notification.channel,
      type: notification.type,
      recipientId: notification.recipientId,
    });

    try {
      switch (notification.channel) {
        case 'email':
          await this.sendEmailNotification(traceId, logger, notification);
          break;
        case 'sms':
          await this.sendSmsNotification(traceId, logger, notification);
          break;
        case 'push':
          await this.sendPushNotification(traceId, logger, notification);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      logger.info('Notification sent successfully');
    } catch (error) {
      logger.error('Notification sending failed', error as Error);
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  private async sendEmailNotification(
    traceId: string,
    parentLogger: UnifiedLogger,
    notification: NotificationData
  ): Promise<void> {
    const { logger, span } = this.loggerFactory.createCustomChildLogger(
      parentLogger,
      'send_email_notification',
      'external',
      {
        'email.provider': 'sendgrid',
        'email.template': notification.template,
      }
    );

    try {
      logger.info('Sending email via SendGrid');
      await new Promise(resolve => setTimeout(resolve, 200));
      logger.info('Email sent successfully via SendGrid');
    } finally {
      logger.finishSpan();
    }
  }

  private async sendSmsNotification(
    traceId: string,
    parentLogger: UnifiedLogger,
    notification: NotificationData
  ): Promise<void> {
    const { logger, span } = this.loggerFactory.createCustomChildLogger(
      parentLogger,
      'send_sms_notification',
      'external',
      {
        'sms.provider': 'twilio',
        'sms.country_code': notification.metadata?.countryCode,
      }
    );

    try {
      logger.info('Sending SMS via Twilio');
      await new Promise(resolve => setTimeout(resolve, 150));
      logger.info('SMS sent successfully via Twilio');
    } finally {
      logger.finishSpan();
    }
  }

  private async sendPushNotification(
    traceId: string,
    parentLogger: UnifiedLogger,
    notification: NotificationData
  ): Promise<void> {
    const { logger, span } = this.loggerFactory.createCustomChildLogger(
      parentLogger,
      'send_push_notification',
      'external',
      {
        'push.provider': 'fcm',
        'push.platform': notification.metadata?.platform,
      }
    );

    try {
      logger.info('Sending push notification via FCM');
      await new Promise(resolve => setTimeout(resolve, 100));
      logger.info('Push notification sent successfully via FCM');
    } finally {
      logger.finishSpan();
    }
  }
}

// ✅ Example 6: Custom Logger Without Span (สำหรับ external libraries)
export class ExternalLibraryWrapper {
  constructor(
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async processWithExternalLib(traceId: string, data: unknown): Promise<unknown> {
    // ✅ Logger ที่ไม่สร้าง span (เพราะ external library อาจจะสร้าง span เอง)
    const logger = this.loggerFactory.createCustomLoggerWithoutSpan(
      traceId,
      'external_lib_processing',
      'integration',
      'external',
      {
        'external.lib.name': 'some-external-lib',
        'external.lib.version': '2.1.0',
      }
    );

    logger.info('Starting external library processing');

    try {
      // External library ที่อาจจะมี telemetry ของตัวเองอยู่แล้ว
      const result = await this.callExternalLibrary(data);
      logger.info('External library processing completed');
      return result;
    } catch (error) {
      logger.error('External library processing failed', error as Error);
      throw error;
    }
    // ✅ ไม่ต้อง finishSpan() เพราะไม่ได้สร้าง span
  }

  private async callExternalLibrary(data: unknown): Promise<unknown> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { processed: true, data };
  }
}

// ================= DATA LAYER USAGE =================

export class UserRepository {
  constructor(
    private telemetryService: UnifiedCoreTelemetryService,
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async findById(traceId: string, userId: string): Promise<User | null> {
    // ✅ ใช้ interface แทน implementation
    const { logger, span }: { logger: UnifiedLogger; span: UnifiedTelemetrySpan } = 
      this.loggerFactory.createDataLogger(traceId, 'findById', 'users', { 'user.id': userId });

    logger.info('Starting user lookup', { userId });

    try {
      logger.addSpanEvent('database.query.start', { userId });
      
      const user = await this.performDatabaseQuery(userId);
      
      logger.setSpanAttribute('db.result.found', !!user);
      logger.addSpanEvent('database.query.complete', { found: !!user });

      if (user) {
        logger.info('User found successfully', { userId, userEmail: user.email });
      } else {
        logger.warn('User not found', { userId });
      }

      return user;
    } catch (error) {
      logger.error('Database query failed', error as Error, { userId });
      throw error;
    } finally {
      logger.finishSpan(); // ✅ ชัดเจนว่า finish span
    }
  }

  private async performDatabaseQuery(userId: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return userId === '1' ? { id: '1', email: 'user@example.com', name: 'Test User', role: 'user' } : null;
  }
}

// ================= SERVICE LAYER USAGE =================

export class CreateUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private telemetryService: UnifiedCoreTelemetryService,
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async handle(traceId: string, command: CreateUserCommand): Promise<User> {
    // ✅ ชัดเจนว่าได้ UnifiedLogger interface
    const { logger }: { logger: UnifiedLogger; span: UnifiedTelemetrySpan } = 
      this.loggerFactory.createServiceLogger(traceId, 'createUser', 'User', { 
        'command.type': 'CreateUserCommand',
        'user.email': command.email 
      });

    logger.info('Processing create user command', { email: command.email });

    try {
      // สร้าง child logger
      const { logger: validationLogger }: { logger: UnifiedLogger; span: UnifiedTelemetrySpan } = 
        this.loggerFactory.createChildLogger(logger, 'validateCommand', 'business');
      
      try {
        validationLogger.debug('Starting command validation');
        await this.validateCommand(validationLogger, command);
        validationLogger.info('Command validation completed');
      } finally {
        validationLogger.finishSpan();
      }

      logger.debug('Delegating to repository layer');
      const user = await this.userRepository.create(traceId, {
        email: command.email,
        name: command.name,
        role: command.role
      });

      logger.info('User creation completed successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Create user command failed', error as Error);
      throw error;
    } finally {
      logger.finishSpan();
    }
  }

  private async validateCommand(logger: UnifiedLogger, command: CreateUserCommand): Promise<void> {
    logger.debug('Validating email format');
    if (!command.email.includes('@')) {
      logger.warn('Invalid email format', { email: command.email });
      throw new Error('Invalid email');
    }
    logger.debug('Command validation successful');
  }
}

// =============================================================================
// 📋 EXPORT SUMMARY
// =============================================================================

// ✅ Core package exports - ชัดเจนระหว่าง interface กับ implementation
export {
  // Interfaces
  UnifiedLogger,                    // ✅ Main logger interface
  UnifiedBaseTelemetryLogger,       // ✅ Base logger interface  
  UnifiedLoggerContext,             // ✅ Context object

  // Implementations
  DefaultUnifiedLogger,             // ✅ Default implementation
  ConsoleUnifiedLogger,             // ✅ Console implementation
  NoOpUnifiedLogger,                // ✅ NoOp implementation

  // Factory
  UnifiedLoggerFactory,             // ✅ Logger factory
};

// =============================================================================
// 📊 CUSTOM LOGGER SUMMARY & USAGE PATTERNS
// =============================================================================

/**
 * ✅ CUSTOM LOGGER METHODS SUMMARY:
 * 
 * 1. createCustomLogger() - Generic custom logger
 * 2. createCustomLoggerWithoutSpan() - Logger ไม่สร้าง span
 * 3. createCustomChildLogger() - Child logger แบบ custom
 * 4. createBatchLogger() - สำหรับ background jobs
 * 5. createExternalApiLogger() - สำหรับ external API calls
 * 6. createCacheLogger() - สำหรับ cache operations
 * 7. createQueueLogger() - สำหรับ queue operations
 * 8. createAuthLogger() - สำหรับ authentication
 * 9. createNotificationLogger() - สำหรับ notifications
 * 
 * 🎯 USE CASES:
 * - Integration layers
 * - Background job processing
 * - External service calls
 * - Cache operations
 * - Queue/messaging systems
 * - Authentication flows
 * - Notification systems
 * - Custom business operations
 */

// Types for examples
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface PaymentData {
  amount: number;
  currency: string;
  customerId: string;
}

interface PaymentResult {
  id: string;
  status: string;
}

interface EmailData {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

interface QueueMessage {
  id: string;
  body: string;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
}

interface LoginCredentials {
  email: string;
  password: string;
  clientIp: string;
  userAgent: string;
}

interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface NotificationData {
  channel: 'email' | 'sms' | 'push' | 'webhook';
  type: string;
  template: string;
  recipientId: string;
  priority: 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
}

class CreateUserCommand {
  constructor(public readonly data: { email: string; name: string; role: string }) {}
  get email() { return this.data.email; }
  get name() { return this.data.name; }
  get role() { return this.data.role; }
}