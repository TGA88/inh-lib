
// ============================================
// 📁 utils.ts - PUBLIC UTILITIES
// ============================================
import { LogLevel, InhLogger, LogEntry } from "./types";

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
