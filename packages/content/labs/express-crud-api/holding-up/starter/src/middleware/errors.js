// Task: Answer every error as JSON
//
// handleErrors(err, req, res, next) is the app's one error handler:
// - a body that is not valid JSON answers 400 with { error: { code: 'invalid_json', message } }
// - any other error is logged with console.error and answers 500 with
//   { error: { code: 'internal', message } }, where the message says nothing about the error
//   itself: no stack, no error message, no file names
// - if the response has already started, hand the error to next(err)
export function handleErrors(err, req, res, next) {
  throw new Error('Not implemented')
}
