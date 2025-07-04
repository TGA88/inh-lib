// 🏗️ Corrected Architecture: Framework → UnifiedContext → BasicMiddleware → SimpleRoute

// ================================
// 1. Framework Layer (HTTP Transport Only)
// ================================

// ✅ Framework เป็นแค่ HTTP transport layer
interface UnifiedHttpContext {
  request: {
    method: string;
    url: string;
    headers: Record<string, string | undefined>;
    body: unknown;
    query: Record<string, string | undefined>;
    params: Record<string, string | undefined>;
    ip: string;
  };
  response: {
    status(code: number): UnifiedHttpContext['response'];
    json<T>(data: T): void;
    send(data: string): void;
    header(name: string, value: string): void;
    sent?: boolean;
    statusCode?: number;
  };
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

// ✅ Framework adapters - convert to UnifiedContext
function createFastifyContext(request: FastifyRequest, reply: FastifyReply): UnifiedHttpContext {
  return {
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers as Record<string, string | undefined>,
      body: request.body,
      query: request.query as Record<string, string | undefined>,
      params: request.params as Record<string, string | undefined>,
      ip: request.ip
    },
    response: {
      status: (code: number) => {
        reply.status(code);
        // Track status for middleware
        (context.response as any).statusCode = code;
        return context.response;
      },
      json: <T>(data: T) => {
        reply.send(data);
        (context.response as any).sent = true;
      },
      send: (data: string) => {
        reply.send(data);
        (context.response as any).sent = true;
      },
      header: (name: string, value: string) => {
        reply.header(name, value);
        return context.response;
      }
    },
    user: (request as any).user
  };
}

// ✅ Express adapter (example)
function createExpressContext(req: any, res: any): UnifiedHttpContext {
  return {
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip
    },
    response: {
      status: (code: number) => {
        res.status(code);
        (context.response as any).statusCode = code;
        return context.response;
      },
      json: <T>(data: T) => {
        res.json(data);
        (context.response as any).sent = true;
      },
      send: (data: string) => {
        res.send(data);
        (context.response as any).sent = true;
      },
      header: (name: string, value: string) => {
        res.set(name, value);
        return context.response;
      }
    },
    user: req.user
  };
}

// ================================
// 2. Framework-Agnostic BasicMiddleware System
// ================================

// ✅ Middleware ทำงานกับ UnifiedContext (framework-agnostic)
type Middleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;

type RouteHandler = (context: UnifiedHttpContext) => Promise<void>;

// ✅ Framework-agnostic middleware composition
const composeMiddleware = (middlewares: readonly Middleware[]) => {
  return (handler: RouteHandler): RouteHandler => {
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

// ✅ Framework-agnostic built-in middlewares
const createLoggingMiddleware = (): Middleware => {
  return async (context, next) => {
    const startTime = Date.now();
    const { method, url } = context.request;
    
    console.log(`→ ${method} ${url}`, {
      ip: context.request.ip,
      userAgent: context.request.headers['user-agent'],
      correlationId: context.request.headers['x-correlation-id'] || crypto.randomUUID()
    });

    try {
      await next();
      
      const duration = Date.now() - startTime;
      const statusCode = context.response.statusCode || 200;
      console.log(`← ${method} ${url} ${statusCode} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`← ${method} ${url} ERROR (${duration}ms)`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
};

const createCorsMiddleware = (options: {
  readonly origin?: string | readonly string[];
  readonly methods?: readonly string[];
  readonly allowedHeaders?: readonly string[];
} = {}): Middleware => {
  return async (context, next) => {
    const origin = Array.isArray(options.origin) 
      ? options.origin.join(',') 
      : options.origin || '*';
    
    context.response.header('Access-Control-Allow-Origin', origin);
    context.response.header(
      'Access-Control-Allow-Methods', 
      (options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']).join(',')
    );
    context.response.header(
      'Access-Control-Allow-Headers',
      (options.allowedHeaders || ['Content-Type', 'Authorization', 'x-correlation-id', 'x-session-id']).join(',')
    );

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.response.status(200);
      context.response.send('');
      return; // Don't call next() for OPTIONS
    }

    await next();
  };
};

const createErrorHandlingMiddleware = (): Middleware => {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Request error:', error);
      
      // Don't override response if already sent
      if (!context.response.sent) {
        // Handle different error types
        if (error instanceof ValidationError) {
          context.response.status(400).json({
            error: 'Validation failed',
            field: error.field,
            message: error.message,
            correlationId: error.correlationId,
            step: error.stepName
          });
        } else if (error instanceof BusinessLogicError) {
          context.response.status(422).json({
            error: 'Business logic error',
            message: error.message,
            step: error.stepName,
            correlationId: error.correlationId
          });
        } else {
          context.response.status(500).json({
            error: 'Internal server error',
            message: 'Something went wrong',
            timestamp: new Date().toISOString(),
            path: context.request.url
          });
        }
      }
    }
  };
};

const createTimeoutMiddleware = (timeoutMs: number = 30000): Middleware => {
  return async (context, next) => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        if (!context.response.sent) {
          context.response.status(408).json({
            error: 'Request timeout',
            message: `Request took longer than ${timeoutMs}ms`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        throw error;
      }
    }
  };
};

const createBodySizeLimitMiddleware = (maxSizeBytes: number): Middleware => {
  return async (context, next) => {
    const contentLength = context.request.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      context.response.status(413).json({
        error: 'Request body too large',
        maxSize: maxSizeBytes,
        receivedSize: parseInt(contentLength)
      });
      return;
    }

    await next();
  };
};

const createSecurityHeadersMiddleware = (): Middleware => {
  return async (context, next) => {
    // Security headers
    context.response.header('X-Content-Type-Options', 'nosniff');
    context.response.header('X-Frame-Options', 'DENY');
    context.response.header('X-XSS-Protection', '1; mode=block');
    context.response.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remove server information
    context.response.header('X-Powered-By', '');
    
    await next();
  };
};

const createAuthMiddleware = (): Middleware => {
  return async (context, next) => {
    const authHeader = context.request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      context.response.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Mock token validation (replace with real JWT validation)
    if (token === 'valid-admin-token') {
      context.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin']
      };
      await next();
    } else {
      context.response.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  };
};

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

    // Add rate limit headers
    context.response.header('X-RateLimit-Limit', options.maxRequests.toString());
    context.response.header('X-RateLimit-Remaining', (options.maxRequests - clientData.count).toString());
    context.response.header('X-RateLimit-Reset', clientData.resetTime.toString());

    await next();
  };
};

// ✅ Framework-agnostic pre-composed middleware stacks
const withCommonMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createCorsMiddleware(),
  createTimeoutMiddleware()
]);

const withApiMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createCorsMiddleware(),
  createBodySizeLimitMiddleware(1024 * 1024), // 1MB limit
  createTimeoutMiddleware(15000) // 15s timeout for API
]);

const withPublicMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createCorsMiddleware(),
  createTimeoutMiddleware(10000) // 10s timeout for public
]);

const withAdminMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createAuthMiddleware(), // ← Auth required
  createCorsMiddleware(),
  createTimeoutMiddleware()
]);

const withPublicApiMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createRateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }), // 100 req/min
  createCorsMiddleware(),
  createBodySizeLimitMiddleware(512 * 1024), // 512KB limit for public API
  createTimeoutMiddleware(10000)
]);

// ✅ Helper functions to apply middleware to routes
const createProtectedRoute = (handler: RouteHandler): RouteHandler => {
  return withCommonMiddleware(handler);
};

const createPublicRoute = (handler: RouteHandler): RouteHandler => {
  return withPublicMiddleware(handler);
};

const createApiRoute = (handler: RouteHandler): RouteHandler => {
  return withApiMiddleware(handler);
};

const createAdminRoute = (handler: RouteHandler): RouteHandler => {
  return withAdminMiddleware(handler);
};

const createPublicApiRoute = (handler: RouteHandler): RouteHandler => {
  return withPublicApiMiddleware(handler);
};

// ================================
// 3. Helper Functions (Framework-Agnostic)
// ================================

function validateRequestBodyOrError<T>(
  context: UnifiedHttpContext,
  schema: { parse(input: unknown): T }
): T | null {
  try {
    return schema.parse(context.request.body);
  } catch (error) {
    context.response.status(422).json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Invalid input'
    });
    return null;
  }
}

function sendResponse<T>(context: UnifiedHttpContext, data: T, status = 200): void {
  context.response.status(status).json(data);
}

// ================================
// 2. Project-Specific Types for E-commerce
// ================================

// ✅ Extend library types for e-commerce domain
interface ECommerceMetadata extends CoreBusinessMetadata {
  readonly clientIp: string;
  readonly userAgent: string;
  readonly sessionId?: string;
  readonly cartId?: string;
  readonly source: 'web' | 'mobile' | 'api';
  readonly referer?: string;
  readonly features: {
    readonly enhanced_validation: boolean;
    readonly fraud_detection: boolean;
    readonly express_checkout: boolean;
  };
}

interface ECommerceSharedData {
  securityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  fraudFlags: readonly string[];
  cartValue: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: 'card' | 'paypal' | 'crypto' | 'bank_transfer';
  requiresVerification: boolean;
  processingStartedAt: Date;
  validationResults: ValidationResults;
}

interface ValidationResults {
  readonly email: boolean;
  readonly address: boolean;
  readonly payment: boolean;
  readonly inventory: boolean;
}

// ================================
// 3. Domain Models & Input/Output Types
// ================================

interface CreateOrderInput {
  readonly customerId: string;
  readonly items: readonly OrderItem[];
  readonly shippingAddress: ShippingAddress;
  readonly paymentInfo: PaymentInfo;
  readonly couponCode?: string;
}

interface OrderItem {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

interface ShippingAddress {
  readonly firstName: string;
  readonly lastName: string;
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

interface PaymentInfo {
  readonly method: 'card' | 'paypal' | 'crypto' | 'bank_transfer';
  readonly token: string;
  readonly billingAddress?: ShippingAddress;
}

interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly items: readonly OrderItem[];
  readonly shippingAddress: ShippingAddress;
  readonly paymentInfo: Omit<PaymentInfo, 'token'>;
  readonly subtotal: number;
  readonly shippingCost: number;
  readonly taxAmount: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  readonly createdAt: Date;
  readonly estimatedDelivery?: Date;
}

// ================================
// 4. Service Interfaces
// ================================

interface SecurityService {
  checkFraud(params: {
    readonly email: string;
    readonly ip: string;
    readonly userAgent: string;
    readonly orderValue: number;
  }): Promise<{
    readonly score: number;
    readonly riskLevel: 'low' | 'medium' | 'high';
    readonly flags: readonly string[];
  }>;
}

interface InventoryService {
  checkAvailability(items: readonly OrderItem[]): Promise<{
    readonly available: boolean;
    readonly unavailableItems: readonly string[];
  }>;
  
  reserveItems(orderId: string, items: readonly OrderItem[]): Promise<void>;
}

interface PaymentService {
  validatePayment(paymentInfo: PaymentInfo): Promise<{
    readonly valid: boolean;
    readonly reason?: string;
  }>;
  
  createPaymentIntent(params: {
    readonly orderId: string;
    readonly amount: number;
    readonly currency: string;
    readonly paymentMethod: string;
  }): Promise<{ readonly intentId: string }>;
}

interface ShippingService {
  calculateCost(address: ShippingAddress, items: readonly OrderItem[]): Promise<number>;
  estimateDelivery(address: ShippingAddress): Promise<Date>;
}

interface TaxService {
  calculateTax(address: ShippingAddress, subtotal: number): Promise<number>;
}

interface OrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
}

interface CouponService {
  validateCoupon(code: string, customerId: string, cartValue: number): Promise<{
    readonly valid: boolean;
    readonly discountAmount: number;
    readonly reason?: string;
  }>;
}

// ================================
// 5. BusinessPipeline Steps Implementation
// ================================

// ✅ Schema validation step
class ValidateOrderSchemaStep extends BusinessLogicStep<
  unknown,
  CreateOrderInput,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'ValidateOrderSchema';

  constructor(private readonly schema: { parse(input: unknown): CreateOrderInput }) {
    super();
  }

  protected async executeLogic(
    input: unknown,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<CreateOrderInput> {
    try {
      return this.schema.parse(input);
    } catch (error) {
      throw new ValidationError(
        `Schema validation failed: ${error instanceof Error ? error.message : 'Invalid input'}`,
        this.stepName,
        context.correlationId,
        'schema'
      );
    }
  }
}

// ✅ Business validation step
class ValidateOrderBusinessRulesStep extends BusinessLogicStep<
  CreateOrderInput,
  CreateOrderInput,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'ValidateOrderBusinessRules';

  protected async executeLogic(
    input: CreateOrderInput,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<CreateOrderInput> {
    // Basic business validation
    if (input.items.length === 0) {
      throw new ValidationError('Order must contain at least one item', this.stepName, context.correlationId, 'items');
    }

    if (input.items.some(item => item.quantity <= 0)) {
      throw new ValidationError('All items must have positive quantity', this.stepName, context.correlationId, 'items');
    }

    if (input.items.some(item => item.unitPrice <= 0)) {
      throw new ValidationError('All items must have positive price', this.stepName, context.correlationId, 'items');
    }

    // Calculate cart value
    const cartValue = input.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    this.setShared(context, 'cartValue', cartValue);
    this.setShared(context, 'processingStartedAt', new Date());

    // Initialize validation results
    this.setShared(context, 'validationResults', {
      email: false,
      address: false,
      payment: false,
      inventory: false
    });

    return input;
  }
}

// ✅ Security check step
class SecurityCheckStep extends BusinessLogicStep<
  CreateOrderInput,
  CreateOrderInput,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'SecurityCheck';

  constructor(private readonly securityService: SecurityService) {
    super();
  }

  protected async executeLogic(
    input: CreateOrderInput,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<CreateOrderInput> {
    const cartValue = this.getSharedOrDefault(context, 'cartValue', 0);
    
    // Enhanced fraud detection if feature enabled
    if (context.metadata.features.fraud_detection) {
      const fraudCheck = await this.securityService.checkFraud({
        email: input.customerId, // Assuming customerId is email for simplicity
        ip: context.metadata.clientIp,
        userAgent: context.metadata.userAgent,
        orderValue: cartValue
      });

      this.setShared(context, 'securityScore', fraudCheck.score);
      this.setShared(context, 'riskLevel', fraudCheck.riskLevel);
      this.setShared(context, 'fraudFlags', fraudCheck.flags);

      // Block high-risk orders
      if (fraudCheck.riskLevel === 'high') {
        throw new ValidationError(
          'Order flagged for security review',
          this.stepName,
          context.correlationId,
          'security'
        );
      }

      // Require additional verification for medium risk
      if (fraudCheck.riskLevel === 'medium') {
        this.setShared(context, 'requiresVerification', true);
      }
    } else {
      // Default values when fraud detection is disabled
      this.setShared(context, 'securityScore', 50);
      this.setShared(context, 'riskLevel', 'low');
      this.setShared(context, 'fraudFlags', []);
      this.setShared(context, 'requiresVerification', false);
    }

    return input;
  }
}

// ✅ Inventory check step
class InventoryCheckStep extends BusinessLogicStep<
  CreateOrderInput,
  CreateOrderInput,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'InventoryCheck';

  constructor(private readonly inventoryService: InventoryService) {
    super();
  }

  protected async executeLogic(
    input: CreateOrderInput,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<CreateOrderInput> {
    const availability = await this.inventoryService.checkAvailability(input.items);

    if (!availability.available) {
      throw new ValidationError(
        `Items unavailable: ${availability.unavailableItems.join(', ')}`,
        this.stepName,
        context.correlationId,
        'inventory'
      );
    }

    // Update validation results
    const currentResults = this.getSharedOrDefault(context, 'validationResults', {
      email: false,
      address: false,
      payment: false,
      inventory: false
    });

    this.setShared(context, 'validationResults', {
      ...currentResults,
      inventory: true
    });

    return input;
  }
}

// ✅ Payment validation step
class PaymentValidationStep extends BusinessLogicStep<
  CreateOrderInput,
  CreateOrderInput,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'PaymentValidation';

  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  protected async executeLogic(
    input: CreateOrderInput,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<CreateOrderInput> {
    const paymentValidation = await this.paymentService.validatePayment(input.paymentInfo);

    if (!paymentValidation.valid) {
      throw new ValidationError(
        `Payment validation failed: ${paymentValidation.reason || 'Invalid payment method'}`,
        this.stepName,
        context.correlationId,
        'payment'
      );
    }

    // Store payment method for later use
    this.setShared(context, 'paymentMethod', input.paymentInfo.method);

    // Update validation results
    const currentResults = this.getSharedOrDefault(context, 'validationResults', {
      email: false,
      address: false,
      payment: false,
      inventory: false
    });

    this.setShared(context, 'validationResults', {
      ...currentResults,
      payment: true
    });

    return input;
  }
}

// ✅ Calculate costs step
class CalculateCostsStep extends BusinessLogicStep<
  CreateOrderInput,
  CreateOrderInput,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'CalculateCosts';

  constructor(
    private readonly shippingService: ShippingService,
    private readonly taxService: TaxService,
    private readonly couponService: CouponService
  ) {
    super();
  }

  protected async executeLogic(
    input: CreateOrderInput,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<CreateOrderInput> {
    const cartValue = this.getSharedOrDefault(context, 'cartValue', 0);

    // Calculate shipping cost
    const shippingCost = await this.shippingService.calculateCost(input.shippingAddress, input.items);
    this.setShared(context, 'shippingCost', shippingCost);

    // Calculate tax
    const taxAmount = await this.taxService.calculateTax(input.shippingAddress, cartValue);
    this.setShared(context, 'taxAmount', taxAmount);

    // Apply coupon if provided
    let discountAmount = 0;
    if (input.couponCode) {
      const couponResult = await this.couponService.validateCoupon(
        input.couponCode,
        input.customerId,
        cartValue
      );
      
      if (couponResult.valid) {
        discountAmount = couponResult.discountAmount;
      } else {
        console.warn(`Invalid coupon: ${couponResult.reason}`);
      }
    }
    this.setShared(context, 'discountAmount', discountAmount);

    return input;
  }
}

// ✅ Create order step
class CreateOrderStep extends BusinessLogicStep<
  CreateOrderInput,
  Order,
  ECommerceMetadata,
  ECommerceSharedData
> {
  readonly stepName = 'CreateOrder';

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly shippingService: ShippingService
  ) {
    super();
  }

  protected async executeLogic(
    input: CreateOrderInput,
    context: BusinessLogicContext<ECommerceMetadata, ECommerceSharedData>
  ): Promise<Order> {
    const cartValue = this.getSharedOrDefault(context, 'cartValue', 0);
    const shippingCost = this.getSharedOrDefault(context, 'shippingCost', 0);
    const taxAmount = this.getSharedOrDefault(context, 'taxAmount', 0);
    const discountAmount = this.getSharedOrDefault(context, 'discountAmount', 0);
    const requiresVerification = this.getSharedOrDefault(context, 'requiresVerification', false);

    const total = cartValue + shippingCost + taxAmount - discountAmount;
    const orderId = crypto.randomUUID();

    // Create order in database
    const order = await this.orderRepository.create({
      customerId: input.customerId,
      items: input.items,
      shippingAddress: input.shippingAddress,
      paymentInfo: {
        method: input.paymentInfo.method,
        billingAddress: input.paymentInfo.billingAddress
      },
      subtotal: cartValue,
      shippingCost,
      taxAmount,
      discountAmount,
      total,
      status: requiresVerification ? 'pending' : 'confirmed',
      estimatedDelivery: await this.shippingService.estimateDelivery(input.shippingAddress)
    });

    // Reserve inventory
    await this.inventoryService.reserveItems(order.id, input.items);

    // Create payment intent
    await this.paymentService.createPaymentIntent({
      orderId: order.id,
      amount: total,
      currency: 'USD',
      paymentMethod: input.paymentInfo.method
    });

    return order;
  }
}

// ================================
// 6. Command Implementation with BusinessPipeline
// ================================

export class CreateOrderCommand {
  private readonly pipeline: BusinessPipeline<
    unknown,
    Order,
    ECommerceMetadata,
    ECommerceSharedData
  >;

  constructor(
    securityService: SecurityService,
    inventoryService: InventoryService,
    paymentService: PaymentService,
    shippingService: ShippingService,
    taxService: TaxService,
    couponService: CouponService,
    orderRepository: OrderRepository,
    createOrderSchema: { parse(input: unknown): CreateOrderInput }
  ) {
    this.pipeline = new BusinessPipeline([
      new ValidateOrderSchemaStep(createOrderSchema),
      new ValidateOrderBusinessRulesStep(),
      new SecurityCheckStep(securityService),
      new InventoryCheckStep(inventoryService),
      new PaymentValidationStep(paymentService),
      new CalculateCostsStep(shippingService, taxService, couponService),
      new CreateOrderStep(orderRepository, inventoryService, paymentService, shippingService)
    ]);
  }

  async execute(
    input: unknown,
    httpContext: UnifiedHttpContext
  ): Promise<Order> {
    // ✅ Convert HTTP context to Business context
    const businessContext = this.createBusinessContext(httpContext);
    
    console.log(`🛒 Starting CreateOrder pipeline`, {
      correlationId: businessContext.correlationId,
      clientIp: businessContext.metadata.clientIp,
      source: businessContext.metadata.source
    });

    try {
      const result = await this.pipeline.execute(input, businessContext);
      
      console.log(`✅ CreateOrder completed successfully`, {
        correlationId: businessContext.correlationId,
        orderId: result.id,
        total: result.total,
        sharedContext: businessContext.shared.toObject()
      });

      return result;
    } catch (error) {
      console.error(`❌ CreateOrder failed`, {
        correlationId: businessContext.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        sharedContext: businessContext.shared.toObject()
      });
      throw error;
    }
  }

  private createBusinessContext(
    httpContext: UnifiedHttpContext
  ): BusinessLogicContext<ECommerceMetadata, ECommerceSharedData> {
    return createBusinessLogicContext<ECommerceMetadata, ECommerceSharedData>({
      userId: httpContext.user?.id,
      metadata: {
        // HTTP request context
        clientIp: httpContext.request.ip,
        userAgent: httpContext.request.headers['user-agent'] || 'unknown',
        sessionId: httpContext.request.headers['x-session-id'],
        
        // System context
        environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        requestId: crypto.randomUUID(),
        
        // Business context
        source: this.detectSource(httpContext),
        referer: httpContext.request.headers['referer'],
        cartId: httpContext.request.headers['x-cart-id'],
        
        // Feature flags (could come from feature flag service)
        features: {
          enhanced_validation: process.env.NODE_ENV === 'production',
          fraud_detection: true,
          express_checkout: httpContext.request.headers['x-express-checkout'] === 'true'
        }
      }
    });
  }

  private detectSource(httpContext: UnifiedHttpContext): 'web' | 'mobile' | 'api' {
    const userAgent = httpContext.request.headers['user-agent'] || '';
    const apiKey = httpContext.request.headers['x-api-key'];
    
    if (apiKey) return 'api';
    if (userAgent.includes('Mobile')) return 'mobile';
    return 'web';
  }
}

// ================================
// 7. Enhanced Simple Route Functions with Middleware
// ================================

// ✅ Framework-agnostic route function with automatic middleware
export const createOrderRoute = createApiRoute(async (
  context: UnifiedHttpContext
): Promise<void> => {
  // ✅ Get command from DI container (could be injected)
  const container = getGlobalContainer(); // Assuming global container access
  const createOrderCommand = container.get<CreateOrderCommand>('createOrderCommand');

  // ✅ Simple route function delegates to command with pipeline
  // Middleware already handled: logging, CORS, error handling, etc.
  const order = await createOrderCommand.execute(context.request.body, context);
  sendResponse(context, order, 201);
});

// ✅ Public route with different middleware stack
export const getOrderRoute = createPublicRoute(async (
  context: UnifiedHttpContext
): Promise<void> => {
  const container = getGlobalContainer();
  const orderRepository = container.get<OrderRepository>('orderRepository');
  
  const orderId = context.request.params.id;
  
  if (!orderId) {
    context.response.status(400).json({ error: 'Order ID is required' });
    return;
  }

  const order = await orderRepository.findById(orderId);
  
  if (!order) {
    context.response.status(404).json({ error: 'Order not found' });
    return;
  }

  sendResponse(context, order);
});

// ✅ Protected route requiring authentication
const createAuthMiddleware = (): Middleware => {
  return async (context, next) => {
    const authHeader = context.request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      context.response.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Mock token validation (replace with real JWT validation)
    if (token === 'valid-admin-token') {
      context.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin']
      };
      await next();
    } else {
      context.response.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  };
};

// ✅ Admin route with authentication middleware
const withAdminMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createAuthMiddleware(), // ← Auth required
  createCorsMiddleware(),
  createTimeoutMiddleware()
]);

export const createAdminRoute = (handler: RouteHandler): RouteHandler => {
  return withAdminMiddleware(handler);
};

export const getAllOrdersRoute = createAdminRoute(async (
  context: UnifiedHttpContext
): Promise<void> => {
  const container = getGlobalContainer();
  const orderRepository = container.get<OrderRepository>('orderRepository');
  
  // This would normally have pagination, filtering, etc.
  const orders = await orderRepository.findAll();
  sendResponse(context, { orders, total: orders.length });
});

// ✅ Custom rate limiting middleware
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

    // Add rate limit headers
    context.response.header('X-RateLimit-Limit', options.maxRequests.toString());
    context.response.header('X-RateLimit-Remaining', (options.maxRequests - clientData.count).toString());
    context.response.header('X-RateLimit-Reset', clientData.resetTime.toString());

    await next();
  };
};

// ✅ Public API route with rate limiting
const withPublicApiMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createSecurityHeadersMiddleware(),
  createRateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }), // 100 req/min
  createCorsMiddleware(),
  createBodySizeLimitMiddleware(512 * 1024), // 512KB limit for public API
  createTimeoutMiddleware(10000)
]);

export const createPublicApiRoute = (handler: RouteHandler): RouteHandler => {
  return withPublicApiMiddleware(handler);
};

export const getPublicOrderStatusRoute = createPublicApiRoute(async (
  context: UnifiedHttpContext
): Promise<void> => {
  const container = getGlobalContainer();
  const orderRepository = container.get<OrderRepository>('orderRepository');
  
  const orderId = context.request.params.id;
  const trackingCode = context.request.query.tracking;
  
  if (!orderId || !trackingCode) {
    context.response.status(400).json({ 
      error: 'Order ID and tracking code required' 
    });
    return;
  }

  const order = await orderRepository.findById(orderId);
  
  if (!order) {
    context.response.status(404).json({ error: 'Order not found' });
    return;
  }

  // Return public order status (limited information)
  sendResponse(context, {
    orderId: order.id,
    status: order.status,
    estimatedDelivery: order.estimatedDelivery,
    total: order.total
  });
});

// ================================
// 8. Enhanced DI Container with Global Access
// ================================

let globalContainer: Container | null = null;

function getGlobalContainer(): Container {
  if (!globalContainer) {
    throw new Error('Container not initialized. Call configureContainer() first.');
  }
  return globalContainer;
}

function configureContainer(): Container {
  const container = setupContainer();

  // Register services
  container.register('securityService', () => new MockSecurityService());
  container.register('inventoryService', () => new MockInventoryService());
  container.register('paymentService', () => new MockPaymentService());
  container.register('shippingService', () => new MockShippingService());
  container.register('taxService', () => new MockTaxService());
  container.register('couponService', () => new MockCouponService());
  container.register('orderRepository', () => new MockOrderRepository());

  // Register command with all dependencies
  container.register('createOrderCommand', () => {
    return new CreateOrderCommand(
      container.get('securityService'),
      container.get('inventoryService'),
      container.get('paymentService'),
      container.get('shippingService'),
      container.get('taxService'),
      container.get('couponService'),
      container.get('orderRepository'),
      CreateOrderSchema
    );
  });

  // Set global container
  globalContainer = container;
  return container;
}

// ================================
// 9. Enhanced Fastify App Setup with Complete Middleware Integration
// ================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function createApp(): Promise<FastifyInstance> {
  const fastify: FastifyInstance = require('fastify')({ 
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    }
  });

  // Initialize DI container
  const container = configureContainer();

  // ✅ Register routes with different middleware stacks
  
  // API Routes (Protected, with body size limits, shorter timeout)
  fastify.post('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await createOrderRoute(context); // ← API middleware applied automatically
  });

  // Public Routes (Rate limited, longer timeout)
  fastify.get('/orders/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await getOrderRoute(context); // ← Public middleware applied automatically
  });

  // Public API Routes (Rate limited, smaller body size)
  fastify.get('/public/orders/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await getPublicOrderStatusRoute(context); // ← Public API middleware applied
  });

  // Admin Routes (Authentication required)
  fastify.get('/admin/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await getAllOrdersRoute(context); // ← Admin middleware applied automatically
  });

  // Health check endpoint (minimal middleware)
  const healthCheckRoute = composeMiddleware([
    createLoggingMiddleware(),
    createSecurityHeadersMiddleware()
  ])(async (context: UnifiedHttpContext) => {
    sendResponse(context, { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await healthCheckRoute(context);
  });

  // Metrics endpoint (admin only)
  const metricsRoute = createAdminRoute(async (context: UnifiedHttpContext) => {
    sendResponse(context, {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  });

  fastify.get('/admin/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await metricsRoute(context);
  });

  return fastify;
}

// ✅ Enhanced main application startup
async function main() {
  const app = await createApp();
  
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    
    console.log('🚀 Complete E-commerce API running on port 3000');
    console.log('');
    console.log('📋 Architecture Overview:');
    console.log('  HTTP Request');
    console.log('       ↓');
    console.log('  🔗 BasicMiddleware (logging, CORS, auth, rate limit)');
    console.log('       ↓');
    console.log('  🌐 UnifiedContext (framework abstraction)');
    console.log('       ↓');
    console.log('  🛣️  SimpleRoute (framework-agnostic route functions)');
    console.log('       ↓');
    console.log('  💼 Commands (business operations)');
    console.log('       ↓');
    console.log('  🔄 BusinessPipeline (type-safe processing)');
    console.log('       ↓');
    console.log('  📊 Response (with rich logging & metrics)');
    console.log('');
    console.log('✅ Features Enabled:');
    console.log('  🔗 BasicMiddleware: Cross-cutting concerns');
    console.log('  🌐 UnifiedContext: Framework abstraction');
    console.log('  🛣️  SimpleRoute: Framework-agnostic routes');
    console.log('  🔄 BusinessPipeline: Type-safe business logic');
    console.log('  📦 SharedContext: Cross-step data sharing');
    console.log('  🏗️  DI Container: Dependency management');
    console.log('  🛡️  Security: Headers, auth, rate limiting');
    console.log('  📊 Observability: Logging, metrics, tracing');
    console.log('');
    console.log('🌐 Available Endpoints:');
    console.log('  POST /api/orders           - Create order (API middleware)');
    console.log('  GET  /orders/:id           - Get order (Public middleware)');
    console.log('  GET  /public/orders/:id/status - Order status (Rate limited)');
    console.log('  GET  /admin/orders         - List orders (Auth required)');
    console.log('  GET  /admin/metrics        - System metrics (Auth required)');
    console.log('  GET  /health               - Health check (Minimal middleware)');
    console.log('');
    console.log('🔐 Authentication:');
    console.log('  Use "Authorization: Bearer valid-admin-token" for admin routes');
    console.log('');
    console.log('🧪 Test Examples:');
    console.log('  curl -X POST http://localhost:3000/api/orders \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"customerId":"cust-123","items":[{"productId":"prod-1","quantity":2,"unitPrice":50}],"shippingAddress":{"firstName":"John","lastName":"Doe","street":"123 Main St","city":"NYC","state":"NY","postalCode":"10001","country":"US"},"paymentInfo":{"method":"card","token":"tok-123"}}\'');
    console.log('');
    console.log('  curl http://localhost:3000/orders/order-123');
    console.log('');
    console.log('  curl http://localhost:3000/admin/orders \\');
    console.log('    -H "Authorization: Bearer valid-admin-token"');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// ================================
// 10. Enhanced Mock Services with findAll
// ================================

interface Container {
  get<T>(key: string): T;
  register<T>(key: string, factory: () => T): void;
}

function setupContainer(): Container {
  const services = new Map<string, () => unknown>();

  return {
    register: <T>(key: string, factory: () => T) => {
      services.set(key, factory);
    },
    get: <T>(key: string): T => {
      const factory = services.get(key);
      if (!factory) {
        throw new Error(`Service not found: ${key}`);
      }
      return factory() as T;
    }
  };
}

class MockSecurityService implements SecurityService {
  async checkFraud(params: { email: string; ip: string; userAgent: string; orderValue: number }) {
    // Mock fraud detection logic
    const score = params.orderValue > 1000 ? 85 : 30;
    const riskLevel = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
    
    console.log(`🔍 Security check: ${params.email} from ${params.ip} - Score: ${score}, Risk: ${riskLevel}`);
    
    return {
      score,
      riskLevel: riskLevel as 'low' | 'medium' | 'high',
      flags: score > 70 ? ['high_value_order'] : []
    };
  }
}

class MockInventoryService implements InventoryService {
  async checkAvailability(items: readonly OrderItem[]) {
    console.log(`📦 Checking inventory for ${items.length} items`);
    return { available: true, unavailableItems: [] };
  }
  
  async reserveItems(orderId: string, items: readonly OrderItem[]) {
    console.log(`🔒 Reserved ${items.length} items for order ${orderId}`);
  }
}

class MockPaymentService implements PaymentService {
  async validatePayment(paymentInfo: PaymentInfo) {
    console.log(`💳 Validating ${paymentInfo.method} payment`);
    return { valid: true };
  }
  
  async createPaymentIntent(params: { orderId: string; amount: number; currency: string; paymentMethod: string }) {
    console.log(`💰 Created payment intent for order ${params.orderId}: ${params.amount} ${params.currency}`);
    return { intentId: crypto.randomUUID() };
  }
}

class MockShippingService implements ShippingService {
  async calculateCost(address: ShippingAddress, items: readonly OrderItem[]) {
    const cost = address.country === 'US' ? 10 : 25;
    console.log(`🚚 Shipping cost to ${address.country}: ${cost}`);
    return cost;
  }
  
  async estimateDelivery(address: ShippingAddress) {
    const delivery = new Date();
    const days = address.country === 'US' ? 3 : 7;
    delivery.setDate(delivery.getDate() + days);
    console.log(`📅 Estimated delivery to ${address.country}: ${delivery.toDateString()}`);
    return delivery;
  }
}

class MockTaxService implements TaxService {
  async calculateTax(address: ShippingAddress, subtotal: number) {
    const rate = address.state === 'CA' ? 0.08 : 0.05;
    const tax = subtotal * rate;
    console.log(`💰 Tax for ${address.state}: ${rate * 100}% = ${tax.toFixed(2)}`);
    return tax;
  }
}

class MockCouponService implements CouponService {
  async validateCoupon(code: string, customerId: string, cartValue: number) {
    console.log(`🎟️  Validating coupon: ${code} for customer ${customerId}`);
    
    if (code === 'SAVE10') {
      const discount = Math.min(cartValue * 0.1, 50);
      return { valid: true, discountAmount: discount };
    }
    return { valid: false, discountAmount: 0, reason: 'Invalid coupon code' };
  }
}

class MockOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async create(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const order: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    
    this.orders.set(order.id, order);
    console.log(`💾 Created order ${order.id} with total ${order.total}`);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    const order = this.orders.get(id) || null;
    console.log(`🔍 Finding order ${id}: ${order ? 'found' : 'not found'}`);
    return order;
  }

  async findAll(): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    console.log(`📋 Retrieved ${orders.length} orders`);
    return orders;
  }
}

// ✅ Enhanced Zod schema for better validation
const CreateOrderSchema = {
  parse: (input: unknown): CreateOrderInput => {
    // Enhanced validation logic
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: expected object');
    }

    const data = input as Record<string, unknown>;
    
    // Validate required fields
    if (!data.customerId || typeof data.customerId !== 'string') {
      throw new Error('customerId is required and must be a string');
    }
    
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('items is required and must be a non-empty array');
    }
    
    if (!data.shippingAddress || typeof data.shippingAddress !== 'object') {
      throw new Error('shippingAddress is required');
    }
    
    if (!data.paymentInfo || typeof data.paymentInfo !== 'object') {
      throw new Error('paymentInfo is required');
    }

    // Type assertion after validation
    return data as CreateOrderInput;
  }
};

if (require.main === module) {
  main().catch(console.error);
}

// ================================
// 11. Comprehensive Testing Examples
// ================================

describe('Complete Architecture Integration Tests', () => {
  describe('Middleware System', () => {
    it('should apply logging middleware correctly', async () => {
      const logSpy = jest.spyOn(console, 'log');
      const middleware = createLoggingMiddleware();
      const context = createMockUnifiedContext({
        method: 'POST',
        url: '/api/orders',
        ip: '192.168.1.1'
      });
      
      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      await middleware(context, next);

      expect(nextCalled).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(
        '→ POST /api/orders',
        expect.objectContaining({ ip: '192.168.1.1' })
      );
    });

    it('should handle CORS preflight requests', async () => {
      const corsMiddleware = createCorsMiddleware({
        origin: ['https://example.com'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
      });
      
      const context = createMockUnifiedContext({
        method: 'OPTIONS',
        headers: { 'origin': 'https://example.com' }
      });
      
      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      await corsMiddleware(context, next);

      expect(nextCalled).toBe(false); // Should not call next for OPTIONS
      expect(context.response.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin', 
        'https://example.com'
      );
      expect(context.response.status).toHaveBeenCalledWith(200);
    });

    it('should handle authentication middleware', async () => {
      const authMiddleware = createAuthMiddleware();
      const context = createMockUnifiedContext({
        headers: { authorization: 'Bearer valid-admin-token' }
      });
      
      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      await authMiddleware(context, next);

      expect(nextCalled).toBe(true);
      expect(context.user).toEqual({
        id: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin']
      });
    });

    it('should reject invalid authentication', async () => {
      const authMiddleware = createAuthMiddleware();
      const context = createMockUnifiedContext({
        headers: { authorization: 'Bearer invalid-token' }
      });
      
      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      await authMiddleware(context, next);

      expect(nextCalled).toBe(false);
      expect(context.response.status).toHaveBeenCalledWith(401);
    });

    it('should apply rate limiting', async () => {
      const rateLimitMiddleware = createRateLimitMiddleware({
        maxRequests: 2,
        windowMs: 60000
      });
      
      const context = createMockUnifiedContext({ ip: '192.168.1.1' });
      const next = async () => {};

      // First request should pass
      await rateLimitMiddleware(context, next);
      expect(context.response.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');

      // Second request should pass
      await rateLimitMiddleware(context, next);
      expect(context.response.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');

      // Third request should be blocked
      await rateLimitMiddleware(context, next);
      expect(context.response.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Route Integration', () => {
    it('should create order with full pipeline', async () => {
      const mockContext = createMockUnifiedContext({
        method: 'POST',
        url: '/api/orders',
        body: {
          customerId: 'cust-123',
          items: [{ productId: 'prod-1', quantity: 2, unitPrice: 50 }],
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            street: '123 Main St',
            city: 'NYC',
            state: 'NY',
            postalCode: '10001',
            country: 'US'
          },
          paymentInfo: {
            method: 'card',
            token: 'tok-123'
          }
        }
      });

      // Configure container for testing
      configureContainer();

      await createOrderRoute(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(201);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          customerId: 'cust-123',
          total: expect.any(Number),
          status: expect.any(String)
        })
      );
    });

    it('should handle validation errors properly', async () => {
      const mockContext = createMockUnifiedContext({
        method: 'POST',
        url: '/api/orders',
        body: {} // Invalid empty body
      });

      configureContainer();

      await createOrderRoute(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(400);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          correlationId: expect.any(String)
        })
      );
    });
  });

  describe('BusinessPipeline Integration', () => {
    it('should execute complete pipeline with shared context', async () => {
      const mockServices = createMockServices();
      const command = new CreateOrderCommand(
        mockServices.securityService,
        mockServices.inventoryService,
        mockServices.paymentService,
        mockServices.shippingService,
        mockServices.taxService,
        mockServices.couponService,
        mockServices.orderRepository,
        CreateOrderSchema
      );

      const mockHttpContext = createMockUnifiedContext({
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Agent' },
        body: {
          customerId: 'cust-123',
          items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
          shippingAddress: createMockAddress(),
          paymentInfo: { method: 'card', token: 'tok-123' }
        }
      });

      const result = await command.execute(mockHttpContext.request.body, mockHttpContext);

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          customerId: 'cust-123',
          total: expect.any(Number),
          status: expect.any(String)
        })
      );

      // Verify services were called
      expect(mockServices.securityService.checkFraud).toHaveBeenCalled();
      expect(mockServices.inventoryService.checkAvailability).toHaveBeenCalled();
      expect(mockServices.paymentService.validatePayment).toHaveBeenCalled();
    });
  });
});

// ================================
// 12. Test Helpers
// ================================

function createMockUnifiedContext(overrides: Partial<UnifiedHttpContext['request']> = {}): UnifiedHttpContext {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    header: jest.fn(),
    sent: false
  };

  return {
    request: {
      method: 'GET',
      url: '/',
      headers: {},
      body: null,
      query: {},
      params: {},
      ip: '127.0.0.1',
      ...overrides
    },
    response,
    user: undefined
  };
}

function createMockServices() {
  return {
    securityService: {
      checkFraud: jest.fn().mockResolvedValue({
        score: 30,
        riskLevel: 'low',
        flags: []
      })
    },
    inventoryService: {
      checkAvailability: jest.fn().mockResolvedValue({
        available: true,
        unavailableItems: []
      }),
      reserveItems: jest.fn().mockResolvedValue(undefined)
    },
    paymentService: {
      validatePayment: jest.fn().mockResolvedValue({ valid: true }),
      createPaymentIntent: jest.fn().mockResolvedValue({ intentId: 'intent-123' })
    },
    shippingService: {
      calculateCost: jest.fn().mockResolvedValue(10),
      estimateDelivery: jest.fn().mockResolvedValue(new Date())
    },
    taxService: {
      calculateTax: jest.fn().mockResolvedValue(8)
    },
    couponService: {
      validateCoupon: jest.fn().mockResolvedValue({
        valid: false,
        discountAmount: 0
      })
    },
    orderRepository: {
      create: jest.fn().mockImplementation((orderData) => ({
        ...orderData,
        id: 'order-123',
        createdAt: new Date()
      })),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([])
    }
  };
}

function createMockAddress(): ShippingAddress {
  return {
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main St',
    city: 'NYC',
    state: 'NY',
    postalCode: '10001',
    country: 'US'
  };
}

/*
================================
🎉 CORRECTED FRAMEWORK-AGNOSTIC ARCHITECTURE
================================

🏗️ **Corrected Integration Flow:**
HTTP Request 
    ↓
🌐 Framework (Fastify/Express/Koa) - HTTP Transport Layer ONLY
    ↓  
🔄 UnifiedContext - Framework → Generic Context conversion
    ↓
🔗 BasicMiddleware - Framework-agnostic (works with UnifiedContext)
    ↓
🛣️ SimpleRoute - Framework-agnostic (works with UnifiedContext)
    ↓
💼 Commands - Business operations with DI
    ↓
🔄 BusinessPipeline - Type-safe multi-step processing
    ↓
📦 SharedContext - Cross-step data sharing
    ↓
📊 Response - Structured response back through the chain

✅ **TRUE Framework-Agnostic Benefits:**

1. **🌐 Framework = HTTP Transport Only:**
   - Fastify/Express/Koa just handle HTTP protocol
   - No business logic in framework layer
   - Easy to switch frameworks

2. **🔄 UnifiedContext = Abstraction Layer:**
   - Converts framework-specific context to generic context
   - All subsequent layers are framework-independent
   - Single point of framework coupling

3. **🔗 BasicMiddleware = Truly Framework-Agnostic:**
   - Works with UnifiedContext, not framework context
   - Same middleware works with Fastify, Express, Koa
   - No framework-specific dependencies

4. **🛣️ SimpleRoute = Truly Framework-Agnostic:**
   - Receives UnifiedContext from middleware
   - Business logic completely decoupled from framework
   - Can be tested without any HTTP framework

5. **🔄 BusinessPipeline = Framework-Independent:**
   - No knowledge of HTTP or frameworks
   - Pure business logic processing
   - Complete type safety

🎯 **Framework Switching Example:**

// ✅ Fastify Implementation
fastify.post('/api/orders', async (request, reply) => {
  const context = createFastifyContext(request, reply);  // ← Only framework-specific part
  await createOrderRoute(context);                       // ← Framework-agnostic
});

// ✅ Express Implementation (same route function!)
app.post('/api/orders', async (req, res) => {
  const context = createExpressContext(req, res);        // ← Only framework-specific part
  await createOrderRoute(context);                       // ← Same function!
});

// ✅ Koa Implementation (same route function!)
router.post('/api/orders', async (ctx) => {
  const context = createKoaContext(ctx);                 // ← Only framework-specific part
  await createOrderRoute(context);                       // ← Same function!
});

🚀 **Key Architectural Decisions:**

1. **Framework Adapters Only Convert Context:**
   - createFastifyContext() - Fastify → UnifiedContext
   - createExpressContext() - Express → UnifiedContext
   - createKoaContext() - Koa → UnifiedContext

2. **Everything After UnifiedContext is Framework-Agnostic:**
   - BasicMiddleware operates on UnifiedContext
   - SimpleRoute operates on UnifiedContext
   - BusinessPipeline is completely HTTP-agnostic

3. **Single Point of Framework Coupling:**
   - Only the context conversion functions are framework-specific
   - Rest of the application is framework-independent
   - Easy to add support for new frameworks

4. **Complete Test Independence:**
   - Middleware can be tested with mock UnifiedContext
   - Routes can be tested with mock UnifiedContext  
   - BusinessPipeline doesn't know about HTTP at all

📊 **Testing Benefits:**

// ✅ Test middleware without any framework
const mockContext = createMockUnifiedContext();
await loggingMiddleware(mockContext, mockNext);

// ✅ Test routes without any framework
const mockContext = createMockUnifiedContext();
await createOrderRoute(mockContext);

// ✅ Test business logic without HTTP
const businessContext = createBusinessLogicContext();
await businessPipeline.execute(input, businessContext);

🎉 **This is TRUE Framework-Agnostic Architecture!**

- Framework = HTTP transport only
- UnifiedContext = Framework abstraction
- Everything else = Framework-independent
- Easy framework switching
- Complete testability
- Type safety throughout
*/