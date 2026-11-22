import {
  checkApp,
  errorCode,
  glaze,
  openDay,
  readsAtMost,
  saggar,
  same,
  tiles,
  workshops
} from '../../shared/checks-lib.mjs'

const ordered = (res) => res.runs.some((run) => /order\s+by/i.test(run.sql))
const inDatabase = (res) =>
  Array.isArray(res.json) &&
  res.runs.every((run) => run.count === undefined || run.count <= res.json.length)
const oneHint = (res) =>
  Array.isArray(res.json)
    ? 'The answer is a list. get(id) should return the one workshop itself, not a list that holds it.'
    : 'GET /workshops/:id should answer the row whose id is the one in the path, as { id, title, day, seats, priceCents }.'
const list = (res, want) => res.status === 200 && same(res.json, want)

export const checks = {
  async list(t) {
    return checkApp(t, [
      {
        workshops: [tiles, glaze, openDay, saggar],
        requests: [
          {
            name: 'GET /workshops lists every workshop in the table',
            req: { path: '/workshops' },
            ok: (res) => list(res, workshops),
            hint: (res) =>
              Array.isArray(res.json)
                ? 'GET /workshops should answer every row of the workshops table as { id, title, day, seats, priceCents }, in id order.'
                : 'The answer should be a list of workshops. One statement method gives back one row, another gives back all of them.'
          },
          {
            name: 'The query asks for the order it wants',
            req: { path: '/workshops' },
            ok: ordered,
            hint: 'A table has no order of its own that you can count on. The query should say which order the rows come back in.'
          }
        ]
      },
      {
        requests: [
          {
            name: 'An empty table gives an empty list',
            req: { path: '/workshops' },
            ok: (res) => list(res, []),
            hint: 'With no rows in the table, GET /workshops should answer 200 with [].'
          }
        ]
      }
    ])
  },

  async one(t) {
    return checkApp(t, [
      {
        workshops,
        requests: [
          {
            name: 'GET /workshops/:id answers that workshop',
            req: { path: `/workshops/${saggar.id}` },
            ok: (res) => res.status === 200 && same(res.json, saggar),
            values: [saggar.id],
            hint: oneHint
          },
          {
            name: 'Another id finds another workshop',
            req: { path: `/workshops/${tiles.id}` },
            ok: (res) => res.status === 200 && same(res.json, tiles),
            values: [tiles.id],
            hint: oneHint
          },
          {
            name: 'The database finds the row',
            req: { path: `/workshops/${tiles.id}` },
            ok: (res) => res.status === 200 && readsAtMost(res, 1),
            hint: 'The query gave back every workshop, and the one was picked out in JavaScript. Compare the id in the query, so the database sends only that row.'
          },
          {
            name: 'An id with no row answers 404',
            req: { path: '/workshops/4900' },
            ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
            values: [4900],
            hint: (res) =>
              res.status === 200
                ? 'An id with no row answered 200. When no row matches, get(id) should return undefined, so the route answers 404.'
                : 'An id with no row should answer 404, as before.'
          },
          {
            name: 'An id that is not a number answers 404',
            req: { path: '/workshops/pots' },
            ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
            hint: (res) =>
              res.status === 200
                ? 'An id that is not a number answered 200. No row has an id like that, so get(id) should return undefined and the route answers 404.'
                : 'No row has an id like that, so it should get the same 404 as any other missing id.'
          }
        ]
      }
    ])
  },

  async filter(t) {
    return checkApp(t, [
      {
        workshops,
        requests: [
          {
            name: '?day= keeps the workshops on that day',
            req: { path: '/workshops?day=mon' },
            ok: (res) => list(res, [glaze, tiles]),
            values: ['mon'],
            hint: 'GET /workshops?day=mon should answer only the rows whose day is mon, in id order.'
          },
          {
            name: 'The database does the filtering',
            req: { path: '/workshops?day=mon' },
            ok: inDatabase,
            hint: 'The query gave back more rows than the answer holds, so the rows were filtered after they came back. The filter belongs in the query, so the database sends only the rows that match.'
          },
          {
            name: '?maxPriceCents= keeps what costs at most that much',
            req: { path: '/workshops?maxPriceCents=4150' },
            ok: (res) => list(res, [glaze, tiles, openDay]),
            values: [4150],
            hint: 'GET /workshops?maxPriceCents=4150 should keep every workshop whose priceCents is 4150 or less.'
          },
          {
            name: 'Both filters together',
            req: { path: '/workshops?day=mon&maxPriceCents=4000' },
            ok: (res) => list(res, [tiles]),
            values: ['mon', 4000],
            hint: 'With both filters a workshop has to match both.'
          },
          {
            name: 'A top price of 0 still counts',
            req: { path: '/workshops?maxPriceCents=0' },
            ok: (res) => list(res, [openDay]),
            hint: 'maxPriceCents=0 asks for the free workshops only. 0 is a real filter, so look at how you tell a filter that was given from one that was not.'
          },
          {
            name: 'A day with no workshops answers an empty list',
            req: { path: '/workshops?day=sun' },
            ok: (res) => list(res, []),
            values: ['sun'],
            hint: 'When no row matches, the answer is 200 with [].'
          },
          {
            name: 'A day that looks like SQL is only compared',
            req: { path: `/workshops?day=${encodeURIComponent("mon' OR '1'='1")}` },
            ok: (res) => list(res, []),
            values: ['mon'],
            hint: (res) =>
              Array.isArray(res.json) && res.json.length > 0
                ? 'This day changed the query and every workshop came back. The day should only be compared with the column, whatever it holds.'
                : 'No workshop is on a day called that, so the answer should be an empty list.'
          },
          {
            name: 'Without a filter the list is whole',
            req: { path: '/workshops' },
            ok: (res) => list(res, workshops),
            hint: 'A filter that is not in the query string should not remove anything.'
          }
        ]
      }
    ])
  }
}
