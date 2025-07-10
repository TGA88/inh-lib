// ============================================
// 📁 tests/inh-logger-v2.test.ts
// ============================================
import { InhLogContext, LogLevel, InhLogger, LogEntry } from '../src/inh-logger-v2';

// Mock logger for testing
class MockLogger implements InhLogger {
  public calls: Array<{ method: string; entry: LogEntry<object> }> = [];
  
  trace(entry: LogEntry<object>) { this.calls.push({ method: 'trace', entry }); }
  debug(entry: LogEntry<object>) { this.calls.push({ method: 'debug', entry }); }
  info(entry: LogEntry<object>) { this.calls.push({ method: 'info', entry }); }
  warn(entry: LogEntry<object>) { this.calls.push({ method: 'warn', entry }); }
  error(entry: LogEntry<object>) { this.calls.push({ method: 'error', entry }); }
  fatal(entry: LogEntry<object>) { this.calls.push({ method: 'fatal', entry }); }
  
  clear() { this.calls = []; }
  getLastCall() { return this.calls[this.calls.length - 1]; }
}

describe('InhLogContext', () => {
  let mockLogger: MockLogger;
  let logContext: InhLogContext;

  beforeEach(() => {
    mockLogger = new MockLogger();
    logContext = new InhLogContext(mockLogger, 'TestEvent', LogLevel.DEBUG);
    mockLogger.clear(); // Clear the constructor call
  });

  describe('Basic logging', () => {
    test('should log info message', () => {
      logContext.info('Test message', { data: 'test' });
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall.method).toBe('info');
      expect(lastCall.entry.message).toBe('Test message');
      expect(lastCall.entry.eventName).toBe('TestEvent');
      expect(lastCall.entry.level).toBe(LogLevel.INFO);
      expect(lastCall.entry.data).toEqual({ data: 'test' });
    });

    test('should log error message', () => {
      logContext.error('Error occurred', { errorCode: 500 });
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall.method).toBe('error');
      expect(lastCall.entry.message).toBe('Error occurred');
      expect(lastCall.entry.level).toBe(LogLevel.ERROR);
    });

    test('should handle lazy data', () => {
      const lazyData = jest.fn(() => ({ computed: 'value' }));
      
      logContext.info('Test lazy', lazyData);
      
      expect(lazyData).toHaveBeenCalledTimes(1);
      const lastCall = mockLogger.getLastCall();
      expect(lastCall.entry.data).toEqual({ computed: 'value' });
    });
  });

  describe('Log levels', () => {
    test('should respect log level filtering', () => {
      logContext.setLogLevel(LogLevel.WARN);
      
      logContext.debug('Debug message');
      logContext.info('Info message');
      logContext.warn('Warn message');
      logContext.error('Error message');
      
      expect(mockLogger.calls).toHaveLength(2);
      expect(mockLogger.calls[0].entry.level).toBe(LogLevel.WARN);
      expect(mockLogger.calls[1].entry.level).toBe(LogLevel.ERROR);
    });

    test('should change log level', () => {
      expect(logContext.getLogLevel()).toBe(LogLevel.DEBUG);
      
      logContext.setLogLevel(LogLevel.ERROR);
      expect(logContext.getLogLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('Child contexts', () => {
    test('should create child context', () => {
      const childContext = logContext.createChild('ChildEvent');
      
      expect(childContext.eventName).toBe('ChildEvent');
      expect(childContext.context.originEventId).toBe(logContext.context.eventId);
      expect(childContext.context.eventId).not.toBe(logContext.context.eventId);
    });

    test('should inherit log level in child', () => {
      logContext.setLogLevel(LogLevel.WARN);
      const childContext = logContext.createChild('Child');
      
      expect(childContext.getLogLevel()).toBe(LogLevel.WARN);
    });

    test('should track parent-child relationship', () => {
      const childContext = logContext.createChild('Child');
      childContext.info('Child message');
      
      // Clear parent's debug message first
      mockLogger.clear();
      childContext.info('Child message');
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall.entry.originEventId).toBe(logContext.context.eventId);
    });
  });

  describe('Context properties', () => {
    test('should have unique event IDs', () => {
      const context1 = new InhLogContext(mockLogger, 'Event1');
      const context2 = new InhLogContext(mockLogger, 'Event2');
      
      expect(context1.context.eventId).not.toBe(context2.context.eventId);
    });

    test('should have proper timestamps', () => {
      const before = new Date();
      logContext.info('Test message');
      const after = new Date();
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall.entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastCall.entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

// ============================================
// 📁 tests/utils.test.ts
// ============================================
import { 
  logLevelToString, 
  stringToLogLevel, 
  enhanceLogger,
  validateLogEntry
} from '../src/utils';
import { LogLevel, InhLogger, LogEntry } from '../src/types';

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
      
      expect(enhanced.isLevelEnabled!(LogLevel.DEBUG)).toBe(false);
      expect(enhanced.isLevelEnabled!(LogLevel.ERROR)).toBe(true);
      expect(enhanced.getLevel!()).toBe(LogLevel.WARN);
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

// ============================================
// 📁 tests/internal/utils.test.ts
// ============================================
import {
  createLogEntry,
  shouldLog,
  resolveLazyData,
  createChildContext,
  createInitialContext
} from '../../src/internal/utils';
import { LogLevel, InhLogger } from '../../src/types';

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

    test('should use eventId as originEventId when not provided', () => {
      const context = {
        eventId: 'test-event'
      };

      const entry = createLogEntry(context, 'TestEvent', 'Message', LogLevel.INFO);

      expect(entry.originEventId).toBe('test-event');
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
      expect(resolveLazyData(undefined)).toBeUndefined();
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

// ============================================
// 📁 tests/internal/logic.test.ts
// ============================================
import { createChildFromParent } from '../../src/internal/logic';
import { InhLogContext, LogLevel } from '../../src/inh-logger-v2';

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

// ============================================
// 📁 tests/integration.test.ts - Integration Tests
// ============================================
import { InhLogContext, LogLevel, InhLogger } from '../src/inh-logger-v2';
import { enhanceLogger } from '../src/utils';

describe('Integration Tests', () => {
  describe('Real-world scenarios', () => {
    test('should handle nested contexts properly', () => {
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
      };

      const appLogger = new InhLogContext(mockLogger, 'Application', LogLevel.DEBUG);
      const requestLogger = appLogger.createChild('Request');
      const dbLogger = requestLogger.createChild('Database');
      
      appLogger.info('App started');
      requestLogger.info('Request received');
      dbLogger.debug('Query executed');
      
      // Check call sequence
      expect(mockLogger.info).toHaveBeenCalledTimes(3); // App started + Request received + Logger created logs
      expect(mockLogger.debug).toHaveBeenCalledTimes(3); // Child context created logs + Query executed
    });

    test('should work with enhanced logger', () => {
      const basicLogger = {
        log: jest.fn()
      };

      const enhanced = enhanceLogger(basicLogger as InhLogger, LogLevel.WARN);
      const logContext = new InhLogContext(enhanced, 'Enhanced');
      
      logContext.debug('Debug message'); // Should not log
      logContext.error('Error message'); // Should log
      
      expect(basicLogger.log).toHaveBeenCalledTimes(1); // Only error message + constructor
    });

    test('should handle complex data structures', () => {
      const mockLogger = {
        info: jest.fn()
      };

      const logContext = new InhLogContext(mockLogger, 'DataTest');
      
      const complexData = {
        user: { id: 123, name: 'John' },
        metadata: { tags: ['test', 'logging'], count: 42 },
        nested: { deep: { value: 'found' } }
      };

      logContext.info('Complex data logged', complexData);
      
      const lastCall = mockLogger.info.mock.calls[mockLogger.info.mock.calls.length - 1][0];
      expect(lastCall.data).toEqual(complexData);
    });
  });
});

// ============================================
// 📁 jest.config.js - Jest Configuration
// ============================================
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};

// ============================================
// 📁 tests/setup.ts - Test Setup
// ============================================
// Mock UUID to make tests deterministic
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9012')
}));

// Global test utilities
global.createMockLogger = () => ({
  trace: jest.fn(),
  debug: jest.fn(), 
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
});

// ============================================
// 📁 package.json - Test Scripts
// ============================================
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}