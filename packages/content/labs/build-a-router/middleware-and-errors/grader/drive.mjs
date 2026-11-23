// Copied into the sandbox as .grader/drive.mjs. Drives the learner's router with middleware,
// handlers and errors of its own. Every case makes a fresh router.
import * as lib from '../src/router.js'
import { attempt, earlier, fakeRequest, fakeResponse, needs, shown, wait, within } from './helpers.mjs'

// What each kind of middleware does; `name` is how it shows in the log.
const STEP = {
  next: (log, name) => (req, res, next) => {
    log.push(name)
    next()
  },
  asyncNext: (log, name) => async (req, res, next) => {
    await wait(20)
    log.push(name)
    next()
  },
  answer: (log, name) => (req, res) => {
    log.push(name)
    res.statusCode = 401
    res.end(`stopped by ${name}`)
  },
  around: (log, name) => async (req, res, next) => {
    log.push(`${name} before`)
    await next()
    log.push(`${name} after`)
  },
  nextErr: (log, name, thrown) => (req, res, next) => {
    log.push(name)
    next(thrown)
  },
  throw: (log, name, thrown) => () => {
    log.push(name)
    throw thrown
  },
  reject: (log, name, thrown) => async () => {
    await wait(10)
    log.push(name)
    throw thrown
  },
  silent: (log, name) => () => {
    log.push(name)
  },
  silentAsync: (log, name) => async () => {
    await wait(10)
    log.push(name)
  },
  twice: (log, name) => (req, res, next) => {
    log.push(name)
    next()
    next()
  }
}

const HANDLER = {
  answer: (log) => (req, res) => {
    log.push('handler')
    res.end('handler')
  },
  asyncAnswer: (log) => async (req, res) => {
    await wait(30)
    log.push('handler')
    res.end('handler')
  },
  throw: (log, thrown) => () => {
    log.push('handler')
    throw thrown
  },
  reject: (log, thrown) => async () => {
    await wait(10)
    log.push('handler')
    throw thrown
  },
  silent: (log) => () => {
    log.push('handler')
  }
}

/**
 * plan: { middleware: [kind...], handler: kind, onError: 'answer' | 'throw' | undefined,
 * request: [method, url] }. One error object is thrown wherever the plan throws, so the check can
 * tell whether the error handler got that very one.
 */
export async function chainCase(plan, { usesUse = true, usesOnError = false } = {}) {
  const log = []
  const thrown = new Error('Ink ran out at the second press')
  const seen = []
  const router = needs('createRouter() and addRoute() do not work any more.', () => lib.createRouter())
  const add = () => {
    plan.middleware.forEach((kind, i) => lib.use(router, STEP[kind](log, `m${i + 1}`, thrown)))
  }
  if (usesUse) add()
  else needs('This task needs use() from task 1, which does not work yet.', add)
  if (plan.onError) {
    const set = () =>
      lib.onError(router, (error, req, res) => {
        seen.push({ same: error === thrown, shown: shown(error) })
        log.push('error handler')
        if (plan.onError === 'throw') throw new Error('The error handler broke too')
        res.statusCode = 503
        res.end('handled')
      })
    if (usesOnError) set()
    else needs('This task needs onError() from task 2, which does not work yet.', set)
  }
  lib.addRoute(router, 'GET', '/orders/:id', HANDLER[plan.handler](log, thrown))
  const [method, url] = plan.request ?? ['GET', '/orders/1873']
  const req = fakeRequest(method, url)
  const res = fakeResponse()
  let threw
  const run = (async () => lib.handle(router, req, res))().catch((error) => {
    threw = shown(error)
  })
  const outcome = await within(1500, run)
  const atFinish = [...log]
  await wait(60)
  const json = (() => {
    try {
      return JSON.parse(res.body)
    } catch {
      return undefined
    }
  })()
  return {
    log,
    atFinish,
    hung: Boolean(outcome.hung),
    threw,
    seen,
    reply: { request: `${method} ${url}`, answered: res.writableEnded, status: res.writableEnded ? res.statusCode : undefined, body: res.body, json, ends: res.ends, hung: Boolean(outcome.hung) && !res.writableEnded, threw },
    thrownMessage: thrown.message
  }
}

export function useCase() {
  const router = lib.createRouter()
  return attempt(() => lib.use(router, 'log every request'))
}

// Later tasks first make sure middleware runs, then say so plainly when it does not.
export async function probedChainCase(plan, task) {
  const probe = await chainCase({ middleware: ['next'], handler: 'answer' }, { usesUse: false })
  if (probe.log.join() !== 'm1,handler') {
    earlier('This task needs task 1 first: a middleware that calls next() does not lead to the handler yet.')
  }
  if (task === 3) {
    const p = await chainCase({ middleware: ['nextErr'], handler: 'answer', onError: 'answer' }, { usesUse: false })
    if (!p.seen.length) earlier('This task needs task 2 first: next(error) does not reach the error handler yet.')
  }
  return chainCase(plan, { usesUse: false, usesOnError: task === 2 })
}
