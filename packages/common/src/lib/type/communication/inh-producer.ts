
import { Result } from '../../Result';
import { InhLogger } from '../inh-logger';
import {MakeInhHealthCheckCommandFn} from './shared/healthcheck.type'
import {InhMessageFormat} from './shared/message.type'

export interface InhPublishCommandItf<O,F,I> {
     //Broadcast
  execute: (data: InhMessageFormat<I>,messageGroupId?:string) => Promise<Result<O,F>>;
}

// T1 is configuration for specific Provider like awsSNS is {topicArn:string}
export type MakeInhPublishCommandFn =  <T1,O,F,I>(publisherContext:T1,logger:InhLogger) => InhPublishCommandItf<O,F,I>;



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