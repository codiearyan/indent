// The lab model: a deterministic, offline, OpenAI-compatible server.
// Each content/labs/<labId>/model.mjs exports `models`: { [name]: (request) => string }.
// A model function may throw an Error with `status` and `code` to answer with that API error.
import { createServer } from 'node:http'
import { readdirSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { countTokens, truncateTokens } from './tokens.mjs'

const labsDir = fileURLToPath(new URL('../labs/', import.meta.url))

async function loadModels() {
  const models = {}
  for (const entry of readdirSync(labsDir, { withFileTypes: true })) {
    const file = join(labsDir, entry.name, 'model.mjs')
    if (entry.isDirectory() && existsSync(file)) {
      Object.assign(models, (await import(pathToFileURL(file).href)).models)
    }
  }
  return models
}

const models = await loadModels()
let counter = 0

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

function sendError(res, status, message, code, type = 'invalid_request_error') {
  sendJson(res, status, { error: { message, type, param: null, code } })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function promptTokens(messages) {
  return messages.reduce((sum, m) => sum + countTokens(typeof m.content === 'string' ? m.content : ''), 0)
}

function complete(request) {
  const full = models[request.model](request)
  const limit = request.max_completion_tokens ?? request.max_tokens
  const cut = limit == null ? full : truncateTokens(full, limit)
  const usage = {
    prompt_tokens: promptTokens(request.messages ?? []),
    completion_tokens: countTokens(cut)
  }
  usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
  return { text: cut, finishReason: cut === full ? 'stop' : 'length', usage }
}

function streamReply(res, base, { text, finishReason, usage }, includeUsage) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const chunk = (delta, finish_reason = null) => ({
    ...base,
    object: 'chat.completion.chunk',
    choices: [{ index: 0, delta, finish_reason }]
  })
  const write = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  write(chunk({ role: 'assistant', content: '' }))
  for (const piece of text.match(/\S+\s*|\s+/g) ?? []) write(chunk({ content: piece }))
  write(chunk({}, finishReason))
  if (includeUsage) write({ ...base, object: 'chat.completion.chunk', choices: [], usage })
  res.end('data: [DONE]\n\n')
}

async function chatCompletions(req, res) {
  let request
  try {
    request = JSON.parse(await readBody(req))
  } catch {
    return sendError(res, 400, 'The request body is not valid JSON.', 'invalid_json')
  }
  if (!models[request.model]) {
    return sendError(
      res,
      404,
      `The model \`${request.model}\` does not exist on the lab model.`,
      'model_not_found'
    )
  }
  let reply
  try {
    reply = complete(request)
  } catch (err) {
    if (!err.status) throw err
    return sendError(res, err.status, err.message, err.code ?? null)
  }
  const base = {
    id: `chatcmpl-lab-${++counter}`,
    created: 1700000000,
    model: request.model,
    system_fingerprint: 'lab-model'
  }
  if (request.stream) return streamReply(res, base, reply, request.stream_options?.include_usage)
  sendJson(res, 200, {
    ...base,
    object: 'chat.completion',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: reply.text, refusal: null },
        logprobs: null,
        finish_reason: reply.finishReason
      }
    ],
    usage: reply.usage
  })
}

const server = createServer((req, res) => {
  const path = req.url.split('?')[0].replace(/\/+$/, '')
  if (req.method === 'GET' && path === '/v1/models') {
    return sendJson(res, 200, {
      object: 'list',
      data: Object.keys(models).map((id) => ({ id, object: 'model', created: 1700000000, owned_by: 'lab' }))
    })
  }
  if (req.method === 'POST' && path === '/v1/chat/completions') {
    return chatCompletions(req, res).catch((err) => {
      if (!res.headersSent) sendError(res, 500, `Lab model error: ${err.message}`, null, 'server_error')
      else res.end()
    })
  }
  sendError(res, 404, `Unknown route ${req.method} ${path}.`, 'not_found')
})

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(JSON.stringify({ port: server.address().port }) + '\n')
})
