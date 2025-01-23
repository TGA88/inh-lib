import { v4 as uuid } from 'uuid';
import { InhLogContext } from "./inh-logger"
// all function in this file is not expose outside of this package
export function createFrom(originLogCtx: InhLogContext): InhLogContext {
    // const fmt = createEventLogFormatFn('Statc InhLogContext.createFrom', originLogCtx.context)
    // const log = originLogCtx.logger
    // log.debug(fmt('before new context', originLogCtx.context))
    const context = { originEventId: originLogCtx.context.eventId, eventId: uuid() }
    // log.debug(fmt('after new context', context))

    // const logFmt = createEventLogFormatFn('InhLogContext', context)
    // force Type
    // log.debug(fmt('before new childLogContext', undefined))
    const childLogContext:InhLogContext={ logger: originLogCtx.logger, context: context, createChild: originLogCtx.createChild } 
    // log.debug(fmt('after new childLogContext', childLogContext))


    // log.debug(fmt('before setLogFmt', undefined))
    // privete property can beset in static method
    // childLogContext.logFmt = logFmt;
    // log.debug(fmt('after setLogFmt', childLogContext))
    return childLogContext
}