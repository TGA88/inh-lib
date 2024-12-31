import { Result } from '../Result';



describe('Test Result<void,Error>',  () => {
  function testFn(e?:Error):Result<void,Error>  {
    return e ? Result.fail(e):Result.ok()
  }
  // Arragne and Action
  const e = new Error("Test Error")
  const testFail = testFn(e)
  const testSuccess = testFn()

  it('When success Result.isFailure should be true ', async () => {
    const res = testFail.isFailure
    expect(res).toEqual(true)
  });
  it('When fail errorValue should be Error Instance', async () => {
   expect(testFail.errorValue()).toEqual(e)
  });

  it('When success Result.getValue should be undefined ', async () => {
    const res = testSuccess.getValue()
    expect(res).toEqual(undefined)
  });
  it('When success Result.isSuccess should be true ', async () => {
    const res = testSuccess.isSuccess
    expect(res).toEqual(true)
  });
  it('When success Result.errorValue() should be undefined ', async () => {
    const res = testSuccess.error
    expect(res).toEqual(undefined)
  });
});

