# docs/SECURITY.md

# Security Considerations

## Data Privacy and Compliance

### Sensitive Data in Observability

**❌ NEVER include sensitive data in observability signals:**

```typescript
// BAD - Exposing sensitive information
span.setAttributes({
  'user.password': userPassword,        // NEVER
  'user.ssn': userSSN,                 // NEVER
  'payment.credit_card': creditCard,    // NEVER
  'auth.api_key': apiKey               // NEVER
});

logger.info('User login', {
  password: userPassword,              // NEVER
  sessionToken: sessionToken           // NEVER
});
```

**✅ Safe alternatives:**

```typescript
// GOOD - Safe observability data
span.setAttributes({
  'user.id': userId,                   // Safe identifier
  'user.tier': userTier,               // Non-sensitive classification
  'payment.method': 'credit-card',     // Payment type only
  'auth.method': 'oauth2'              // Auth mechanism only
});

logger.info('User login', {
  userId: userId,
  loginMethod: 'oauth2',
  success: true,
  duration: loginDuration
});
```

### Data Sanitization Utilities

```typescript
// src/utils/otel-security.utils.ts

export interface SanitizationConfig {
  readonly sensitiveKeys: string[];
  readonly emailDomainOnly: boolean;
  readonly truncateUrls: boolean;
  readonly maxStringLength: number;
}

export function sanitizeAttributes(
  attributes: Record<string, unknown>,
  config?: Partial<SanitizationConfig>
): Record<string, string | number | boolean> {
  const finalConfig: SanitizationConfig = {
    sensitiveKeys: ['password', 'token', 'key', 'secret', 'auth', 'ssn', 'credit'],
    emailDomainOnly: true,
    truncateUrls: true,
    maxStringLength: 256,
    ...config
  };

  const sanitized: Record<string, string | number | boolean> = {};

  Object.entries(attributes).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    
    // Check for sensitive keys
    if (finalConfig.sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
      return;
    }

    if (typeof value === 'string') {
      let sanitizedValue = value;

      // Sanitize email addresses
      if (finalConfig.emailDomainOnly && isEmail(value)) {
        const domain = value.split('@')[1];
        sanitizedValue = `***@${domain}`;
      }

      // Truncate URLs
      if (finalConfig.truncateUrls && isUrl(value)) {
        const url = new URL(value);
        sanitizedValue = `${url.protocol}//${url.host}${url.pathname}`;
      }

      // Limit string length
      if (sanitizedValue.length > finalConfig.maxStringLength) {
        sanitizedValue = sanitizedValue.substring(0, finalConfig.maxStringLength) + '...';
      }

      sanitized[key] = sanitizedValue;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[COMPLEX_OBJECT]';
    }
  });

  return sanitized;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function createSecureSpanAttributes(
  rawAttributes: Record<string, unknown>
): Record<string, string | number | boolean> {
  return sanitizeAttributes(rawAttributes, {
    sensitiveKeys: [
      'password', 'passwd', 'pass',
      'token', 'jwt', 'bearer',
      'key', 'secret', 'private',
      'ssn', 'social',
      'credit', 'card', 'cvv',
      'pin', 'auth', 'session'
    ]
  });
}

export function createSecureLogMetadata(
  rawMetadata: Record<string, unknown>
): Record<string, unknown> {
  return sanitizeAttributes(rawMetadata, {
    sensitiveKeys: [
      'password', 'token', 'key', 'secret',
      'ssn', 'credit', 'auth', 'session'
    ],
    maxStringLength: 1000
  });
}
```

### Secure Configuration

```typescript
// examples/secure-configuration.ts

import { OtelMetricProviderFactory } from '../src';

// Environment-based secure configuration
const secureConfig = {
  serviceName: process.env.SERVICE_NAME || 'secure-service',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'production',
  
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    vendor: 'opentelemetry' as const,
    endpoint: process.env.METRICS_ENDPOINT, // From secure env var
    headers: {
      // Use environment variables for authentication
      'Authorization': process.env.METRICS_AUTH_TOKEN ? 
        `Bearer ${process.env.METRICS_AUTH_TOKEN}` : undefined,
      'X-API-Key': process.env.METRICS_API_KEY
    }
  },
  
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    vendor: 'opentelemetry' as const,
    endpoint: process.env.TRACING_ENDPOINT,
    // Reduce sampling in production for security
    sampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
    headers: {
      'Authorization': process.env.TRACING_AUTH_TOKEN ? 
        `Bearer ${process.env.TRACING_AUTH_TOKEN}` : undefined
    }
  }
};

// Validate secure configuration
function validateSecureConfig(config: typeof secureConfig): void {
  if (config.tracing?.enabled && !config.tracing.endpoint) {
    throw new Error('Tracing endpoint required when tracing is enabled');
  }

  if (config.metrics?.enabled && !config.metrics.endpoint) {
    throw new Error('Metrics endpoint required when metrics is enabled');
  }

  // Warn about insecure configurations
  if (config.tracing?.sampleRate && config.tracing.sampleRate > 0.1) {
    console.warn('High tracing sample rate may expose sensitive data');
  }

  // Ensure authentication is configured for production
  if (process.env.NODE_ENV === 'production') {
    if (config.metrics?.enabled && !config.metrics.headers?.['Authorization']) {
      console.warn('Metrics authentication not configured for production');
    }
    if (config.tracing?.enabled && !config.tracing.headers?.['Authorization']) {
      console.warn('Tracing authentication not configured for production');
    }
  }
}
```

## Network Security

### TLS/SSL Configuration

```typescript
// Secure exporter configuration
const secureExporterConfig = {
  metrics: {
    endpoint: 'https://metrics.example.com/api/v1/metrics', // Use HTTPS
    headers: {
      'Authorization': `Bearer ${process.env.METRICS_TOKEN}`,
      'X-Client-Version': '1.0.0'
    },
    timeout: 10000,
    // TLS configuration for Node.js
    tlsConfig: {
      rejectUnauthorized: true,  // Verify TLS certificates
      minVersion: 'TLSv1.2',     // Minimum TLS version
      ciphers: [                 // Approved cipher suites
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384'
      ].join(':')
    }
  }
};
```

### Request Filtering

```typescript
// Filter sensitive requests from observability
const sensitivePathPatterns = [
  /\/auth\/login/,
  /\/auth\/token/,
  /\/admin\//,
  /\/internal\//,
  /\/health\/.*\/detailed/
];

function shouldIgnoreRequest(url: string, userAgent?: string): boolean {
  // Ignore sensitive paths
  if (sensitivePathPatterns.some(pattern => pattern.test(url))) {
    return true;
  }

  // Ignore health checks from monitoring systems
  const monitoringUserAgents = [
    'kube-probe',
    'aws-health-check',
    'internal-monitor'
  ];

  if (userAgent && monitoringUserAgents.some(ua => userAgent.includes(ua))) {
    return true;
  }

  return false;
}

// Use in HTTP instrumentation
export function createSecureHttpInstrumentation() {
  return {
    shouldCreateSpan: (request: { url: string; headers: Record<string, string> }) => {
      return !shouldIgnoreRequest(request.url, request.headers['user-agent']);
    },
    
    sanitizeAttributes: (attributes: Record<string, unknown>) => {
      return createSecureSpanAttributes(attributes);
    }
  };
}
```

## Access Control

### Role-based Metrics Access

```typescript
interface ObservabilityRole {
  readonly name: string;
  readonly canViewMetrics: boolean;
  readonly canViewTraces: boolean;
  readonly canViewLogs: boolean;
  readonly allowedServices: string[];
  readonly allowedEnvironments: string[];
}

const observabilityRoles: Record<string, ObservabilityRole> = {
  developer: {
    name: 'developer',
    canViewMetrics: true,
    canViewTraces: true,
    canViewLogs: false, // No access to production logs
    allowedServices: ['*'],
    allowedEnvironments: ['development', 'staging']
  },
  
  operator: {
    name: 'operator',
    canViewMetrics: true,
    canViewTraces: false, // Limited trace access
    canViewLogs: true,
    allowedServices: ['*'],
    allowedEnvironments: ['production', 'staging']
  },
  
  security: {
    name: 'security',
    canViewMetrics: true,
    canViewTraces: true,
    canViewLogs: true,
    allowedServices: ['*'],
    allowedEnvironments: ['*']
  }
};

function authorizeObservabilityAccess(
  userRole: string,
  requestedService: string,
  requestedEnvironment: string,
  dataType: 'metrics' | 'traces' | 'logs'
): boolean {
  const role = observabilityRoles[userRole];
  if (!role) {
    return false;
  }

  // Check data type permission
  switch (dataType) {
    case 'metrics':
      if (!role.canViewMetrics) return false;
      break;
    case 'traces':
      if (!role.canViewTraces) return false;
      break;
    case 'logs':
      if (!role.canViewLogs) return false;
      break;
  }

  // Check service access
  if (!role.allowedServices.includes('*') && 
      !role.allowedServices.includes(requestedService)) {
    return false;
  }

  // Check environment access
  if (!role.allowedEnvironments.includes('*') && 
      !role.allowedEnvironments.includes(requestedEnvironment)) {
    return false;
  }

  return true;
}
```

# docs/DEPLOYMENT.md

# Deployment Guide

## Production Deployment Checklist

### ✅ Pre-deployment Checklist

- [ ] **Security Review**
  - [ ] No sensitive data in metrics/traces/logs
  - [ ] Authentication configured for all exporters
  - [ ] TLS/SSL enabled for all communications
  - [ ] Appropriate sampling rates configured

- [ ] **Performance Review**
  - [ ] Sampling rates optimized for production load
  - [ ] Export intervals configured appropriately
  - [ ] Circuit breakers configured for external services
  - [ ] Memory and CPU overhead measured

- [ ] **Reliability Review**
  - [ ] Graceful shutdown implemented
  - [ ] Error handling for all observability operations
  - [ ] Fallback mechanisms in place
  - [ ] Health checks for observability systems

- [ ] **Compliance Review**
  - [ ] Data retention policies configured
  - [ ] Geographic data restrictions respected
  - [ ] Audit logging enabled
  - [ ] Access controls implemented

### 🚀 Deployment Configurations

#### Production Configuration
```typescript
const productionConfig = {
  serviceName: process.env.SERVICE_NAME!,
  serviceVersion: process.env.SERVICE_VERSION!,
  environment: 'production',
  
  metrics: {
    enabled: true,
    vendor: 'opentelemetry' as const,
    exporterType: 'prometheus' as const,
    endpoint: process.env.PROMETHEUS_ENDPOINT!,
    interval: 30000, // 30 seconds
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${process.env.PROMETHEUS_TOKEN!}`
    }
  },
  
  tracing: {
    enabled: true,
    vendor: 'opentelemetry' as const,
    exporterType: 'otlp-http' as const,
    endpoint: process.env.JAEGER_ENDPOINT!,
    sampleRate: 0.01, // 1% sampling for high-volume production
    maxSpansPerTrace: 100,
    timeout: 15000,
    headers: {
      'Authorization': `Bearer ${process.env.JAEGER_TOKEN!}`
    }
  },
  
  logging: {
    enabled: true,
    vendor: 'opentelemetry' as const,
    level: 'info' as const, // No debug logs in production
    format: 'json' as const
  }
};
```

#### Staging Configuration
```typescript
const stagingConfig = {
  ...productionConfig,
  environment: 'staging',
  
  tracing: {
    ...productionConfig.tracing,
    sampleRate: 0.1, // 10% sampling for staging
    maxSpansPerTrace: 200
  },
  
  logging: {
    ...productionConfig.logging,
    level: 'debug' as const // Debug logs allowed in staging
  }
};
```

#### Development Configuration
```typescript
const developmentConfig = {
  serviceName: 'dev-service',
  serviceVersion: '1.0.0-dev',
  environment: 'development',
  
  metrics: {
    enabled: true,
    vendor: 'opentelemetry' as const,
    exporterType: 'console' as const, // Console output for development
    interval: 5000 // Faster feedback in development
  },
  
  tracing: {
    enabled: true,
    vendor: 'opentelemetry' as const,
    exporterType: 'console' as const,
    sampleRate: 1.0, // Trace everything in development
    maxSpansPerTrace: 1000
  },
  
  logging: {
    enabled: true,
    vendor: 'opentelemetry' as const,
    level: 'trace' as const, // Verbose logging in development
    format: 'text' as const  // Human-readable format
  }
};
```

### 🐳 Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S observability -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=observability:nodejs /app/dist ./dist
COPY --from=builder --chown=observability:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=observability:nodejs /app/package.json ./

# Security: Use non-root user
USER observability

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Observability ports
EXPOSE 3000 9090 14268

# Start application
CMD ["node", "dist/server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SERVICE_NAME=my-service
      - SERVICE_VERSION=1.0.0
      - PROMETHEUS_ENDPOINT=http://prometheus:9090/api/v1/write
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - PROMETHEUS_TOKEN=${PROMETHEUS_TOKEN}
      - JAEGER_TOKEN=${JAEGER_TOKEN}
    depends_on:
      - prometheus
      - jaeger
    networks:
      - observability

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - observability

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "14268:14268"
      - "16686:16686"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - observability

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - observability

networks:
  observability:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

### ☸️ Kubernetes Deployment

#### Deployment Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: observability-app
  labels:
    app: observability-app
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: observability-app
  template:
    metadata:
      labels:
        app: observability-app
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: app
        image: my-registry/observability-app:1.0.0
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: SERVICE_NAME
          value: "k8s-observability-app"
        - name: SERVICE_VERSION
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['version']
        - name: SERVICE_INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: PROMETHEUS_ENDPOINT
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: prometheus-endpoint
        - name: PROMETHEUS_TOKEN
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: prometheus-token
        - name: JAEGER_ENDPOINT
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: jaeger-endpoint
        - name: JAEGER_TOKEN
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: jaeger-token
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: observability-app-service
  labels:
    app: observability-app
spec:
  selector:
    app: observability-app
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
---
apiVersion: v1
kind: Secret
metadata:
  name: observability-secrets
type: Opaque
stringData:
  prometheus-endpoint: "https://prometheus.example.com/api/v1/write"
  prometheus-token: "your-prometheus-token"
  jaeger-endpoint: "https://jaeger.example.com/api/traces"
  jaeger-token: "your-jaeger-token"
```

### 📊 Monitoring the Monitor

#### Health Check Implementation
```typescript
// src/health/observability-health.ts

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  duration: number;
  details?: Record<string, unknown>;
  error?: string;
}

export class ObservabilityHealthChecker {
  constructor(
    readonly metricsProvider: UnifiedMetricProvider,
    readonly tracingProvider: UnifiedTraceProvider,
    readonly loggingProvider: UnifiedLogProvider
  ) {}

  async checkHealth(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check metrics provider
    checks.push(await this.checkMetricsHealth());
    
    // Check tracing provider
    checks.push(await this.checkTracingHealth());
    
    // Check logging provider
    checks.push(await this.checkLoggingHealth());

    return checks;
  }

  async checkMetricsHealth(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      // Create a test metric to verify provider is working
      const testCounter = this.metricsProvider.createCounter({
        name: 'health_check_test_counter',
        description: 'Health check test counter'
      });
      
      testCounter.increment();
      
      return {
        name: 'metrics',
        status: 'healthy',
        duration: performance.now() - start,
        details: {
          provider: this.metricsProvider.name,
          initialized: this.metricsProvider.isInitialized
        }
      };
    } catch (error) {
      return {
        name: 'metrics',
        status: 'unhealthy',
        duration: performance.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkTracingHealth(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      const tracer = this.tracingProvider.getActiveTracer();
      const span = tracer.startSpan('health-check-test');
      span.setAttributes({ 'health.check': true });
      span.end();
      
      return {
        name: 'tracing',
        status: 'healthy',
        duration: performance.now() - start,
        details: {
          provider: this.tracingProvider.name,
          initialized: this.tracingProvider.isInitialized
        }
      };
    } catch (error) {
      return {
        name: 'tracing',
        status: 'unhealthy',
        duration: performance.now() - start,
        error: (error as Error).message
      };
    }
  }

  async checkLoggingHealth(): Promise<HealthCheck> {
    const start = performance.now();
    
    try {
      const logger = this.loggingProvider.getLogger('health-check');
      logger.info('Health check test log message');
      
      return {
        name: 'logging',
        status: 'healthy',
        duration: performance.now() - start,
        details: {
          provider: this.loggingProvider.name,
          initialized: this.loggingProvider.isInitialized
        }
      };
    } catch (error) {
      return {
        name: 'logging',
        status: 'unhealthy',
        duration: performance.now() - start,
        error: (error as Error).message
      };
    }
  }

  async getOverallHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheck[];
  }> {
    const checks = await this.checkHealth();
    
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    let status: 'healthy' | 'unhealthy' | 'degraded';
    
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return { status, checks };
  }
}
```

### 🔄 CI/CD Integration

#### GitHub Actions Workflow
```yaml
name: Deploy with Observability

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-observability:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run observability tests
      run: npm run test:observability
      env:
        NODE_ENV: test
    
    - name: Test observability performance
      run: npm run test:performance
    
    - name: Verify security compliance
      run: npm run test:security

  deploy:
    needs: test-observability
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and deploy
      run: |
        docker build -t ${{ secrets.REGISTRY }}/app:${{ github.sha }} .
        docker push ${{ secrets.REGISTRY }}/app:${{ github.sha }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/observability-app \
          app=${{ secrets.REGISTRY }}/app:${{ github.sha }}
    
    - name: Verify deployment health
      run: |
        kubectl rollout status deployment/observability-app
        kubectl exec deployment/observability-app -- \
          curl -f http://localhost:3000/health/observability
```

This completes the comprehensive OpenTelemetry unified observability package with:

1. ✅ **Complete Type Safety** - No `any` types throughout
2. ✅ **Utility-based Architecture** - No private methods, utilities extracted
3. ✅ **Comprehensive Testing** - Internal modules for testing
4. ✅ **Security Compliance** - Data sanitization and secure configurations
5. ✅ **Production Ready** - Performance optimization and monitoring
6. ✅ **Framework Agnostic** - Vendor-independent implementation
7. ✅ **Enterprise Features** - Circuit breakers, retry logic, health checks

The package provides a complete observability solution that can replace vendor-specific SDKs while maintaining flexibility and performance!