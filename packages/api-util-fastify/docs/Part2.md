# Part 2: Schema Validation with Zod

For robust request validation in your framework-agnostic applications, we recommend using [Zod](https://zod.dev/) - a TypeScript-first schema validation library that integrates seamlessly with our unified context approach.

## 📚 Series Navigation

- **[Part 1: Getting Started](../README.md)**
- **[Part 2: Schema Validation with Zod](02-zod-validation.md)** ← You are here
- **[Part 3: Framework-Agnostic Architecture](03-framework-agnostic.md)**
- **[Part 4: Enterprise Architecture](04-enterprise-architecture.md)**
- **[Part 5: Configuration & Deployment](05-configuration-deployment.md)**

## Installation

```bash
# Install Zod
npm install zod

# For TypeScript users (usually already installed)
npm install -D typescript
```

## Basic Schema Definitions

### Creating Your First Schemas

```typescript
// schemas/user.schemas.ts
import { z } from 'zod';

// User creation schema
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  age: z.number().int().min(13, 'Must be at least 13 years old').max(120, 'Invalid age').optional(),
});

// User update schema (all fields optional)
export const UpdateUserSchema = CreateUserSchema.partial();

// Query parameters schema
export const GetUsersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
  search: z.string().optional(),
  sort: z.enum(['email', 'firstName', 'lastName', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// URL parameters schema
export const UserParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

// Automatically infer TypeScript types
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
export type UserParams = z.infer<typeof UserParamsSchema>;
```

### Response Schemas

```typescript
// Response schemas for consistency
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  age: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// Usage
export const PaginatedUsersResponseSchema = PaginatedResponseSchema(UserResponseSchema);

export type UserResponse = z.infer<typeof UserResponseSchema>;
export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersResponseSchema>;
```

## Validation Helpers

### Core Validation Functions

```typescript
// utils/validation.ts
import { z } from 'zod';
import { UnifiedHttpContext, getRequestBody, getParams, getQuery } from '@inh-lib/api-util-fastify';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export type ValidationResponse<T> = ValidationResult<T> | ValidationError;

// Generic validation function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResponse<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      return { success: false, errors };
    }
    
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed', code: 'invalid_type' }],
    };
  }
}

// Context-aware validation helpers
export function validateRequestBody<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): ValidationResponse<T> {
  const body = getRequestBody(context);
  return validateData(schema, body);
}

export function validateParams<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): ValidationResponse<T> {
  const params = getParams(context);
  return validateData(schema, params);
}

export function validateQuery<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): ValidationResponse<T> {
  const query = getQuery(context);
  return validateData(schema, query);
}
```

### Auto-Error Response Helpers

```typescript
// Enhanced helpers that automatically send error responses
export function validateRequestBodyOrError<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): T | null {
  const validation = validateRequestBody(context, schema);
  
  if (!validation.success) {
    sendValidationError(context, 'Request validation failed', validation.errors);
    return null;
  }
  
  return validation.data;
}

export function validateParamsOrError<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): T | null {
  const validation = validateParams(context, schema);
  
  if (!validation.success) {
    sendValidationError(context, 'Invalid parameters', validation.errors, 400);
    return null;
  }
  
  return validation.data;
}

export function validateQueryOrError<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): T | null {
  const validation = validateQuery(context, schema);
  
  if (!validation.success) {
    sendValidationError(context, 'Invalid query parameters', validation.errors, 400);
    return null;
  }
  
  return validation.data;
}

// Enhanced error response for validation
function sendValidationError(
  context: UnifiedHttpContext,
  message: string,
  errors: Array<{ field: string; message: string; code: string }>,
  statusCode: number = 422
): void {
  context.response['status'](statusCode)['json']({
    error: message,
    code: 'VALIDATION_ERROR',
    details: errors,
    timestamp: new Date().toISOString(),
  });
}
```

## Integration with Fastify Routes

### Basic Route with Validation

```typescript
// routes/user.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createFastifyContext, sendResponse } from '@inh-lib/api-util-fastify';
import {
  CreateUserSchema,
  UpdateUserSchema,
  GetUsersQuerySchema,
  UserParamsSchema,
  CreateUser,
  UpdateUser,
  GetUsersQuery,
  UserParams,
} from '../schemas/user.schemas';
import {
  validateRequestBodyOrError,
  validateParamsOrError,
  validateQueryOrError,
} from '../utils/validation';

export function registerUserRoutes(fastify: FastifyInstance) {
  // Create user with validation
  fastify.post<{ Body: CreateUser }>('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    
    // Validate request body with Zod
    const userData = validateRequestBodyOrError(context, CreateUserSchema);
    if (!userData) return; // Validation error already sent
    
    try {
      // userData is now fully typed and validated ✨
      console.log(`Creating user: ${userData.email}`); // TypeScript knows email exists
      
      const user = await userService.createUser(userData);
      sendResponse(context, user, 201);
    } catch (error) {
      console.error('Create user error:', error);
      sendError(context, 'Failed to create user', 500);
    }
  });

  // Get users with query validation
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    
    // Validate and transform query parameters
    const queryParams = validateQueryOrError(context, GetUsersQuerySchema);
    if (!queryParams) return;
    
    try {
      // queryParams.page and queryParams.limit are now numbers (transformed by Zod)
      const result = await userService.getUsers({
        page: queryParams.page,
        limit: queryParams.limit,
        search: queryParams.search,
        sortBy: queryParams.sort,
        sortOrder: queryParams.order,
      });
      
      const response = {
        data: result.users,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / queryParams.limit),
        },
      };
      
      sendResponse(context, response);
    } catch (error) {
      console.error('Get users error:', error);
      sendError(context, 'Failed to fetch users', 500);
    }
  });

  // Get user by ID with parameter validation
  fastify.get<{ Params: UserParams }>('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    
    // Validate URL parameters
    const params = validateParamsOrError(context, UserParamsSchema);
    if (!params) return;
    
    try {
      // params.id is validated as UUID
      const user = await userService.getUserById(params.id);
      
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, user);
    } catch (error) {
      console.error('Get user error:', error);
      sendError(context, 'Failed to fetch user', 500);
    }
  });

  // Update user with both param and body validation
  fastify.put<{ Params: UserParams; Body: UpdateUser }>('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    
    // Validate both params and body
    const params = validateParamsOrError(context, UserParamsSchema);
    if (!params) return;

    const updateData = validateRequestBodyOrError(context, UpdateUserSchema);
    if (!updateData) return;
    
    try {
      const user = await userService.updateUser(params.id, updateData);
      
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, user);
    } catch (error) {
      console.error('Update user error:', error);
      sendError(context, 'Failed to update user', 500);
    }
  });
}
```

## Advanced Schema Patterns

### Conditional Validation

```typescript
// schemas/advanced.schemas.ts
import { z } from 'zod';

// Conditional validation based on other fields
export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms and conditions'),
  birthDate: z.string().datetime().optional(),
  parentalConsent: z.boolean().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(data => {
  // If user is under 18, parental consent is required
  if (data.birthDate) {
    const age = new Date().getFullYear() - new Date(data.birthDate).getFullYear();
    if (age < 18) {
      return data.parentalConsent === true;
    }
  }
  return true;
}, {
  message: 'Parental consent required for users under 18',
  path: ['parentalConsent'],
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
```

### Discriminated Unions

```typescript
// Different notification types with type discrimination
export const NotificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    template: z.string().optional(),
  }),
  z.object({
    type: z.literal('sms'),
    to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    message: z.string().max(160, 'SMS message too long'),
  }),
  z.object({
    type: z.literal('push'),
    deviceId: z.string(),
    title: z.string().max(50),
    body: z.string().max(200),
    data: z.record(z.string()).optional(),
  }),
]);

export type Notification = z.infer<typeof NotificationSchema>;

// Usage with type narrowing
fastify.post<{ Body: Notification }>('/notifications', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  const notification = validateRequestBodyOrError(context, NotificationSchema);
  if (!notification) return;
  
  // TypeScript knows the exact type based on discriminator
  switch (notification.type) {
    case 'email':
      // notification.subject is available here
      await emailService.send(notification.to, notification.subject, notification.body);
      break;
    case 'sms':
      // notification.message is available here
      await smsService.send(notification.to, notification.message);
      break;
    case 'push':
      // notification.deviceId is available here
      await pushService.send(notification.deviceId, notification.title, notification.body);
      break;
  }
  
  sendResponse(context, { status: 'sent' });
});
```

### Array and Nested Validation

```typescript
// Complex nested schemas
export const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    price: z.number().positive('Price must be positive'),
    options: z.object({
      size: z.enum(['S', 'M', 'L', 'XL']).optional(),
      color: z.string().optional(),
      customization: z.string().max(100).optional(),
    }).optional(),
  })).min(1, 'Order must have at least one item').max(50, 'Too many items'),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    country: z.string().length(2, 'Country must be 2-letter code'),
  }),
  paymentMethod: z.object({
    type: z.enum(['credit_card', 'paypal', 'bank_transfer']),
    token: z.string().min(1),
  }),
  discountCode: z.string().optional(),
}).refine(data => {
  // Business rule: orders over $500 require premium shipping
  const total = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return total <= 500 || data.shippingAddress !== null;
}, {
  message: 'Orders over $500 require valid shipping address',
  path: ['shippingAddress'],
});

export type CreateOrder = z.infer<typeof CreateOrderSchema>;

// Bulk operations with array validation
export const BulkUserCreateSchema = z.object({
  users: z.array(CreateUserSchema)
    .min(1, 'At least one user is required')
    .max(100, 'Cannot create more than 100 users at once')
    .refine(users => {
      // Check for duplicate emails
      const emails = users.map(user => user.email);
      return new Set(emails).size === emails.length;
    }, 'Duplicate emails are not allowed'),
});

export type BulkUserCreate = z.infer<typeof BulkUserCreateSchema>;
```

### File Upload Validation

```typescript
// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.enum([
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/json'
  ], 'Unsupported file type'),
  size: z.number()
    .max(5 * 1024 * 1024, 'File size must be less than 5MB')
    .min(1, 'File cannot be empty'),
  buffer: z.instanceof(Buffer, 'Invalid file data'),
});

export const ProfileImageUploadSchema = FileUploadSchema.extend({
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/gif'], 'Only image files allowed'),
  size: z.number().max(2 * 1024 * 1024, 'Image must be less than 2MB'),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ProfileImageUpload = z.infer<typeof ProfileImageUploadSchema>;
```

## Error Handling & Responses

### Structured Validation Errors

```typescript
// Enhanced error response structure
interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

interface ValidationErrorResponse {
  error: string;
  code: 'VALIDATION_ERROR';
  details: ValidationErrorDetail[];
  timestamp: string;
}

// Enhanced validation error handler
export function createValidationErrorResponse(
  zodError: z.ZodError,
  message: string = 'Validation failed'
): ValidationErrorResponse {
  const details: ValidationErrorDetail[] = zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    value: err.code !== 'invalid_type' ? (err as any).received : undefined,
  }));

  return {
    error: message,
    code: 'VALIDATION_ERROR',
    details,
    timestamp: new Date().toISOString(),
  };
}

// Usage in validation helper
export function validateRequestBodyOrError<T>(
  context: UnifiedHttpContext,
  schema: z.ZodSchema<T>
): T | null {
  try {
    const body = getRequestBody(context);
    const result = schema.parse(body);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = createValidationErrorResponse(error, 'Request body validation failed');
      context.response['status'](422)['json'](errorResponse);
    } else {
      context.response['status'](400)['json']({
        error: 'Invalid request body',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }
    return null;
  }
}

// Example validation error response:
{
  "error": "Request body validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string",
      "value": "not-an-email"
    },
    {
      "field": "age",
      "message": "Must be at least 13 years old",
      "code": "too_small",
      "value": 10
    },
    {
      "field": "firstName",
      "message": "First name is required",
      "code": "too_small"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Testing with Zod Schemas

### Schema Testing

```typescript
// __tests__/schemas/user.schemas.test.ts
import {
  CreateUserSchema,
  UpdateUserSchema,
  GetUsersQuerySchema,
  UserParamsSchema,
} from '../schemas/user.schemas';

describe('User Schemas', () => {
  describe('CreateUserSchema', () => {
    it('should validate correct user data', () => {
      const validData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        age: 25,
      };

      const result = CreateUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = CreateUserSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['email'],
            message: 'Invalid email format',
          })
        );
      }
    });

    it('should reject age under 13', () => {
      const invalidData = {
        email: 'child@example.com',
        firstName: 'Child',
        lastName: 'User',
        age: 10,
      };

      const result = CreateUserSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['age'],
            message: 'Must be at least 13 years old',
          })
        );
      }
    });

    it('should handle optional age field', () => {
      const validData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        // age is optional
      };

      const result = CreateUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBeUndefined();
      }
    });
  });

  describe('GetUsersQuerySchema', () => {
    it('should transform string numbers to actual numbers', () => {
      const queryData = {
        page: '2',
        limit: '20',
        search: 'john',
        sort: 'email',
        order: 'desc',
      };

      const result = GetUsersQuerySchema.safeParse(queryData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2); // Transformed to number
        expect(result.data.limit).toBe(20); // Transformed to number
        expect(result.data.search).toBe('john');
      }
    });

    it('should use default values', () => {
      const emptyQuery = {};

      const result = GetUsersQuerySchema.safeParse(emptyQuery);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1); // Default value
        expect(result.data.limit).toBe(10); // Default value
        expect(result.data.order).toBe('asc'); // Default value
      }
    });
  });

  describe('UserParamsSchema', () => {
    it('should validate valid UUID', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = UserParamsSchema.safeParse(validParams);

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidParams = {
        id: 'not-a-uuid',
      };

      const result = UserParamsSchema.safeParse(invalidParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['id'],
            message: 'Invalid user ID format',
          })
        );
      }
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/routes/user.routes.test.ts
import { createMockContext } from '@inh-lib/api-util-fastify/testing';
import { CreateUserSchema } from '../schemas/user.schemas';
import { validateRequestBodyOrError } from '../utils/validation';

describe('User Routes Integration', () => {
  describe('POST /users', () => {
    it('should create user with valid data', async () => {
      const validUserData = {
        email: 'integration@test.com',
        firstName: 'Integration',
        lastName: 'Test',
        age: 25,
      };

      const mockContext = createMockContext({
        body: validUserData,
      });

      const userData = validateRequestBodyOrError(mockContext, CreateUserSchema);

      expect(userData).not.toBeNull();
      expect(userData).toEqual(validUserData);
      expect(mockContext.response['status']).not.toHaveBeenCalled();
    });

    it('should reject invalid data with structured error', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        firstName: '', // Too short
        // Missing lastName
        age: 10, // Too young
      };

      const mockContext = createMockContext({
        body: invalidUserData,
      });

      const userData = validateRequestBodyOrError(mockContext, CreateUserSchema);

      expect(userData).toBeNull();
      expect(mockContext.response['status']).toHaveBeenCalledWith(422);
      expect(mockContext.response['json']).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Request body validation failed',
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'firstName' }),
            expect.objectContaining({ field: 'lastName' }),
            expect.objectContaining({ field: 'age' }),
          ]),
        })
      );
    });
  });
});
```

## Best Practices

### 1. Schema Organization

```typescript
// Organize schemas by route for better maintainability
schemas/
├── user/
│   ├── create-user.schemas.ts       # POST /users - request & response
│   ├── get-users.schemas.ts         # GET /users - query & response  
│   ├── get-user-by-id.schemas.ts    # GET /users/:id - params & response
│   ├── update-user.schemas.ts       # PUT /users/:id - params, body & response
│   ├── delete-user.schemas.ts       # DELETE /users/:id - params & response
│   └── index.ts                     # Export all user schemas
├── order/
│   ├── create-order.schemas.ts      # POST /orders
│   ├── get-orders.schemas.ts        # GET /orders
│   ├── get-order-by-id.schemas.ts   # GET /orders/:id
│   ├── update-order.schemas.ts      # PUT /orders/:id
│   └── index.ts
├── notification/
│   ├── send-notification.schemas.ts  # POST /notifications
│   ├── get-notifications.schemas.ts  # GET /notifications
│   └── index.ts
├── shared/
│   ├── common.schemas.ts            # Shared validation patterns
│   ├── pagination.schemas.ts        # Pagination helpers
│   └── index.ts
└── index.ts

// schemas/shared/common.schemas.ts - Reusable validation patterns
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format');
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

export const TimestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// schemas/shared/pagination.schemas.ts
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
});

export const PaginationResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: PaginationResponseSchema,
  });

// schemas/user/create-user.schemas.ts - POST /users
import { EmailSchema, TimestampSchema, UUIDSchema } from '../shared/common.schemas';

// Request schema
export const CreateUserRequestSchema = z.object({
  email: EmailSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  age: z.number().int().min(13, 'Must be at least 13 years old').max(120, 'Invalid age').optional(),
});

// Response schema
export const CreateUserResponseSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  firstName: z.string(),
  lastName: z.string(),
  age: z.number().optional(),
}).merge(TimestampSchema);

// Type exports
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

// schemas/user/get-users.schemas.ts - GET /users
import { PaginationQuerySchema, createPaginatedResponseSchema } from '../shared/pagination.schemas';
import { CreateUserResponseSchema } from './create-user.schemas';

// Query schema
export const GetUsersQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  sort: z.enum(['email', 'firstName', 'lastName', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// Response schema (reuse user from create-user)
export const GetUsersResponseSchema = createPaginatedResponseSchema(CreateUserResponseSchema);

// Type exports
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
export type GetUsersResponse = z.infer<typeof GetUsersResponseSchema>;

// schemas/user/get-user-by-id.schemas.ts - GET /users/:id
import { UUIDSchema } from '../shared/common.schemas';
import { CreateUserResponseSchema } from './create-user.schemas';

// Params schema
export const GetUserByIdParamsSchema = z.object({
  id: UUIDSchema,
});

// Response schema (same as create user response)
export const GetUserByIdResponseSchema = CreateUserResponseSchema;

// Type exports
export type GetUserByIdParams = z.infer<typeof GetUserByIdParamsSchema>;
export type GetUserByIdResponse = z.infer<typeof GetUserByIdResponseSchema>;

// schemas/user/update-user.schemas.ts - PUT /users/:id
import { UUIDSchema } from '../shared/common.schemas';
import { CreateUserRequestSchema, CreateUserResponseSchema } from './create-user.schemas';

// Params schema
export const UpdateUserParamsSchema = z.object({
  id: UUIDSchema,
});

// Request schema (all fields optional for update)
export const UpdateUserRequestSchema = CreateUserRequestSchema.partial();

// Response schema
export const UpdateUserResponseSchema = CreateUserResponseSchema;

// Type exports
export type UpdateUserParams = z.infer<typeof UpdateUserParamsSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;

// schemas/user/delete-user.schemas.ts - DELETE /users/:id
import { UUIDSchema } from '../shared/common.schemas';

// Params schema
export const DeleteUserParamsSchema = z.object({
  id: UUIDSchema,
});

// Response schema
export const DeleteUserResponseSchema = z.object({
  message: z.string(),
});

// Type exports
export type DeleteUserParams = z.infer<typeof DeleteUserParamsSchema>;
export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;

// schemas/user/index.ts - Export all user schemas
export * from './create-user.schemas';
export * from './get-users.schemas';
export * from './get-user-by-id.schemas';
export * from './update-user.schemas';
export * from './delete-user.schemas';

// Usage in routes becomes very clear
import {
  CreateUserRequestSchema,
  CreateUserResponseSchema,
  type CreateUserRequest,
  type CreateUserResponse,
} from '../schemas/user/create-user.schemas';

import {
  GetUsersQuerySchema,
  GetUsersResponseSchema,
  type GetUsersQuery,
  type GetUsersResponse,
} from '../schemas/user/get-users.schemas';

// Each route file imports exactly what it needs
fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  const userData = validateRequestBodyOrError(context, CreateUserRequestSchema);
  if (!userData) return;
  
  // Business logic...
  
  sendResponse(context, userResponse); // Type: CreateUserResponse
});

fastify.get('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  const queryParams = validateQueryOrError(context, GetUsersQuerySchema);
  if (!queryParams) return;
  
  // Business logic...
  
  sendResponse(context, response); // Type: GetUsersResponse
});
```

### 2. Schema Composition

```typescript
// Base schemas for reuse
const BaseTimestamps = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

const BaseEntity = z.object({
  id: UUIDSchema,
}).merge(BaseTimestamps);

// Extend base schemas
export const UserSchema = BaseEntity.extend({
  email: EmailSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  age: z.number().int().min(13).max(120).optional(),
});

export const UserWithProfileSchema = UserSchema.extend({
  profile: z.object({
    bio: z.string().max(500).optional(),
    website: z.string().url().optional(),
    avatar: z.string().url().optional(),
  }).optional(),
});
```

### 3. Environment-Specific Schemas

```typescript
// Different validation rules for different environments
const createUserSchemaForEnv = (env: 'development' | 'production') => {
  const baseSchema = z.object({
    email: EmailSchema,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
  });

  if (env === 'development') {
    // More lenient in development
    return baseSchema.extend({
      age: z.number().int().min(1).max(150).optional(),
    });
  } else {
    // Stricter in production
    return baseSchema.extend({
      age: z.number().int().min(13).max(120).optional(),
    });
  }
};

export const CreateUserSchema = createUserSchemaForEnv(
  process.env.NODE_ENV as 'development' | 'production' || 'production'
);
```

### 4. Performance Considerations

```typescript
// Pre-compile schemas for better performance
const compiledSchemas = {
  createUser: CreateUserSchema,
  updateUser: UpdateUserSchema,
  getUsersQuery: GetUsersQuerySchema,
} as const;

// Use compiled schemas
export function validateRequestBodyOrError<K extends keyof typeof compiledSchemas>(
  context: UnifiedHttpContext,
  schemaKey: K
): z.infer<typeof compiledSchemas[K]> | null {
  const schema = compiledSchemas[schemaKey];
  // ... validation logic
}

// Usage
const userData = validateRequestBodyOrError(context, 'createUser');
```

## Integration with OpenAPI/Swagger

### Generate OpenAPI Schemas

```typescript
// utils/zod-to-openapi.ts
import { z } from 'zod';

export function zodToOpenAPI(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodString) {
    const checks = (schema as any)._def.checks || [];
    const result: any = { type: 'string' };
    
    for (const check of checks) {
      switch (check.kind) {
        case 'email':
          result.format = 'email';
          break;
        case 'uuid':
          result.format = 'uuid';
          break;
        case 'min':
          result.minLength = check.value;
          break;
        case 'max':
          result.maxLength = check.value;
          break;
      }
    }
    
    return result;
  }
  
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  
  if (schema instanceof z.ZodObject) {
    const properties: any = {};
    const required: string[] = [];
    const shape = schema.shape;
    
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToOpenAPI(value as z.ZodTypeAny);
      if (!(value as any).isOptional()) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  
  return { type: 'string' }; // Fallback
}

// Usage in Fastify schema
fastify.post('/users', {
  schema: {
    description: 'Create a new user',
    tags: ['users'],
    body: zodToOpenAPI(CreateUserSchema),
    response: {
      201: zodToOpenAPI(UserResponseSchema),
      422: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
}, async (request, reply) => {
  // Route handler
});
```

## What's Next?

You now have robust, type-safe validation in your Fastify applications! In the next part, we'll explore how to build completely framework-agnostic architecture that can work with any HTTP framework:

**[Part 3: Framework-Agnostic Architecture](03-framework-agnostic.md)** - Learn how to build business logic that's completely independent of HTTP frameworks, making your code more portable and testable.

## Summary

Zod integration provides:

✅ **Runtime Validation** - Catch invalid data before it reaches your business logic  
✅ **Type Safety** - Automatic TypeScript type inference from schemas  
✅ **Transform Data** - Convert strings to numbers, validate and parse dates  
✅ **Detailed Errors** - User-friendly validation error messages  
✅ **Schema Reuse** - Use the same schemas for validation, documentation, and testing  
✅ **Framework Independence** - Validation logic stays in your business layer  
✅ **Performance** - Fast validation with minimal overhead  
✅ **Extensible** - Custom validation functions and complex conditional logic