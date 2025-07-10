# @inh-lib/inh-logger

> **Powerful TypeScript logger with context tracking and parent-child relationships**

[![npm version](https://badge.fury.io/js/%40inh-lib%2Finh-logger.svg)](https://badge.fury.io/js/%40inh-lib%2Finh-logger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🔗 **Parent-Child Context Tracking** - Trace request flows across services
- 🎯 **TypeScript First** - Full type safety with generics support
- ⚡ **Lazy Data Evaluation** - Performance-optimized logging
- 🎛️ **Flexible Log Levels** - Configurable filtering with inheritance
- 🔌 **Multi-Backend Support** - Works with Console, Winston, Pino, and more
- 📦 **Zero Dependencies** - Lightweight and efficient
- 🚀 **Framework Agnostic** - Perfect for Express, Fastify, Hono, and others

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Framework Integration](#framework-integration)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Contributing](#contributing)

## 🚀 Installation

```bash
npm install @inh-lib/inh-logger
```

```bash
yarn add @inh-lib/inh-logger
```

```bash
pnpm add @inh-lib/inh-logger
```

## ⚡ Quick Start

### Basic Usage

```typescript
import { InhLogContext, LogLevel } from '@inh-lib/inh-logger';

// Simple console logging
const logger = new InhLogContext(console, 'MyApp', LogLevel.INFO);

logger.info('Application started', { 
  version: '1.0.0', 
  port: 3000 
});

logger.error('Database connection failed', { 
  host: 'localhost', 
  port: 5432,
  retryCount: 3 
});
```

**Output:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "originEventId": null,
  "eventName": "MyApp",
  "message": "Application started",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": 2,
  "data": {
    "version": "1.0.0",
    "port": 3000
  }
}

{
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "originEventId": null,
  "eventName": "MyApp",
  "message": "Database connection failed",
  "timestamp": "2024-01-15T10:30:45.234Z",
  "level": 4,
  "data": {
    "host": "localhost",
    "port": 5432,
    "retryCount": 3
  }
}
```

### Child Context Creation

```typescript
// Create child contexts for request tracing
const requestLogger = logger.createChild('Request');
const dbLogger = requestLogger.createChild('Database');

requestLogger.info('Processing user request', { userId: 123 });
dbLogger.debug('Executing SQL query', { table: 'users' });

// Child contexts automatically maintain parent relationships
```

**Output:**
```json
{
  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "originEventId": "550e8400-e29b-41d4-a716-446655440001",
  "eventName": "Request",
  "message": "Processing user request",
  "timestamp": "2024-01-15T10:30:45.345Z",
  "level": 2,
  "data": {
    "userId": 123
  }
}

{
  "eventId": "b2c3d4e5-f6g7-8901-bcde-f23456789012",
  "originEventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventName": "Database",
  "message": "Executing SQL query",
  "timestamp": "2024-01-15T10:30:45.456Z",
  "level": 1,
  "data": {
    "table": "users"
  }
}
```

> 📝 **Event ID Chain:**
> - `MyApp` (root) has `originEventId: null`
> - `Request` (child) has `originEventId` pointing to `MyApp` context
> - `Database` (grandchild) has `originEventId` pointing to `Request` context

### Environment-based Log Level Configuration

```typescript
import { InhLogContext, LogLevel, stringToLogLevel } from '@inh-lib/inh-logger';

// ✅ Good - Configure log level from environment
const getLogLevelFromEnv = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL || 'info';
  return stringToLogLevel(envLevel);
};

// Create logger with environment-based log level
const logger = new InhLogContext(console, 'MyApp', getLogLevelFromEnv());

// Alternative: Environment-specific defaults
const createAppLogger = () => {
  const defaultLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
  const logLevel = stringToLogLevel(process.env.LOG_LEVEL || defaultLevel);
  
  return new InhLogContext(console, 'MyApp', logLevel);
};

// Usage examples
logger.debug('Debug info');        // Only shows when LOG_LEVEL=debug
logger.info('App started');        // Shows when LOG_LEVEL=info or below
logger.warn('Warning message');    // Shows when LOG_LEVEL=warn or below
logger.error('Error occurred');    // Shows when LOG_LEVEL=error or below
```

### Log Level Filtering

```typescript
const logger = new InhLogContext(console, 'App', LogLevel.WARN);

logger.debug('Debug info');  // ❌ Won't log (below WARN)
logger.info('Info message'); // ❌ Won't log (below WARN)
logger.warn('Warning!');     // ✅ Will log
logger.error('Error!');      // ✅ Will log
```

**Output:**
```json
{
  "eventId": "c3d4e5f6-g7h8-9012-cdef-345678901234",
  "originEventId": null,
  "eventName": "App",
  "message": "Warning!",
  "timestamp": "2024-01-15T10:30:45.567Z",
  "level": 3
}

{
  "eventId": "c3d4e5f6-g7h8-9012-cdef-345678901234",
  "originEventId": null,
  "eventName": "App",
  "message": "Error!",
  "timestamp": "2024-01-15T10:30:45.678Z",
  "level": 4
}
```

> 💡 **Debug and Info messages are filtered out** because LogLevel.WARN (3) blocks levels below it.

## 🧠 Core Concepts

### Event ID vs Origin Event ID

Understanding the relationship between `eventId` and `originEventId`:

```typescript
const appLogger = new InhLogContext(console, 'App');
const requestLogger = appLogger.createChild('Request');
const dbLogger = requestLogger.createChild('Database');
```

**Context Hierarchy:**
```json
// Root Context
{
  "eventId": "app-abc123",
  "originEventId": null,        // ✅ Root has no parent
  "eventName": "App"
}

// Child Context  
{
  "eventId": "req-def456",
  "originEventId": "app-abc123", // ✅ Points to parent
  "eventName": "Request"
}

// Grandchild Context
{
  "eventId": "db-ghi789", 
  "originEventId": "req-def456", // ✅ Points to immediate parent
  "eventName": "Database"
}
```

**Key Points:**
- `eventId`: Unique identifier for each context
- `originEventId`: Parent context's eventId (null for root contexts)
- All log entries from the same context share the same `eventId`
- Use `originEventId` to trace parent-child relationships

> 📝 **Note:** Root contexts have `originEventId: undefined` in memory but display as `null` in JSON output for clarity and queryability.

### Context Hierarchy

```typescript
const appLogger = new InhLogContext(console, 'App');
const serviceLogger = appLogger.createChild('UserService');
const repoLogger = serviceLogger.createChild('UserRepository');

// Each context maintains a unique event ID and tracks its parent
// Perfect for distributed tracing and request flow analysis
```

### Tracing Request Flows

```typescript
// Find all root contexts
const rootContexts = logs.filter(log => log.originEventId === null);

// Find children of a specific context
const children = logs.filter(log => log.originEventId === 'app-abc123');

// Build complete trace chain
function buildTraceChain(eventId: string, logs: LogEntry[]): LogEntry[] {
  const result = [];
  let currentId = eventId;
  
  while (currentId) {
    const log = logs.find(l => l.eventId === currentId);
    if (!log) break;
    
    result.unshift(log);
    currentId = log.originEventId; // null will break the loop
  }
  
  return result;
}
```

### Lazy Data Evaluation

```typescript
const logger = new InhLogContext(console, 'App', LogLevel.WARN);

// Expensive computation only runs if log level allows it
logger.debug('Heavy computation result', () => {
  // This function only executes if DEBUG level is enabled
  return performExpensiveCalculation();
});
```

### Structured Logging

```typescript
logger.info('User authentication successful', {
  userId: 'user_123',
  email: 'john@example.com',
  loginMethod: 'oauth',
  ipAddress: '192.168.1.100',
  timestamp: new Date().toISOString(),
  metadata: {
    userAgent: 'Mozilla/5.0...',
    sessionId: 'sess_456'
  }
});
```

**Output:**
```json
{
  "eventId": "d4e5f6g7-h8i9-0123-defg-456789012345",
  "originEventId": null,
  "eventName": "App",
  "message": "User authentication successful",
  "timestamp": "2024-01-15T10:30:45.789Z",
  "level": 2,
  "data": {
    "userId": "user_123",
    "email": "john@example.com",
    "loginMethod": "oauth",
    "ipAddress": "192.168.1.100",
    "timestamp": "2024-01-15T10:30:45.789Z",
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "sessionId": "sess_456"
    }
  }
}
```

## 📚 API Reference

### InhLogContext

#### Constructor

```typescript
new InhLogContext(logger: InhLogger, eventName?: string, logLevel?: LogLevel)
```

#### Methods

| Method | Description | Example |
|--------|-------------|---------|
| `info(message, data?)` | Log info level message | `logger.info('User created', { id: 123 })` |
| `debug(message, data?)` | Log debug level message | `logger.debug('Query executed')` |
| `warn(message, data?)` | Log warning level message | `logger.warn('Rate limit hit')` |
| `error(message, data?)` | Log error level message | `logger.error('DB connection failed')` |
| `fatal(message, data?)` | Log fatal level message | `logger.fatal('System shutdown')` |
| `createChild(name)` | Create child context | `const child = logger.createChild('API')` |
| `setLogLevel(level)` | Change log level | `logger.setLogLevel(LogLevel.DEBUG)` |
| `getLogLevel()` | Get current log level | `const level = logger.getLogLevel()` |

### LogLevel Enum

```typescript
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}
```

### LogEntry Interface

```typescript
interface LogEntry<T = object> {
  eventId: string;           // Unique context identifier
  originEventId: string | null;  // Parent context ID (null for root)
  eventName: string;         // Context name
  message: string;           // Log message
  timestamp: Date;           // When log was created
  level: LogLevel;           // Log severity level
  data?: T;                  // Optional structured data
}
```

### Utility Functions

```typescript
import { 
  logLevelToString, 
  stringToLogLevel, 
  enhanceLogger,
  validateLogEntry 
} from '@inh-lib/inh-logger';

// Convert log levels
const levelName = logLevelToString(LogLevel.ERROR); // "error"
const level = stringToLogLevel("debug"); // LogLevel.DEBUG

// Enhance existing loggers
const enhanced = enhanceLogger(console, LogLevel.INFO);

// Enhanced utility functions with null support
export const LogUtils = {
  isRoot: (entry: LogEntry): boolean => 
    entry.originEventId === null,
    
  getParentId: (entry: LogEntry): string | null => 
    entry.originEventId,
    
  findRoots: (logs: LogEntry[]): LogEntry[] => 
    logs.filter(log => log.originEventId === null),
    
  findChildren: (parentId: string, logs: LogEntry[]): LogEntry[] =>
    logs.filter(log => log.originEventId === parentId),
    
  buildTraceChain: (targetEventId: string, logs: LogEntry[]): LogEntry[] => {
    const result: LogEntry[] = [];
    let currentId: string | null = targetEventId;
    
    while (currentId) {
      const log = logs.find(l => l.eventId === currentId);
      if (!log) break;
      
      result.unshift(log);
      currentId = log.originEventId;
    }
    
    return result;
  }
};
```

## 🌐 Framework Integration

### Fastify

```typescript
import fastify from 'fastify';
import { InhLogContext, LogLevel } from '@inh-lib/inh-logger';

// Use Fastify's built-in logger (Pino by default)
const app = fastify({ 
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

// Plugin for request-scoped logging using Fastify's logger
app.register(async function (fastify) {
  fastify.addHook('onRequest', async (request) => {
    // Use Fastify's logger instance with inh-logger
    request.logger = new InhLogContext(fastify.log, 'Request', LogLevel.INFO);
    request.logger.info('Request received', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent']
    });
  });
});

app.get('/users/:id', async (request) => {
  const dbLogger = request.logger.createChild('Database');
  dbLogger.debug('Fetching user', { userId: request.params.id });
  
  // ... business logic
  
  request.logger.info('Request completed', { statusCode: 200 });
});

// Alternative: Global inh-logger setup with Fastify logger
const setupGlobalLogger = (fastify) => {
  const globalLogger = new InhLogContext(fastify.log, 'App', LogLevel.INFO);
  
  fastify.decorate('inhLogger', globalLogger);
  
  fastify.addHook('onRequest', async (request) => {
    request.logger = fastify.inhLogger.createChild('Request');
  });
};

app.register(setupGlobalLogger);
```

**Example Request Output (via Fastify Logger):**

GET `/users/123` request flow:

```json
{
  "level": 30,
  "time": 1705315845123,
  "pid": 1234,
  "hostname": "localhost",
  "eventId": "req-550e8400-e29b-41d4-a716",
  "originEventId": null,
  "eventName": "Request",
  "message": "Request received",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": 2,
  "data": {
    "method": "GET",
    "url": "/users/123",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
  }
}
```

```json
{
  "level": 20,
  "time": 1705315845234,
  "pid": 1234,
  "hostname": "localhost",
  "eventId": "db-a1b2c3d4-e5f6-7890-abcd",
  "originEventId": "req-550e8400-e29b-41d4-a716",
  "eventName": "Database",
  "message": "Fetching user",
  "timestamp": "2024-01-15T10:30:45.234Z",
  "level": 1,
  "data": {
    "userId": "123"
  }
}
```

```json
{
  "level": 30,
  "time": 1705315845345,
  "pid": 1234,
  "hostname": "localhost",
  "eventId": "req-550e8400-e29b-41d4-a716",
  "originEventId": null,
  "eventName": "Request", 
  "message": "Request completed",
  "timestamp": "2024-01-15T10:30:45.345Z",
  "level": 2,
  "data": {
    "statusCode": 200
  }
}
```

> 🔍 **Benefits of using Fastify Logger:**
> - **Structured JSON output** by default (Pino)
> - **Performance optimized** logging
> - **Automatic request correlation** when combined with inh-logger contexts
> - **Configurable transports** (file, console, remote services)
> - **Built-in serializers** for req/res objects

### Hono

```typescript
import { Hono } from 'hono';
import { InhLogContext, LogLevel } from '@inh-lib/inh-logger';

const app = new Hono();

// Middleware for logging
app.use('*', async (c, next) => {
  const logger = new InhLogContext(console, 'Request', LogLevel.INFO);
  
  logger.info('Request started', {
    method: c.req.method,
    path: c.req.path
  });
  
  c.set('logger', logger);
  await next();
});

app.get('/api/users', async (c) => {
  const logger = c.get('logger');
  const dbLogger = logger.createChild('Database');
  
  dbLogger.info('Querying users');
  // ... business logic
  
  return c.json({ users: [] });
});
```

### Express.js

```typescript
import express from 'express';
import { InhLogContext, LogLevel } from '@inh-lib/inh-logger';

const app = express();

// Middleware
app.use((req, res, next) => {
  req.logger = new InhLogContext(console, 'Request', LogLevel.INFO);
  req.logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

app.get('/api/users/:id', async (req, res) => {
  const { logger } = req;
  const serviceLogger = logger.createChild('UserService');
  
  try {
    serviceLogger.info('Fetching user', { userId: req.params.id });
    // ... business logic
    res.json({ user: {} });
  } catch (error) {
    serviceLogger.error('Failed to fetch user', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🔗 Logger Backend Integration

### Winston

```typescript
import winston from 'winston';
import { InhLogContext } from '@inh-lib/inh-logger';

const winstonLogger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

const winstonAdapter = {
  info: (entry) => winstonLogger.info(entry),
  error: (entry) => winstonLogger.error(entry),
  debug: (entry) => winstonLogger.debug(entry),
  warn: (entry) => winstonLogger.warn(entry)
};

const logger = new InhLogContext(winstonAdapter, 'App');
```

### Pino

```typescript
import pino from 'pino';
import { InhLogContext } from '@inh-lib/inh-logger';

const pinoLogger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

const pinoAdapter = {
  info: (entry) => pinoLogger.info(entry),
  error: (entry) => pinoLogger.error(entry),
  debug: (entry) => pinoLogger.debug(entry)
};

const logger = new InhLogContext(pinoAdapter, 'App');
```

### Custom Logger

```typescript
import { InhLogger, LogEntry } from '@inh-lib/inh-logger';

class CustomFileLogger implements InhLogger {
  constructor(private filePath: string) {}
  
  info(entry: LogEntry) {
    this.writeToFile('INFO', entry);
  }
  
  error(entry: LogEntry) {
    this.writeToFile('ERROR', entry);
  }
  
  private writeToFile(level: string, entry: LogEntry) {
    const logLine = `[${level}] ${entry.timestamp.toISOString()} - ${entry.message}\n`;
    // Write to file logic here
  }
}

const fileLogger = new CustomFileLogger('./app.log');
const logger = new InhLogContext(fileLogger, 'App');
```

## 🎯 Advanced Usage

### Performance Optimization with Lazy Evaluation

```typescript
const logger = new InhLogContext(console, 'App', LogLevel.WARN);

// Heavy computation only runs when logging level allows it
logger.debug('Processing results', () => {
  // This expensive operation only executes if DEBUG is enabled
  const results = performComplexAnalysis();
  return {
    processedItems: results.length,
    executionTime: results.executionTime,
    memoryUsage: process.memoryUsage()
  };
});

// String concatenation example
logger.debug('User details', () => {
  // Only format this expensive string if debug logging is enabled
  return {
    userInfo: `${user.firstName} ${user.lastName} (${user.email})`,
    fullProfile: generateUserProfile(user) // Expensive operation
  };
});

logger.error('Critical error occurred', () => ({
  errorDetails: analyzeError(), // This WILL execute (ERROR >= WARN)
  systemState: getCurrentSystemState()
}));
```

**Output with LogLevel.WARN:**

No output for debug logs (expensive functions won't execute):

```json
{
  "eventId": "app-f7g8h9i0-j1k2-3456",
  "originEventId": null,
  "eventName": "App",
  "message": "Critical error occurred",
  "timestamp": "2024-01-15T10:30:45.567Z",
  "level": 4,
  "data": {
    "errorDetails": {
      "type": "DatabaseConnectionError",
      "code": "ECONNREFUSED",
      "retryCount": 3
    },
    "systemState": {
      "memoryUsage": 85.6,
      "cpuLoad": 92.3,
      "activeConnections": 247
    }
  }
}
```

> ⚡ **Performance Benefit:** Expensive computations in `logger.debug()` are completely skipped when log level is WARN or higher!

### Request Tracing Across Services

```typescript
// Main application
const appLogger = new InhLogContext(console, 'App');

// API request handler
async function handleUserRequest(userId: string) {
  const requestLogger = appLogger.createChild('UserRequest');
  
  requestLogger.info('Processing user request', { userId });
  
  // Authentication service
  const authLogger = requestLogger.createChild('AuthService');
  const isAuthenticated = await authenticateUser(userId, authLogger);
  
  if (isAuthenticated) {
    // User service
    const userLogger = requestLogger.createChild('UserService');
    const userData = await fetchUserData(userId, userLogger);
    
    requestLogger.info('Request completed successfully', { 
      userId, 
      responseTime: '245ms' 
    });
    
    return userData;
  }
}

async function authenticateUser(userId: string, logger: InhLogContext) {
  const dbLogger = logger.createChild('Database');
  
  logger.debug('Starting authentication', { userId });
  dbLogger.debug('Querying auth tokens', { table: 'user_tokens' });
  
  // ... authentication logic
  
  logger.info('Authentication successful', { userId });
  return true;
}
```

**Complete Request Trace Output:**

Request processing flow:

```json
{
  "eventId": "req-abc123-def456-ghi789",
  "originEventId": null,
  "eventName": "UserRequest", 
  "message": "Processing user request",
  "timestamp": "2024-01-15T10:30:45.100Z",
  "level": 2,
  "data": { "userId": "user_456" }
}
```

```json
{
  "eventId": "auth-def456-ghi789-jkl012",
  "originEventId": "req-abc123-def456-ghi789",
  "eventName": "AuthService",
  "message": "Starting authentication", 
  "timestamp": "2024-01-15T10:30:45.120Z",
  "level": 1,
  "data": { "userId": "user_456" }
}
```

```json
{
  "eventId": "db-ghi789-jkl012-mno345",
  "originEventId": "auth-def456-ghi789-jkl012",
  "eventName": "Database",
  "message": "Querying auth tokens",
  "timestamp": "2024-01-15T10:30:45.135Z", 
  "level": 1,
  "data": { "table": "user_tokens" }
}
```

```json
{
  "eventId": "auth-def456-ghi789-jkl012",
  "originEventId": "req-abc123-def456-ghi789",
  "eventName": "AuthService",
  "message": "Authentication successful",
  "timestamp": "2024-01-15T10:30:45.180Z",
  "level": 2,
  "data": { "userId": "user_456" }
}
```

```json
{
  "eventId": "req-abc123-def456-ghi789",
  "originEventId": null,
  "eventName": "UserRequest",
  "message": "Request completed successfully",
  "timestamp": "2024-01-15T10:30:45.345Z",
  "level": 2,
  "data": {
    "userId": "user_456",
    "responseTime": "245ms"
  }
}
```

> 🔗 **Enhanced Tracing Chain:**
> 
> SQL query examples for log analysis:
> 
> ```sql
> -- Find all logs for this request
> SELECT * FROM logs 
> WHERE eventId = 'req-abc123...' OR originEventId = 'req-abc123...';
> ```
> 
> ```sql
> -- Find only root contexts
> SELECT * FROM logs WHERE originEventId IS NULL;
> ```
> 
> ```sql
> -- Build hierarchy with recursive query
> WITH RECURSIVE trace AS (
>   SELECT * FROM logs WHERE eventId = 'db-ghi789...'
>   UNION ALL
>   SELECT l.* FROM logs l 
>   JOIN trace t ON l.eventId = t.originEventId
> ) SELECT * FROM trace;
> ```

### Error Handling with Context

```typescript
async function processOrder(orderId: string) {
  const orderLogger = appLogger.createChild('OrderProcessing');
  
  try {
    orderLogger.info('Processing order', { orderId });
    
    const paymentLogger = orderLogger.createChild('Payment');
    await processPayment(orderId, paymentLogger);
    
    const inventoryLogger = orderLogger.createChild('Inventory');
    await updateInventory(orderId, inventoryLogger);
    
    orderLogger.info('Order processed successfully', { orderId });
    
  } catch (error) {
    orderLogger.error('Order processing failed', {
      orderId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Error context is preserved through the entire chain
    throw error;
  }
}
```

## 💡 Best Practices

### 1. **Use Descriptive Event Names**

```typescript
// ✅ Good
const apiLogger = appLogger.createChild('UserRegistrationAPI');
const validationLogger = apiLogger.createChild('InputValidation');
const emailLogger = apiLogger.createChild('EmailService');

// ❌ Avoid
const logger1 = appLogger.createChild('API');
const logger2 = logger1.createChild('Validation');
```

### 2. **Structured Data Logging**

```typescript
// ✅ Good - Structured and searchable
logger.info('User login attempt', {
  userId: 'user_123',
  email: 'john@example.com',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  loginMethod: 'oauth',
  success: true,
  duration: 245
});

// ❌ Avoid - Unstructured string interpolation
logger.info(`User ${email} logged in from ${ip} in ${duration}ms`);
```

### 3. **Appropriate Log Levels**

```typescript
// Use appropriate log levels
logger.trace('Entering function calculateTotal()');           // Detailed tracing
logger.debug('Processing item', { itemId, quantity });        // Debugging info
logger.info('Order placed successfully', { orderId });        // General info
logger.warn('Stock running low', { productId, remaining });   // Warnings
logger.error('Payment failed', { orderId, reason });          // Errors
logger.fatal('Database connection lost', { timestamp });      // Critical errors
```

### 4. **Performance-Conscious Logging**

```typescript
// ✅ Good - Use lazy evaluation for expensive operations
logger.debug('Analysis complete', () => ({
  results: expensiveAnalysis(),
  metrics: calculateMetrics()
}));

// ❌ Avoid - Always executes expensive operations
logger.debug('Analysis complete', {
  results: expensiveAnalysis(),  // Always runs even if debug is disabled
  metrics: calculateMetrics()
});
```

### 5. **Understanding Event ID Relationships**

```typescript
// ✅ Good - Check for root contexts
function isRootContext(entry: LogEntry): boolean {
  return entry.originEventId === null;
}

// ✅ Good - Find all logs in a request chain
function findRequestLogs(rootEventId: string, logs: LogEntry[]): LogEntry[] {
  const isInChain = (log: LogEntry): boolean => {
    if (log.eventId === rootEventId) return true;
    if (log.originEventId === null) return false;
    
    const parent = logs.find(l => l.eventId === log.originEventId);
    return parent ? isInChain(parent) : false;
  };
  
  return logs.filter(isInChain);
}

// ✅ Good - Query patterns for different scenarios
const queryPatterns = {
  // Find all root contexts
  roots: "SELECT * FROM logs WHERE originEventId IS NULL",
  
  // Find direct children of a context
  children: "SELECT * FROM logs WHERE originEventId = ?",
  
  // Find all descendants (requires recursive query)
  descendants: `
    WITH RECURSIVE descendants AS (
      SELECT * FROM logs WHERE originEventId = ?
      UNION ALL
      SELECT l.* FROM logs l 
      JOIN descendants d ON l.originEventId = d.eventId
    ) SELECT * FROM descendants
  `
};
```

### 6. **Efficient Log Analysis**

```typescript
// ✅ Good - Group logs by request chains
function groupByRequestChain(logs: LogEntry[]): Map<string, LogEntry[]> {
  const chains = new Map<string, LogEntry[]>();
  
  // First pass: identify root contexts
  const roots = logs.filter(log => log.originEventId === null);
  
  // Second pass: group by root
  for (const log of logs) {
    const rootId = findRootEventId(log, logs);
    if (!chains.has(rootId)) {
      chains.set(rootId, []);
    }
    chains.get(rootId)!.push(log);
  }
  
  return chains;
}

function findRootEventId(log: LogEntry, logs: LogEntry[]): string {
  if (log.originEventId === null) return log.eventId;
  
  const parent = logs.find(l => l.eventId === log.originEventId);
  return parent ? findRootEventId(parent, logs) : log.eventId;
}
```

### 8. **Environment-based Configuration**

```typescript
// ✅ Good - Environment-aware logging configuration
class AppLogger {
  private static instance: InhLogContext;
  
  static getInstance(): InhLogContext {
    if (!this.instance) {
      this.instance = this.createLogger();
    }
    return this.instance;
  }
  
  private static createLogger(): InhLogContext {
    const config = this.getLoggerConfig();
    const backend = this.createLoggerBackend(config);
    
    return new InhLogContext(backend, 'App', config.level);
  }
  
  private static getLoggerConfig() {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL;
    
    const configs = {
      development: {
        level: stringToLogLevel(logLevel || 'debug'),
        format: 'pretty',
        enableConsole: true,
        enableFile: false
      },
      staging: {
        level: stringToLogLevel(logLevel || 'info'),
        format: 'json',
        enableConsole: true,
        enableFile: true
      },
      production: {
        level: stringToLogLevel(logLevel || 'warn'),
        format: 'json',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE !== 'false'
      }
    };
    
    return configs[env] || configs.development;
  }
  
  private static createLoggerBackend(config: any) {
    if (config.enableFile) {
      // Return winston or pino backend
      return this.createFileLogger(config);
    }
    return console;
  }
}

// Usage
const logger = AppLogger.getInstance();

// Environment-specific behavior
logger.debug('Detailed debug info');     // Only in development
logger.info('Application started');      // In development and staging
logger.warn('Resource usage high');      // In all environments
logger.error('Critical failure');        // In all environments
```

**Docker Environment Configuration:**
```dockerfile
# Dockerfile
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=warn


COPY . .
RUN npm install

CMD ["npm", "start"]
```

**Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
  
  app-debug:
    build: .
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    command: npm run dev
```

**Kubernetes ConfigMap:**
```yaml
# k8s-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        envFrom:
        - configMapRef:
            name: app-config
```

**Runtime Log Level Changes:**
```typescript
// ✅ Good - Support runtime log level changes
class DynamicLogger {
  private logger: InhLogContext;
  
  constructor() {
    this.logger = new InhLogContext(console, 'App', this.getCurrentLogLevel());
    this.watchEnvironmentChanges();
  }
  
  private getCurrentLogLevel(): LogLevel {
    return stringToLogLevel(process.env.LOG_LEVEL || 'info');
  }
  
  private watchEnvironmentChanges() {
    // Watch for SIGUSR1 signal to reload configuration
    process.on('SIGUSR1', () => {
      const newLevel = this.getCurrentLogLevel();
      this.logger.setLogLevel(newLevel);
      this.logger.info('Log level changed', { newLevel: LogLevel[newLevel] });
    });
  }
  
  getLogger(): InhLogContext {
    return this.logger;
  }
}

// Usage
const dynamicLogger = new DynamicLogger();
const logger = dynamicLogger.getLogger();
```

### 9. **Error Context Preservation**

```typescript
async function processUserData(userId: string) {
  const logger = appLogger.createChild('UserDataProcessing');
  
  try {
    // ... processing logic
  } catch (error) {
    logger.error('User data processing failed', {
      userId,
      error: error.message,
      stack: error.stack,
      context: {
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
    
    throw error; // Re-throw with logged context
  }
}
```

```typescript
async function processUserData(userId: string) {
  const logger = appLogger.createChild('UserDataProcessing');
  
  try {
    // ... processing logic
  } catch (error) {
    logger.error('User data processing failed', {
      userId,
      error: error.message,
      stack: error.stack,
      context: {
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
    
    throw error; // Re-throw with logged context
  }
}
```

## 📝 Examples

### Complete API Server Example

```typescript
import fastify from 'fastify';
import { InhLogContext, LogLevel } from '@inh-lib/inh-logger';

const app = fastify({ logger: false });

// Global logger
const appLogger = new InhLogContext(console, 'ECommerceAPI', LogLevel.INFO);

// Request logging middleware
app.addHook('onRequest', async (request) => {
  request.logger = appLogger.createChild('APIRequest');
  request.startTime = Date.now();
  
  request.logger.info('API request received', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    requestId: request.id
  });
});

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  
  request.logger.info('API request completed', {
    statusCode: reply.statusCode,
    duration: `${duration}ms`,
    method: request.method,
    url: request.url
  });
});

// User registration endpoint
app.post('/api/users/register', async (request, reply) => {
  const { logger } = request;
  const { email, firstName, lastName } = request.body;
  
  const validationLogger = logger.createChild('Validation');
  const dbLogger = logger.createChild('Database');
  const emailLogger = logger.createChild('EmailService');
  
  try {
    // Validation
    validationLogger.debug('Validating user input', { email });
    if (!email || !firstName || !lastName) {
      validationLogger.warn('Invalid input provided', { email, firstName, lastName });
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    // Database operation
    dbLogger.info('Creating user record', { email });
    const userId = await createUser({ email, firstName, lastName });
    dbLogger.info('User created successfully', { userId, email });
    
    // Send welcome email
    emailLogger.info('Sending welcome email', { userId, email });
    await sendWelcomeEmail(email, firstName);
    emailLogger.info('Welcome email sent', { userId, email });
    
    logger.info('User registration completed', { 
      userId, 
      email,
      totalDuration: `${Date.now() - request.startTime}ms`
    });
    
    return { success: true, userId };
    
  } catch (error) {
    logger.error('User registration failed', {
      email,
      error: error.message,
      stack: error.stack
    });
    
    return reply.status(500).send({ error: 'Registration failed' });
  }
});

async function createUser(userData) {
  // Database logic here
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

async function sendWelcomeEmail(email, firstName) {
  // Email service logic here
  return true;
}

app.listen({ port: 3000 }, () => {
  appLogger.info('Server started', { 
    port: 3000, 
    environment: process.env.NODE_ENV 
  });
});
```

**Complete Registration Flow Output:**

POST `/api/users/register` with body: `{"email":"john@example.com","firstName":"John","lastName":"Doe"}`

Server startup:
```json
{
  "eventId": "server-550e8400-e29b-41d4",
  "originEventId": null,
  "eventName": "ECommerceAPI",
  "message": "Server started",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": 2,
  "data": {
    "port": 3000,
    "environment": "development"
  }
}
```

Request received:
```json
{
  "eventId": "req-a1b2c3d4-e5f6-7890",
  "originEventId": "server-550e8400-e29b-41d4",
  "eventName": "APIRequest",
  "message": "API request received", 
  "timestamp": "2024-01-15T10:30:45.100Z",
  "level": 2,
  "data": {
    "method": "POST",
    "url": "/api/users/register",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "requestId": "req-12345"
  }
}
```

Validation step:
```json
{
  "eventId": "val-b2c3d4e5-f6g7-8901",
  "originEventId": "req-a1b2c3d4-e5f6-7890",
  "eventName": "Validation",
  "message": "Validating user input",
  "timestamp": "2024-01-15T10:30:45.120Z", 
  "level": 1,
  "data": {
    "email": "john@example.com"
  }
}
```

Database operations:
```json
{
  "eventId": "db-c3d4e5f6-g7h8-9012", 
  "originEventId": "req-a1b2c3d4-e5f6-7890",
  "eventName": "Database",
  "message": "Creating user record",
  "timestamp": "2024-01-15T10:30:45.140Z",
  "level": 2,
  "data": {
    "email": "john@example.com"
  }
}
```

```json
{
  "eventId": "db-c3d4e5f6-g7h8-9012",
  "originEventId": "req-a1b2c3d4-e5f6-7890", 
  "eventName": "Database",
  "message": "User created successfully",
  "timestamp": "2024-01-15T10:30:45.180Z",
  "level": 2,
  "data": {
    "userId": "user_abc123def",
    "email": "john@example.com"
  }
}
```

Email service:
```json
{
  "eventId": "email-d4e5f6g7-h8i9-0123",
  "originEventId": "req-a1b2c3d4-e5f6-7890",
  "eventName": "EmailService", 
  "message": "Sending welcome email",
  "timestamp": "2024-01-15T10:30:45.200Z",
  "level": 2,
  "data": {
    "userId": "user_abc123def",
    "email": "john@example.com"
  }
}
```

```json
{
  "eventId": "email-d4e5f6g7-h8i9-0123",
  "originEventId": "req-a1b2c3d4-e5f6-7890",
  "eventName": "EmailService",
  "message": "Welcome email sent", 
  "timestamp": "2024-01-15T10:30:45.250Z",
  "level": 2,
  "data": {
    "userId": "user_abc123def", 
    "email": "john@example.com"
  }
}
```

Registration completion:
```json
{
  "eventId": "req-a1b2c3d4-e5f6-7890",
  "originEventId": "server-550e8400-e29b-41d4",
  "eventName": "APIRequest",
  "message": "User registration completed",
  "timestamp": "2024-01-15T10:30:45.270Z",
  "level": 2, 
  "data": {
    "userId": "user_abc123def",
    "email": "john@example.com",
    "totalDuration": "170ms"
  }
}
```

Request completed:
```json
{
  "eventId": "req-a1b2c3d4-e5f6-7890", 
  "originEventId": "server-550e8400-e29b-41d4",
  "eventName": "APIRequest",
  "message": "API request completed",
  "timestamp": "2024-01-15T10:30:45.280Z",
  "level": 2,
  "data": {
    "statusCode": 200,
    "duration": "180ms", 
    "method": "POST",
    "url": "/api/users/register"
  }
}
```

> 📊 **Enhanced Request Tracing:**
> 
> SQL query patterns for production log analysis:
> 
> ```sql
> -- Root Detection
> SELECT * FROM logs WHERE originEventId IS NULL;
> ```
> 
> ```sql  
> -- Request Scope
> SELECT * FROM logs 
> WHERE originEventId = 'req-a1b2c3d4...' OR eventId = 'req-a1b2c3d4...';
> ```
> 
> Benefits:
> - **Service Separation:** Each service has unique eventId but same originEventId
> - **Performance Analysis:** Calculate duration between first and last log of same eventId
> - **Error Correlation:** Group errors by originEventId to trace failure chains

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/inh-logger.git

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only  
npm run test:integration

# Run tests with real console output (demo)
npm run test:demo
```

## 📄 License

MIT © [Your Organization](https://github.com/your-org)

## 🔗 Links

- [GitHub Repository](https://github.com/your-org/inh-logger)
- [NPM Package](https://www.npmjs.com/package/@inh-lib/inh-logger)
- [Documentation](https://your-org.github.io/inh-logger)
- [Changelog](CHANGELOG.md)
- [Issues](https://github.com/your-org/inh-logger/issues)

---

Made with ❤️ by [Your Organization](https://github.com/your-org)