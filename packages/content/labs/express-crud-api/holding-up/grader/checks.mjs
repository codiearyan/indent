import {
  broken,
  checkApp,
  checkRouter,
  created,
  errorCode,
  hasMessage,
  isJson,
  same,
  sandbox,
  seed
} from '../../shared/checks-lib.mjs'

const [planters, raku, coil] = seed
const bowls = { title: 'Throwing bowls', day: 'tue', seats: 6, priceCents: 4400 }
const staffKey = 'check-key-7'
const staff = { 'x-staff-key': staffKey }
const secret = 'workshop file locked at /srv/kilnworth/workshops.db'
const htmlPage = (res) => /text\/html/i.test(res.headers?.['content-type'] ?? '')
const neverRan = (hint) => (res) => {
  if (!htmlPage(res)) return hint
  if (/Not implemented/.test(res.text)) {
    return `handleErrors still throws 'Not implemented'. Replace that line with your code.`
  }
  return 'Express answered with its own HTML error page, so your error handler never ran. Look at how Express tells an error handler from other middleware, and where yours is registered.'
}

export const checks = {
  async router(t) {
    const mounted = await checkRouter(
      t,
      [
        {
          name: 'The router lists workshops at its own root',
          req: { path: '/classes' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: "Mounted at /classes, GET /classes should list every workshop. Write the router's paths from where it is mounted, not with /workshops in them."
        },
        {
          name: 'The router keeps its filters',
          req: { path: '/classes?day=mon' },
          ok: (res) => res.status === 200 && same(res.json, [planters, coil]),
          hint: 'The day and maxPriceCents filters should move with the list route.'
        },
        {
          name: 'The router reads one workshop',
          req: { path: '/classes/12' },
          ok: (res) => res.status === 200 && same(res.json, raku),
          hint: 'GET /classes/12 should answer the workshop with id 12.'
        },
        {
          name: 'The router says 404 for an unknown id',
          req: { path: '/classes/99' },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: "An unknown id should still answer 404 with code 'not_found'."
        },
        {
          name: 'The router creates',
          req: { method: 'POST', path: '/classes', json: bowls },
          ok: (res) => res.status === 201 && same(res.json, { ...bowls, id: 16 }),
          hint: "POST to the router's root should create a workshop and answer 201, as before."
        },
        {
          name: 'The location follows where the router is mounted',
          req: { method: 'POST', path: '/classes', json: { ...bowls, title: 'Throwing jugs' } },
          ok: (res) => created(res, { ...bowls, title: 'Throwing jugs' }, '/classes'),
          hint: 'Mounted at /classes, a new workshop lives under /classes, and its location should say so. The router cannot know its prefix ahead of time, but every request it gets carries it.'
        },
        {
          name: 'The router refuses a bad workshop',
          req: { method: 'POST', path: '/classes', json: { ...bowls, seats: 0 } },
          ok: (res) => res.status === 400 && errorCode(res) === 'validation_failed',
          hint: 'POST should still check the body with validateWorkshop.'
        },
        {
          name: 'The router replaces',
          req: { method: 'PUT', path: '/classes/11', json: { ...bowls, day: 'mon' } },
          ok: (res) => res.status === 200 && same(res.json, { ...bowls, day: 'mon', id: 11 }),
          hint: 'PUT /classes/11 should replace the workshop and answer 200, as before.'
        },
        {
          name: 'The router changes part of a workshop',
          req: { method: 'PATCH', path: '/classes/12', json: { seats: 4 } },
          ok: (res) => res.status === 200 && same(res.json, { ...raku, seats: 4 }),
          hint: 'PATCH /classes/12 should change only the fields sent and answer 200, as before.'
        },
        {
          name: 'The router removes',
          req: { method: 'DELETE', path: '/classes/15' },
          ok: (res) => res.status === 204 && res.text === '',
          hint: 'DELETE /classes/15 should answer 204 with no body, as before.'
        }
      ],
      { workshops: seed, mount: '/classes' }
    )
    const app = await checkApp(
      t,
      [
        {
          name: 'The app still answers at /workshops',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 200 && same(res.json, raku),
          hint: 'Mount the router at /workshops in createApp, so the app answers as it did before.'
        },
        {
          name: 'A new workshop still points at /workshops',
          req: { method: 'POST', path: '/workshops', json: bowls, headers: staff },
          ok: (res) => res.status === 201 && res.headers.location === '/workshops/16',
          hint: 'The location header should name the path the workshop really lives at in the app. A router knows where it was mounted.'
        },
        {
          name: 'The health check still answers',
          req: { path: '/health' },
          ok: (res) => res.status === 200 && same(res.json, { status: 'ok' }),
          hint: 'GET /health should stay in app.js and still answer.'
        }
      ],
      { workshops: seed, staffKey }
    )
    return [...mounted, ...app]
  },

  async 'staff-only'(t) {
    return checkApp(
      t,
      [
        {
          name: 'Anyone can list workshops',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'GET requests should go through without a key.'
        },
        {
          name: 'Anyone can read one workshop',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 200 && same(res.json, raku),
          hint: 'GET requests should go through without a key.'
        },
        {
          name: 'A POST without a key answers 401',
          req: { method: 'POST', path: '/workshops', json: bowls },
          ok: (res) =>
            res.status === 401 &&
            isJson(res) &&
            errorCode(res) === 'unauthorized' &&
            hasMessage(res),
          hint: "A change without an x-staff-key header should answer 401 with { error: { code: 'unauthorized', message } }."
        },
        {
          name: 'A wrong key answers 401',
          req: {
            method: 'POST',
            path: '/workshops',
            json: bowls,
            headers: { 'x-staff-key': 'guess' }
          },
          ok: (res) => res.status === 401 && errorCode(res) === 'unauthorized',
          hint: 'Only the exact key lets a change through.'
        },
        {
          name: 'A DELETE without a key answers 401',
          req: { method: 'DELETE', path: '/workshops/11' },
          ok: (res) => res.status === 401 && errorCode(res) === 'unauthorized',
          hint: 'Every method that changes something needs the key, not only POST.'
        },
        {
          name: 'Refused changes changed nothing',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'A refused request must stop before the route runs. Look at what your middleware does after it has answered.'
        },
        {
          name: 'The right key lets a POST through',
          req: { method: 'POST', path: '/workshops', json: bowls, headers: staff },
          ok: (res) => created(res, bowls),
          hint: (res) =>
            res.status === 401
              ? 'This request had the right key in its x-staff-key header and still got 401. Look at how the middleware reads that header: what does it get back?'
              : 'With the right key the request should reach the route and create the workshop, as before.'
        },
        {
          name: 'The right key lets a PATCH through',
          req: { method: 'PATCH', path: '/workshops/12', json: { seats: 4 }, headers: staff },
          ok: (res) => res.status === 200 && same(res.json, { ...raku, seats: 4 }),
          hint: 'With the right key every change should reach its route.'
        },
        {
          name: 'A path with no route still answers 404',
          req: { method: 'POST', path: '/kilns', json: bowls },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: 'The key guards the workshops, not the whole app. A request for a path the app does not serve should still get the JSON 404. Look at where the guard is mounted.'
        }
      ],
      { workshops: seed, staffKey }
    )
  },

  async errors(t) {
    const answers = await checkApp(
      t,
      [
        {
          name: 'A thrown error answers 500 internal as JSON',
          req: { path: '/workshops' },
          may500: true,
          ok: (res) =>
            res.status === 500 && isJson(res) && errorCode(res) === 'internal' && hasMessage(res),
          hint: neverRan(
            "When a route throws, the answer should be 500 with { error: { code: 'internal', message } } as JSON, from your error handler."
          )
        },
        {
          name: 'The 500 leaks nothing',
          req: { path: '/workshops?day=mon' },
          may500: true,
          ok: (res) =>
            res.status === 500 &&
            !res.text.includes('locked') &&
            !res.text.includes('/srv/') &&
            !/\bat\s+\S+\s*\(/.test(res.text),
          hint: neverRan(
            'The client should not see the error message, a file path or a stack trace. Log those, and send a plain sentence.'
          )
        },
        {
          name: 'Broken JSON answers 400 invalid_json',
          may500: true,
          req: {
            method: 'POST',
            path: '/workshops',
            body: '{"title": "Throwing bowls",',
            headers: staff
          },
          ok: (res) =>
            res.status === 400 &&
            isJson(res) &&
            errorCode(res) === 'invalid_json' &&
            hasMessage(res),
          hint: neverRan(
            "A body that is not valid JSON should answer 400 with { error: { code: 'invalid_json', message } }. Look at what express.json() puts on the error it passes on."
          )
        },
        {
          name: 'A good request still works',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 200 && same(res.json, raku),
          hint: 'Requests that do not fail should answer as before.'
        },
        {
          name: 'An unknown path still answers 404',
          req: { path: '/kilns' },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: 'The JSON 404 for unknown paths should stay. An error handler is not a catch-all route.'
        },
        {
          name: 'A good workshop is still created',
          req: { method: 'POST', path: '/workshops', json: bowls, headers: staff },
          ok: (res) => created(res, bowls),
          hint: 'A valid POST should still answer 201.'
        }
      ],
      { workshops: seed, staffKey, brokenList: secret },
      ({ logged }) => {
        const passed = logged.some((line) => line.includes(secret))
        return [
          {
            name: 'The error is logged for you',
            passed,
            message: passed
              ? undefined
              : 'The client gets a plain sentence, so the error itself should be logged where you can read it, the way the task says. Nothing with the error in it was logged.',
            output: logged.length
              ? `console.error got:\n${logged.join('\n').slice(0, 600)}`
              : 'Nothing was logged with console.error.'
          }
        ]
      }
    )
    return [...answers, ...(await afterAnswer(t))]
  }
}

async function afterAnswer(t) {
  const r = await t.call(await sandbox(t), '.grader/harness.mjs', 'lateError')
  if (!r.ok) return broken('handleErrors can be called', r)
  const { reached } = r.value
  if (reached && /Not implemented/.test(reached)) return broken('handleErrors is written', { error: reached })
  const passed = reached === 'same'
  return [
    {
      name: 'An error after the answer started is passed on',
      passed,
      message: passed
        ? undefined
        : reached
          ? 'The answer had already started when this error came, and your handler tried to send another one. Look at how a handler can tell that an answer has begun, and hand the error on instead.'
          : 'The answer had already started when this error came, and your handler kept the error to itself. Hand it on to Express, which knows how to close a half-sent answer.',
      output: `A route sent part of its answer, then passed on an error.\n${
        reached === 'same'
          ? 'The same error reached Express after your handler.'
          : reached
            ? `Express got another error instead: ${reached}`
            : 'No error reached Express after your handler.'
      }`
    }
  ]
}
