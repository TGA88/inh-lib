# @inh-lib/api-util-fastify

A TypeScript-first Fastify adapter that provides a unified HTTP context abstraction for building framework-agnostic web services.

## 📚 Series Guide

This documentation is split into multiple parts for easier reading:

- **[Part 1: Getting Started](README.md)** ← You are here
- **[Part 2: Schema Validation with Zod](docs/02-zod-validation.md)**  
- **[Part 3: Framework-Agnostic Architecture](docs/03-framework-agnostic.md)**
- **[Part 4: Enterprise Architecture](docs/04-enterprise-architecture.md)**
- **[Part 5: Configuration & Deployment](docs/05-configuration-deployment.md)**

## Features

✨ **Framework Agnostic** - Use the same business logic across Fastify, Express, and Koa  
🎯 **TypeScript First** - Full type safety with generic support  
🔧 **Function-based API** - Easy to test and compose  
⚡ **Performance** - Minimal overhead with efficient adapters  
🧪 **Well Tested** - Comprehensive test coverage  
📦 **Tree-shakable** - Import only what you need  

## Installation

```bash
# npm
npm install @inh-lib/api-util-fastify

# yarn
yarn add @inh-lib/api-util-fastify

# pnpm
pnpm add @inh-lib/api-util-fastify
```

### Peer Dependencies

```bash
npm install fastify @inh-lib/common
```

## Quick Start

### Basic Usage

```typescript
import { FastifyInstance } from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { getRequestBody, sendResponse } from '@inh-lib/common';

const fastify: FastifyInstance = require('fastify')({ logger: true });

// Register a route with unified context
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  // Use unified helper functions
  const userData = getRequestBody(context);
  
  // Your business logic here
  const newUser = await createUser(userData);
  
  // Send response
  sendResponse(context, newUser, 201);
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server listening on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Type-Safe Request Handling

```typescript
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
}

fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  
  const userData = getRequestBody<CreateUserRequest>(context);
  // userData is now fully typed ✨
  
  const user = {
    id: generateId(),
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    age: userData.age,
    createdAt: new Date(),
  };
  
  sendResponse(context, user, 201);
});
```

## API Reference

### Core Functions

#### `createFastifyContext<TBody>(request, reply)`

Creates a unified HTTP context from Fastify request and reply objects.

**Parameters:**
- `request: FastifyRequest` - Fastify request object
- `reply: FastifyReply` - Fastify reply object

**Type Parameters:**
- `TBody` - Type of the request body (optional, defaults to `Record<string, unknown>`)

**Returns:** `UnifiedHttpContext & { request: UnifiedRequestContext & { body: TBody } }`

```typescript
// Basic usage
const context = createFastifyContext(request, reply);

// With typed body
const context = createFastifyContext<UserCreateRequest>(request, reply);
```

#### `adaptFastifyRequest<TBody>(request)`

Adapts a Fastify request to unified request context.

```typescript
const unifiedRequest = adaptFastifyRequest<UserData>(request);
```

#### `adaptFastifyResponse(reply)`

Adapts a Fastify reply to unified response context.

```typescript
const unifiedResponse = adaptFastifyResponse(reply);
```

### Helper Functions (from @inh-lib/common)

#### Request Helpers

```typescript
// Get request body with type safety
const body = getRequestBody<UserCreateRequest>(context);

// Get URL parameters
const params = getParams(context); // { id: "123", category: "users" }

// Get query parameters
const query = getQuery(context); // { page: "1", limit: "10" }

// Get headers
const headers = getHeaders(context);
```

#### Response Helpers

```typescript
// Send successful response
sendResponse(context, data, 200); // status code optional, defaults to 200

// Send error response
sendError(context, 'Validation failed', 422); // status code optional, defaults to 400
```

## Basic Examples

### CRUD Operations

```typescript
import { FastifyInstance } from 'fastify';
import { createFastifyContext, getRequestBody, getParams, getQuery, sendResponse, sendError } from '@inh-lib/api-util-fastify';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export function registerUserRoutes(fastify: FastifyInstance) {
  // Create user
  fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
    const context = createFastifyContext<CreateUserRequest>(request, reply);
    
    try {
      const userData = getRequestBody<CreateUserRequest>(context);
      
      // Validation
      if (!userData.email || !userData.firstName || !userData.lastName) {
        sendError(context, 'Missing required fields', 422);
        return;
      }
      
      // Create user
      const user: User = {
        id: generateId(),
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await userRepository.save(user);
      sendResponse(context, user, 201);
    } catch (error) {
      sendError(context, 'Failed to create user', 500);
    }
  });
  
  // Get users with pagination
  fastify.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    
    try {
      const query = getQuery(context);
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      
      const { users, total } = await userRepository.findPaginated(page, limit);
      
      const response = {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
      
      sendResponse(context, response);
    } catch (error) {
      sendError(context, 'Failed to fetch users', 500);
    }
  });
  
  // Get user by ID
  fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    
    try {
      const params = getParams(context);
      const user = await userRepository.findById(params['id']);
      
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, user);
    } catch (error) {
      sendError(context, 'Failed to fetch user', 500);
    }
  });
  
  // Update user
  fastify.put<{ 
    Params: { id: string }; 
    Body: Partial<CreateUserRequest> 
  }>('/users/:id', async (request, reply) => {
    const context = createFastifyContext<Partial<CreateUserRequest>>(request, reply);
    
    try {
      const params = getParams(context);
      const updateData = getRequestBody<Partial<CreateUserRequest>>(context);
      
      const user = await userRepository.findById(params['id']);
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      const updatedUser: User = {
        ...user,
        ...updateData,
        updatedAt: new Date(),
      };
      
      await userRepository.save(updatedUser);
      sendResponse(context, updatedUser);
    } catch (error) {
      sendError(context, 'Failed to update user', 500);
    }
  });
  
  // Delete user
  fastify.delete<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    
    try {
      const params = getParams(context);
      
      const deleted = await userRepository.deleteById(params['id']);
      if (!deleted) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, { message: 'User deleted successfully' });
    } catch (error) {
      sendError(context, 'Failed to delete user', 500);
    }
  });
}
```

### Error Handling

```typescript
class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message: string, public errors: string[]) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

// Global error handler
function handleApiError(context: UnifiedHttpContext, error: unknown): void {
  if (error instanceof ValidationError) {
    sendError(context, error.message, error.statusCode);
  } else if (error instanceof ApiError) {
    sendError(context, error.message, error.statusCode);
  } else {
    console.error('Unexpected error:', error);
    sendError(context, 'Internal server error', 500);
  }
}

// Usage in route
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  try {
    const userData = getRequestBody(context);
    
    // Validate
    const errors: string[] = [];
    if (!userData.email) errors.push('Email is required');
    if (!userData.firstName) errors.push('First name is required');
    
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
    
    const user = await createUser(userData);
    sendResponse(context, user, 201);
    
  } catch (error) {
    handleApiError(context, error);
  }
});
```

## Testing

The package includes comprehensive test utilities for easy testing:

```typescript
import { adaptFastifyRequest, adaptFastifyResponse, createFastifyContext } from '@inh-lib/api-util-fastify';

// Mock Fastify request/reply for testing
const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/',
  ip: '127.0.0.1',
  ...overrides,
});

const createMockReply = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  header: jest.fn().mockReturnThis(),
  redirect: jest.fn(),
});

describe('User API', () => {
  it('should create user successfully', async () => {
    const mockRequest = createMockRequest({
      body: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    const mockReply = createMockReply();
    
    const context = createFastifyContext(mockRequest as unknown as FastifyRequest, mockReply as unknown as FastifyReply);
    
    await userHandler(context);
    
    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
      })
    );
  });
});
```

## Migration Guide

### From Direct Fastify Usage

```typescript
// Before: Direct Fastify usage
fastify.post('/users', async (request, reply) => {
  const { email, firstName } = request.body as CreateUserRequest;
  
  if (!email) {
    reply.status(422).send({ error: 'Email required' });
    return;
  }
  
  const user = await createUser({ email, firstName });
  reply.status(201).send(user);
});

// After: Using unified context
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  
  const userData = getRequestBody<CreateUserRequest>(context);
  
  if (!userData.email) {
    sendError(context, 'Email required', 422);
    return;
  }
  
  const user = await createUser(userData);
  sendResponse(context, user, 201);
});
```

## Performance Considerations

- **Minimal Overhead**: The adapters add minimal performance overhead
- **Tree Shaking**: Import only the functions you need
- **Memory Efficient**: No unnecessary object creation
- **Type Erasure**: TypeScript types don't affect runtime performance

```typescript
// Only import what you need
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { getRequestBody, sendResponse } from '@inh-lib/common';
```

## Best Practices

### 1. Use Type-Safe Interfaces

```typescript
// Define clear interfaces for your API
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}
```

### 2. Consistent Error Handling

```typescript
// Create standardized error responses
interface ErrorResponse {
  error: string;
  code?: string;
  details?: string[];
  timestamp: string;
}

function createErrorResponse(message: string, code?: string, details?: string[]): ErrorResponse {
  return {
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

// Enhanced sendError function with error response
function sendStructuredError(
  context: UnifiedHttpContext, 
  message: string, 
  statusCode: number = 400,
  code?: string,
  details?: string[]
): void {
  const errorResponse = createErrorResponse(message, code, details);
  context.response['status'](statusCode)['json'](errorResponse);
}

// Usage examples
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  
  try {
    const userData = getRequestBody<CreateUserRequest>(context);
    
    // Validation with structured errors
    const validationErrors: string[] = [];
    if (!userData.email) validationErrors.push('Email is required');
    if (!userData.firstName) validationErrors.push('First name is required');
    if (userData.email && !isValidEmail(userData.email)) {
      validationErrors.push('Invalid email format');
    }
    
    if (validationErrors.length > 0) {
      sendStructuredError(
        context, 
        'Validation failed', 
        422, 
        'VALIDATION_ERROR', 
        validationErrors
      );
      return;
    }
    
    // Business logic
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      sendStructuredError(
        context,
        'Email already exists',
        409,
        'EMAIL_EXISTS'
      );
      return;
    }
    
    const user = await userService.createUser(userData);
    sendResponse(context, user, 201);
    
  } catch (error) {
    console.error('Create user error:', error);
    sendStructuredError(
      context,
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
});

// Different error scenarios with consistent structure
fastify.get('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  try {
    const params = getParams(context);
    const userId = params['id'];
    
    // Parameter validation
    if (!userId || !isValidUUID(userId)) {
      sendStructuredError(
        context,
        'Invalid user ID format',
        400,
        'INVALID_PARAMS',
        ['User ID must be a valid UUID']
      );
      return;
    }
    
    // Authorization check
    const currentUserId = getHeaders(context)['x-user-id'];
    if (!currentUserId) {
      sendStructuredError(
        context,
        'Authentication required',
        401,
        'UNAUTHENTICATED'
      );
      return;
    }
    
    if (currentUserId !== userId) {
      sendStructuredError(
        context,
        'Access denied',
        403,
        'ACCESS_DENIED',
        ['You can only access your own profile']
      );
      return;
    }
    
    const user = await userRepository.findById(userId);
    if (!user) {
      sendStructuredError(
        context,
        'User not found',
        404,
        'USER_NOT_FOUND'
      );
      return;
    }
    
    sendResponse(context, user);
    
  } catch (error) {
    console.error('Get user error:', error);
    sendStructuredError(
      context,
      'Failed to fetch user',
      500,
      'INTERNAL_ERROR'
    );
  }
});

// Example error responses:

// Validation Error (422)
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    "Email is required",
    "First name is required"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Business Logic Error (409)
{
  "error": "Email already exists",
  "code": "EMAIL_EXISTS",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Authentication Error (401)
{
  "error": "Authentication required",
  "code": "UNAUTHENTICATED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Not Found Error (404)
{
  "error": "User not found",
  "code": "USER_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Validate Early

```typescript
// Validate request data as early as possible
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  
  const userData = getRequestBody<CreateUserRequest>(context);
  
  // Validate immediately
  if (!userData.email || !userData.firstName) {
    sendError(context, 'Missing required fields', 422);
    return;
  }
  
  const user = await userService.createUser(userData);
  sendResponse(context, user, 201);
});
```

## What's Next?

Now that you understand the basics, explore the other parts of this series:

- **[Part 2: Schema Validation with Zod](docs/02-zod-validation.md)** - Learn how to add robust request validation with Zod schemas
- **[Part 3: Framework-Agnostic Architecture](docs/03-framework-agnostic.md)** - Build business logic that works across any HTTP framework
- **[Part 4: Enterprise Architecture](docs/04-enterprise-architecture.md)** - Scale your application with mono-repo and layered architecture
- **[Part 5: Configuration & Deployment](docs/05-configuration-deployment.md)** - Production deployment strategies and configuration management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`nx test api-util-fastify`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Packages

- [`@inh-lib/common`](../common) - Common utilities and types
- [`@inh-lib/api-util-express`](../api-util-express) - Express adapter (coming soon)
- [`@inh-lib/api-util-koa`](../api-util-koa) - Koa adapter (coming soon)