import { checkApp, errorCode, hasMessage, isJson, same, seed } from '../../shared/checks-lib.mjs'

const [planters, raku, coil] = seed
const ids = (res) => (Array.isArray(res.json) ? res.json.map((w) => w.id) : undefined)

export const checks = {
  async one(t) {
    return checkApp(
      t,
      [
        {
          name: 'GET /workshops/:id answers 200 with that workshop',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 200 && isJson(res) && same(res.json, raku),
          hint: 'GET /workshops/12 should answer 200 with the workshop whose id is 12, as the store has it. Route parameters arrive as text.'
        },
        {
          name: 'Another id finds another workshop',
          req: { path: '/workshops/15' },
          ok: (res) => res.status === 200 && same(res.json, coil),
          hint: 'The id comes from the path, so every id should find its own workshop.'
        },
        {
          name: 'An id the store does not have answers 404',
          req: { path: '/workshops/99' },
          ok: (res) =>
            res.status === 404 && isJson(res) && errorCode(res) === 'not_found' && hasMessage(res),
          hint: "An id the store does not have should answer 404 with { error: { code: 'not_found', message } }."
        },
        {
          name: 'An id that is not a number answers 404',
          req: { path: '/workshops/raku' },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: 'No workshop has an id like that. It should get the same 404, not a crash.'
        },
        {
          name: 'The list still answers',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'GET /workshops should still list every workshop.'
        }
      ],
      { workshops: seed }
    )
  },

  async day(t) {
    return checkApp(
      t,
      [
        {
          name: '?day= keeps the workshops on that day',
          req: { path: '/workshops?day=mon' },
          ok: (res) => res.status === 200 && same(res.json, [planters, coil]),
          hint: "GET /workshops?day=mon should answer only the workshops whose day is mon, in the store's order."
        },
        {
          name: 'A day with no workshops answers an empty list',
          req: { path: '/workshops?day=sun' },
          ok: (res) => res.status === 200 && same(res.json, []),
          hint: 'When no workshop is on that day the answer is still 200, with an empty list.'
        },
        {
          name: 'Without a filter the list is whole',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'A filter that is not in the query string should not remove anything.'
        }
      ],
      { workshops: seed }
    )
  },

  async price(t) {
    return checkApp(
      t,
      [
        {
          name: '?maxPriceCents= keeps what costs at most that much',
          req: { path: '/workshops?maxPriceCents=4100' },
          ok: (res) => res.status === 200 && same(ids(res), [11, 15]),
          hint: 'GET /workshops?maxPriceCents=4100 should keep every workshop whose price is that amount or less. Query values arrive as text.'
        },
        {
          name: 'Both filters together',
          req: { path: '/workshops?day=fri&maxPriceCents=5000' },
          ok: (res) => res.status === 200 && same(res.json, []),
          hint: 'With day and maxPriceCents both given, keep only the workshops that match both.'
        },
        {
          name: 'Both filters together keep a match',
          req: { path: '/workshops?day=fri&maxPriceCents=7000' },
          ok: (res) => res.status === 200 && same(ids(res), [12]),
          hint: 'With day and maxPriceCents both given, keep only the workshops that match both.'
        },
        {
          name: 'A price that is not a number answers 400',
          req: { path: '/workshops?maxPriceCents=cheap' },
          ok: (res) =>
            res.status === 400 && isJson(res) && errorCode(res) === 'bad_query' && hasMessage(res),
          hint: "maxPriceCents=cheap is not a number. Answer 400 with { error: { code: 'bad_query', message } } instead of guessing."
        },
        {
          name: 'Without a filter the list is whole',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'A filter that is not in the query string should not remove anything.'
        }
      ],
      { workshops: seed }
    )
  }
}
