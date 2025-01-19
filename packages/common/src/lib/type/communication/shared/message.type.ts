export type InhMessageFormat<T>={
    eventId: string 
    topicName: string
    originId: string
    publishBy: string
    systemName: string
    totalChunk: number
    chunk: number
    data: T,
    actions: string
  }