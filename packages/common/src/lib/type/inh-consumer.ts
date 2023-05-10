
export interface InhConsumer{
    //push base
    subscribe:<I,O>(topic:string,data:I)=>Promise<O>

    // polling base
    recieve:<I,O>(data:I)=>Promise<O>
}