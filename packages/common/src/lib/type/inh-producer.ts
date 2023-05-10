
export interface DefaultInhPublishMessageFormat{
    eventId: string 
    topicName: string
    originId: string
    publishBy: string
    systemName: string
    totalChunk: number
    chunk: number
    data: unknown,
    actions: string
  }
  
export interface InhProducer{
    //Broadcast
    publish:<I,O>(topic:string,data:I)=>Promise<O>

    // send 1 to 1
    send:<I,O>(data:I)=>Promise<O>
}