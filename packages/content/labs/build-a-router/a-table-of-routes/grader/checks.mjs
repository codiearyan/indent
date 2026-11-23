import { NEVER, runCases, said } from '../../checks-helpers.mjs'

const ran = (calls) => `handlers that ran: ${calls.length ? calls.join(', ') : 'none'}`
const why = (reply, otherwise) =>
  reply?.hung ? NEVER : reply?.threw && !reply.answered ? `handle() threw ${reply.threw}. ${otherwise}` : otherwise
const showAdd = (v) => (v.threw ? `threw ${v.error}` : 'did not throw')

// A plain answer: the status, JSON with an error that names the method and the path, and no handler run.
const plainNo = (status) => (v) =>
  v.reply.status === status &&
  typeof v.reply.json?.error === 'string' &&
  v.reply.json.error.includes(v.method) &&
  v.reply.json.error.includes(v.url) &&
  v.calls.length === 0

function noHint(v, status, otherwise) {
  const r = v?.reply
  if (!r || r.hung || (r.threw && !r.answered)) return why(r, otherwise)
  if (v.calls.length) return `A handler ran, but no route has exactly this method and path. ${otherwise}`
  if (!r.answered) return `handle() finished without answering. Nothing called res.end(), through sendJson() or otherwise.`
  if (r.status !== status) return `The answer was ${r.status}. ${otherwise}`
  if (typeof r.json?.error !== 'string') return 'The status is right. The body should be JSON with an error property that is a string: sendJson() writes JSON for you.'
  return `The status is right, but the error should say which request it was about: it names the method (${v.method}) and the path (${v.url}).`
}

export const checks = {
  table(t) {
    return runCases(t, 'createRouter(), addRoute() or handle()', [
      {
        name: 'Calls the handler of the matching route',
        run: 'matchCase',
        args: ['one'],
        pass: (v) => v.calls.join() === 'GET /orders' && v.same,
        show: (v) => `${ran(v.calls)}${v.calls.length === 1 && !v.same ? ', but not with the request and response that came in' : ''}\n${said(v.reply)}`,
        setup: 'routes GET /prices, GET /orders and GET /orders/today, then a request for GET /orders',
        hint: (v) =>
          v?.calls.length === 1 && v.calls[0] === 'GET /orders'
            ? 'The right handler ran. Pass it the very req and res that handle() was given.'
            : why(v?.reply, 'handle() should call the one handler whose route has the same method and exactly the same path as the request.')
      },
      {
        name: 'Each method has its own handler',
        run: 'matchCase',
        args: ['methods'],
        pass: (v) => v.afterPost.join() === 'POST /orders' && v.calls.join() === 'POST /orders,GET /orders',
        show: (v) => `after POST /orders, ${ran(v.afterPost)}\nafter GET /orders as well, ${ran(v.calls)}`,
        setup: 'routes GET /orders and POST /orders, then a POST /orders and a GET /orders',
        hint: (v) =>
          v?.afterPost?.[0] === 'GET /orders'
            ? 'A POST went to the GET handler. A route is a method and a path together: compare both.'
            : why(v?.replies?.[0], 'Each request should reach the route with its own method and path, and only that one.')
      },
      {
        name: 'Two routers keep their own routes',
        run: 'matchCase',
        args: ['separate'],
        pass: (v) => v.aCalls.join() === 'GET /prices' && v.bCalls.length === 0,
        show: (v) => `router A: ${ran(v.aCalls)}\nrouter B: ${ran(v.bCalls)}`,
        setup: 'router A has GET /prices, router B has GET /orders; GET /prices sent to B, GET /orders to A, then GET /prices to A',
        hint: (v) =>
          v?.bCalls?.length || (v?.aCalls?.length ?? 0) > 1
            ? "One router answered with the other's route. Keep each router's routes inside the router that createRouter() returns, not in one list for the whole file."
            : why(v?.replies?.[2], "Router A should answer GET /prices with its own route.")
      },
      {
        name: 'Refuses a path without a slash',
        run: 'addCase',
        args: ['noSlash'],
        pass: (v) => v.threw && v.typeError,
        show: showAdd,
        setup: "addRoute(router, 'GET', 'orders', handler)",
        hint: 'A path always starts with /. Throw a TypeError for one that does not, so the mistake shows on the line that made it.'
      },
      {
        name: 'Refuses a path that is not text',
        run: 'addCase',
        args: ['notString'],
        pass: (v) => v.threw && v.typeError,
        show: showAdd,
        setup: "addRoute(router, 'GET', 42, handler)",
        hint: 'Only a string can be a path. Make sure it is one before you look at its first character, and throw a TypeError when it is not.'
      },
      {
        name: 'Refuses a handler that is not a function',
        run: 'addCase',
        args: ['notFn'],
        pass: (v) => v.threw && v.typeError,
        show: showAdd,
        setup: "addRoute(router, 'GET', '/orders', 'list orders')",
        hint: 'A route needs a function to call. Throw a TypeError when handler is not one.'
      },
      {
        name: 'Refuses the same route twice',
        run: 'addCase',
        args: ['twice'],
        pass: (v) => !v.first.threw && v.second.threw && v.reply.body === 'first',
        show: (v) => `first addRoute: ${showAdd(v.first)}\nsecond addRoute: ${showAdd(v.second)}\n${said(v.reply)}`,
        setup: "addRoute(router, 'GET', '/orders', first), then the same method and path again with another handler, then GET /orders",
        hint: (v) =>
          v?.first?.threw
            ? `The first route was refused: ${v.first.error}.`
            : !v?.second?.threw
              ? 'Two handlers for one method and path is a mistake, because only one can answer. Throw an Error on the second, and keep the first.'
              : 'The second route was refused, so the first should still answer.'
      }
    ])
  },

  missing(t) {
    const kase = (name, kind, setup, extra) => ({
      name,
      run: 'missingCase',
      args: [kind],
      pass: plainNo(404),
      show: (v) => `${ran(v.calls)}\n${said(v.reply)}`,
      setup,
      hint: (v) => noHint(v, 404, extra)
    })
    return runCases(t, 'handle()', [
      kase('An unknown path is a 404', 'unknown', 'route GET /prices, then GET /invoices', 'A path with no route at all is answered 404, with sendJson().'),
      kase('A 404 names the request', 'post', 'route GET /prices, then POST /stock', 'A path with no route at all is answered 404, with sendJson().'),
      kase('A longer path is not the same path', 'prefix', 'routes GET /orders and GET /prices, then GET /orders/1873', 'A path matches a route only when it is exactly the same, not when it starts with it.'),
      kase('A shorter path is not the same path', 'longer', 'routes GET /orders/today and GET /prices, then GET /orders', 'A path matches a route only when it is exactly the same, not when one is part of the other.'),
      kase('Paths are matched letter for letter', 'case', 'routes GET /orders/today and GET /prices, then GET /Orders/Today', 'Capital letters count: /Orders/Today is not the path /orders/today.'),
      kase('A router with no routes says so', 'empty', 'no routes at all, then GET /', 'Even with no routes, every request gets an answer.')
    ])
  },

  methods(t) {
    const kase = (name, kind, setup, allow) => ({
      name,
      run: 'methodCase',
      args: [kind],
      pass: (v) => plainNo(405)(v) && v.reply.allow === allow,
      show: (v) => `${ran(v.calls)}\n${said(v.reply)}`,
      setup,
      hint: (v) => {
        const r = v?.reply
        if (r?.status === 405 && plainNo(405)(v) && r.allow !== allow) {
          if (r.allow === undefined && /headers after they are sent/.test(r.threw ?? '')) {
            return 'The allow header was set after the answer had ended, and that throws. Headers go out before the body: set allow first, then call sendJson().'
          }
          return r.allow === undefined
            ? 'The 405 is right. Add an allow header that lists the methods this path takes.'
            : `The allow header should list every method this path takes, and only those, in the order their routes were added, separated by a comma and a space.`
        }
        if (r?.status === 404 && !v.calls.length) return 'The path has routes, just not for this method. That is a 405, not a 404.'
        return noHint(v, 405, 'A path that has routes, but none for this method, is answered 405.')
      }
    })
    return runCases(t, 'handle()', [
      kase('The wrong method is a 405', 'two', 'routes GET /orders and POST /orders, then DELETE /orders', 'GET, POST'),
      kase('allow keeps the order routes were added', 'order', 'routes POST /prices then GET /prices, then PUT /prices', 'POST, GET'),
      kase('A path with one method', 'one', 'route GET /orders/today, then POST /orders/today', 'GET'),
      kase('allow lists this path only', 'others', 'routes GET /orders, DELETE /prices and POST /orders, then PATCH /orders', 'GET, POST')
    ])
  }
}
