

import { Result } from '../../../Result';

// Recieve


export interface InhRecieveCommandItf<O,F> {

/**
 * I is type of Message to send
 * @returns Result<O,F> O is message, F is error
 */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute: <I=void>() => Promise<Result<O,F>>;
}



