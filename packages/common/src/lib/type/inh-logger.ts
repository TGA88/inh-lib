



export interface InhLogger{
trace:<I>(msg:I|string)=>InhLogger,
debug:<I>(msg:I|string)=>InhLogger
info:<I>(msg:I|string)=>InhLogger
warn:<I>(msg:I|string)=>InhLogger
error:<I>(msg:I|string)=>InhLogger
fatal:<I>(msg:I|string)=>InhLogger
}