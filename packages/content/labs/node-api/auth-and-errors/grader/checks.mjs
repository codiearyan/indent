import { fleet } from '../starter/src/fleet.js'
import { broken, checkApp, errorCode, isJson, runApp, runProbe, sandbox, show } from '../../shared/checks-lib.mjs'

const tokens = [
  ['tok-staff-1', 'staff'],
  ['tok-viewer-1', 'viewer']
]
const staff = { authorization: 'Bearer tok-staff-1' }
const viewer = { authorization: 'Bearer tok-viewer-1' }
const kestrel = { code: 'TW-09', name: 'Kestrel', type: 'single', hourlyCents: 1900 }
const secret = 'connect ECONNREFUSED 10.4.0.7:5432 user=larchmere password=hunter2'
const leaks = (text) => /ECONNREFUSED|hunter2|10\.4\.0\.7|\bat \S+ \(/.test(text ?? '')
const options = { boats: fleet, tokens }
const goodId = /^[\w.-]{1,64}$/

const unauthorized = (res) =>
  res.status === 401 && errorCode(res) === 'unauthorized' && /^Bearer\b/i.test(res.headers['www-authenticate'] ?? '')

export const checks = {
  async auth(t) {
    const dir = await sandbox(t)
    return checkApp(t, dir, [
      {
        name: 'Reading the fleet needs no token',
        req: { path: '/boats/TW-01' },
        ok: (res) => res.status === 200,
        hint: 'GET routes stay open. Only routes that change data need a token.'
      },
      {
        name: 'POST without a token answers 401',
        req: { method: 'POST', path: '/boats', json: kestrel },
        ok: unauthorized,
        hint: "A write with no Authorization header should answer 401 with code 'unauthorized' and a www-authenticate: Bearer header."
      },
      {
        name: 'An unknown token answers 401',
        req: { method: 'POST', path: '/boats', json: kestrel, headers: { authorization: 'Bearer not-a-real-token' } },
        ok: unauthorized,
        hint: 'A token that is not in the map proves nothing about who is asking. That is 401, not 403.'
      },
      {
        name: 'A header that is not Bearer answers 401',
        req: { method: 'POST', path: '/boats', json: kestrel, headers: { authorization: 'Basic dG9rLXN0YWZmLTE=' } },
        ok: unauthorized,
        hint: "Only headers of the form 'Bearer <token>' count. Anything else is treated like no token."
      },
      {
        name: 'Auth is checked before the body',
        req: { method: 'POST', path: '/boats', body: '{"code": "TW-10",' },
        ok: unauthorized,
        hint: 'Without a token this request should get 401, not a 400 about its JSON. Check the token before reading the body.'
      },
      {
        name: 'A viewer token answers 403',
        req: { method: 'POST', path: '/boats', json: kestrel, headers: viewer },
        ok: (res) => res.status === 403 && errorCode(res) === 'forbidden',
        hint: "A valid token whose role is not staff should answer 403 with code 'forbidden'. We know who they are; they just may not do this."
      },
      {
        name: 'A staff token can create',
        req: { method: 'POST', path: '/boats', json: kestrel, headers: staff },
        ok: (res) => res.status === 201,
        hint: 'With a staff token, POST /boats should work as before.'
      },
      {
        name: 'The word Bearer may be lowercase',
        req: { method: 'PATCH', path: '/boats/TW-09', json: { available: false }, headers: { authorization: 'bearer tok-staff-1' } },
        ok: (res) => res.status === 200,
        hint: 'The scheme name in the Authorization header is not case sensitive.'
      },
      {
        name: 'PATCH is locked too',
        req: { method: 'PATCH', path: '/boats/TW-01', json: { available: false }, headers: viewer },
        ok: (res) => res.status === 403,
        hint: 'PATCH /boats/:code changes data, so it needs a staff token too.'
      },
      {
        name: 'DELETE is locked too',
        req: { method: 'DELETE', path: '/boats/TW-01' },
        ok: unauthorized,
        hint: 'DELETE /boats/:code changes data, so it needs a staff token too.'
      },
      {
        name: 'Nothing was deleted without a token',
        req: { path: '/boats/TW-01' },
        ok: (res) => res.status === 200,
        hint: 'A refused DELETE must not have removed the boat. Check the token first.'
      }
    ], options)
  },

  async 'error-handler'(t) {
    const dir = await sandbox(t)
    const cases = [
      { http: [404, 'not_found', 'No boat with code TW-99'], requestId: 'probe-1' },
      { http: [400, 'validation_failed', 'Some fields are not valid', [{ field: 'name', message: 'is required' }]] },
      { plain: secret, requestId: 'probe-3' }
    ]
    const [p, app] = await Promise.all([
      runProbe(t, dir, 'handleError', cases, cases.map(() => ({}))),
      runApp(t, dir, [{ path: '/boats' }, { path: '/health' }, { path: '/boats/TW-99' }], {
        ...options,
        brokenList: secret,
        captureLog: true
      })
    ])
    if (!p.ok) return broken('handleError can be called', p)
    const [notFound, invalid, crash] = p.value.responses
    const unwritten = [notFound, invalid, crash].find((x) => /Not implemented/.test(x.json?.thrown?.message))
    if (unwritten) {
      return [
        {
          name: 'handleError is implemented',
          passed: false,
          message: `handleError still throws 'Not implemented'. Replace that line with your code.`,
          output: unwritten.json.thrown.message
        }
      ]
    }
    const label = (i) => ({
      label: `handleError(${cases[i].http ? `new HttpError(${cases[i].http.map((x) => JSON.stringify(x)).join(', ')})` : `new Error(${JSON.stringify(cases[i].plain)})`}, req, res, log)`
    })
    const out = [
      {
        name: 'An HttpError answers its own status and code',
        passed: notFound.status === 404 && errorCode(notFound) === 'not_found' && notFound.json?.error?.message === cases[0].http[2] && isJson(notFound),
        message: 'An HttpError should become a JSON response with its status, and its code and message inside error.',
        output: show(label(0), notFound)
      },
      {
        name: 'HttpError details are kept',
        passed: invalid.status === 400 && Array.isArray(invalid.json?.error?.details) && invalid.json.error.details[0]?.field === 'name',
        message: 'The details of a validation error should still reach the client.',
        output: show(label(1), invalid)
      },
      {
        name: 'Any other error answers 500 internal_error',
        passed: crash.status === 500 && errorCode(crash) === 'internal_error' && isJson(crash),
        message: "An error that is not an HttpError is a bug on our side. Answer 500 with code 'internal_error'.",
        output: show(label(2), crash)
      },
      {
        name: 'A 500 does not leak the error',
        passed: crash.status === 500 && !leaks(crash.text),
        message: 'The 500 response shows details of the original error. Clients should get a fixed, general message.',
        output: show(label(2), crash)
      },
      {
        name: 'The real error is logged',
        passed: p.value.log.some((line) => line.includes('ECONNREFUSED')),
        message: 'The team still needs the details. Pass the error to the log function you are given.',
        output: `log calls: ${JSON.stringify(p.value.log)}`
      }
    ]
    if (!app.ok) return [...out, ...broken('The app starts', app)]
    const [boats, health, missing] = app.value.responses
    const appReq = (path) => ({ path })
    out.push(
      {
        name: 'The app sends a crash through handleError',
        passed: !boats.error && boats.status === 500 && errorCode(boats) === 'internal_error' && !leaks(boats.text),
        message: "When a store method throws, GET /boats should answer a 500 that hides the error. Send every error from createApp's catch to handleError.",
        output: show(appReq('/boats (store.list throws)'), boats)
      },
      {
        name: 'The app logs the crash with its log option',
        passed: app.value.log.some((line) => line.includes('ECONNREFUSED')),
        message: 'Pass the log from createApp options to handleError, so the error reaches the team.',
        output: `log calls: ${JSON.stringify(app.value.log)}`
      },
      {
        name: 'The app keeps serving after a crash',
        passed: !health.error && health.status === 200 && !missing.error && missing.status === 404,
        message: 'After a 500, the next requests should be answered as usual.',
        output: `${show(appReq('/health'), health)}\n\n${show(appReq('/boats/TW-99'), missing)}`
      }
    )
    return out
  },

  async 'request-ids'(t) {
    const dir = await sandbox(t)
    const r = await runApp(t, dir, [
      { path: '/health' },
      { path: '/health' },
      { path: '/health', headers: { 'x-request-id': 'booking-page-42' } },
      { path: '/health', headers: { 'x-request-id': 'x'.repeat(100) } },
      { path: '/health', headers: { 'x-request-id': 'id with spaces' } },
      { path: '/canoes' },
      { path: '/boats?limit=0' },
      { path: '/boats/TW-99' }
    ], options)
    if (!r.ok) return broken('The app starts', r)
    const [a, b, given, long, spaced, notFound, badQuery, noBoat] = r.value.responses
    const id = (res) => res?.headers?.['x-request-id']
    const has = (res) => !res.error && typeof id(res) === 'string' && goodId.test(id(res))
    const verdict = (name, passed, message, shown) => ({
      name,
      passed,
      message: passed ? undefined : message,
      output: shown.map(([req, res]) => show(req, res)).join('\n\n')
    })
    const health = { path: '/health' }
    return [
      verdict('Every response has an x-request-id', has(a) && has(b), 'Set an x-request-id header on every response, before routing.', [[health, a]]),
      verdict('Each request gets a new id', has(a) && has(b) && id(a) !== id(b), 'Two requests got the same id. Make a new one for each request.', [[health, a], [health, b]]),
      verdict(
        'A good incoming id is kept',
        id(given) === 'booking-page-42',
        'When the client sends a safe x-request-id, answer with the same one, so both sides can find the request in their logs.',
        [[{ ...health, label: 'GET /health with x-request-id: booking-page-42' }, given]]
      ),
      verdict(
        'A bad incoming id is replaced',
        has(long) && has(spaced) && id(long) !== 'x'.repeat(100) && id(spaced) !== 'id with spaces',
        'An incoming id that is too long or has unsafe characters should be replaced with a new one, not copied into your headers and logs.',
        [[{ label: 'GET /health with a 100 character x-request-id' }, long], [{ label: "GET /health with x-request-id: 'id with spaces'" }, spaced]]
      ),
      verdict('A 404 has an id too', has(notFound), 'Set the header before the router runs, so even unknown paths get one.', [[{ path: '/canoes' }, notFound]]),
      verdict(
        'Error bodies carry the same requestId',
        has(badQuery) && badQuery.json?.requestId === id(badQuery) && has(noBoat) && noBoat.json?.requestId === id(noBoat),
        'Error responses from handleError should include requestId, equal to the x-request-id header of the same response.',
        [[{ path: '/boats?limit=0' }, badQuery], [{ path: '/boats/TW-99' }, noBoat]]
      )
    ]
  }
}
