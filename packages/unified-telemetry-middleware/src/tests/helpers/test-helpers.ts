/**
 * Test helper functions
 */

import type { UnifiedHttpContext } from '@inh-lib/unified-route';

/**
 * Type for getRegistryItem function
 */
type GetRegistryItemFunction = <T>(context: UnifiedHttpContext, key: string) => T | Error;

/**
 * Create mock UnifiedHttpContext for testing
 */
export function createMockContext(overrides: Partial<UnifiedHttpContext> = {}): UnifiedHttpContext {
  return {
    request: {
      body: {},
      params: {},
      query: {},
      headers: {},
      method: 'GET',
      url: '/test',
      route: '/test', // Default route
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      ...overrides.request,
    },
    response: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      header: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
      sent: false,
      ...overrides.response,
    },
    registry: {},
    ...overrides,
  };
}

/**
 * Create mock context with specific request overrides
 */
export function createMockContextWithRequest(
  requestOverrides: Partial<UnifiedHttpContext['request']>
): UnifiedHttpContext {
  const baseRequest: UnifiedHttpContext['request'] = {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/test',
    route: '/test', // Default route
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  return createMockContext({
    request: {
      ...baseRequest,
      ...requestOverrides,
    },
  });
}

/**
 * Create mock next function for middleware testing
 */
export function createMockNext(): jest.MockedFunction<() => Promise<void>> {
  return jest.fn().mockResolvedValue(undefined);
}

/**
 * Create mock next function that throws error
 */
export function createMockNextWithError(error: Error): jest.MockedFunction<() => Promise<void>> {
  return jest.fn().mockRejectedValue(error);
}

/**
 * Create mock next function with delay
 */
export function createMockNextWithDelay(delayMs: number): jest.MockedFunction<() => Promise<void>> {
  return jest.fn().mockImplementation(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, delayMs));
  });
}

/**
 * Assert registry item exists and is not an error
 */
export function assertRegistryItemExists(
  context: UnifiedHttpContext,
  key: string,
  getRegistryItem: GetRegistryItemFunction
): void {
  const item = getRegistryItem<unknown>(context, key);
  expect(item instanceof Error).toBe(false);
}

/**
 * Assert registry item matches expected value
 */
export function assertRegistryItemValue<T>(
  context: UnifiedHttpContext,
  key: string,
  expectedValue: T,
  getRegistryItem: GetRegistryItemFunction
): void {
  const item = getRegistryItem<T>(context, key);
  expect(!(item instanceof Error) && item).toBe(expectedValue);
}

/**
 * Assert registry item matches regex pattern
 */
export function assertRegistryItemPattern(
  context: UnifiedHttpContext,
  key: string,
  pattern: RegExp,
  getRegistryItem: GetRegistryItemFunction
): void {
  const item = getRegistryItem<string>(context, key);
  expect(!(item instanceof Error)).toBe(true);
  if (!(item instanceof Error)) {
    expect(item).toMatch(pattern);
  }
}

/**
 * Assert registry item is of expected type
 */
export function assertRegistryItemType<T>(
  context: UnifiedHttpContext,
  key: string,
  typeGuard: (value: unknown) => value is T,
  getRegistryItem: GetRegistryItemFunction
): void {
  const item = getRegistryItem<unknown>(context, key);
  expect(!(item instanceof Error)).toBe(true);
  if (!(item instanceof Error)) {
    expect(typeGuard(item)).toBe(true);
  }
}

/**
 * Get registry item with type assertion
 */
export function getTypedRegistryItem<T>(
  context: UnifiedHttpContext,
  key: string,
  getRegistryItem: GetRegistryItemFunction
): T | Error {
  return getRegistryItem<T>(context, key);
}

/**
 * Type guard for checking if value is string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if value is number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Type guard for checking if value is object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Create mock function with specific return type
 */
export function createMockFunction<TArgs extends ReadonlyArray<unknown>, TReturn>(
  returnValue: TReturn
): jest.MockedFunction<(...args: TArgs) => TReturn> {
  return jest.fn().mockReturnValue(returnValue);
}

/**
 * Create mock async function with specific return type
 */
export function createMockAsyncFunction<TArgs extends ReadonlyArray<unknown>, TReturn>(
  returnValue: TReturn
): jest.MockedFunction<(...args: TArgs) => Promise<TReturn>> {
  return jest.fn().mockResolvedValue(returnValue);
}