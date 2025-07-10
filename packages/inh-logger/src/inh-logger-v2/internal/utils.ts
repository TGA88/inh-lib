
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
        originEventId: context.originEventId ?? null, // 🎯 ใช้ null เพื่อไม่่ให้ field originEventId หายใน output กรณี กรณี Root Logger
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