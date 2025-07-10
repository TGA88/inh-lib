
// ============================================
// 📁 tests/internal/utils.test.ts
// ============================================
import {
  createLogEntry,
  shouldLog,
  resolveLazyData,
  createChildContext,
  createInitialContext
} from '../../internal/utils';
import { LogLevel, InhLogger } from '../../types';

describe('Internal Utils', () => {
  describe('createLogEntry', () => {
    test('should create proper log entry', () => {
      const context = {
        eventId: 'test-event',
        originEventId: 'origin-event'
      };

      const entry = createLogEntry(
        context,
        'TestEvent',
        'Test message',
        LogLevel.INFO,
        { data: 'test' }
      );

      expect(entry.eventId).toBe('test-event');
      expect(entry.originEventId).toBe('origin-event');
      expect(entry.eventName).toBe('TestEvent');
      expect(entry.message).toBe('Test message');
      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.data).toEqual({ data: 'test' });
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    test('should use null as originEventId when it is root logger ', () => {
      const context = {
        eventId: 'test-event'
      };

      const entry = createLogEntry(context, 'TestEvent', 'Message', LogLevel.INFO);

      expect(entry.originEventId).toBeNull();
    });
  });

  describe('shouldLog', () => {
    test('should use logger isLevelEnabled when available', () => {
      const logger: InhLogger = {
        isLevelEnabled: jest.fn(() => true)
      };

      const result = shouldLog(logger, LogLevel.INFO, LogLevel.DEBUG);

      expect(logger.isLevelEnabled).toHaveBeenCalledWith(LogLevel.DEBUG);
      expect(result).toBe(true);
    });

    test('should fall back to level comparison', () => {
      const logger: InhLogger = {};

      expect(shouldLog(logger, LogLevel.WARN, LogLevel.ERROR)).toBe(true);
      expect(shouldLog(logger, LogLevel.WARN, LogLevel.DEBUG)).toBe(false);
    });
  });

  describe('resolveLazyData', () => {
    test('should call function and return result', () => {
      const lazyFn = jest.fn(() => ({ computed: 'value' }));
      
      const result = resolveLazyData(lazyFn);
      
      expect(lazyFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ computed: 'value' });
    });

    test('should return data as-is when not function', () => {
      const data = { static: 'value' };
      
      const result = resolveLazyData(data);
      
      expect(result).toBe(data);
    });

    test('should return undefined for undefined input', () => {
      expect(resolveLazyData()).toBeUndefined();
    });
  });

  describe('createChildContext', () => {
    test('should create child context with new eventId', () => {
      const parentContext = {
        eventId: 'parent-id',
        originEventId: 'origin-id'
      };

      const childContext = createChildContext(parentContext);

      expect(childContext.originEventId).toBe('parent-id');
      expect(childContext.eventId).not.toBe('parent-id');
      expect(childContext.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('createInitialContext', () => {
    test('should create initial context', () => {
      const context = createInitialContext();

      expect(context.originEventId).toBeUndefined();
      expect(context.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });
});