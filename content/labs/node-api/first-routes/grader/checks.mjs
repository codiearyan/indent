import { isDeepStrictEqual } from 'node:util'
import { fleet } from '../starter/src/fleet.js'
import { broken, checkApp, errorCode, isJson, runProbe, sandbox, show } from '../../shared/checks-lib.mjs'

const jsonType = (res) => /^application\/json;\s*charset=utf-8$/i.test(res.headers['content-type'] ?? '')

export const checks = {
  async json(t) {
    const dir = await sandbox(t)
    const cases = [
      { status: 200, body: { status: 'ok' } },
      { status: 201, body: [1, 2, 3] },
      { status: 404, body: { error: { code: 'not_found', message: 'Nothing here' } } },
      { status: 200, body: { name: 'Søren on the jetty, 3 café au lait' } }
    ]
    const r = await runProbe(t, dir, 'sendJson', cases, cases.map(() => ({ path: '' })))
    if (!r.ok) return broken('sendJson can be called', r)
    const res = r.value.responses
    const unwritten = res.find((x) => /Not implemented/.test(x.json?.thrown?.message))
    if (unwritten) {
      return [
        {
          name: 'sendJson is implemented',
          passed: false,
          message: `sendJson still throws 'Not implemented'. Replace that line with your code.`,
          output: unwritten.json.thrown.message
        }
      ]
    }
    const call = (i) => `sendJson(res, ${cases[i].status}, ${JSON.stringify(cases[i].body)})`
    const verdict = (name, i, passed, message) => {
      const thrown = res[i].json?.thrown
      return {
        name,
        passed,
        message: passed ? undefined : thrown ? `sendJson threw an error. ${message}` : message,
        output: thrown ? `${call(i)}\nthrew ${thrown.name}: ${thrown.message}` : show({ label: call(i) }, res[i])
      }
    }
    const ok = (i) => !res[i].error && !res[i].json?.thrown
    return [
      verdict(
        'Sends the status and the body as JSON',
        0,
        ok(0) && res[0].status === 200 && isDeepStrictEqual(res[0].json, cases[0].body),
        'The client should receive status 200 and exactly the object that was passed in, as JSON text.'
      ),
      verdict(
        'Uses the status it is given',
        1,
        ok(1) && res[1].status === 201 && ok(2) && res[2].status === 404,
        'Calling sendJson with 201 or 404 should send that status, not a fixed one.'
      ),
      verdict(
        'Says the body is JSON in UTF-8',
        0,
        ok(0) && jsonType(res[0]),
        "Look at the content-type header. Clients need to know the body is JSON and how its text is encoded."
      ),
      verdict(
        'content-length counts bytes, not characters',
        3,
        ok(3) &&
          isDeepStrictEqual(res[3].json, cases[3].body) &&
          Number(res[3].headers['content-length']) === Buffer.byteLength(res[3].text),
        'A body with letters like ø and é must arrive whole, with content-length equal to its size in bytes. A string length counts characters.'
      )
    ]
  },

  async routes(t) {
    const dir = await sandbox(t)
    return checkApp(t, dir, [
      {
        name: 'GET /health answers 200 { status: "ok" }',
        req: { path: '/health' },
        ok: (res) => res.status === 200 && isDeepStrictEqual(res.json, { status: 'ok' }),
        hint: 'GET /health should answer 200 with a small JSON object saying the status is ok.'
      },
      {
        name: 'GET /health is sent as JSON',
        req: { path: '/health' },
        ok: isJson,
        hint: 'Use sendJson for every response so the content-type is right.'
      },
      {
        name: 'GET /boats answers 200 with the whole fleet',
        req: { path: '/boats' },
        ok: (res) => res.status === 200 && isDeepStrictEqual(res.json, fleet),
        hint: 'GET /boats should answer 200 with the fleet array from fleet.js, unchanged.'
      },
      {
        name: 'A query string does not change the route',
        req: { path: '/boats?available=true' },
        ok: (res) => res.status === 200 && isDeepStrictEqual(res.json, fleet),
        hint: 'req.url includes the query string. Match routes on the path only.'
      }
    ])
  },

  async 'not-found'(t) {
    const dir = await sandbox(t)
    return checkApp(t, dir, [
      {
        name: 'An unknown path answers 404 not_found',
        req: { path: '/canoes' },
        ok: (res) => res.status === 404 && errorCode(res) === 'not_found' && isJson(res),
        hint: "A path with no route should answer 404 with { error: { code: 'not_found', message } } as JSON."
      },
      {
        name: 'The 404 error has a message',
        req: { path: '/boats/TW-01' },
        ok: (res) => res.status === 404 && typeof res.json?.error?.message === 'string' && res.json.error.message.length > 0,
        hint: 'The error object should carry a short message a developer can read.'
      },
      {
        name: 'A wrong method answers 405 method_not_allowed',
        req: { method: 'POST', path: '/health' },
        ok: (res) => res.status === 405 && errorCode(res) === 'method_not_allowed' && isJson(res),
        hint: 'The path /health exists but not for POST. That is a different answer from 404.'
      },
      {
        name: 'The 405 lists the allowed methods',
        req: { method: 'DELETE', path: '/boats' },
        ok: (res) => res.status === 405 && /\bGET\b/.test(res.headers.allow ?? ''),
        hint: 'A 405 response should include an allow header naming the methods the path does accept.'
      },
      {
        name: 'Known routes still work',
        req: { path: '/health' },
        ok: (res) => res.status === 200,
        hint: 'GET /health should still answer 200 after your 404 and 405 handling.'
      }
    ])
  }
}
