// Task: One place for errors
//
// handleError(err, req, res, log) is the only place that turns a thrown error into a response.
// - an HttpError answers its status with { error: { code, message, details }, requestId }
// - anything else is a bug: call log(...) with the error so the team can find it, and answer 500
//   with { error: { code: 'internal_error', message }, requestId }, where the message says
//   nothing about the error itself
// - requestId is the response's x-request-id header (res.getHeader('x-request-id'))
// - if the response has already started (res.headersSent), destroy it instead
import { sendJson } from './respond.js'

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function handleError(err, req, res, log) {
  throw new Error('Not implemented')
}
