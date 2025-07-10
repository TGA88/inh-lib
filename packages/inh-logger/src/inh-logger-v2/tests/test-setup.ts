// ============================================
// 📁 src/test-setup.ts (แก้ไขให้ type-safe)
// ============================================

// ✅ Import Jest types for TypeScript
/// <reference types="jest" />

// ✅ Type-safe MockLogger interface
interface MockLogger {
  trace: jest.Mock<void, [string | object]>;
  debug: jest.Mock<void, [string | object]>;
  info: jest.Mock<void, [string | object]>;
  warn: jest.Mock<void, [string | object]>;
  error: jest.Mock<void, [string | object]>;
  fatal: jest.Mock<void, [string | object]>;
}

// ✅ Extend global with proper types
declare global {
  const createMockLogger: () => MockLogger;
}

// ✅ Type-safe global assignment
(global as typeof globalThis & { createMockLogger: () => MockLogger }).createMockLogger = (): MockLogger => ({
  trace: jest.fn(),
  debug: jest.fn(), 
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
});

// ✅ Make this file an external module to allow global augmentations
export {};