
import { Result } from '../../../Result';
import {InhMessageFormat} from './message.type'

// Send
// export interface InhSendCommandItf {
//      //1to1
//   execute: <I,O,F>(data: InhMessageFormat<I>,messageGroupId?:string) => Promise<Result<O,F>>;
// }

export interface InhSendCommandItf<O,F> {
  //1to1
execute: <I>(data: InhMessageFormat<I>,messageGroupId?:string) => Promise<Result<O,F>>;
}


