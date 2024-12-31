import {MakeInhHealthCheckCommandFn} from './shared/healthcheck.type'
import {InhMessageFormat} from './shared/message.type'

// Send
export interface InhSendCommandItf {
     //1to1
  execute: <O>(data: InhMessageFormat) => Promise<O>;
}

// target is queueUrl
export type MakeInhSendCommandFn =  (target:string) => InhSendCommandItf;
// ===========


// Recieve
export interface InhRecieveCommandItf {
  //Pull message from Q
execute: <O>() => Promise<O>;
}

// target is queueUrl
export type MakeInhRecieveCommandFn =  (target:string) => InhRecieveCommandItf;
// ==========


export interface InhSenderClientItf  {
  makeSendCommand: MakeInhSendCommandFn;
  makeRecieveCommand: MakeInhSendCommandFn;
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