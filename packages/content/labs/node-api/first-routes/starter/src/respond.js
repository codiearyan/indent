// Task: Send JSON responses
//
// sendJson(res, status, body) writes one complete JSON response:
// - the status code is `status`
// - content-type is 'application/json; charset=utf-8'
// - content-length is the size of the body in bytes
// - the body is `body` turned into JSON text
export function sendJson(res, status, body) {
  throw new Error('Not implemented')
}
