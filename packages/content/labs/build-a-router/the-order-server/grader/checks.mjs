import { NEVER, runCases, said } from '../../checks-helpers.mjs'

const line = (r) => {
  if (!r) return 'no reply'
  if (!r.answered) return `${r.request}: ${r.hung ? 'no answer after 1.5 seconds' : `the request failed: ${r.threw}`}`
  const allow = r.allow === undefined ? '' : `, allow: ${r.allow}`
  return `${r.request}: ${r.status}${allow}, body ${r.body === '' ? '(none)' : r.body}`
}
const stuck = (r) => (r?.hung ? NEVER : r?.threw && !r.answered ? `handle() threw ${r.threw}.` : null)

function group(name, plan, requests, pass, setup, hint) {
  return {
    name,
    run: 'groupCase',
    args: [plan, requests],
    pass,
    show: (v) => v.map((x) => `${said(x.reply)}\n  ran: ${x.log.join(', ') || 'nothing'}`).join('\n'),
    setup,
    hint: (v) => {
      const bad = v?.map((x) => stuck(x.reply)).find(Boolean)
      const text = typeof hint === 'function' ? hint(v) : hint
      return bad ? `${bad} ${text}` : text
    }
  }
}

const body = (x) => {
  try {
    return JSON.parse(x.reply.body)
  } catch {
    return undefined
  }
}

const STAFF = { prefix: '/staff', routes: [['GET', '/prices']], groupRoutes: [['GET', '/queue'], ['POST', '/orders/:id/status']] }

function serve(name, kind, pass, setup, hint, first) {
  return {
    name,
    run: 'serveCase',
    args: [kind],
    pass: (v) => v.isServer && v.listeningAtFirst === false && !v.listenError && v.closed && pass(v),
    show: (v) =>
      !v.isServer
        ? `serve() returned ${v.got}`
        : v.listenError
          ? `the check could not start the server: ${v.listenError}`
          : `${v.replies.map(line).join('\n')}${v.closed ? '' : '\nthe server did not close'}`,
    setup,
    hint: (v) => {
      if (v && !v.isServer) return 'serve() should return a server made with createServer() from node:http.'
      if (v?.listeningAtFirst || v?.listenError) return 'serve() should return the server without starting it: the check, like anyone who calls it, chooses where it listens.'
      if (first && v?.replies?.some((r) => !r.answered || r.status !== 500)) return first
      const bad = v?.replies?.find((r) => !r.answered)
      if (bad) return bad.hung ? 'A request got no answer from the server. Every request should go through handle(), which answers it.' : `A request failed: ${bad.threw}. Look at what the server does with each request.`
      return typeof hint === 'function' ? hint(v) : hint
    }
  }
}

const ids = (r) => (Array.isArray(r?.json) ? r.json.map((o) => o?.id).join(',') : undefined)

function app(name, requests, pass, setup, hint) {
  return {
    name,
    run: 'appCase',
    args: [requests],
    pass: (v) => pass(v.replies),
    show: (v) => v.replies.map(line).join('\n'),
    setup,
    hint: (v) => {
      const bad = v?.replies?.find((r) => !r.answered)
      if (bad) return bad.hung ? 'A request got no answer. Look for a handler or middleware that neither answers nor calls next().' : `A request failed: ${bad.threw}.`
      return typeof hint === 'function' ? hint(v?.replies) : hint
    }
  }
}

export const checks = {
  groups(t) {
    return runCases(t, 'mount()', [
      group('Group routes answer under the prefix', STAFF, [['GET', '/staff/queue'], ['POST', '/staff/orders/5102/status']], (v) => v[0].log.join() === 'group GET /queue' && v[1].log.join() === 'group POST /orders/:id/status' && body(v[1])?.params?.id === '5102', "a router with GET /prices, a group with GET /queue and POST /orders/:id/status, mount(router, '/staff', group), then GET /staff/queue and POST /staff/orders/5102/status", (v) => (v?.[1]?.log.length && body(v[1])?.params?.id !== '5102' ? "The group's route ran, but its params are wrong. A group's route matches like any other, on the prefix and its path together." : "Each route of the group should answer at the prefix followed by its own path.")),
      group('A group route is not at its own path', STAFF, [['GET', '/queue']], (v) => v[0].reply.status === 404 && v[0].log.length === 0, "the same, then GET /queue", 'Only the prefixed path reaches a group route; /queue on its own has no route.'),
      group("A group's / is the prefix itself", { prefix: '/staff', groupRoutes: [['GET', '/']] }, [['GET', '/staff']], (v) => v[0].log.join() === 'group GET /', "a group with GET /, mounted at /staff, then GET /staff", "A group's route / answers at the prefix itself, /staff, not /staff/."),
      group('The prefix is whole parts', STAFF, [['GET', '/staffroom/queue'], ['GET', '/staff-queue']], (v) => v.every((x) => x.reply.status === 404 && x.log.length === 0), 'the same group at /staff, then GET /staffroom/queue and GET /staff-queue', 'A path is in the group only when its first parts are exactly the prefix. /staffroom starts with /staff, but it is another part.'),
      group('Group middleware runs after the router\'s, for its routes only', { ...STAFF, use: ['router m1'], groupUse: ['group m1'] }, [['GET', '/staff/queue'], ['GET', '/prices']], (v) => v[0].log.join() === 'router m1,group m1,group GET /queue' && v[1].log.join() === 'router m1,GET /prices', 'the same, with use(router, m1) and use(group, m1), then GET /staff/queue and GET /prices', (v) => (v?.[1]?.log.includes('group m1') ? "The group's middleware ran for a route outside the group. It belongs to the group's routes only." : "For a group route, the router's middleware runs first, then the group's, then the handler.")),
      group("Errors go to the router's error handler", { prefix: '/staff', groupRoutes: [['GET', '/queue', 'throw']], onError: true }, [['GET', '/staff/queue']], (v) => v[0].reply.status === 503 && v[0].seen.join() === 'true', "a group route that throws, mounted at /staff, and an error handler on the router, then GET /staff/queue", "An error in a group's route goes to the one error handler, the router's."),
      group('A 405 knows about groups', { prefix: '/staff', groupRoutes: [['GET', '/orders/:id/notes'], ['DELETE', '/orders/:id/notes']] }, [['POST', '/staff/orders/5101/notes']], (v) => v[0].reply.status === 405 && v[0].reply.allow === 'GET, DELETE' && v[0].log.length === 0, 'a group with GET and DELETE /orders/:id/notes, mounted at /staff, then POST /staff/orders/5101/notes', "The path has group routes, but none for POST: that is a 405, and allow lists the group's methods for it."),
      group('Group routes compete like any other', { prefix: '/staff', routes: [['GET', '/staff/:page']], groupRoutes: [['GET', '/queue']] }, [['GET', '/staff/queue'], ['GET', '/staff/rota']], (v) => v[0].log.join() === 'group GET /queue' && v[1].log.join() === 'GET /staff/:page', 'a router with GET /staff/:page, a group with GET /queue at /staff, then GET /staff/queue and GET /staff/rota', '/staff/queue has two fixed parts and /staff/:page one, so the group route wins for /staff/queue, as in issue 2.'),
      {
        name: 'Refuses a prefix without a slash',
        run: 'prefixCase',
        pass: (v) => v.threw && v.typeError,
        show: (v) => (v.threw ? `threw ${v.error}` : 'did not throw'),
        setup: "mount(router, 'staff', group)",
        hint: 'A prefix is the start of a path, so it starts with /. Throw a TypeError for one that does not.'
      }
    ])
  },

  serve(t) {
    return runCases(t, 'serve()', [
      serve('Real requests reach their routes', 'real', (v) => {
        const [one, made, none, wrong] = v.replies
        return one.status === 200 && one.json?.id === '5102' && one.json?.query?.proof === 'yes' && made.status === 201 && made.json?.got?.quantity === 12 && none.status === 404 && wrong.status === 405 && wrong.allow === 'GET'
      }, 'serve(router) on a port the system picks, then real requests: GET /orders/5102?proof=yes, a POST with a JSON body, GET /invoices, DELETE /orders/5102', 'Every request should go through handle(router, req, res): a real request has the same method, url, headers and body stream as the ones your router already knows.'),
      serve('HEAD is answered by the GET route', 'head', (v) => {
        const [prices, stock, orders, get] = v.replies
        return prices.status === 200 && prices.body === '' && prices.type?.includes('application/json') && stock.from === 'head' && orders.status === 405 && orders.allow === 'POST' && get.body === '{"card":30}'
      }, 'routes GET /prices, GET /stock, HEAD /stock and POST /orders, then HEAD /prices, HEAD /stock, HEAD /orders and GET /prices', (v) => {
        const [prices, stock, orders] = v?.replies ?? []
        if (prices?.status === 405) return 'A HEAD asks for the headers a GET would give. When a path has no HEAD route, use its GET route; Node leaves the body out by itself.'
        if (stock?.from === 'get') return 'The path has a HEAD route of its own, and it should win over the GET route.'
        if (orders?.status !== 405) return 'Without a HEAD or GET route, a HEAD gets a 405 like any other method.'
        return 'HEAD /prices should run the GET route and answer with its status and headers.'
      }),
      serve('A router that breaks still answers', 'broken', (v) => v.replies.every((r) => r.status === 500 && typeof r.json?.error === 'string'), 'serve() given an object that is not a router, so handle() fails on every request, then GET /prices and GET /orders', '', "handle() failed and nothing answered, so the client waited. Catch what handle() throws, or the promise it rejects, in the server's listener, and answer a plain 500 with sendJson() when nothing was answered yet."),
      serve('A failing router still answers', 'failing', (v) => v.replies[0].status === 500 && !v.replies[0].body.includes('Ink ran out') && !v.replies[0].body.includes('broke too') && v.replies[1].status === 200, 'a route that throws and an error handler that throws as well, then GET /broken and GET /prices', 'When everything else has failed, the client still gets a plain 500 that gives no message away, and the server goes on to answer the next request.')
    ])
  },

  app(t) {
    const W = { body: { item: 'poster', quantity: 25, due: '2027-04-01' } }
    return runCases(t, 'createApp()', [
      app('Prices and every order', [['GET', '/prices'], ['GET', '/orders']], (r) => JSON.stringify(r[0].json) === '{"card":30,"invite":85,"poster":400}' && ids(r[1]) === '5101,5102,5103,5104,5105', 'GET /prices and GET /orders, on a shop with orders of the check\'s own', (r) => (r?.[0]?.status === 401 ? 'GET /prices was refused with a 401, so the staff check runs for every route. Use it on the staff group only.' : 'GET /prices answers 200 with shop.prices(), and GET /orders with every order of shop.list().')),
      app('Orders filtered by the query', [['GET', '/orders?status=waiting'], ['GET', '/orders?status=waiting&item=card&item=poster'], ['GET', '/orders?item=card']], (r) => ids(r[0]) === '5101,5103,5105' && ids(r[1]) === '5101,5105' && ids(r[2]) === '5102,5104,5105', 'GET /orders?status=waiting, then with item=card&item=poster as well, then GET /orders?item=card', (r) => (ids(r?.[1]) === '' || ids(r?.[1]) === '5105' ? 'item can come more than once, and then req.query.item is an array: keep the orders whose item is any of them.' : 'Keep only the orders with the status in req.query.status, and with an item from req.query.item, when each is given.')),
      app("Today's orders and one order", [['GET', '/orders/today'], ['GET', '/orders/5102'], ['GET', '/orders/5999']], (r) => ids(r[0]) === '5101,5103' && r[1].status === 200 && r[1].json?.id === '5102' && r[2].status === 404 && typeof r[2].json?.error === 'string', 'GET /orders/today, GET /orders/5102 and GET /orders/5999, which does not exist', (r) => (r?.[0]?.status === 404 ? "/orders/today reached the route for one order. Is there a GET /orders/today route? Your router gives it the win once it is there." : r?.[2]?.status === 500 ? 'An order that does not exist was answered 500. If the handler throws a ShopError for it, the error handler should answer a ShopError with its own status and message.' : r?.[2]?.status !== 404 ? 'An order that does not exist is a 404 with { error }, not an empty answer.' : 'GET /orders/today answers shop.today(), and GET /orders/:id the order with that id.')),
      app('A new order is kept', [['POST', '/orders', W], ['GET', '/orders/5106']], (r) => r[0].status === 201 && r[0].json?.id === '5106' && r[1].status === 200 && r[1].json?.item === 'poster', 'POST /orders with a poster order as JSON, then GET /orders/5106', 'POST /orders answers 201 with what shop.add(req.body) returns, and the order is then there to read.'),
      app('A bad order is refused in plain words', [['POST', '/orders', { body: { item: 'mug', quantity: 3, due: '2027-04-01' } }], ['POST', '/orders', { body: '{"item":"card",' }]], (r) => r[0].status === 400 && r[0].json?.error === 'We do not print mug.' && r[1].status === 400, 'POST /orders with an order for mugs, then one with broken JSON', (r) => (r?.[0]?.status === 500 ? "shop.add() throws a ShopError with status 400. The error handler answers a ShopError with its own status and message." : 'A ShopError is answered with its status and { error: its message }.')),
      app('Staff routes need the key', [['GET', '/staff/queue'], ['GET', '/staff/queue', { key: 'wrong' }], ['GET', '/staff/queue', { key: 'right' }]], (r) => r[0].status === 401 && r[1].status === 401 && r[2].status === 200 && ids(r[2]) === '5101,5102,5103,5105', 'GET /staff/queue with no x-staff-key, with a wrong one, and with the right one', (r) => (r?.[2]?.status === 404 ? 'There is no /staff/queue yet. Put the staff routes in a group, and mount it at /staff once its routes and middleware are added.' : r?.[0]?.status === 200 ? 'Without the right x-staff-key, the staff group answers 401 before any of its routes run.' : 'With the right x-staff-key, GET /staff/queue answers 200 with shop.queue().')),
      app('Staff change an order', [['POST', '/staff/orders/5104/status', { key: 'right', body: { status: 'collected' } }], ['GET', '/orders/5104'], ['POST', '/staff/orders/5101/status', { body: { status: 'ready' } }], ['GET', '/orders/5101'], ['POST', '/staff/orders/5104/status', { key: 'right', body: { status: 'lost' } }], ['POST', '/staff/orders/5999/status', { key: 'right', body: { status: 'ready' } }]], (r) => r[0].status === 200 && r[1].json?.status === 'collected' && r[2].status === 401 && r[3].json?.status === 'waiting' && r[4].status === 400 && r[5].status === 404, 'with the key, order 5104 marked collected; without it, 5101 marked ready; then a status that does not exist and an order that does not exist', (r) => (r?.[3]?.json?.status === 'ready' ? 'An order changed without the staff key. The staff middleware has to stop the request before the route runs.' : 'POST /staff/orders/:id/status answers 200 with shop.setStatus(id, req.body.status), and its ShopErrors with their own status.')),
      app('What the old server got wrong', [['DELETE', '/orders/5101'], ['GET', '/orders/5101/proof'], ['GET', '/staffroom'], ['GET', '/prices?fresh=1']], (r) => r[0].status === 405 && r[0].allow === 'GET' && r[1].status === 404 && r[2].status === 404 && r[3].status === 200, 'DELETE /orders/5101, GET /orders/5101/proof, GET /staffroom and GET /prices?fresh=1', 'These are the requests the old server answered wrongly. With every route in the table, your router gives each its right answer: add no route for them.')
    ])
  }
}
