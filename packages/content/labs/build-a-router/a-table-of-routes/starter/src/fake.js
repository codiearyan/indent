// Requests and responses shaped like the ones a Node server hands over, so src/try.js can send
// requests without a server. A request is a readable stream of its body with method, url and
// headers on it; a response has statusCode, setHeader(), getHeader() and end().
import { Readable } from 'node:stream'

export function request(method, url, { headers = {}, body } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(body)])
  return Object.assign(req, { method, url, headers })
}

export function response() {
  const headers = {}
  const res = {
    statusCode: 200,
    headersSent: false,
    writableEnded: false,
    body: undefined,
    setHeader(name, value) {
      if (res.headersSent) throw new Error('Cannot set headers after they are sent to the client')
      headers[name.toLowerCase()] = String(value)
    },
    getHeader: (name) => headers[name.toLowerCase()],
    end(body = '') {
      if (res.writableEnded) return
      res.writableEnded = res.headersSent = true
      res.body = String(body)
    }
  }
  return res
}

/** Sends one request to `listener(req, res)` and returns a line that says what came back. */
export async function ask(listener, method, url, options) {
  const res = response()
  await listener(request(method, url, options), res)
  if (!res.writableEnded) return `${method} ${url} -> no answer`
  const allow = res.getHeader('allow') ? ` (allow: ${res.getHeader('allow')})` : ''
  const body = res.body.length > 72 ? `${res.body.slice(0, 69)}...` : res.body
  return `${method} ${url} -> ${res.statusCode}${allow} ${body}`
}
