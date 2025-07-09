// inh-logger.logic.ts (ปรับปรุงใช้ utility functions)
import { InhLogContext, createChildContext, EventLogContext } from "./inh-logger-v2";

// ปรับ function ให้ใช้ utility functions
export function createFrom(originLogCtx: InhLogContext, eventName: string): InhLogContext {
    // ใช้ utility function เพื่อสร้าง child context
    const childContext = createChildContext(originLogCtx.context);

    // สร้าง child context ใหม่ พร้อมสืบทอด log level
    const childLogContext = new InhLogContext(
        originLogCtx.logger, 
        eventName, 
        originLogCtx.getLogLevel()
    );
    
    // Override context เพื่อให้ maintain parent-child relationship
    (childLogContext as InhLogContext & { context: EventLogContext }).context = childContext;
    
    return childLogContext;
}