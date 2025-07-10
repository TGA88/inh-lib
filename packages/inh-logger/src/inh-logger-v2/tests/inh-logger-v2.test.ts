// ============================================
// 📁 src/inh-logger-v2.spec.ts (แก้ไข UUID mock ให้ unique)
// ============================================
/// <reference types="jest" />

import { InhLogContext } from '../inh-logger-v2';
import type { InhLogger, LogEntry } from '../types';
import { LogLevel } from '../types';

// ✅ Mock UUID ให้สร้าง unique values
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${++mockUuidCounter}-${Date.now()}`)
}));

// ✅ แก้ไข MockLogger ให้ถูกต้อง
class MockLogger implements InhLogger {
  public calls: Array<{ method: string; entry: LogEntry<object> }> = [];
  
  // ✅ ใช้ arrow functions เพื่อ preserve this context
  trace = (params: string | object) => { 
    this.calls.push({ method: 'trace', entry: params as LogEntry<object> }); 
  };
  
  debug = (params: string | object) => { 
    this.calls.push({ method: 'debug', entry: params as LogEntry<object> }); 
  };
  
  info = (params: string | object) => { 
    this.calls.push({ method: 'info', entry: params as LogEntry<object> }); 
  };
  
  warn = (params: string | object) => { 
    this.calls.push({ method: 'warn', entry: params as LogEntry<object> }); 
  };
  
  error = (params: string | object) => { 
    this.calls.push({ method: 'error', entry: params as LogEntry<object> }); 
  };
  
  fatal = (params: string | object) => { 
    this.calls.push({ method: 'fatal', entry: params as LogEntry<object> }); 
  };
  
  clear() { 
    this.calls = []; 
  }
  
  getLastCall() { 
    return this.calls[this.calls.length - 1]; 
  }
}

describe('InhLogContext', () => {
  let mockLogger: MockLogger;
  let logContext: InhLogContext;

  beforeEach(() => {
    // ✅ Reset UUID counter before each test
    mockUuidCounter = 0;
    
    mockLogger = new MockLogger();
    logContext = new InhLogContext(mockLogger, 'TestEvent', LogLevel.DEBUG);
    mockLogger.clear(); // Clear the constructor call
  });

  describe('Basic logging', () => {
    test('should log info message', () => {
      logContext.info('Test message', { data: 'test' });
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall?.method).toBe('info');
      expect(lastCall?.entry.message).toBe('Test message');
      expect(lastCall?.entry.eventName).toBe('TestEvent');
      expect(lastCall?.entry.level).toBe(LogLevel.INFO);
      expect(lastCall?.entry.data).toEqual({ data: 'test' });
    });

    test('should log error message', () => {
      logContext.error('Error occurred', { errorCode: 500 });
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall?.method).toBe('error');
      expect(lastCall?.entry.message).toBe('Error occurred');
      expect(lastCall?.entry.level).toBe(LogLevel.ERROR);
    });

    test('should handle lazy data', () => {
      const lazyData = jest.fn(() => ({ computed: 'value' }));
      
      logContext.info('Test lazy', lazyData);
      
      expect(lazyData).toHaveBeenCalledTimes(1);
      const lastCall = mockLogger.getLastCall();
      expect(lastCall?.entry.data).toEqual({ computed: 'value' });
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
      expect(mockLogger.calls[0]?.entry.level).toBe(LogLevel.WARN);
      expect(mockLogger.calls[1]?.entry.level).toBe(LogLevel.ERROR);
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
      
      // Clear parent's debug message first
      mockLogger.clear();
      childContext.info('Child message');
      
      const lastCall = mockLogger.getLastCall();
      expect(lastCall?.entry.originEventId).toBe(logContext.context.eventId);
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
      expect(lastCall?.entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastCall?.entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });


});




// ============================================
// 🔌 Console Integration Tests (แยกออกมาเป็น top-level)
// ============================================
describe('Console Integration', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    info: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
    warn: jest.SpyInstance;
  };

  beforeEach(() => {
    // Reset UUID counter
    mockUuidCounter = 0;
    
    // ✅ แก้ไข: ใช้ proper jest mock functions
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(jest.fn()),
      info: jest.spyOn(console, 'info').mockImplementation(jest.fn()),
      error: jest.spyOn(console, 'error').mockImplementation(jest.fn()),
      debug: jest.spyOn(console, 'debug').mockImplementation(jest.fn()),
      warn: jest.spyOn(console, 'warn').mockImplementation(jest.fn())
    };

  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  test('should work with console as logger', () => {
    const consoleLogger = new InhLogContext(console, 'ConsoleTest', LogLevel.DEBUG);
    
    consoleLogger.info('Test info message', { userId: 123 });
    consoleLogger.error('Test error message', { error: 'Something wrong' });
    consoleLogger.debug('Test debug message');
    
    // Check that console methods were called
    expect(consoleSpy.info).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled(); 
    expect(consoleSpy.debug).toHaveBeenCalled();
    
    // Check log entry structure
    const infoCall = consoleSpy.info.mock.calls[0]?.[0];
    expect(infoCall).toHaveProperty('eventId');
    expect(infoCall).toHaveProperty('message', 'Test info message');
    expect(infoCall).toHaveProperty('data', { userId: 123 });
  });

  test('should fallback to console.log when specific method unavailable', () => {
    // ✅ แก้ไข: ใช้ wrapper functions แทน
    const minimalLogger: Partial<InhLogger> = {
      info: (params: string | object) => console.info(params),
      // Missing error, debug, warn methods
    };
    
    const logger = new InhLogContext(minimalLogger as InhLogger, 'MinimalTest', LogLevel.DEBUG);
    
    logger.info('This should use info');
    logger.error('This should fallback to console.log');
    logger.debug('This should fallback to console.log');
    
    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    expect(consoleSpy.log).toHaveBeenCalledTimes(3); // 1 error + 1 debug fallback + 1 debug in InhLogContext constructor
  });

  test('should work with partial console object', () => {
    // ✅ แก้ไข: ใช้ wrapper functions แทน
    const partialConsole: Partial<InhLogger> = {
      log: (params: string | object) => console.log(params),
      error: (params: string | object) => console.error(params)
      // Missing other methods
    };
    
    const logger = new InhLogContext(partialConsole as InhLogger, 'PartialConsole', LogLevel.DEBUG);
    
    logger.info('Should fallback to log');
    logger.error('Should use error');
    logger.debug('Should fallback to log');
    
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    expect(consoleSpy.log).toHaveBeenCalledTimes(3); // 1 info + 1 debug + 1 fallback(debug in InhLogContext constrcuture )
  });

  test('should handle logger without any methods gracefully', () => {
    const emptyLogger = {};
    
    const logger = new InhLogContext(emptyLogger as InhLogger, 'EmptyLogger', LogLevel.DEBUG);
    
    // Should not throw errors
    expect(() => {
      logger.info('Test message');
      logger.error('Test error');
    }).not.toThrow();
    
    // Should fallback to console.log
    expect(consoleSpy.log).toHaveBeenCalledTimes(3); // 1 info + 1 error + 1 debug in InhLogContext constructor
  });

  test('should preserve log entry structure with console', () => {
    const consoleLogger = new InhLogContext(console, 'StructureTest', LogLevel.INFO);
    
    const testData = {
      requestId: 'req-123',
      user: { id: 456, name: 'John' },
      timestamp: new Date().toISOString()
    };
    
    consoleLogger.info('Processing request', testData);
    
    const loggedEntry = consoleSpy.info.mock.calls[0]?.[0] as LogEntry<typeof testData>;
    
    expect(loggedEntry).toMatchObject({
      eventName: 'StructureTest',
      message: 'Processing request',
      level: LogLevel.INFO,
      data: testData
    });
    
    expect(loggedEntry.eventId).toBeDefined();
    expect(loggedEntry.timestamp).toBeInstanceOf(Date);
  });

  test('should work with child contexts using console', () => {
    const parentLogger = new InhLogContext(console, 'Parent', LogLevel.DEBUG);
    const childLogger = parentLogger.createChild('Child');
    
    parentLogger.info('Parent message');
    childLogger.info('Child message');
    
    expect(consoleSpy.info).toHaveBeenCalledTimes(2);
    
    const parentCall = consoleSpy.info.mock.calls[0]?.[0] as LogEntry<object>;
    const childCall = consoleSpy.info.mock.calls[1]?.[0] as LogEntry<object>;
    
    expect(parentCall.eventName).toBe('Parent');
    expect(childCall.eventName).toBe('Child');
    expect(childCall.originEventId).toBe(parentCall.eventId);
  });

  test('should respect log levels with console', () => {
    const consoleLogger = new InhLogContext(console, 'LevelTest', LogLevel.WARN);
    
    consoleLogger.debug('Should not log');
    consoleLogger.info('Should not log');
    consoleLogger.warn('Should log');
    consoleLogger.error('Should log');
    
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
  });

  
});







