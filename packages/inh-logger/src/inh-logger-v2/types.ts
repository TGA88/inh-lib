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
    originEventId: string | null; // Support null for root logger level
    eventId: string;
    eventName: string;
    message: string;
    timestamp: Date;
    level: LogLevel;
    data?: T;
}