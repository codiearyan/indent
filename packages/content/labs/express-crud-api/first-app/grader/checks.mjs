import { checkApp, errorCode, hasMessage, isJson, same, seed } from '../../shared/checks-lib.mjs'

export const checks = {
  async health(t) {
    return checkApp(
      t,
      [
        {
          name: 'GET /health answers 200 { status: "ok" }',
          req: { path: '/health' },
          ok: (res) => res.status === 200 && same(res.json, { status: 'ok' }),
          hint: 'GET /health should answer 200 with a small JSON object saying the status is ok.'
        },
        {
          name: 'GET /health is sent as JSON',
          req: { path: '/health' },
          ok: (res) => res.status === 200 && isJson(res),
          hint: 'Answer with res.json() so the content-type says the body is JSON.'
        }
      ],
      { workshops: seed }
    )
  },

  async list(t) {
    return checkApp(
      t,
      [
        {
          name: 'GET /workshops answers 200 with every workshop',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && isJson(res) && same(res.json, seed),
          hint: 'GET /workshops should answer 200 with what the store lists, unchanged. Use the store createApp is given, not the list in workshops.js.'
        },
        {
          name: 'A query string reaches the same route',
          req: { path: '/workshops?day=mon' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'GET /workshops with a query string should still answer with the whole list.'
        },
        {
          name: 'GET /health still works',
          req: { path: '/health' },
          ok: (res) => res.status === 200,
          hint: 'Adding a route should not change the health check.'
        }
      ],
      { workshops: seed }
    )
  },

  async 'not-found'(t) {
    return checkApp(
      t,
      [
        {
          name: 'An unknown path answers 404 not_found as JSON',
          req: { path: '/kilns' },
          ok: (res) => res.status === 404 && isJson(res) && errorCode(res) === 'not_found',
          hint: "A path with no route should answer 404 with { error: { code: 'not_found', message } } as JSON, not the HTML page Express sends by itself."
        },
        {
          name: 'The error has a message',
          req: { path: '/workshops/11/students' },
          ok: (res) => res.status === 404 && hasMessage(res),
          hint: 'The error object should carry a short message a developer can read.'
        },
        {
          name: 'A method with no route answers 404 too',
          req: { method: 'POST', path: '/health' },
          ok: (res) => res.status === 404 && isJson(res) && errorCode(res) === 'not_found',
          hint: 'POST /health has no route either. It should get the same JSON 404.'
        },
        {
          name: 'Known routes still answer',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'The routes you wrote should still answer. Think about where in createApp the catch-all goes.'
        }
      ],
      { workshops: seed }
    )
  }
}
