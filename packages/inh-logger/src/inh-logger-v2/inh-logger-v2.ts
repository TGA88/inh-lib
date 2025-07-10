
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