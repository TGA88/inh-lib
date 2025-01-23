

import { UseCase } from '@inh-lib/ddd';
import { InhRecieveCommandItf } from './shared/inh-reciever';
import { InhSendCommandItf } from './shared/inh-sender';

// Recieve




export interface InhQueueItf  {
  makeRecieveCommand<TUsecaseInput,TUsecaseOutput>(ctx:unknown,handler:UseCase<TUsecaseInput,TUsecaseOutput>): InhRecieveCommandItf<unknown,unknown>;  
  makeSendCommand(ctx:unknown): InhSendCommandItf<unknown,unknown>;
}



export type InhQueueConfig = InhAwsSqsConfig 
  
// AWS
export type InhAwsSqsConfig = {
  region: string
  endpoint: string
  credentials: {
      accessKeyId: string
      secretAccessKey: string
  }
}
// ==========