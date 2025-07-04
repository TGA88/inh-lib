// inh-logger.ts (ปรับปรุงแยก utility functions)
import { v4 as uuid } from "uuid";
import { createFrom } from "./inh-logger-v2.logic";

// เพิ่ม LogLevel enum
export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5
}

// ปรับ interface ให้รองรับ level checking (optional)
export interface InhLogger {
    trace?: (params: string | object) => unknown;
    debug?: (params: string | object) => unknown;
    info?: (params: string | object) => unknown;
    warn?: (params: string | object) => unknown;
    error?: (params: string | object) => unknown;
    fatal?: (params: string | object) => unknown;
    log?: (params: string | object) => unknown;
    
    // เพิ่ม optional methods สำหรับ level checking
    isLevelEnabled?: (level: LogLevel) => boolean;
    getLevel?: () => LogLevel;
    setLevel?: (level: LogLevel) => void;
}

export type EventLogContext = {
    eventId: string;
    originEventId?: string;
}

export type LogEntry<T = object> = {
    originEventId: string;
    eventId: string;
    eventName: string;
    message: string;
    timestamp: Date;
    level: LogLevel;
    data?: T;
}

// ============================================
// UTILITY FUNCTIONS (แยกออกมาเพื่อง่ายต่อการ test)
// ============================================

/**
 * สร้าง log entry object
 */
export function createLogEntry<T extends object = object>(
    context: EventLogContext,
    eventName: string,
    message: string,
    level: LogLevel,
    data?: T
): LogEntry<T> {
    return {
        originEventId: context.originEventId ?? context.eventId,
        eventId: context.eventId,
        eventName,
        message,
        timestamp: new Date(),
        level,
        data
    };
}

/**
 * ตรวจสอบว่า logger รองรับ level checking หรือไม่
 */
export function checkLoggerLevelSupport(logger: InhLogger) {
    return !!(logger.isLevelEnabled && logger.getLevel && logger.setLevel);
}

/**
 * ตรวจสอบว่า level นี้ควรจะ log หรือไม่
 */
export function shouldLog(
    logger: InhLogger, 
    currentLevel: LogLevel, 
    targetLevel: LogLevel
) {
    // ถ้า logger มี isLevelEnabled ใช้ของ logger
    if (logger.isLevelEnabled) {
        return logger.isLevelEnabled(targetLevel);
    }
    
    // ถ้าไม่มี ใช้ current level ของเรา
    return targetLevel >= currentLevel;
}

/**
 * Resolve lazy data (เรียก function ถ้าเป็น function)
 */
export function resolveLazyData<T extends object>(data?: T | (() => T)): T | undefined {
    return typeof data === 'function' ? (data as () => T)() : data;
}

/**
 * ส่ง log entry ไปยัง logger โดยลองหา method ที่เหมาะสม
 */
export function sendLogEntry<T extends object = object>(
    logger: InhLogger,
    methodName: keyof InhLogger,
    entry: LogEntry<T>
): void {
    // ลองใช้ method ที่ต้องการก่อน
    const logMethod = logger[methodName];
    if (logMethod && typeof logMethod === 'function') {
        (logMethod as (params: LogEntry<T>) => unknown)(entry);
        return;
    }
    
    // ถ้าไม่มี ลอง fallback เป็น log
    if (logger.log && typeof logger.log === 'function') {
        (logger.log as (params: LogEntry<T>) => unknown)(entry);
        return;
    }
    
    // ถ้าไม่มีเลย ใช้ console
    console.log(entry);
}

/**
 * Log message ที่ level ที่กำหนด (ย้ายมาจาก private method)
 */
export function logAtLevel<T extends object>(
    logger: InhLogger,
    context: EventLogContext,
    eventName: string,
    methodName: keyof InhLogger,
    level: LogLevel,
    message: string,
    data?: T | (() => T)
): void {
    // ใช้ utility function เพื่อ resolve lazy data
    const resolvedData: T | undefined = resolveLazyData(data);
    
    // ใช้ utility function เพื่อสร้าง log entry
    const entry = createLogEntry<T>(
        context, 
        eventName, 
        message, 
        level, 
        resolvedData
    );
    
    // ใช้ utility function เพื่อส่ง log
    sendLogEntry<T>(logger, methodName, entry);
}
export function createChildContext(parentContext: EventLogContext) {
    return {
        originEventId: parentContext.eventId,
        eventId: uuid()
    };
}

/**
 * สร้าง initial context
 */
export function createInitialContext() {
    return {
        eventId: uuid(),
        originEventId: undefined
    };
}

// ============================================
// MAIN CLASS
// ============================================

export class InhLogContext {
    readonly logger: InhLogger;
    readonly context: EventLogContext;
    readonly eventName: string;
    private currentLogLevel: LogLevel;

    constructor(logger: InhLogger, eventName = 'Root', logLevel = LogLevel.INFO) {
        this.logger = logger;
        this.eventName = eventName;
        this.currentLogLevel = logLevel;
        this.context = createInitialContext();
        
        this.debug('Logger context created', { eventName, eventId: this.context.eventId });
    }

    // เพิ่ม method สำหรับ set log level
    setLogLevel(level: LogLevel) {
        this.currentLogLevel = level;
        
        // ถ้า logger รองรับ setLevel ก็ set ด้วย
        if (this.logger.setLevel) {
            this.logger.setLevel(level);
        }
    }

    // เพิ่ม method สำหรับ get log level
    getLogLevel() {
        // ถ้า logger มี getLevel ใช้ของ logger
        if (this.logger.getLevel) {
            return this.logger.getLevel();
        }
        
        // ถ้าไม่มี ใช้ของเรา
        return this.currentLogLevel;
    }

    // เพิ่ม method สำหรับตรวจสอบว่า level นี้จะ log หรือไม่
    isLevelEnabled(level: LogLevel) {
        return shouldLog(this.logger, this.currentLogLevel, level);
    }

    // ปรับ convenience methods ให้ใช้ utility functions
    trace<T extends object>(message: string, data?: T | (() => T)) {
        if (this.isLevelEnabled(LogLevel.TRACE)) {
            logAtLevel<T>(
                this.logger,
                this.context,
                this.eventName,
                'trace',
                LogLevel.TRACE,
                message,
                data
            );
        }
    }

    debug<T extends object>(message: string, data?: T | (() => T)) {
        if (this.isLevelEnabled(LogLevel.DEBUG)) {
            logAtLevel<T>(
                this.logger,
                this.context,
                this.eventName,
                'debug',
                LogLevel.DEBUG,
                message,
                data
            );
        }
    }

    info<T extends object>(message: string, data?: T | (() => T)) {
        if (this.isLevelEnabled(LogLevel.INFO)) {
            logAtLevel<T>(
                this.logger,
                this.context,
                this.eventName,
                'info',
                LogLevel.INFO,
                message,
                data
            );
        }
    }

    warn<T extends object>(message: string, data?: T | (() => T)) {
        if (this.isLevelEnabled(LogLevel.WARN)) {
            logAtLevel<T>(
                this.logger,
                this.context,
                this.eventName,
                'warn',
                LogLevel.WARN,
                message,
                data
            );
        }
    }

    error<T extends object>(message: string, data?: T | (() => T)) {
        if (this.isLevelEnabled(LogLevel.ERROR)) {
            logAtLevel<T>(
                this.logger,
                this.context,
                this.eventName,
                'error',
                LogLevel.ERROR,
                message,
                data
            );
        }
    }

    fatal<T extends object>(message: string, data?: T | (() => T)) {
        if (this.isLevelEnabled(LogLevel.FATAL)) {
            logAtLevel<T>(
                this.logger,
                this.context,
                this.eventName,
                'fatal',
                LogLevel.FATAL,
                message,
                data
            );
        }
    }

    // ปรับ createChild ให้ใช้ utility functions
    createChild(eventName = 'Child') {
        const childLogContext = createFrom(this, eventName);
        
        // สืบทอด log level ไปให้ child
        childLogContext.setLogLevel(this.currentLogLevel);
        
        this.debug('Child context created', { 
            childEventName: eventName, 
            childEventId: childLogContext.context.eventId,
            inheritedLogLevel: LogLevel[this.currentLogLevel]
        });
        
        return childLogContext;
    }

    createScope(scopeName: string) {
        return this.createChild(scopeName);
    }
}

// ============================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================

/**
 * แปลง LogLevel เป็น string
 */
export function logLevelToString(level: LogLevel) {
    return LogLevel[level].toLowerCase();
}

/**
 * แปลง string เป็น LogLevel
 */
export function stringToLogLevel(levelString: string) {
    const upperLevel = levelString.toUpperCase();
    return LogLevel[upperLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
}

/**
 * เพิ่ม level support ให้ logger ที่ไม่รองรับ
 */
export function enhanceLogger(logger: InhLogger, currentLevel = LogLevel.INFO) {
    if (checkLoggerLevelSupport(logger)) {
        // ถ้ามีครบแล้ว ใช้ตัวเดิม
        return logger;
    }
    
    // เพิ่ม level support
    const enhanced = { ...logger };
    let level = currentLevel;
    
    enhanced.isLevelEnabled ??= (checkLevel: LogLevel) => checkLevel >= level;
    enhanced.getLevel ??= () => level;
    enhanced.setLevel ??= (newLevel: LogLevel) => { level = newLevel; };
    
    return enhanced;
}

/**
 * สร้าง event log format function (compatibility กับโค้ดเดิม)
 */
export function createEventLogFormatFn(name: string, eventLogContext: EventLogContext) {
    return function <T extends object = object>(message: string, data?: T): LogEntry<T> {
        return createLogEntry<T>(eventLogContext, name, message, LogLevel.INFO, data);
    };
}

/**
 * Validate log entry (สำหรับ testing)
 */
export function validateLogEntry<T extends object = object>(entry: LogEntry<T>) {
    return !!(
        entry.eventId &&
        entry.originEventId &&
        entry.eventName &&
        entry.message &&
        entry.timestamp &&
        typeof entry.level === 'number'
    );
}

// /**
//  * Create mock logger สำหรับ testing
//  */
// export function createMockLogger(methods: Partial<InhLogger> = {}) {
//     type MockFunction = (params: string | object) => unknown;
    
//     const createMockFn = (): MockFunction => {
//         // ใช้ jest.fn() ถ้ามี jest, ถ้าไม่มีใช้ regular function
//         if (typeof jest !== 'undefined' && jest.fn) {
//             return jest.fn() as MockFunction;
//         }
        
//         // Fallback สำหรับ environment ที่ไม่มี jest
//         const calls: Array<[string | object]> = [];
//         const mockFn: MockFunction = (params: string | object) => {
//             calls.push([params]);
//         };
//         (mockFn as MockFunction & { mock: { calls: Array<[string | object]> } }).mock = { calls };
//         return mockFn;
//     };

//     return {
//         trace: methods.trace || createMockFn(),
//         debug: methods.debug || createMockFn(),
//         info: methods.info || createMockFn(),
//         warn: methods.warn || createMockFn(),
//         error: methods.error || createMockFn(),
//         fatal: methods.fatal || createMockFn(),
//         log: methods.log || createMockFn(),
//         ...methods
//     };
// }