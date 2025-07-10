// ============================================
// 📁 tests/utils.test.ts
// ============================================
import { 
  logLevelToString, 
  stringToLogLevel, 
  enhanceLogger,
  validateLogEntry
} from '../utils';
import { LogLevel,InhLogger, LogEntry } from '../types';



describe('Utils', () => {
  describe('logLevelToString', () => {
    test('should convert log levels to strings', () => {
      expect(logLevelToString(LogLevel.TRACE)).toBe('trace');
      expect(logLevelToString(LogLevel.DEBUG)).toBe('debug');
      expect(logLevelToString(LogLevel.INFO)).toBe('info');
      expect(logLevelToString(LogLevel.WARN)).toBe('warn');
      expect(logLevelToString(LogLevel.ERROR)).toBe('error');
      expect(logLevelToString(LogLevel.FATAL)).toBe('fatal');
    });
  });

  describe('stringToLogLevel', () => {
    test('should convert strings to log levels', () => {
      expect(stringToLogLevel('trace')).toBe(LogLevel.TRACE);
      expect(stringToLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(stringToLogLevel('Info')).toBe(LogLevel.INFO);
      expect(stringToLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(stringToLogLevel('error')).toBe(LogLevel.ERROR);
      expect(stringToLogLevel('FATAL')).toBe(LogLevel.FATAL);
    });

    test('should return INFO for invalid strings', () => {
      expect(stringToLogLevel('invalid')).toBe(LogLevel.INFO);
      expect(stringToLogLevel('')).toBe(LogLevel.INFO);
    });
  });

  describe('enhanceLogger', () => {
    test('should add level support to basic logger', () => {
      const basicLogger: Partial<InhLogger> = {
        info: jest.fn(),
        error: jest.fn()
      };

      const enhanced = enhanceLogger(basicLogger as InhLogger, LogLevel.WARN);

      expect(enhanced.isLevelEnabled).toBeDefined();
      expect(enhanced.getLevel).toBeDefined();
      expect(enhanced.setLevel).toBeDefined();
      
      expect(enhanced.isLevelEnabled?.(LogLevel.DEBUG)).toBe(false);
      expect(enhanced.isLevelEnabled?.(LogLevel.ERROR)).toBe(true);
      expect(enhanced.getLevel?.()).toBe(LogLevel.WARN);
    });

    test('should not modify logger that already has level support', () => {
      const fullLogger: InhLogger = {
        info: jest.fn(),
        error: jest.fn(),
        isLevelEnabled: jest.fn(),
        getLevel: jest.fn(),
        setLevel: jest.fn()
      };

      const enhanced = enhanceLogger(fullLogger);
      expect(enhanced).toBe(fullLogger);
    });
  });

  describe('validateLogEntry', () => {
    test('should validate complete log entry', () => {
      const validEntry: LogEntry = {
        eventId: 'test-event-id',
        originEventId: 'origin-event-id',
        eventName: 'TestEvent',
        message: 'Test message',
        timestamp: new Date(),
        level: LogLevel.INFO,
        data: { test: 'data' }
      };

      expect(validateLogEntry(validEntry)).toBe(true);
    });

    test('should reject incomplete log entry', () => {
      const incompleteEntry = {
        eventId: 'test-event-id',
        message: 'Test message',
        // Missing required fields
      } as LogEntry;

      expect(validateLogEntry(incompleteEntry)).toBe(false);
    });
  });
});
