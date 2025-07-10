
// ============================================
// 📁 internal/logic.ts - INTERNAL BUSINESS LOGIC
// ============================================
import { InhLogContext } from "../inh-logger-v2";
import { EventLogContext } from "../types";
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
