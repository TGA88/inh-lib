

import { InhPublishCommandItf } from './shared/inh-producer';





export interface InhPubSubItf  {
  makePublishCommand(ctx:unknown): InhPublishCommandItf<unknown,unknown>;
}



export type InhPubSubConfig = InhAwsSnsConfig 
  
// AWS
export type InhAwsSnsConfig = {
  region: string
  endpoint: string
  credentials: {
      accessKeyId: string
      secretAccessKey: string
  }
}
// ==========