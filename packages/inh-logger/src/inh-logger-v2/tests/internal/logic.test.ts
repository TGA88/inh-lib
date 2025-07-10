// ============================================
// 📁 tests/internal/logic.test.ts
// ============================================
import { createChildFromParent } from '../../internal/logic';
import { InhLogContext } from '../../inh-logger-v2';
import {  LogLevel } from '../../types';

// Mock logger for testing
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
};

describe('Internal Logic', () => {
  describe('createChildFromParent', () => {
    test('should create child context from parent', () => {
      const parentContext = new InhLogContext(mockLogger, 'ParentEvent', LogLevel.INFO);
      
      const childContext = createChildFromParent(parentContext, 'ChildEvent');
      
      expect(childContext.eventName).toBe('ChildEvent');
      expect(childContext.getLogLevel()).toBe(LogLevel.INFO);
      expect(childContext.context.originEventId).toBe(parentContext.context.eventId);
      expect(childContext.context.eventId).not.toBe(parentContext.context.eventId);
    });

    test('should maintain parent-child relationship', () => {
      const parentContext = new InhLogContext(mockLogger, 'Parent', LogLevel.DEBUG);
      const childContext = createChildFromParent(parentContext, 'Child');
      
      // Check that child's originEventId points to parent's eventId
      expect(childContext.context.originEventId).toBe(parentContext.context.eventId);
    });

    test('should inherit log level from parent', () => {
      const parentContext = new InhLogContext(mockLogger, 'Parent', LogLevel.WARN);
      const childContext = createChildFromParent(parentContext, 'Child');
      
      expect(childContext.getLogLevel()).toBe(LogLevel.WARN);
    });
  });
});
