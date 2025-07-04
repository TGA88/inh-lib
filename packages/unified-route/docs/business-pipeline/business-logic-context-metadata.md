// 📋 BusinessLogicContext Metadata: คืออะไร ใช้ทำอะไร

// ================================
// 1. Metadata คืออะไร?
// ================================

/*
Metadata = ข้อมูลเกี่ยวกับ Context ของการทำงาน ที่ไม่ใช่ Business Data หลัก

🔍 ความแตกต่าง:
- Business Data: { email: "user@example.com", age: 25 } ← ข้อมูลหลักที่ต้องการประมวลผล
- Metadata: { clientIp: "192.168.1.1", userAgent: "Chrome/120", feature: "user_registration" } ← ข้อมูลเสริมเกี่ยวกับ context

💡 คิดง่ายๆ:
Business Data = เนื้อหาจดหมาย
Metadata = ที่อยู่ผู้ส่ง, วันที่ส่ง, ประเภทไปรษณีย์, หมายเลขติดตาม
*/

interface BusinessLogicContext {
  correlationId: string;
  userId?: string;
  timestamp: Date;
  
  // ✅ Metadata = ข้อมูล Context เสริม
  metadata: {
    // HTTP Request Context
    clientIp?: string;
    userAgent?: string;
    requestId?: string;
    sessionId?: string;
    
    // Command/Operation Context  
    command?: string;
    operation?: string;
    version?: string;
    
    // System Context
    environment?: 'development' | 'staging' | 'production';
    region?: string;
    datacenter?: string;
    
    // Feature Flags
    features?: Record<string, boolean>;
    experiments?: Record<string, string>;
    
    // Audit Context
    source?: 'web' | 'mobile' | 'api' | 'admin' | 'system';
    channel?: 'organic' | 'social' | 'email' | 'referral';
    
    // Business Context
    tenant?: string;
    organization?: string;
    plan?: 'free' | 'premium' | 'enterprise';
    
    // Performance Context
    timeoutMs?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    
    // Custom metadata
    [key: string]: any;
  };
  
  shared: SharedContextState;
}

// ================================
// 2. การใช้งาน Metadata ในชีวิตจริง
// ================================

// ✅ Example: HTTP Request → Business Context
app.post('/users', async (request, reply) => {
  const context = createBusinessLogicContext({
    userId: request.user?.id,
    metadata: {
      // 🌐 HTTP Request Context
      clientIp: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.id,
      sessionId: request.session?.id,
      
      // 🎯 Operation Context
      command: 'CreateUser',
      operation: 'user_registration',
      version: 'v2',
      
      // 🏢 System Context  
      environment: process.env.NODE_ENV,
      region: process.env.AWS_REGION,
      
      // 🚩 Feature Flags
      features: {
        enhanced_validation: true,
        social_login: false,
        email_verification: true
      },
      
      // 📊 Business Context
      source: 'web',
      channel: request.headers['referer']?.includes('google') ? 'organic' : 'direct',
      plan: request.user?.plan || 'free',
      
      // Custom
      referralCode: request.body.referralCode,
      marketingCampaign: request.query.utm_campaign
    }
  });

  await createUserCommand.execute(request.body, context);
});

// ================================
// 3. Steps ใช้ Metadata อย่างไร
// ================================

// ✅ Example 1: Security Validation ใช้ Request Context
class SecurityValidationStep extends BusinessLogicStep<CreateUserInput, CreateUserInput> {
  stepName = 'SecurityValidation';
  
  constructor(private securityService: SecurityService) {
    super();
  }

  protected async executeLogic(input: CreateUserInput, context: BusinessLogicContext): Promise<CreateUserInput> {
    // ✅ ใช้ IP address จาก metadata
    const clientIp = context.metadata.clientIp;
    const userAgent = context.metadata.userAgent;
    
    if (!clientIp) {
      throw new Error('Client IP is required for security validation');
    }

    // Enhanced security check ด้วย request context
    const securityResult = await this.securityService.comprehensiveCheck({
      email: input.email,
      ip: clientIp,
      userAgent: userAgent || 'unknown',
      sessionId: context.metadata.sessionId
    });

    // ✅ ใช้ environment เพื่อ adjust security level
    const environment = context.metadata.environment;
    const minSecurityScore = environment === 'production' ? 70 : 50;
    
    if (securityResult.score < minSecurityScore) {
      throw new Error(`Security score too low: ${securityResult.score}`);
    }

    this.setShared(context, 'securityScore', securityResult.score);
    return input;
  }
}

// ✅ Example 2: Feature Flag Based Processing
class ConditionalValidationStep extends BusinessLogicStep<CreateUserInput, CreateUserInput> {
  stepName = 'ConditionalValidation';
  
  protected async executeLogic(input: CreateUserInput, context: BusinessLogicContext): Promise<CreateUserInput> {
    // ✅ ใช้ feature flags จาก metadata
    const features = context.metadata.features || {};
    
    // Enhanced validation เฉพาะเมื่อ feature flag เปิด
    if (features.enhanced_validation) {
      console.log('🔬 Running enhanced validation (feature flag enabled)');
      await this.enhancedPasswordValidation(input.password);
      await this.enhancedEmailValidation(input.email);
    } else {
      console.log('📝 Running standard validation');
      this.standardValidation(input);
    }

    // Email verification requirement based on plan
    const plan = context.metadata.plan;
    if (plan === 'free' && features.email_verification) {
      this.setShared(context, 'requireEmailVerification', true);
    }

    return input;
  }

  private async enhancedPasswordValidation(password: string): Promise<void> {
    // More strict validation for enhanced mode
  }

  private async enhancedEmailValidation(email: string): Promise<void> {
    // Check against more blacklists, validate MX records, etc.
  }

  private standardValidation(input: CreateUserInput): void {
    // Basic validation
  }
}

// ✅ Example 3: Audit Logging ด้วย Rich Metadata  
class AuditLoggingStep extends BusinessLogicStep<User, User> {
  stepName = 'AuditLogging';
  
  constructor(private auditService: AuditService) {
    super();
  }

  protected async executeLogic(user: User, context: BusinessLogicContext): Promise<User> {
    // ✅ สร้าง comprehensive audit log จาก metadata
    await this.auditService.log({
      // Core audit info
      action: 'user_created',
      userId: user.id,
      correlationId: context.correlationId,
      timestamp: context.timestamp,
      
      // ✅ Rich context จาก metadata
      source: context.metadata.source,
      channel: context.metadata.channel,
      clientIp: context.metadata.clientIp,
      userAgent: context.metadata.userAgent,
      sessionId: context.metadata.sessionId,
      
      // System context
      environment: context.metadata.environment,
      region: context.metadata.region,
      command: context.metadata.command,
      version: context.metadata.version,
      
      // Business context
      plan: context.metadata.plan,
      referralCode: context.metadata.referralCode,
      marketingCampaign: context.metadata.marketingCampaign,
      
      // Computed context from shared state
      securityScore: this.getShared(context, 'securityScore'),
      riskLevel: this.getShared(context, 'riskLevel'),
      processingTimeMs: Date.now() - context.timestamp.getTime(),
      
      // Feature flags ที่ใช้งาน
      activeFeatures: Object.entries(context.metadata.features || {})
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature)
    });

    return user;
  }
}

// ✅ Example 4: Performance Optimization ด้วย Priority
class PerformanceOptimizedStep extends BusinessLogicStep<CreateUserInput, CreateUserInput> {
  stepName = 'PerformanceOptimizedStep';
  
  constructor(private externalService: ExternalService) {
    super();
  }

  protected async executeLogic(input: CreateUserInput, context: BusinessLogicContext): Promise<CreateUserInput> {
    // ✅ ปรับ timeout based on priority
    const priority = context.metadata.priority || 'normal';
    const timeoutMs = context.metadata.timeoutMs || this.getDefaultTimeout(priority);
    
    // ✅ ปรับ caching strategy based on environment
    const environment = context.metadata.environment;
    const useCache = environment === 'production';
    
    // ✅ ปรับ validation level based on plan
    const plan = context.metadata.plan || 'free';
    const validationLevel = plan === 'enterprise' ? 'strict' : 'standard';

    console.log(`🚀 Processing with priority: ${priority}, timeout: ${timeoutMs}ms, cache: ${useCache}`);

    const validationResult = await this.externalService.validate(input.email, {
      timeout: timeoutMs,
      useCache,
      validationLevel
    });

    return input;
  }

  private getDefaultTimeout(priority: string): number {
    switch (priority) {
      case 'critical': return 30000; // 30s
      case 'high': return 15000;     // 15s  
      case 'normal': return 10000;   // 10s
      case 'low': return 5000;       // 5s
      default: return 10000;
    }
  }
}

// ================================
// 4. Metadata ใช้ใน Business Decisions
// ================================

// ✅ Example: Region-Specific Processing
class RegionalProcessingStep extends BusinessLogicStep<CreateUserInput, CreateUserInput> {
  stepName = 'RegionalProcessing';
  
  protected async executeLogic(input: CreateUserInput, context: BusinessLogicContext): Promise<CreateUserInput> {
    const region = context.metadata.region;
    
    // ✅ GDPR compliance สำหรับ EU
    if (region?.startsWith('eu-')) {
      this.setShared(context, 'gdprCompliance', true);
      this.setShared(context, 'dataRetentionPolicy', 'eu_gdpr');
      await this.applyGdprValidation(input);
    }
    
    // ✅ CCPA compliance สำหรับ California
    if (region === 'us-west-1') {
      this.setShared(context, 'ccpaCompliance', true);
      await this.applyCcpaValidation(input);
    }
    
    // ✅ Localization
    const locale = this.getLocaleFromRegion(region);
    this.setShared(context, 'locale', locale);
    
    return input;
  }

  private async applyGdprValidation(input: CreateUserInput): Promise<void> {
    // GDPR-specific validation
  }

  private async applyCcpaValidation(input: CreateUserInput): Promise<void> {
    // CCPA-specific validation  
  }

  private getLocaleFromRegion(region?: string): string {
    if (region?.startsWith('eu-')) return 'en-EU';
    if (region?.startsWith('us-')) return 'en-US';
    if (region?.startsWith('ap-')) return 'en-APAC';
    return 'en-US';
  }
}

// ================================
// 5. Command สร้าง Metadata จาก Multiple Sources
// ================================

export class CreateUserCommand {
  constructor(private pipeline: BusinessPipeline<CreateUserInput, User>) {}

  async execute(
    input: CreateUserInput, 
    requestContext: {
      // HTTP Request info
      clientIp: string;
      userAgent: string;
      sessionId?: string;
      
      // Business context
      source: 'web' | 'mobile' | 'api';
      referralCode?: string;
      marketingCampaign?: string;
    },
    systemContext?: {
      // System overrides
      priority?: 'low' | 'normal' | 'high';
      timeoutMs?: number;
      features?: Record<string, boolean>;
    }
  ): Promise<User> {

    // ✅ รวม metadata จากหลาย sources
    const context = createBusinessLogicContext({
      userId: input.createdBy,
      metadata: {
        // Request context
        ...requestContext,
        requestId: crypto.randomUUID(),
        
        // System context
        environment: process.env.NODE_ENV as any,
        region: process.env.AWS_REGION,
        version: process.env.APP_VERSION || 'unknown',
        
        // Command context
        command: 'CreateUser',
        operation: 'user_registration',
        
        // Feature flags (จาก service หรือ config)
        features: {
          enhanced_validation: true,
          email_verification: true,
          ...systemContext?.features
        },
        
        // Performance context
        priority: systemContext?.priority || 'normal',
        timeoutMs: systemContext?.timeoutMs || 10000,
        
        // Audit context
        timestamp: new Date(),
        correlationId: crypto.randomUUID()
      }
    });

    console.log('📋 Starting CreateUser with metadata:', {
      correlationId: context.correlationId,
      source: requestContext.source,
      clientIp: requestContext.clientIp,
      environment: context.metadata.environment,
      features: Object.keys(context.metadata.features || {})
    });

    return await this.pipeline.execute(input, context);
  }
}

// ================================
// 6. Metadata Testing
// ================================

describe('CreateUserCommand with Metadata', () => {
  it('should handle different environments correctly', async () => {
    const command = new CreateUserCommand(mockPipeline);
    
    // ✅ Test with production metadata
    const prodResult = await command.execute(validInput, {
      clientIp: '192.168.1.1',
      userAgent: 'Chrome/120',
      source: 'web'
    });

    // ✅ Verify security validation used production settings
    expect(mockSecurityService.comprehensiveCheck).toHaveBeenCalledWith({
      email: validInput.email,
      ip: '192.168.1.1',
      userAgent: 'Chrome/120',
      sessionId: undefined
    });
  });

  it('should respect feature flags from metadata', async () => {
    const command = new CreateUserCommand(mockPipeline);
    
    await command.execute(validInput, 
      { clientIp: '127.0.0.1', userAgent: 'Test', source: 'api' },
      { 
        features: { 
          enhanced_validation: false,  // ← Disable enhanced validation
          email_verification: true 
        } 
      }
    );

    // ✅ Verify enhanced validation was skipped
    expect(mockEnhancedValidation.validate).not.toHaveBeenCalled();
  });
});

// ================================
// 7. สรุป: Metadata ใช้ทำอะไร
// ================================

/*
🎯 Metadata ใช้สำหรับ:

1. **Request Context** 📱
   - Client IP, User Agent, Session ID
   - ใช้ใน security validation, geo-location, device detection

2. **System Context** 🖥️
   - Environment, Region, Version
   - ใช้ใน configuration, performance tuning, regional compliance

3. **Feature Flags** 🚩
   - Enable/disable features dynamically
   - ใช้ใน A/B testing, gradual rollouts, conditional processing

4. **Business Context** 💼
   - Source, Channel, Plan, Organization
   - ใช้ใน business rules, personalization, access control

5. **Audit & Compliance** 📋
   - Rich logging, compliance requirements
   - ใช้ใน audit trails, regulatory reporting, debugging

6. **Performance** ⚡
   - Priority, Timeout, Caching strategies
   - ใช้ใน optimization, resource allocation

7. **Debugging** 🐛
   - Correlation IDs, Request IDs, Tracing
   - ใช้ใน distributed tracing, troubleshooting

💡 คิดง่ายๆ: Metadata = Context ที่ช่วยให้ Business Logic ตัดสินใจได้ดีขึ้น
แต่ไม่ใช่ Business Data หลักที่ต้องการประมวลผล
*/