



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


export function createEventLogFormatFn(name: string) {
    return function <T>(message: string, data: T) {
        return { eventName: name, message: message, data: data }
    }
}