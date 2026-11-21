// The local model: a deterministic, offline, OpenAI-compatible server.
// Each content/labs/<labId>/model.mjs may export:
//   models:     { [name]: (request) => string | { content?: string, tool_calls?: [{ name, arguments }] } }
//               A reply with tool_calls ends with finish_reason "tool_calls".
//   embeddings: { [name]: (text) => number[] }   (see embed.mjs for a ready-made one)
// A model function may throw an Error with `status` and `code` to answer with that API error.
import { createServer } from 'node:http'
import { readdirSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { countTokens, truncateTokens } from './tokens.mjs'

const labsDir = fileURLToPath(new URL('../labs/', import.meta.url))

// The query makes import() read a model.mjs again after its repo was updated.
// shortcut: files a model.mjs imports from its own repo stay cached; none do today, add the query to them if one does.
async function loadModels(query = '') {
  const models = {}
  const embeddings = {}
  for (const entry of readdirSync(labsDir, { withFileTypes: true })) {
    const file = join(labsDir, entry.name, 'model.mjs')
    if (!entry.isDirectory() || !existsSync(file)) continue
    try {
      const lab = await import(pathToFileURL(file).href + query)
      Object.assign(models, lab.models)
      Object.assign(embeddings, lab.embeddings)
    } catch (err) {
      // One broken lab must not take the model away from every other lab.
      process.stderr.write(`local model: skipped ${entry.name}/model.mjs: ${err.message}\n`)
    }
  }
  return { models, embeddings }
}

let { models, embeddings } = await loadModels()
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

// Ids depend only on the conversation so far, so a run is the same every time.
function toolCalls(request, calls) {
  const earlier = (request.messages ?? []).flatMap((m) => m.tool_calls ?? []).length
  return calls.map((call, i) => ({
    id: `call_lab_${earlier + i + 1}`,
    type: 'function',
    function: {
      name: call.name,
      arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments ?? {})
    }
  }))
}

function complete(request) {
  const reply = models[request.model](request)
  const full = typeof reply === 'string' ? reply : (reply.content ?? '')
  const calls = typeof reply === 'string' ? [] : (reply.tool_calls ?? [])
  const limit = request.max_completion_tokens ?? request.max_tokens
  const cut = limit == null ? full : truncateTokens(full, limit)
  const usage = {
    prompt_tokens: promptTokens(request.messages ?? []),
    completion_tokens: countTokens(cut)
  }
  usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
  if (cut !== full) return { text: cut, finishReason: 'length', usage }
  if (calls.length === 0) return { text: cut, finishReason: 'stop', usage }
  return { text: cut, toolCalls: toolCalls(request, calls), finishReason: 'tool_calls', usage }
}

function streamReply(res, base, { text, toolCalls, finishReason, usage }, includeUsage) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const chunk = (delta, finish_reason = null) => ({
    ...base,
    object: 'chat.completion.chunk',
    choices: [{ index: 0, delta, finish_reason }]
  })
  const write = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  write(chunk({ role: 'assistant', content: '' }))
  for (const piece of text.match(/\S+\s*|\s+/g) ?? []) write(chunk({ content: piece }))
  // Like the real API: the name first, then the arguments in pieces the client must join.
  for (const [index, call] of (toolCalls ?? []).entries()) {
    const { arguments: args, name } = call.function
    const half = Math.ceil(args.length / 2)
    write(chunk({ tool_calls: [{ index, id: call.id, type: 'function', function: { name, arguments: '' } }] }))
    for (const part of [args.slice(0, half), args.slice(half)]) {
      if (part) write(chunk({ tool_calls: [{ index, function: { arguments: part } }] }))
    }
  }
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
      `The model \`${request.model}\` does not exist on the local model.`,
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
        message: {
          role: 'assistant',
          content: reply.toolCalls && !reply.text ? null : reply.text,
          refusal: null,
          ...(reply.toolCalls ? { tool_calls: reply.toolCalls } : {})
        },
        logprobs: null,
        finish_reason: reply.finishReason
      }
    ],
    usage: reply.usage
  })
}

async function createEmbeddings(req, res) {
  let request
  try {
    request = JSON.parse(await readBody(req))
  } catch {
    return sendError(res, 400, 'The request body is not valid JSON.', 'invalid_json')
  }
  const embed = embeddings[request.model]
  if (!embed) {
    return sendError(
      res,
      404,
      `The embedding model \`${request.model}\` does not exist on the local model.`,
      'model_not_found'
    )
  }
  const inputs = Array.isArray(request.input) ? request.input : [request.input]
  if (inputs.some((input) => typeof input !== 'string' || input === '')) {
    return sendError(res, 400, 'Each input must be a non-empty string.', 'invalid_input')
  }
  // The OpenAI client asks for base64 by default: the raw bytes of 32-bit floats.
  const encode = (vector) =>
    request.encoding_format === 'base64'
      ? Buffer.from(new Float32Array(vector).buffer).toString('base64')
      : vector
  const tokens = inputs.reduce((sum, input) => sum + countTokens(input), 0)
  sendJson(res, 200, {
    object: 'list',
    data: inputs.map((input, index) => ({ object: 'embedding', index, embedding: encode(embed(input)) })),
    model: request.model,
    usage: { prompt_tokens: tokens, total_tokens: tokens }
  })
}

const server = createServer((req, res) => {
  const path = req.url.split('?')[0].replace(/\/+$/, '')
  if (req.method === 'GET' && path === '/v1/models') {
    return sendJson(res, 200, {
      object: 'list',
      data: [...Object.keys(models), ...Object.keys(embeddings)].map((id) => ({
        id,
        object: 'model',
        created: 1700000000,
        owned_by: 'lab'
      }))
    })
  }
  if (req.method === 'POST' && path === '/v1/chat/completions') {
    return chatCompletions(req, res).catch((err) => {
      if (!res.headersSent) sendError(res, 500, `Local model error: ${err.message}`, null, 'server_error')
      else res.end()
    })
  }
  if (req.method === 'POST' && path === '/v1/embeddings') {
    return createEmbeddings(req, res).catch((err) => {
      if (!res.headersSent) sendError(res, 500, `Local model error: ${err.message}`, null, 'server_error')
      else res.end()
    })
  }
  // The app asks for this after installing a repo, so the port, and every terminal using it, stays.
  if (req.method === 'POST' && path === '/reload') {
    return loadModels(`?v=${Date.now()}`).then((loaded) => {
      ;({ models, embeddings } = loaded)
      sendJson(res, 200, { ok: true })
    })
  }
  sendError(res, 404, `Unknown route ${req.method} ${path}.`, 'not_found')
})

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(JSON.stringify({ port: server.address().port }) + '\n')
})
