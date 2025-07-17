// ============================================
// 📁 src/test-setup.ts (แก้ไขให้ type-safe)
// ============================================

// ✅ Import Jest types for TypeScript
/// <reference types="jest" />


 // Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set up default timezone for consistent date testing
process.env.TZ = 'UTC';

// Mock Date.now for consistent timestamp testing
const mockDateNow = jest.fn(() => 1234567890000);
Date.now = mockDateNow;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockDateNow.mockReturnValue(1234567890000);
});
// ✅ Make this file an external module to allow global augmentations
export {};