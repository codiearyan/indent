import { HttpError } from './errors.js'

export async function readBody(req, limit = 10_000) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) {
      throw new HttpError(413, 'payload_too_large', `The body is larger than ${limit} bytes`)
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function readJson(req, limit = 10_000) {
  const text = await readBody(req, limit)
  if (text.trim() === '') {
    throw new HttpError(400, 'invalid_json', 'The body is empty. Send a JSON object.')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'invalid_json', 'The body is not valid JSON')
  }
}
