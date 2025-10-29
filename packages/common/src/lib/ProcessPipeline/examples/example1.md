// examples/user-registration.ts

import { ProcessPipeline } from '../core/process-pipeline';
import { ProcessMiddlewareFn } from '../types/process-pipeline';
import { fail, complete } from '../utils/process-helpers';

// ========================================
// Types
// ========================================

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface RegisterOutput {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
}

// ========================================
// Middlewares
// ========================================

const validateEmailMiddleware: ProcessMiddlewareFn<RegisterInput, RegisterOutput> = (ctx) => {
  const { email } = ctx.input;

  if (!email || !email.includes('@')) {
    fail(ctx, 'Invalid email format');
    return;
  }

  console.log('✓ Email validation passed');
};

const validatePasswordMiddleware: ProcessMiddlewareFn<RegisterInput, RegisterOutput> = (ctx) => {
  const { password } = ctx.input;

  if (!password || password.length < 8) {
    fail(ctx, 'Password must be at least 8 characters');
    return;
  }

  console.log('✓ Password validation passed');
};

const checkEmailExistsMiddleware: ProcessMiddlewareFn<RegisterInput, RegisterOutput> = async (ctx) => {
  const { email } = ctx.input;

  // Simulate database check
  const exists = await checkEmailInDatabase(email);

  if (exists) {
    fail(ctx, 'Email already registered');
    return;
  }

  console.log('✓ Email is available');
};

const hashPasswordMiddleware: ProcessMiddlewareFn<RegisterInput, RegisterOutput> = async (ctx) => {
  const { password } = ctx.input;

  // Simulate password hashing
  const hashedPassword = await hashPassword(password);

  // Store in state for handler to use
  ctx.state['hashedPassword'] = hashedPassword;

  console.log('✓ Password hashed');
};

// ========================================
// Handler
// ========================================

const createUserHandler: ProcessMiddlewareFn<RegisterInput, RegisterOutput> = async (ctx) => {
  const { email, name } = ctx.input;
  const hashedPassword = ctx.state['hashedPassword'] as string;

  // Simulate user creation
  const user = await createUserInDatabase({
    email,
    name,
    password: hashedPassword
  });

  // Set output
  complete(ctx, {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  });

  console.log('✓ User created');
};

// ========================================
// Build Pipeline
// ========================================

export function createUserRegistrationPipeline(): ProcessPipeline<RegisterInput, RegisterOutput> {
  const pipeline = new ProcessPipeline<RegisterInput, RegisterOutput>();

  pipeline
    .use(validateEmailMiddleware)
    .use(validatePasswordMiddleware)
    .use(checkEmailExistsMiddleware)
    .use(hashPasswordMiddleware)
    .setHandler(createUserHandler);

  return pipeline;
}

// ========================================
// Usage
// ========================================

async function testUserRegistration(): Promise<void> {
  const pipeline = createUserRegistrationPipeline();

  // Test 1: Valid registration
  console.log('\n=== Test 1: Valid Registration ===');
  const result1 = await pipeline.execute({
    email: 'john@example.com',
    password: 'SecurePass123',
    name: 'John Doe'
  });

  console.log('Success:', result1.success);
  console.log('Output:', result1.output);
  console.log('');

  // Test 2: Invalid email
  console.log('=== Test 2: Invalid Email ===');
  const result2 = await pipeline.execute({
    email: 'invalid-email',
    password: 'SecurePass123',
    name: 'Jane Doe'
  });

  console.log('Success:', result2.success);
  console.log('Error:', result2.error?.message);
  console.log('');

  // Test 3: Weak password
  console.log('=== Test 3: Weak Password ===');
  const result3 = await pipeline.execute({
    email: 'jane@example.com',
    password: 'weak',
    name: 'Jane Doe'
  });

  console.log('Success:', result3.success);
  console.log('Error:', result3.error?.message);
}

// Mock functions
async function checkEmailInDatabase(email: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return email === 'existing@example.com';
}

async function hashPassword(password: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return `hashed_${password}`;
}

async function createUserInDatabase(data: Record<string, unknown>): Promise<Record<string, string>> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return {
    id: `user-${Date.now()}`,
    email: data['email'] as string,
    name: data['name'] as string,
    createdAt: new Date().toISOString()
  };
}
