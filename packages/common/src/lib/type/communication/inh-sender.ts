import { Result } from '../../Result';
import { InhLogger } from '../inh-logger';
import {MakeInhHealthCheckCommandFn} from './shared/healthcheck.type'
import {InhMessageFormat} from './shared/message.type'

// Send
export interface InhSendCommandItf {
     //1to1
  execute: <I,O,F>(data: InhMessageFormat<I>,messageGroupId?:string) => Promise<Result<O,F>>;
}

// T1 is configuration for specific Provider like aws is AWS.SendMessageRequest
export type MakeInhSendCommandFn =  <T1>(senderContext:T1,logger:InhLogger) => InhSendCommandItf;
// ===========


export interface InhSenderClientItf  {
  makeSendCommand: MakeInhSendCommandFn;
  makeHealthCheckCommand: MakeInhHealthCheckCommandFn;
}

export interface InhSenderProviderItf{
  makeSenderClient(config:InhSenderConfig): InhSenderClientItf
}


export type InhSenderConfig = AwsSqsSenderConfig 
  
// AWS
export type AwsSqsSenderConfig = {
  region: string
  endpoint: string
  credentials: {
      accessKeyId: string
      secretAccessKey: string
  }
}
// ==========