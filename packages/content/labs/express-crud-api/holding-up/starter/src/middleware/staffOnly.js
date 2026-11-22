// Task: Let only staff make changes
//
// staffOnly(key) returns a middleware. GET and HEAD requests go on to the next handler. Any
// other request goes on only when its x-staff-key header equals key; otherwise it answers 401
// with { error: { code: 'unauthorized', message } }.
export function staffOnly(key) {
  throw new Error('Not implemented')
}
