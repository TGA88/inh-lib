
import { Result } from '../../Result';
import {MakeInhHealthCheckCommandFn} from './shared/healthcheck.type'
import {InhMessageFormat} from './shared/message.type'

export interface InhPublishCommandItf {
     //Broadcast
  execute: <O,F>(data: InhMessageFormat) => Promise<Result<O,F>>;
}

export type MakeInhPublishCommandFn =  (target:string) => InhPublishCommandItf;



export interface InhProducerClientItf  {
  makePublishCommand: MakeInhPublishCommandFn;
  makeHealthCheckCommand: MakeInhHealthCheckCommandFn;
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