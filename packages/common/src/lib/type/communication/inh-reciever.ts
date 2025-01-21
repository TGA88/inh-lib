import { UseCase } from '@inh-lib/ddd';
import { InhLogger } from '../inh-logger';
import {MakeInhHealthCheckCommandFn} from './shared/healthcheck.type'
import { Result } from '../../Result';

// Recieve
export interface InhRecieveCommandItf<O,F,I=void> {
  //Pull message from Q
execute: (input:I) => Promise<Result<O,F>>;
}

// T1 is configuration for specific Provider like aws is AWS.ReceiveMessageRequest
export type MakeInhRecieveCommandFn =  <T1, IRequest, IResponse,O,F,I=void>(recieveContext:T1,recieveHandler:UseCase<IRequest, IResponse>,logger:InhLogger) => InhRecieveCommandItf<O,F,I>;
// ==========

export interface InhRecieverClientItf  {
  makeRecieveCommand: MakeInhRecieveCommandFn;
  makeHealthCheckCommand: MakeInhHealthCheckCommandFn;
}

export interface InhRecieverProviderItf{
    InhRecieverClientItf(config:InhRecieveConfig): InhRecieverClientItf
}


export type InhRecieveConfig = AwsSqsRecieverConfig 
  
// AWS
export type AwsSqsRecieverConfig = {
  region: string
  endpoint: string
  credentials: {
      accessKeyId: string
      secretAccessKey: string
  }
}
// ==========