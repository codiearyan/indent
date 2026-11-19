// Lab model behavior for Pip, the operations assistant at Pebble Lane Pantry.
// A scripted policy: it reads the request, the tools offered and the tool results so far,
// then asks for the next tool call or writes the final answer. Replies depend only on the request.

const apiError = (message) =>
  Object.assign(new Error(message), { status: 400, code: 'invalid_tool_messages' })

// The same rules the real API enforces on tool messages.
export function checkToolMessages(messages) {
  let pending = null
  for (const [i, m] of messages.entries()) {
    if (m.role === 'tool') {
      if (!pending?.has(m.tool_call_id)) {
        throw apiError(
          `messages[${i}] has role 'tool' with tool_call_id ${JSON.stringify(m.tool_call_id)}, which does not answer a tool call in the assistant message before it.`
        )
      }
      if (typeof m.content !== 'string') {
        throw apiError(`messages[${i}].content must be a string. Turn tool results into text first.`)
      }
      pending.delete(m.tool_call_id)
      continue
    }
    if (pending?.size) {
      throw apiError(
        `An assistant message with tool_calls must be followed by one tool message per call. No answer for: ${[...pending].join(', ')}.`
      )
    }
    pending = m.role === 'assistant' && m.tool_calls?.length ? new Set(m.tool_calls.map((c) => c.id)) : null
  }
  if (pending?.size) {
    throw apiError(
      `An assistant message with tool_calls must be followed by one tool message per call. No answer for: ${[...pending].join(', ')}.`
    )
  }
}

const read = (text) => {
  try {
    const value = JSON.parse(text)
    return value !== null && typeof value === 'object' ? value : { unreadable: text }
  } catch {
    return { unreadable: text }
  }
}

// Every tool call so far, paired with the tool message that answered it.
function history(messages) {
  const results = new Map(messages.filter((m) => m.role === 'tool').map((m) => [m.tool_call_id, m.content]))
  return messages
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => m.tool_calls ?? [])
    .map((c) => ({
      id: c.id,
      name: c.function?.name,
      args: read(c.function?.arguments ?? ''),
      result: read(results.get(c.id) ?? '')
    }))
}

const offered = (request, name) =>
  (request.tools ?? []).find((t) => t.type === 'function' && t.function?.name === name)?.function

const call = (name, args) => ({ tool_calls: [{ name, arguments: args }] })
const named = (calls, name) => calls.filter((c) => c.name === name)

const STATUS = {
  packing: 'being packed',
  out_for_delivery: 'out for delivery',
  delivered: 'delivered'
}

const PRODUCT_WORDS = [
  [/oat milk/i, 'OAT-1L'],
  [/rye/i, 'RYE-800'],
  [/eggs?/i, 'EGG-12'],
  [/honey/i, 'HNY-250']
]

function unreadable(name) {
  return `I could not read the result of ${name}. Tool results should be JSON text.`
}

function needs(request, ...names) {
  const missing = names.filter((n) => !offered(request, n))
  return missing.length ? `I need the ${missing.join(' and ')} tool${missing.length > 1 ? 's' : ''} to answer that.` : null
}

function orderStatus(request, calls, orderId) {
  const tool = offered(request, 'get_order')
  if (!tool) return 'I cannot look up orders without a get_order tool.'
  if (!tool.parameters?.properties?.orderId) {
    return `The get_order tool does not take an orderId, so I cannot ask it about ${orderId}.`
  }
  const done = named(calls, 'get_order')
  if (!done.length) return call('get_order', { orderId })
  const r = done.at(-1).result
  if ('unreadable' in r) return unreadable('get_order')
  if (r.error) return `I could not find order ${orderId}: ${r.error}`
  return `Order ${r.orderId} is ${STATUS[r.status] ?? r.status}${r.eta ? `, expected by ${r.eta}` : ''}.`
}

function waitDelivered(request, calls, orderId) {
  const missing = needs(request, 'get_order')
  if (missing) return missing
  const r = named(calls, 'get_order').at(-1)?.result
  if (r && 'unreadable' in r) return unreadable('get_order')
  if (r?.error) return `I could not find order ${orderId}: ${r.error}`
  if (r?.status === 'delivered') return `Order ${orderId} has been delivered.`
  return call('get_order', { orderId })
}

function orderInStock(request, calls, orderId) {
  const missing = needs(request, 'get_order', 'check_stock')
  if (missing) return missing
  const order = named(calls, 'get_order').at(-1)?.result
  if (!order) return call('get_order', { orderId })
  if ('unreadable' in order || (!order.error && !Array.isArray(order.items))) return unreadable('get_order')
  if (order.error) return `I could not find order ${orderId}: ${order.error}`
  const checks = named(calls, 'check_stock')
  const next = order.items.find((item) => !checks.some((c) => c.args.sku === item.sku))
  if (next) return call('check_stock', { sku: next.sku })
  const short = order.items.flatMap((item) => {
    const r = checks.find((c) => c.args.sku === item.sku).result
    if ('unreadable' in r) return [`${item.sku} (unreadable result)`]
    return r.stock >= item.qty ? [] : [`${r.name} (needs ${item.qty}, ${r.stock} in stock)`]
  })
  return short.length
    ? `Order ${orderId} is short: ${short.join(', ')}.`
    : `Everything in order ${orderId} is in stock.`
}

function stockCheck(request, calls, text) {
  const missing = needs(request, 'check_stock')
  if (missing) return missing
  const skus = PRODUCT_WORDS.map(([re, sku]) => ({ at: text.search(re), sku }))
    .filter((p) => p.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((p) => p.sku)
  const checks = named(calls, 'check_stock')
  if (!checks.length) return { tool_calls: skus.map((sku) => ({ name: 'check_stock', arguments: { sku } })) }
  const lines = checks.map(({ id, args, result: r }) => {
    if ('unreadable' in r) return `${args.sku}: unreadable result.`
    if (r.error) return `${args.sku}: ${r.error}.`
    if (r.sku !== args.sku) return `The result for ${id} is about ${r.sku}, but that call asked about ${args.sku}.`
    return `${r.name}: ${r.stock > 0 ? `${r.stock} in stock` : 'out of stock'}.`
  })
  return lines.join(' ')
}

function reserve(request, calls, qty, words, orderId) {
  const missing = needs(request, 'search_products', 'reserve_stock')
  if (missing) return missing
  // Like real models now and then, it first reaches for a tool that does not exist.
  if (!calls.length) return call('find_product', { name: words })
  const search = named(calls, 'search_products').at(-1)?.result
  if (!search) return call('search_products', { query: words })
  if ('unreadable' in search) return unreadable('search_products')
  if (search.error || !Array.isArray(search) || !search.length) {
    return `I could not find ${words}${search.error ? `: ${search.error}` : '.'}`
  }
  const product = search[0]
  const attempts = named(calls, 'reserve_stock')
  if (!attempts.length) {
    return call('reserve_stock', { sku: product.sku, quantity: String(qty), orderId })
  }
  const r = attempts.at(-1).result
  if ('unreadable' in r) return unreadable('reserve_stock')
  if (!r.error) return `Reserved ${r.reserved} of ${product.name} for ${orderId}. ${r.left} left in stock.`
  if (attempts.length === 1) return call('reserve_stock', { sku: product.sku, quantity: qty, orderId })
  return `I could not reserve ${qty} of ${product.name} for ${orderId}: ${r.error}`
}

function refund(request, calls, orderId, reason) {
  const missing = needs(request, 'get_order', 'refund_order')
  if (missing) return missing
  const order = named(calls, 'get_order').at(-1)?.result
  if (!order) return call('get_order', { orderId })
  if ('unreadable' in order) return unreadable('get_order')
  if (order.error) return `I could not find order ${orderId}: ${order.error}`
  const done = named(calls, 'refund_order').at(-1)?.result
  if (!done) return call('refund_order', { orderId, amount: order.total, reason })
  if ('unreadable' in done) return unreadable('refund_order')
  if (done.refused) return `I did not refund ${orderId}: the refund was not approved.`
  if (done.error) return `The refund for ${orderId} failed: ${done.error}`
  return `Refunded ${Number(done.amount).toFixed(2)} to ${order.customer} for ${orderId}.`
}

export function pip(request) {
  const messages = request.messages ?? []
  checkToolMessages(messages)
  const text = String([...messages].reverse().find((m) => m.role === 'user')?.content ?? '')
  const calls = history(messages)
  let m
  if ((m = text.match(/wait until order (PL-\d{4}) is delivered/i))) return waitDelivered(request, calls, m[1])
  if ((m = text.match(/refund order (PL-\d{4})[^,]*(?:,\s*(.+?))?\.?$/i))) {
    return refund(request, calls, m[1], m[2] ?? 'customer request')
  }
  if ((m = text.match(/reserve (\d+) (?:jars? of )?(.+?) for order (PL-\d{4})/i))) {
    return reserve(request, calls, Number(m[1]), m[2], m[3])
  }
  if (/check stock for/i.test(text)) return stockCheck(request, calls, text)
  if ((m = text.match(/is everything in order (PL-\d{4}) in stock/i))) return orderInStock(request, calls, m[1])
  if ((m = text.match(/order (PL-\d{4})/i))) return orderStatus(request, calls, m[1])
  return 'I can help with Pebble Lane Pantry orders and stock. Ask me about an order such as PL-2041.'
}

export const models = {
  'agents-pip-1': pip
}
