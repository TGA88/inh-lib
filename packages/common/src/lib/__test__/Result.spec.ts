import { Result } from '../Result';

describe('Test Result',  () => {
    let testFn:() => Result<boolean> 
  it('should use Result.fail', async () => {
    const e = new Error("Test Error")
    testFn = ()=> Result.fail(e);

    const res = testFn()

   expect(res.error).toEqual(e)


  });
});

