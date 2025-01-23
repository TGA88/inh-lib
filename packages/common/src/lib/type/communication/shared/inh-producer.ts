
import { Result } from '../../../Result';


import {InhMessageFormat} from './message.type'

export interface InhPublishCommandItf<O,F> {
     //Broadcast
  execute: <I>(data: InhMessageFormat<I>,messageGroupId?:string) => Promise<Result<O,F>>;
}






