// ============================================
// 📁 tests/integration.test.ts (แก้ไขให้ถูกต้อง)
// ============================================
import { InhLogContext } from '../inh-logger-v2';
import { enhanceLogger } from '../utils';
import type { InhLogger } from '../types';
import { LogLevel } from '../types';

// ✅ เพิ่ม UUID mock สำหรับ integration test
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${++mockUuidCounter}-${Date.now()}`)
}));

describe('Integration Tests', () => {
  beforeEach(() => {
    // Reset UUID counter for clean testing
    mockUuidCounter = 0;
  });

  describe('Real-world scenarios', () => {
    test('should handle nested contexts properly', () => {
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      // ✅ เปลี่ยนกลับเป็น INFO เพื่อให้ info() ทำงาน
      const appLogger = new InhLogContext(mockLogger, 'Application', LogLevel.INFO);
      const requestLogger = appLogger.createChild('Request');
      const dbLogger = requestLogger.createChild('Database');
      
      // ✅ Clear mocks หลัง setup เพื่อลบ constructor/createChild debug calls
      mockLogger.info.mockClear();
      mockLogger.debug.mockClear();
      mockLogger.warn.mockClear();
      mockLogger.error.mockClear();
      
      appLogger.info('App started');
      requestLogger.info('Request received');
      dbLogger.info('Query executed'); // ✅ เปลี่ยนเป็น info เพื่อความสม่ำเสมอ
      
      // ✅ ตอนนี้ expect ถูกต้องแล้ว
      expect(mockLogger.info).toHaveBeenCalledTimes(3); // App + Request + Query
      expect(mockLogger.debug).toHaveBeenCalledTimes(0); // ไม่มี debug calls (ถูก clear แล้ว)
      
      // ✅ ตรวจสอบ call arguments
      expect(mockLogger.info).toHaveBeenNthCalledWith(1, expect.objectContaining({
        message: 'App started',
        eventName: 'Application'
      }));
      
      expect(mockLogger.info).toHaveBeenNthCalledWith(2, expect.objectContaining({
        message: 'Request received', 
        eventName: 'Request'
      }));
      
      expect(mockLogger.info).toHaveBeenNthCalledWith(3, expect.objectContaining({
        message: 'Query executed',
        eventName: 'Database'
      }));
    });

    test('should work with enhanced logger', () => {
      const basicLogger = {
        log: jest.fn() // ✅ ใช้ jest.fn() แทน empty function
      };

      const enhanced = enhanceLogger(basicLogger as InhLogger, LogLevel.WARN);
      const logContext = new InhLogContext(enhanced, 'Enhanced', LogLevel.WARN);
      
      // ✅ Clear after setup
      basicLogger.log.mockClear();
      
      logContext.debug('Debug message'); // Should not log (level = WARN)
      logContext.info('Info message');   // Should not log (level = WARN)  
      logContext.warn('Warn message');   // Should log
      logContext.error('Error message'); // Should log
      
      expect(basicLogger.log).toHaveBeenCalledTimes(2); // warn + error only
      
      // ✅ ตรวจสอบว่า enhanced logger มี level methods
      expect(enhanced.isLevelEnabled).toBeDefined();
      expect(enhanced.getLevel).toBeDefined();
      expect(enhanced.setLevel).toBeDefined();
      
      expect(enhanced.isLevelEnabled?.(LogLevel.DEBUG)).toBe(false);
      expect(enhanced.isLevelEnabled?.(LogLevel.ERROR)).toBe(true);
    });

    test('should handle complex data structures', () => {
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn()
      };

      const logContext = new InhLogContext(mockLogger, 'DataTest', LogLevel.INFO);
      
      // ✅ Clear after setup
      mockLogger.info.mockClear();
      mockLogger.error.mockClear();
      
      const complexData = {
        user: { id: 123, name: 'John', email: 'john@example.com' },
        metadata: { 
          tags: ['test', 'logging', 'integration'], 
          count: 42,
          settings: {
            theme: 'dark',
            language: 'en',
            notifications: true
          }
        },
        nested: { 
          deep: { 
            value: 'found',
            array: [1, 2, 3, { nested: 'object' }],
            nullValue: null,
            undefinedValue: undefined
          } 
        },
        timestamp: new Date(),
        functionData: () => 'should be serialized properly'
      };

      logContext.info('Complex data logged', complexData);
      
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const loggedEntry = mockLogger.info.mock.calls[0]?.[0];
      
      // ✅ ตรวจสอบ data structure
      expect(loggedEntry).toMatchObject({
        eventName: 'DataTest',
        message: 'Complex data logged',
        level: LogLevel.INFO
      });
      
      expect(loggedEntry.data).toEqual(complexData);
      expect(loggedEntry.eventId).toBeDefined();
      expect(loggedEntry.timestamp).toBeInstanceOf(Date);
    });

    test('should maintain event ID chain in nested contexts', () => {
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn()
      };

      const appLogger = new InhLogContext(mockLogger, 'App', LogLevel.INFO);
      const serviceLogger = appLogger.createChild('Service');
      const moduleLogger = serviceLogger.createChild('Module');
      
      // ✅ Clear after setup
      mockLogger.info.mockClear();
      mockLogger.debug.mockClear();
      
      appLogger.info('App message');
      serviceLogger.info('Service message');  
      moduleLogger.info('Module message');
      
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
      
      const appCall = mockLogger.info.mock.calls[0]?.[0];
      const serviceCall = mockLogger.info.mock.calls[1]?.[0];
      const moduleCall = mockLogger.info.mock.calls[2]?.[0];
      
      
      expect(appLogger.context.originEventId).toBeUndefined();
      // ✅ ตรวจสอบว่า child contexts ชี้ไปยัง parent ถูกต้อง
      expect(appCall.eventId).toBeDefined();
      expect(serviceCall.eventId).toBeDefined();
      expect(moduleCall.eventId).toBeDefined();
      
      expect(serviceCall.originEventId).toBe(appCall.eventId); // Service points to App
      expect(moduleCall.originEventId).toBe(serviceCall.eventId); // Module points to Service
      
      // ✅ ตรวจสอบว่า event IDs แตกต่างกัน
      expect(appCall.eventId).not.toBe(serviceCall.eventId);
      expect(serviceCall.eventId).not.toBe(moduleCall.eventId);
      expect(appCall.eventId).not.toBe(moduleCall.eventId);
      
      // ✅ ตรวจสอบ event names
      expect(appCall.eventName).toBe('App');
      expect(serviceCall.eventName).toBe('Service');
      expect(moduleCall.eventName).toBe('Module');
      
      // ✅ ตรวจสอบ messages
      expect(appCall.message).toBe('App message');
      expect(serviceCall.message).toBe('Service message');
      expect(moduleCall.message).toBe('Module message');
    });

    test('should handle mixed log levels in nested contexts', () => {
      const mockLogger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
      };

      // ✅ Different log levels for different contexts
      const appLogger = new InhLogContext(mockLogger, 'App', LogLevel.DEBUG);
      const serviceLogger = appLogger.createChild('Service');
      serviceLogger.setLogLevel(LogLevel.WARN); // Higher level
      
      const moduleLogger = serviceLogger.createChild('Module');
      // Module inherits WARN level from service
      
      // ✅ Clear after setup
      Object.values(mockLogger).forEach(mock => mock.mockClear());
      
      // App level (DEBUG) - should log debug and above
      appLogger.debug('App debug');
      appLogger.info('App info');
      appLogger.warn('App warn');
      
      // Service level (WARN) - should only log warn and above
      serviceLogger.debug('Service debug'); // Should NOT log
      serviceLogger.info('Service info');   // Should NOT log
      serviceLogger.warn('Service warn');   // Should log
      serviceLogger.error('Service error'); // Should log
      
      // Module level (inherits WARN) - should only log warn and above
      moduleLogger.info('Module info');     // Should NOT log
      moduleLogger.error('Module error');   // Should log
      
      // ✅ Check call counts
      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // Only app debug
      expect(mockLogger.info).toHaveBeenCalledTimes(1);  // Only app info
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);  // App warn + Service warn
      expect(mockLogger.error).toHaveBeenCalledTimes(2); // Service error + Module error
      
      // ✅ Verify level inheritance
      expect(appLogger.getLogLevel()).toBe(LogLevel.DEBUG);
      expect(serviceLogger.getLogLevel()).toBe(LogLevel.WARN);
      expect(moduleLogger.getLogLevel()).toBe(LogLevel.WARN); // Inherited
    });

    test('should work with lazy data evaluation across contexts', () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
      };

      let computationCount = 0;
      const expensiveComputation = () => {
        computationCount++;
        return { result: `computation-${computationCount}`, count: computationCount };
      };

      const appLogger = new InhLogContext(mockLogger, 'App', LogLevel.INFO);
      const debugLogger = appLogger.createChild('Debug');
      debugLogger.setLogLevel(LogLevel.DEBUG); // Allow debug logging
      
      // ✅ Clear after setup
      Object.values(mockLogger).forEach(mock => mock.mockClear());
      computationCount = 0;
      
      // Should NOT execute (app level = INFO, debug blocked)
      appLogger.debug('App debug with computation', expensiveComputation);
      expect(computationCount).toBe(0);
      
      // Should execute (debug level = DEBUG, debug allowed)
      debugLogger.debug('Debug with computation', expensiveComputation);
      expect(computationCount).toBe(1);
      
      // Should execute (app level = INFO, info allowed)
      appLogger.info('App info with computation', expensiveComputation);
      expect(computationCount).toBe(2);
      
      // ✅ Check final state
      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // Only debug logger
      expect(mockLogger.info).toHaveBeenCalledTimes(1);  // Only app info
      expect(computationCount).toBe(2); // Only executed computations
    });
  });
});