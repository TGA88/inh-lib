// ============================================
// CURRENT ISSUES:
// ============================================
// 1. Circular Import: 
//    inh-logger-v2.ts imports from inh-logger-v2.logic.ts
//    inh-logger-v2.logic.ts imports from inh-logger-v2.ts
//
// 2. Mixed responsibilities in main file
// 3. Unclear public/internal boundaries

// ============================================
// PROPOSED STRUCTURE:
// ============================================

// ============================================
// 📁 types.ts - SHARED TYPES (ไม่มี implementation)
// ============================================
export enum LogLevel {
    TRACE = 0,
    DEBUG = 1, 
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5
}

export interface InhLogger {
    trace?: (params: string | object) => unknown;
    debug?: (params: string | object) => unknown;
    info?: (params: string | object) => unknown;
    warn?: (params: string | object) => unknown;
    error?: (params: string | object) => unknown;
    fatal?: (params: string | object) => unknown;
    log?: (params: string | object) => unknown;
    
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
// 📁 internal/utils.ts - INTERNAL UTILITIES
// ============================================
import { v4 as uuid } from "uuid";
import { LogLevel, InhLogger, EventLogContext, LogEntry } from "../types";

/**
 * INTERNAL: สร้าง log entry object
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
 * INTERNAL: ตรวจสอบว่า logger รองรับ level checking หรือไม่
 */
export function checkLoggerLevelSupport(logger: InhLogger): boolean {
    return !!(logger.isLevelEnabled && logger.getLevel && logger.setLevel);
}

/**
 * INTERNAL: ตรวจสอบว่า level นี้ควรจะ log หรือไม่
 */
export function shouldLog(
    logger: InhLogger, 
    currentLevel: LogLevel, 
    targetLevel: LogLevel
): boolean {
    if (logger.isLevelEnabled) {
        return logger.isLevelEnabled(targetLevel);
    }
    return targetLevel >= currentLevel;
}

/**
 * INTERNAL: Resolve lazy data
 */
export function resolveLazyData<T extends object>(data?: T | (() => T)): T | undefined {
    return typeof data === 'function' ? (data as () => T)() : data;
}

/**
 * INTERNAL: ส่ง log entry ไปยัง logger
 */
export function sendLogEntry<T extends object = object>(
    logger: InhLogger,
    methodName: keyof InhLogger,
    entry: LogEntry<T>
): void {
    const logMethod = logger[methodName];
    if (logMethod && typeof logMethod === 'function') {
        (logMethod as (params: LogEntry<T>) => unknown)(entry);
        return;
    }
    
    if (logger.log && typeof logger.log === 'function') {
        (logger.log as (params: LogEntry<T>) => unknown)(entry);
        return;
    }
    
    console.log(entry);
}

/**
 * INTERNAL: Log ที่ level ที่กำหนด
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
    const resolvedData: T | undefined = resolveLazyData(data);
    const entry = createLogEntry<T>(context, eventName, message, level, resolvedData);
    sendLogEntry<T>(logger, methodName, entry);
}

/**
 * INTERNAL: สร้าง child context
 */
export function createChildContext(parentContext: EventLogContext): EventLogContext {
    return {
        originEventId: parentContext.eventId,
        eventId: uuid()
    };
}

/**
 * INTERNAL: สร้าง initial context
 */
export function createInitialContext(): EventLogContext {
    return {
        eventId: uuid(),
        originEventId: undefined
    };
}

// ============================================
// 📁 internal/logic.ts - INTERNAL BUSINESS LOGIC
// ============================================
import { InhLogContext } from "../inh-logger-v2";
import { createChildContext } from "./utils";

/**
 * INTERNAL: สร้าง child context จาก parent
 */
export function createChildFromParent(
    originLogCtx: InhLogContext, 
    eventName: string
): InhLogContext {
    const childContext = createChildContext(originLogCtx.context);
    
    const childLogContext = new InhLogContext(
        originLogCtx.logger, 
        eventName, 
        originLogCtx.getLogLevel()
    );
    
    // Override context เพื่อ maintain parent-child relationship
    (childLogContext as InhLogContext & { context: EventLogContext }).context = childContext;
    
    return childLogContext;
}

// ============================================
// 📁 utils.ts - PUBLIC UTILITIES
// ============================================
import { LogLevel, InhLogger } from "./types";

/**
 * PUBLIC: แปลง LogLevel เป็น string
 */
export function logLevelToString(level: LogLevel): string {
    return LogLevel[level].toLowerCase();
}

/**
 * PUBLIC: แปลง string เป็น LogLevel
 */
export function stringToLogLevel(levelString: string): LogLevel {
    const upperLevel = levelString.toUpperCase();
    return LogLevel[upperLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
}

/**
 * PUBLIC: เพิ่ม level support ให้ logger
 */
export function enhanceLogger(
    logger: InhLogger, 
    currentLevel = LogLevel.INFO
): InhLogger {
    if (logger.isLevelEnabled && logger.getLevel && logger.setLevel) {
        return logger;
    }
    
    const enhanced = { ...logger };
    let level = currentLevel;
    
    enhanced.isLevelEnabled ??= (checkLevel: LogLevel) => checkLevel >= level;
    enhanced.getLevel ??= () => level;
    enhanced.setLevel ??= (newLevel: LogLevel) => { level = newLevel; };
    
    return enhanced;
}

/**
 * PUBLIC: Validate log entry
 */
export function validateLogEntry<T extends object = object>(
    entry: LogEntry<T>
): boolean {
    return !!(
        entry.eventId &&
        entry.originEventId &&
        entry.eventName &&
        entry.message &&
        entry.timestamp &&
        typeof entry.level === 'number'
    );
}

// ============================================
// 📁 inh-logger-v2.ts - MAIN PUBLIC API
// ============================================
import { LogLevel, InhLogger, EventLogContext } from "./types";
import { 
    createInitialContext, 
    shouldLog, 
    logAtLevel 
} from "./internal/utils";
import { createChildFromParent } from "./internal/logic";

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
        
        this.debug('Logger context created', { 
            eventName, 
            eventId: this.context.eventId 
        });
    }

    setLogLevel(level: LogLevel): void {
        this.currentLogLevel = level;
        if (this.logger.setLevel) {
            this.logger.setLevel(level);
        }
    }

    getLogLevel(): LogLevel {
        if (this.logger.getLevel) {
            return this.logger.getLevel();
        }
        return this.currentLogLevel;
    }

    isLevelEnabled(level: LogLevel): boolean {
        return shouldLog(this.logger, this.currentLogLevel, level);
    }

    // Logging methods
    trace<T extends object>(message: string, data?: T | (() => T)): void {
        if (this.isLevelEnabled(LogLevel.TRACE)) {
            logAtLevel<T>(this.logger, this.context, this.eventName, 'trace', LogLevel.TRACE, message, data);
        }
    }

    debug<T extends object>(message: string, data?: T | (() => T)): void {
        if (this.isLevelEnabled(LogLevel.DEBUG)) {
            logAtLevel<T>(this.logger, this.context, this.eventName, 'debug', LogLevel.DEBUG, message, data);
        }
    }

    info<T extends object>(message: string, data?: T | (() => T)): void {
        if (this.isLevelEnabled(LogLevel.INFO)) {
            logAtLevel<T>(this.logger, this.context, this.eventName, 'info', LogLevel.INFO, message, data);
        }
    }

    warn<T extends object>(message: string, data?: T | (() => T)): void {
        if (this.isLevelEnabled(LogLevel.WARN)) {
            logAtLevel<T>(this.logger, this.context, this.eventName, 'warn', LogLevel.WARN, message, data);
        }
    }

    error<T extends object>(message: string, data?: T | (() => T)): void {
        if (this.isLevelEnabled(LogLevel.ERROR)) {
            logAtLevel<T>(this.logger, this.context, this.eventName, 'error', LogLevel.ERROR, message, data);
        }
    }

    fatal<T extends object>(message: string, data?: T | (() => T)): void {
        if (this.isLevelEnabled(LogLevel.FATAL)) {
            logAtLevel<T>(this.logger, this.context, this.eventName, 'fatal', LogLevel.FATAL, message, data);
        }
    }

    createChild(eventName = 'Child'): InhLogContext {
        const childLogContext = createChildFromParent(this, eventName);
        childLogContext.setLogLevel(this.currentLogLevel);
        
        this.debug('Child context created', { 
            childEventName: eventName, 
            childEventId: childLogContext.context.eventId,
            inheritedLogLevel: LogLevel[this.currentLogLevel]
        });
        
        return childLogContext;
    }

    createScope(scopeName: string): InhLogContext {
        return this.createChild(scopeName);
    }
}

// Re-export public types and utilities
export * from "./types";
export * from "./utils";

// ============================================
// 📁 index.ts - MAIN ENTRY POINT
// ============================================
export * from "./inh-logger-v2";

// ============================================
// SUMMARY OF CHANGES:
// ============================================
// ✅ แก้ circular import โดยแยก utilities ออก
// ✅ แยก public API จาก internal implementation  
// ✅ จัดโครงสร้างไฟล์ให้ชัดเจน
// ✅ Internal utilities ถูกซ่อนใน internal/ folder
// ✅ Public API อยู่ที่ root level เท่านั้น
// ✅ Types แยกออกมาเป็นไฟล์เดียว ไม่มี implementation