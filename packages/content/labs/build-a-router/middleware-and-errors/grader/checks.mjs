import { runCases, said } from '../../checks-helpers.mjs'

const showRun = (v) =>
  [
    `ran, in order: ${v.log.join(', ') || 'nothing'}`,
    v.hung ? 'handle() had not finished after 1.5 seconds' : `when handle() finished: ${v.atFinish.join(', ') || 'nothing'}`,
    said(v.reply),
    v.seen?.length ? `the error handler got ${v.seen.map((s) => `${s.shown}${s.same ? '' : ' (not the error that was thrown)'}`).join(', then ')}` : ''
  ]
    .filter(Boolean)
    .join('\n')

const HUNG =
  'Your router never answered this request, and handle() had not finished after 1.5 seconds, so the check stopped waiting. Look for a next() whose promise never settles, or a step your router waits for that never finishes.'
const broke = (v, hint) => (v?.hung && !v.reply.answered ? HUNG : v?.threw ? `handle() threw ${v.threw}. ${hint}` : hint)

function kase(name, run, plan, pass, setup, hint, task) {
  return {
    name,
    run,
    args: run === 'chainCase' ? [plan] : [plan, task],
    pass,
    show: showRun,
    setup,
    hint: (v) => broke(v, typeof hint === 'function' ? hint(v) : hint)
  }
}

const logIs = (...names) => (v) => v.log.join() === names.join()
const plainNo = (v) =>
  v.reply.status === 500 && typeof v.reply.json?.error === 'string' && !v.reply.body.includes(v.thrownMessage)
const handled = (...names) => (v) => logIs(...names, 'error handler')(v) && v.seen.length === 1 && v.seen[0].same && v.reply.status === 503

export const checks = {
  use(t) {
    const c = (name, plan, pass, setup, hint) => kase(name, 'chainCase', plan, pass, setup, hint)
    return runCases(t, 'use()', [
      c('Middleware runs first, in order', { middleware: ['next', 'next'], handler: 'answer' }, logIs('m1', 'm2', 'handler'), 'use(m1), use(m2), each calling next(), then GET /orders/1873', 'Each middleware runs in the order it was added, and next() leads to the one after it. After the last one comes the handler.'),
      c('A middleware may wait before next', { middleware: ['asyncNext', 'next'], handler: 'answer' }, (v) => logIs('m1', 'm2', 'handler')(v) && v.atFinish.includes('handler'), 'use(m1) that waits a moment and then calls next(), use(m2), then GET /orders/1873', 'm1 calls next() a moment later, from an async function. The rest of the chain starts when next() is called, and handle() finishes only after it.'),
      c('A middleware that answers ends the request', { middleware: ['next', 'answer', 'next'], handler: 'answer' }, (v) => logIs('m1', 'm2')(v) && v.reply.status === 401 && v.reply.body === 'stopped by m2' && v.reply.ends === 1, 'use(m1), use(m2) that answers 401 without calling next(), use(m3), then GET /orders/1873', 'm2 answered and did not call next(), so nothing after it runs: not m3, not the handler.'),
      c('next() waits for the rest', { middleware: ['around'], handler: 'asyncAnswer' }, (v) => logIs('m1 before', 'handler', 'm1 after')(v) && v.atFinish.length === 3, 'use(m1) that awaits next() and notes when it comes back, an async handler, then GET /orders/1873', (v) => v?.log?.[1] === 'm1 after' ? 'm1 came back from await next() before the handler had finished. next() should return a promise that settles once the rest of the chain has.' : 'next() should return a promise of the rest of the chain, and handle() should wait for the whole chain.'),
      c('handle() waits for an async handler', { middleware: [], handler: 'asyncAnswer' }, (v) => v.atFinish.includes('handler') && v.reply.body === 'handler', 'no middleware, a handler that answers after a moment, then GET /orders/1873', 'The handler is async. handle() should finish once its promise has settled, not before.'),
      c('No middleware without a route', { middleware: ['next'], handler: 'answer', request: ['GET', '/invoices'] }, (v) => v.log.length === 0 && v.reply.status === 404, 'use(m1), a route GET /orders/:id, then GET /invoices', 'Middleware runs only for a request that reaches a route. A 404 is answered before any of it.'),
      c('No middleware for a wrong method', { middleware: ['next'], handler: 'answer', request: ['PUT', '/orders/1873'] }, (v) => v.log.length === 0 && v.reply.status === 405, 'use(m1), a route GET /orders/:id, then PUT /orders/1873', 'Middleware runs only for a request that reaches a route. A 405 is answered before any of it.'),
      c('No middleware for a path that cannot be read', { middleware: ['next'], handler: 'answer', request: ['GET', '/orders/18%E0%A4%A'] }, (v) => v.log.length === 0 && v.reply.status === 400, 'use(m1), a route GET /orders/:id, then GET /orders/18%E0%A4%A, whose %-codes are broken', 'Middleware runs only once the params, query and body are ready. A path that cannot be read is answered 400 before any of it.'),
      {
        name: 'Refuses a middleware that is not a function',
        run: 'useCase',
        pass: (v) => v.threw && v.typeError,
        show: (v) => (v.threw ? `threw ${v.error}` : 'did not throw'),
        setup: "use(router, 'log every request')",
        hint: 'A middleware is a function. Throw a TypeError for anything else, so the mistake shows on the line that made it.'
      }
    ])
  },

  errors(t) {
    const c = (name, plan, pass, setup, hint) => kase(name, 'probedChainCase', plan, pass, setup, hint, 2)
    const once = (v) => (v?.seen?.length > 1 ? 'The error handler ran more than once for one error. Hand each error over once.' : null)
    const notSame = (v) => (v?.seen?.length && !v.seen[0].same ? 'The error handler ran, but not with the error that was thrown. Pass it on as it is.' : null)
    return runCases(t, 'onError()', [
      c('next(error) goes to the error handler', { middleware: ['next', 'nextErr', 'next'], handler: 'answer', onError: 'answer' }, handled('m1', 'm2'), 'use(m1), use(m2) that calls next(error), use(m3), and an error handler, then GET /orders/1873', (v) => once(v) ?? notSame(v) ?? (v?.log?.includes('m3') || v?.log?.includes('handler') ? 'next(error) skips everything left, m3 and the handler included, and goes straight to the error handler.' : 'next(error) should call the error handler with that error, and the error handler answers.')),
      c('A throw in a middleware', { middleware: ['throw', 'next'], handler: 'answer', onError: 'answer' }, handled('m1'), 'use(m1) that throws, use(m2), and an error handler, then GET /orders/1873', (v) => once(v) ?? notSame(v) ?? 'A throw from a middleware is an error like next(error): catch it where you call the middleware, and hand it to the error handler.'),
      c('A throw in the handler', { middleware: ['next'], handler: 'throw', onError: 'answer' }, handled('m1', 'handler'), 'use(m1), a handler that throws, and an error handler, then GET /orders/1873', (v) => once(v) ?? notSame(v) ?? 'A throw from the handler goes to the error handler too.'),
      c('A rejected promise', { middleware: ['reject'], handler: 'answer', onError: 'answer' }, handled('m1'), 'use(m1), an async function that throws after a moment, and an error handler, then GET /orders/1873', (v) => once(v) ?? notSame(v) ?? 'An async function that throws does not throw at the call: it returns a promise that rejects. Wait for it, so the rejection is caught and handed on.'),
      c('A rejected promise in the handler', { middleware: [], handler: 'reject', onError: 'answer' }, handled('handler'), 'an async handler that throws after a moment, and an error handler, then GET /orders/1873', (v) => once(v) ?? notSame(v) ?? 'The handler is async and rejects. Wait for its promise and hand the rejection to the error handler.'),
      c('Without an error handler, a plain 500', { middleware: ['throw'], handler: 'answer' }, (v) => plainNo(v) && !v.log.includes('handler'), "use(m1) that throws new Error('Ink ran out at the second press'), no error handler, then GET /orders/1873", (v) => v?.reply?.status === 500 && v.reply.body?.includes(v.thrownMessage) ? "The answer gives the error's message away. Messages are for the shop's log, not for whoever sent the request: say that something went wrong, in your own words." : 'With no error handler, the router answers 500 itself, with sendJson() and { error }.'),
      c('When the error handler fails, a plain 500', { middleware: ['throw'], handler: 'answer', onError: 'throw' }, (v) => plainNo(v) && v.seen.length === 1, 'use(m1) that throws, and an error handler that throws as well, then GET /orders/1873', 'The error handler broke too. The request still deserves an answer: catch that as well and answer 500 plainly.')
    ])
  },

  stuck(t) {
    const c = (name, plan, pass, setup, hint) => kase(name, 'probedChainCase', plan, pass, setup, hint, 3)
    const names = (v, words) => v.reply.status === 500 && typeof v.reply.json?.error === 'string' && v.reply.json.error.toLowerCase().includes(words.toLowerCase())
    const stuckHint = (words) => (v) =>
      !v?.reply?.answered
        ? `Nothing answered and handle() finished. When a step finishes without answering${words.startsWith('GET') ? '' : ' or calling next()'}, answer 500 yourself.`
        : v.reply.status === 500
          ? `The 500 is right. Its error should name what stopped: ${words}.`
          : `When a step finishes without answering, answer 500 with an error that names it: ${words}.`
    return runCases(t, 'handle()', [
      c('Names a middleware that stops', { middleware: ['next', 'silent'], handler: 'answer' }, (v) => names(v, 'middleware 2') && !v.log.includes('handler'), 'use(m1), use(m2) that returns without answering or calling next(), then GET /orders/1873', stuckHint('middleware 2')),
      c('Names an async middleware that stops', { middleware: ['silentAsync'], handler: 'answer' }, (v) => names(v, 'middleware 1') && v.atFinish.includes('m1'), 'use(m1), an async function that waits a moment and returns without answering or calling next(), then GET /orders/1873', (v) => (v?.reply?.status === 500 && !v.atFinish.includes('m1') ? 'The 500 came before m1 had finished. Wait for the promise a middleware returns before you decide it stopped.' : stuckHint('middleware 1')(v))),
      c('Names a handler that does not answer', { middleware: ['next'], handler: 'silent' }, (v) => names(v, 'GET /orders/:id'), 'use(m1), a handler for GET /orders/:id that returns without answering, then GET /orders/1873', stuckHint('the route, GET /orders/:id')),
      c('A second next() does nothing', { middleware: ['twice'], handler: 'answer' }, (v) => logIs('m1', 'handler')(v) && v.reply.ends === 1, 'use(m1) that calls next() twice, then GET /orders/1873', 'The handler ran twice. The first next() starts the rest; any later call should do nothing.'),
      c('A middleware that answers has not stopped', { middleware: ['answer'], handler: 'answer' }, (v) => v.reply.status === 401 && !v.threw && v.reply.ends === 1, 'use(m1) that answers 401 without calling next(), then GET /orders/1873', 'm1 answered. A step has stopped only when it finished without answering; this one did its job.')
    ])
  }
}
