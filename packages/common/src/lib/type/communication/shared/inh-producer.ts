
import { Result } from '../../../Result';


import {InhMessageFormat} from './message.type'

export interface InhPublishCommandItf<O,F> {
  //Broadcast
execute: <I>(data: InhMessageFormat<I>,options?:InhPublishInputOptions) => Promise<Result<O,F>>;
}
export type InhPublishInputOptions = InhSnsPublishInputOptions
export type InhSnsPublishInputOptions = {messageGroupId?: string,MessageDeduplicationId?:string}

export type InhPublishCommandConfig = InhSnsPublishCommandConfig
export type InhSnsPublishCommandConfig = {topicArn:string}
