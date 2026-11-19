// Tasks: Collect the body, Parse it as JSON
//
// readBody(req, limit = 10000) resolves to the whole request body as a UTF-8 string.
// - an empty body gives ''
// - when the body is larger than `limit` bytes, it rejects with
//   new HttpError(413, 'payload_too_large', message)
//
// readJson(req, limit = 10000) reads the body with readBody and resolves to the parsed value.
// - an empty body or text that is not valid JSON rejects with
//   new HttpError(400, 'invalid_json', message)
import { HttpError } from './errors.js'

export async function readBody(req, limit = 10_000) {
  throw new Error('Not implemented')
}

export async function readJson(req, limit = 10_000) {
  throw new Error('Not implemented')
}
