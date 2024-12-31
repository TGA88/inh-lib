export type InhMessageFormat={
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