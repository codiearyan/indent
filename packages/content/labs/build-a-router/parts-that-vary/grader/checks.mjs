import { NEVER, runCases, said } from '../../checks-helpers.mjs'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const ran = (calls) => (calls.length ? calls.map((c) => `${c.route} with req.params ${JSON.stringify(c.params)}`).join(', ') : 'no handler ran')
const showAll = (v) => v.map((x) => `${said(x.reply)}\n  ${ran(x.calls)}`).join('\n')

function matchCase(name, pattern, path, expected, hint) {
  return {
    name,
    run: 'matchCase',
    args: [pattern, path],
    pass: (v) => same(v.value, expected),
    show: (v) => `got ${v.shown}`,
    setup: `matchPath('${pattern}', '${path}')`,
    hint
  }
}

const FITS = 'The path fits the pattern. Return an object with one property per part that varies, named after the part without its colon, holding the part as written in the path.'
const NO_FIT = (why) => `This path does not fit the pattern, so matchPath() should return null. ${why}`

const hung = (v) => v?.find((x) => x.reply.hung || (x.reply.threw && !x.reply.answered))?.reply
const crash = (r, hint) => (r.hung ? NEVER : `handle() threw ${r.threw}. ${hint}`)

export const checks = {
  match(t) {
    return runCases(t, 'matchPath()', [
      matchCase('Pulls out one value', '/orders/:id', '/orders/1873', { id: '1873' }, FITS),
      matchCase('Pulls out two values', '/presses/:press/jobs/:job', '/presses/2/jobs/1876', { press: '2', job: '1876' }, 'Every part that varies gives one value, each under its own name.'),
      matchCase('A value in the middle', '/orders/:id/proof', '/orders/1874/proof', { id: '1874' }, 'A part that varies can sit between fixed parts. The fixed parts after it must still be the same.'),
      matchCase('No parts that vary', '/prices', '/prices', {}, 'A pattern without parts that vary fits only its own path, and gives an empty object: a fit with nothing to pull out, which is not the same as null.'),
      matchCase('A value is one part, not more', '/orders/:id', '/orders/1873/proof', null, NO_FIT('A part that varies stands for one part of the path, never for a slash and what follows it. Count the parts.')),
      matchCase('A shorter path does not fit', '/orders/:id', '/orders', null, NO_FIT('The path has fewer parts than the pattern.')),
      matchCase('A value is never empty', '/orders/:id', '/orders/', null, NO_FIT('Splitting /orders/ on slashes gives an empty last part, and an empty part is not a value.')),
      matchCase('Fixed parts after a value count', '/orders/:id/proof', '/orders/1873/invoice', null, NO_FIT('After a value, the fixed part has to be the same too.')),
      matchCase('Fixed parts match letter for letter', '/orders/:id/proof', '/orders/1873/Proof', null, NO_FIT('Capital letters count in fixed parts: Proof is not proof.')),
      matchCase('Another first part does not fit', '/orders/:id', '/invoices/1873', null, NO_FIT('Every fixed part has to be exactly the same.'))
    ])
  },

  params(t) {
    const kase = (name, routes, requests, pass, setup, hint) => ({
      name,
      run: 'paramsCase',
      args: [routes, requests],
      pass,
      show: showAll,
      setup,
      hint: (v) => {
        const text = typeof hint === 'function' ? hint(v) : hint
        return hung(v) ? crash(hung(v), text) : text
      }
    })
    const got = (v, i = 0) => v[i].calls.length === 1 ? v[i].calls[0].params : undefined
    return runCases(t, 'handle()', [
      kase(
        'The handler gets req.params',
        [['GET', '/orders/:id'], ['GET', '/prices']],
        [['GET', '/orders/1873']],
        (v) => same(got(v), { id: '1873' }),
        'routes GET /orders/:id and GET /prices, then GET /orders/1873',
        (v) => v[0].calls.length ? 'The route ran. Set req.params to the values matchPath() found before you call the handler.' : 'handle() should find a route by matching each pattern with matchPath(), not by comparing the path as text.'
      ),
      kase(
        'Two values reach the handler',
        [['GET', '/presses/:press/jobs/:job']],
        [['GET', '/presses/1/jobs/1875']],
        (v) => same(got(v), { press: '1', job: '1875' }),
        'route GET /presses/:press/jobs/:job, then GET /presses/1/jobs/1875',
        'The handler should get every value of its pattern on req.params.'
      ),
      kase(
        'A route without values gets an empty req.params',
        [['GET', '/prices'], ['GET', '/orders/:id']],
        [['GET', '/prices']],
        (v) => same(got(v), {}),
        'routes GET /prices and GET /orders/:id, then GET /prices',
        'A route with no parts that vary still gets req.params, as an empty object, so a handler can always read it.'
      ),
      kase(
        'Values are decoded',
        [['GET', '/papers/:name']],
        [['GET', '/papers/cotton%20white'], ['GET', '/papers/A5%2FA6']],
        (v) => same(got(v, 0), { name: 'cotton white' }) && same(got(v, 1), { name: 'A5/A6' }),
        'route GET /papers/:name, then GET /papers/cotton%20white and GET /papers/A5%2FA6',
        (v) =>
          v[1].reply.status === 404
            ? 'A %2F inside a value is a slash that belongs to the value. Match the path as it came in, then decode each value on its own.'
            : 'A value may hold %-codes, such as %20 for a space. Decode each value before it goes on req.params.'
      ),
      kase(
        'A value that cannot be decoded is a 400',
        [['GET', '/papers/:name']],
        [['GET', '/papers/linen%E0%A4%A']],
        (v) => v[0].reply.status === 400 && typeof v[0].reply.json?.error === 'string' && v[0].calls.length === 0,
        'route GET /papers/:name, then GET /papers/linen%E0%A4%A, whose %-codes are broken',
        (v) =>
          v[0].calls.length
            ? 'The handler ran with a value nobody can read. Answer 400 instead, and do not call it.'
            : 'Decoding broken %-codes throws a URIError. Catch it and answer 400 with sendJson() and { error }, so the request is refused and the server carries on.'
      ),
      kase(
        'A longer path is still a 404',
        [['GET', '/orders/:id']],
        [['GET', '/orders/1873/proof']],
        (v) => v[0].reply.status === 404 && v[0].calls.length === 0,
        'route GET /orders/:id, then GET /orders/1873/proof',
        'No pattern fits this path, so it is answered 404 as before.'
      ),
      kase(
        'A 405 knows about patterns',
        [['GET', '/orders/:id'], ['GET', '/prices'], ['DELETE', '/orders/:id']],
        [['PUT', '/orders/1874']],
        (v) => v[0].reply.status === 405 && v[0].reply.allow === 'GET, DELETE' && v[0].calls.length === 0,
        'routes GET /orders/:id, GET /prices and DELETE /orders/:id, then PUT /orders/1874',
        'Patterns fit this path, but none for PUT: that is a 405, and allow lists the methods of the routes whose patterns fit.'
      ),
      kase(
        'allow names each method once',
        [['GET', '/orders/:id'], ['GET', '/orders/today'], ['DELETE', '/orders/:id']],
        [['PUT', '/orders/today']],
        (v) => v[0].reply.status === 405 && v[0].reply.allow === 'GET, DELETE' && v[0].calls.length === 0,
        'routes GET /orders/:id, GET /orders/today and DELETE /orders/:id, then PUT /orders/today',
        (v) =>
          v[0].reply.status === 405
            ? 'Two GET routes fit this path, but allow is a list of methods: name each one once, in the order its first route was added.'
            : 'Patterns fit this path, but none for PUT: that is a 405, with an allow header.'
      )
    ])
  },

  wins(t) {
    const kase = (name, routes, requests, expected, setup, hint) => ({
      name,
      run: 'winsCase',
      args: [routes, requests],
      pass: (v) => v.every((x, i) => x.calls.length === 1 && x.calls[0].route === expected[i]),
      show: showAll,
      setup,
      hint: (v) => (hung(v) ? crash(hung(v), hint) : v?.some((x) => x.calls.length > 1) ? 'Only one handler may run for a request, the winner.' : hint)
    })
    return runCases(t, 'handle()', [
      kase(
        'A fixed part beats a value',
        [['GET', '/orders/:id'], ['GET', '/orders/today']],
        [['GET', '/orders/today'], ['GET', '/orders/1873']],
        ['GET /orders/today', 'GET /orders/:id'],
        'routes GET /orders/:id then GET /orders/today, then GET /orders/today and GET /orders/1873',
        'Both routes fit /orders/today. The one with more fixed parts wins, even when it was added later.'
      ),
      kase(
        'The order they were added does not matter',
        [['GET', '/orders/today'], ['GET', '/orders/:id']],
        [['GET', '/orders/today'], ['GET', '/orders/1874']],
        ['GET /orders/today', 'GET /orders/:id'],
        'routes GET /orders/today then GET /orders/:id, then GET /orders/today and GET /orders/1874',
        'The route with more fixed parts wins whichever was added first, and a path only one route fits goes to that one.'
      ),
      kase(
        'More fixed parts win further along',
        [['GET', '/orders/:id/:part'], ['GET', '/orders/:id/proof']],
        [['GET', '/orders/1873/proof'], ['GET', '/orders/1873/invoice']],
        ['GET /orders/:id/proof', 'GET /orders/:id/:part'],
        'routes GET /orders/:id/:part then GET /orders/:id/proof, then GET /orders/1873/proof and GET /orders/1873/invoice',
        'Count the fixed parts of every route that fits. /orders/:id/proof has one more than /orders/:id/:part.'
      ),
      kase(
        'A tie goes to the route added first',
        [['GET', '/:shelf/:slot'], ['GET', '/:kind/:id']],
        [['GET', '/cards/12']],
        ['GET /:shelf/:slot'],
        'routes GET /:shelf/:slot then GET /:kind/:id, then GET /cards/12',
        'Both routes have the same number of fixed parts, so the one added first wins.'
      ),
      kase(
        'Only routes of the method compete',
        [['GET', '/orders/today'], ['POST', '/orders/:id']],
        [['POST', '/orders/today']],
        ['POST /orders/:id'],
        'routes GET /orders/today and POST /orders/:id, then POST /orders/today',
        'Choose among the routes for the request\'s method. GET /orders/today has more fixed parts, but it cannot take a POST, so POST /orders/:id runs.'
      )
    ])
  }
}
