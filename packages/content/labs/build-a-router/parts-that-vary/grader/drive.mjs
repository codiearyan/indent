// Copied into the sandbox as .grader/drive.mjs. Drives the learner's router with patterns and
// requests of its own. Every case makes a fresh router.
import * as lib from '../src/router.js'
import { earlier, needs, send, shown } from './helpers.mjs'

export function matchCase(pattern, path) {
  const value = lib.matchPath(pattern, path)
  return { value: value === undefined ? 'undefined' : value, shown: shown(value) }
}

// A router with the given routes; each handler notes its route and the params it was given.
function build(routes) {
  const calls = []
  const router = needs('createRouter() and addRoute() do not work any more.', () => {
    const r = lib.createRouter()
    routes.forEach(([method, path], i) => {
      lib.addRoute(r, method, path, (req, res) => {
        calls.push({ route: `${method} ${path}`, at: i, params: req.params === undefined ? 'undefined' : req.params })
        res.end(`${method} ${path}`)
      })
    })
    return r
  })
  return { router, calls }
}

function needsMatch() {
  const got = needs('This task needs matchPath() from task 1, which does not work yet.', () =>
    lib.matchPath('/shelves/:shelf', '/shelves/b')
  )
  if (got?.shelf !== 'b' || lib.matchPath('/shelves/:shelf', '/drawers/b') !== null) {
    earlier('This task needs matchPath() from task 1, which does not give the right values yet.')
  }
}

// Sends each request to a fresh router with `routes`, and notes what each one did.
async function each(routes, requests) {
  const out = []
  for (const [method, url] of requests) {
    const { router, calls } = build(routes)
    const { reply } = await send(lib.handle, router, method, url)
    out.push({ calls, reply })
  }
  return out
}

export async function paramsCase(routes, requests) {
  needsMatch()
  return each(routes, requests)
}

export async function winsCase(routes, requests) {
  needsMatch()
  const probe = await each([['GET', '/shelves/:shelf']], [['GET', '/shelves/b']])
  if (probe[0].calls[0]?.params?.shelf !== 'b') {
    earlier("This task needs task 2 first: handle() does not give a pattern's handler its req.params yet.")
  }
  return each(routes, requests)
}
