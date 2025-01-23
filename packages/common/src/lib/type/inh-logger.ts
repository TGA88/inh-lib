
import{ v4 as uuid } from "uuid";
import { createFrom } from "./inh-logger.logic";


// export interface InhLogger{
// trace:<I>(msg:I|string)=>InhLogger | void,
// debug:<I>(msg:I|string)=>InhLogger | void
// info:<I>(msg:I|string)=>InhLogger | void
// warn:<I>(msg:I|string)=>InhLogger | void
// error:<I>(msg:I|string)=>InhLogger | void
// fatal:<I>(msg:I|string)=>InhLogger | void
// }

export interface InhLogger {
    trace(params: string | unknown): unknown;
    debug(params: string | unknown): unknown;
    info(params: string | unknown): unknown;
    warn(params: string | unknown): unknown;
    error(params: string | unknown): unknown;
    fatal(params: string | unknown): unknown;
}



export type EventLogFormatter = <T>(message: string, data: T) => {
    originEventId:string;
    eventId:string;
    eventName: string;
    message: string;
    data: T;
}


export type EventLogContext = {
    eventId:string;
    originEventId?:string;
}

export class InhLogContext {
    readonly logger: InhLogger;
    readonly context: { readonly eventId: string, readonly originEventId?: string };
    // private logFmt:EventLogFormatter

    constructor(logger: InhLogger) {
        this.logger = logger;
        const eventId = uuid()
        this.context = { eventId: eventId ,originEventId:undefined}
        // this.logFmt = createEventLogFormatFn('InhLogContext',this.context)
        // this.logger.debug(this.logFmt('New InhLogContext',this.context))
    }

  

    createChild(): InhLogContext {
        
        // this.logger.debug(this.logFmt("before InhLogContext.createFrom",this.context))
        const childLogContext: InhLogContext = createFrom(this)
        // this.logger.debug(this.logFmt("after InhLogContext.createFrom",childLogContext.context))

        return childLogContext
    }
}





export function createEventLogFormatFn(name: string,eventLogContext:EventLogContext): EventLogFormatter {
    // const eventId=new UniqueEntityID().toValue() as string
    return function <T>(message: string, data: T) {
        return  {
            originEventId: eventLogContext.originEventId || "0", // กำหนดค่า default
            eventId:eventLogContext.eventId,
            eventName: name,
            message: message,
            data: data
        }

    }
}