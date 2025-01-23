

import { InhRecieveCommandItf } from './shared/inh-reciever';
import { InhSendCommandItf } from './shared/inh-sender';

// Recieve




export interface InhQueueItf  {
  makeRecieveCommand: InhRecieveCommandItf<unknown,unknown>;  
  makeSendCommand: InhSendCommandItf<unknown,unknown>;
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