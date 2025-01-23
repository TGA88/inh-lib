
import { Result } from '../../Result';


import {InhMessageFormat} from './shared/message.type'

export interface InhPublishCommandItf<O,F> {
     //Broadcast
  execute: <I>(data: InhMessageFormat<I>,messageGroupId?:string) => Promise<Result<O,F>>;
}



export interface InhProducerClientItf  {
  makePublishCommand: InhPublishCommandItf<unknown,unknown>;
}

export interface InhProducerProviderItf{
  makeProducerClient(config:InhProducerConfig): InhProducerClientItf
}


export type InhProducerConfig = AwsSnsProducerConfig 
  
// AWS
export type AwsSnsProducerConfig = {
  region: string
  endpoint: string
  credentials: {
      accessKeyId: string
      secretAccessKey: string
  }
}
// ==========