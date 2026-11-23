import { NEVER, runCases, said } from '../../checks-helpers.mjs'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sorted = (pairs) => [...pairs].sort((a, b) => (a[0] < b[0] ? -1 : 1))
const showQuery = (v) => (v.own ? `got an ${v.kind} with ${v.own.length ? v.own.map(([k, x]) => `${k}: ${JSON.stringify(x)}`).join(', ') : 'no keys'}` : `got ${v.kind}`)
const ran = (calls) => (calls.length ? calls.map((c) => `${c.route} ran with req.body ${JSON.stringify(c.body ?? c.bodyLength)}`).join(', ') : 'no handler ran')
const broke = (r, hint) => (r?.hung ? NEVER : r?.threw && !r.answered ? `handle() threw ${r.threw}. ${hint}` : hint)

function query(name, search, pairs, hint) {
  return {
    name,
    run: 'queryCase',
    args: [search],
    pass: (v) => v.kind === 'object' && same(v.own, sorted(pairs)),
    show: showQuery,
    setup: `parseQuery('${search}')`,
    hint: (v) => (v && v.kind !== 'object' && v.own ? `parseQuery() should return a plain object, not ${v.kind === 'an array' ? 'an array' : `a ${v.kind}`}.` : typeof hint === 'function' ? hint(v) : hint)
  }
}

const has = (v, key) => v?.own?.some(([k]) => k === key)

function parseCases() {
    return [
      query('Reads pairs', 'status=waiting&item=card', [['item', 'card'], ['status', 'waiting']], 'Split the text into pairs at each &, and each pair into a key and a value at its =.'),
      query('Decodes + and %-codes', 'note=two+colours%2C+cream%20card', [['note', 'two colours, cream card']], 'In a query, + stands for a space, and %2C and %20 are %-codes for a comma and a space. Decode both.'),
      query('Splits at the first = only', 'note=size=A5', [['note', 'size=A5']], 'A value may hold an = of its own. Split each pair at its first = and keep the rest of it as the value.'),
      query('A key with no value', 'proof&status=ready', [['proof', ''], ['status', 'ready']], "A key with no = still counts. Its value is ''."),
      query('A repeated key gives every value', 'item=card&item=poster&item=invite', [['item', ['card', 'poster', 'invite']]], (v) => has(v, 'item') ? 'The key comes three times, so its value is an array of all three values, in the order they came. Keeping one of them loses the others.' : 'Every key should be on the object.'),
      query('Broken %-codes are kept as written', 'discount=50%', [['discount', '50%']], 'Decoding 50% fails, because % starts a code that is not there. Keep that part as it was written instead of throwing.'),
      query('Empty pairs are skipped', '&status=waiting&&', [['status', 'waiting']], 'Two & in a row, or one at either end, leave empty pairs. Skip them: they are not keys.'),
      query("Keys that every object has are ordinary keys", 'constructor=staff&toString=1&constructor=hesper', [['constructor', ['staff', 'hesper']], ['toString', '1']], (v) => typeof v?.own?.find(([k]) => k === 'constructor')?.[1] === 'string' ? 'constructor comes twice here, so like any key that repeats, its value is an array of both values, in order.' : 'An ordinary object already has constructor and toString, from its prototype, so asking whether it has the key is true before you added it. Start from an object with no prototype, or ask only about its own keys.'),
      query('__proto__ is an ordinary key', '__proto__=ink', [['__proto__', 'ink']], 'On an ordinary object, setting __proto__ does not add a key: it tries to change the prototype, and a string is ignored. Start from an object with no prototype so __proto__ is a key like any other.'),
      query('No query at all', '', [], 'An empty query gives an object with no keys.')
    ]
}

function routeCases() {
    const kase = (name, routes, method, url, pass, hint) => ({
      name,
      run: 'routeQueryCase',
      args: [routes, method, url],
      pass,
      show: (v) => `${said(v.reply)}\n${v.calls.length ? v.calls.map((c) => `${c.route} ran with req.query ${c.query === 'undefined' ? 'undefined' : JSON.stringify(Object.fromEntries(c.query.own ?? []))}`).join(', ') : 'no handler ran'}`,
      setup: `routes ${routes.map((r) => r.join(' ')).join(' and ')}, then ${method} ${url}`,
      hint: (v) => broke(v?.reply, hint)
    })
    const q = (v) => (v.calls.length === 1 && v.calls[0].query !== 'undefined' ? Object.fromEntries(v.calls[0].query.own ?? []) : undefined)
    return [
      kase('A query does not change the route', [['GET', '/orders'], ['GET', '/prices']], 'GET', '/orders?status=waiting', (v) => v.calls.length === 1 && v.calls[0].route === 'GET /orders', 'Match routes on the path, the part of req.url before the ?.'),
      kase('The handler gets req.query', [['GET', '/orders']], 'GET', '/orders?status=ready&item=poster', (v) => same(q(v), { item: 'poster', status: 'ready' }), 'Give the handler req.query, made by parseQuery() from the part after the ?.'),
      kase('A pattern with a query', [['GET', '/orders/:id']], 'GET', '/orders/1876?proof', (v) => v.calls[0]?.params?.id === '1876' && same(q(v), { proof: '' }), 'The query is not part of the last value: /orders/:id should give id 1876 and the query should hold proof.'),
      kase('No query gives an empty req.query', [['GET', '/orders']], 'GET', '/orders', (v) => same(q(v), {}), 'Without a ?, req.query is still an object, with no keys, so a handler can always read it.')
    ]
}

export const checks = {
  query(t) {
    return runCases(t, 'parseQuery()', [...parseCases(), ...routeCases()])
  },

  body(t) {
    const kase = (name, kind, pass, hint, type) => ({
      name,
      run: 'bodyCase',
      args: type ? [kind, type] : [kind],
      pass,
      show: (v) => `${said(v.reply)}\n${ran(v.calls)}\nchunks read: ${v.reply.pulled}`,
      setup: `routes POST /orders and GET /prices, then POST /orders with content-type ${type ?? 'application/json'} and ${{ split: 'the body {"note":"crème"}, with the two bytes of è in different chunks', many: 'an order as JSON, in four chunks', array: 'the body [1,2,3] in two chunks', broken: 'the body {"item":"card", which is cut short', empty: 'no body', text: 'the body item=card&quantity=4' }[kind]}`,
      hint: (v) => broke(v?.reply, typeof hint === 'function' ? hint(v) : hint)
    })
    const body = (v) => (v.calls.length === 1 ? v.calls[0].body : 'no handler ran')
    return runCases(t, 'handle()', [
      kase('Reads a body sent in pieces', 'many', (v) => same(body(v), { item: 'poster', quantity: 30, due: '2026-12-04' }), 'Read every chunk of the body before you parse it: the request is a stream, and one chunk is only part of the text.'),
      kase('Any JSON value', 'array', (v) => same(body(v), [1, 2, 3]), 'req.body is whatever the JSON holds, an array included.'),
      kase('Joins bytes before reading them as text', 'split', (v) => same(body(v), { note: 'crème' }), (v) => typeof body(v) === 'object' && body(v)?.note !== 'crème' ? 'The note came out wrong: è is two bytes, and here they arrive in different chunks. Turning each chunk into text on its own breaks the character in two. Join the bytes first, then make them text once.' : 'Join the chunks into one piece of text, then parse it.'),
      kase('Broken JSON is a 400', 'broken', (v) => v.reply.status === 400 && typeof v.reply.json?.error === 'string' && v.calls.length === 0, (v) => v.calls.length ? 'The handler ran with a body nobody can read. Answer 400 instead.' : 'JSON.parse throws a SyntaxError on broken JSON. Catch it and answer 400 with sendJson() and { error }: the client sent it wrong, the server is fine.'),
      kase('No body leaves req.body undefined', 'empty', (v) => body(v) === 'undefined', 'With no bytes at all there is nothing to parse, so the handler runs and req.body stays undefined.'),
      kase('A charset does not stop it being JSON', 'many', (v) => same(body(v), { item: 'poster', quantity: 30, due: '2026-12-04' }), 'A content-type can carry more after a ;, such as application/json; charset=utf-8, and its letters can come in capitals. Look at the type before the ;.', 'Application/JSON; charset=utf-8'),
      kase('Other bodies are not read', 'text', (v) => body(v) === 'undefined' && v.reply.pulled === 0, (v) => v.reply.pulled ? 'This body is not JSON, so the router leaves it unread, for the handler, and the handler runs with req.body undefined.' : 'The handler should still run, with req.body undefined.', 'application/x-www-form-urlencoded'),
      {
        name: 'Only a request with a route is read',
        run: 'bodyNotReadCase',
        pass: (v) => v.replies[0].status === 404 && v.replies[1].status === 405 && v.replies.every((r) => r.pulled === 0),
        show: (v) => v.replies.map((r) => `${said(r)}, chunks read: ${r.pulled}`).join('\n'),
        setup: 'route POST /orders, then POST /invoices and PUT /orders, each with a JSON body',
        hint: (v) => broke(v?.replies?.find((r) => r.hung || r.threw), 'Find the route first. A request answered 404 or 405 never needs its body, so do not read it.')
      }
    ])
  },

  limit(t) {
    const kase = (name, limit, plan, expect, setup, hint) => ({
      name,
      run: 'limitCase',
      args: [limit, plan],
      pass: (v) => (expect === 413 ? v.reply.status === 413 && typeof v.reply.json?.error === 'string' && v.calls.length === 0 : v.calls.length === 1),
      show: (v) => `${said(v.reply)}\n${v.calls.length ? `the handler ran with a body of ${v.calls[0].bodyLength} bytes` : 'no handler ran'}\nchunks read: ${v.reply.pulled}`,
      setup,
      hint: (v) => (plan.hold && v?.reply?.hung ? hint(v) : broke(v?.reply, typeof hint === 'function' ? hint(v) : hint))
    })
    return runCases(t, 'handle()', [
      kase('A body of exactly the limit is fine', 500, { size: 500 }, 'ok', 'createRouter({ bodyLimit: 500 }), then a JSON body of exactly 500 bytes', 'The limit is the most a body may have, so a body of exactly that size reaches the handler.'),
      kase('One byte over is a 413', 500, { size: 501 }, 413, 'createRouter({ bodyLimit: 500 }), then a JSON body of 501 bytes', (v) => v?.calls.length ? 'The body is over the limit, so the handler must not run. Answer 413 with sendJson() and { error }.' : 'Answer 413 with sendJson() and { error } for a body over the limit.'),
      kase('The limit counts bytes, not letters', 1000, { size: 602, ch: 'é' }, 413, 'createRouter({ bodyLimit: 1000 }), then a JSON body of 602 letters, each é, which is 1202 bytes', 'Each é is two bytes. Count the length of the chunks, which are bytes, not the length of the text.'),
      kase('Without a limit, 100000 bytes is fine', null, { size: 100000 }, 'ok', 'createRouter() with no options, then a JSON body of 100000 bytes', 'With no bodyLimit given, a router allows 100000 bytes.'),
      kase('Without a limit, 100001 bytes is too many', null, { size: 100001 }, 413, 'createRouter() with no options, then a JSON body of 100001 bytes', 'With no bodyLimit given, a router allows 100000 bytes, and refuses one more.'),
      kase('Stops as soon as the limit is passed', 1000, { pieces: 3, each: 600, hold: true }, 413, 'createRouter({ bodyLimit: 1000 }), then a body sent in pieces of 600 bytes by a client that keeps sending', (v) => v?.reply?.hung ? 'The body passed the limit with its second piece, but the router kept waiting for the rest, which may never come. Answer 413 the moment the count goes over, without reading on.' : 'Answer 413 the moment the bytes read go over the limit.'),
      kase('A content-length over the limit is refused unread', 1000, { length: 5000, size: 10 }, 413, 'createRouter({ bodyLimit: 1000 }), then a request whose content-length header says 5000', (v) => v?.calls.length ? 'The content-length header says the body is 5000 bytes, over the limit. Refuse it before you read anything.' : 'Answer 413 when the content-length header is over the limit, before reading the body.'),
      kase('A content-length is not trusted', 1000, { length: 10, size: 3000 }, 413, 'createRouter({ bodyLimit: 1000 }), then a request whose content-length says 10 but whose body is 3000 bytes', 'A header is only a claim. Count the bytes as they arrive as well, and refuse the body when they go over.')
    ])
  }
}
