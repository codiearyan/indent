import {
  checkApp,
  errorCode,
  glaze,
  saggar,
  same,
  staff,
  tiles,
  workshops
} from '../../shared/checks-lib.mjs'

const night = { title: "Potter's night: raku", day: 'thu', seats: 6, priceCents: 5275 }
const jugs = { title: 'Lidded jugs', day: 'sun', seats: 8, priceCents: 4615 }
const withoutId = ({ id, ...rest }) => rest
const row = (after, id) => after.workshops.find((w) => w.id === id)
const newRows = (after, before) => after.workshops.filter((w) => !before.some((b) => b.id === w.id))

const madeHint = (fields) => (res) => {
  if (res.status !== 201) return 'POST /workshops should answer 201, as before.'
  if (!Number.isInteger(res.json?.id)) {
    return 'The new workshop came back without its id. The database picked one when it stored the row, and the result of run() says which.'
  }
  if (!same(withoutId(res.json), fields)) {
    return 'The new workshop should come back with exactly the fields that were sent, plus its id.'
  }
  return 'The location header should name the new workshop by the id the database gave it.'
}

export const checks = {
  async create(t) {
    const before = [glaze, saggar]
    return checkApp(t, [
      {
        workshops: before,
        file: true,
        requests: [
          {
            name: 'POST /workshops answers the new workshop with its id',
            req: { method: 'POST', path: '/workshops', json: night, headers: staff },
            ok: (res) =>
              res.status === 201 &&
              Number.isInteger(res.json?.id) &&
              !before.some((w) => w.id === res.json.id) &&
              same(withoutId(res.json), night) &&
              res.headers.location === `/workshops/${res.json.id}`,
            values: [night.priceCents, 'raku'],
            hint: madeHint(night)
          },
          {
            name: 'A second workshop gets an id of its own',
            req: { method: 'POST', path: '/workshops', json: jugs, headers: staff },
            ok: (res, after) =>
              res.status === 201 &&
              same(withoutId(res.json), jugs) &&
              same(row(after, res.json.id), res.json),
            values: [jugs.priceCents, jugs.title],
            hint: (res, after) =>
              res.status === 201 && Number.isInteger(res.json?.id) && !row(after, res.json.id)
                ? 'The id that came back is not the id of the row in the table. Use the id the database reports for the row it just added.'
                : madeHint(jugs)(res)
          },
          { req: { restart: true } },
          {
            name: 'New workshops are still there after a restart',
            req: { path: '/workshops' },
            ok: (res, after) =>
              res.status === 200 &&
              same(newRows(after, before).map(withoutId), [night, jugs]) &&
              same(res.json, after.workshops),
            hint: (res, after) =>
              newRows(after, before).length === 0
                ? 'After the restart the workshops table had no new row, because the POST requests above added none. Get those working first: each should add a row to the table.'
                : 'After the server restarted on the same file, the list should hold both new workshops. Each should be a row in the workshops table, not something kept in memory.'
          }
        ]
      }
    ])
  },

  async update(t) {
    const ashWood = { title: 'Ash and wood glazes', day: 'tue', seats: 8, priceCents: 4475 }
    return checkApp(t, [
      {
        workshops,
        requests: [
          {
            name: 'PATCH changes only the fields it sends',
            req: {
              method: 'PATCH',
              path: `/workshops/${saggar.id}`,
              json: { seats: 4 },
              headers: staff
            },
            ok: (res, after) =>
              res.status === 200 &&
              same(res.json, { ...saggar, seats: 4 }) &&
              same(row(after, saggar.id), { ...saggar, seats: 4 }),
            values: [saggar.id],
            hint: (res) =>
              res.status === 404
                ? 'This row is in the table, but the update changed nothing, so the route answered 404. Look at the values you hand to run(): one for each ?, in the same order.'
                : res.status === 200 && res.json && !('title' in res.json)
                  ? 'The answer should be the whole workshop as it is now in the table, not only the fields that were sent.'
                  : `PATCH /workshops/${saggar.id} with { "seats": 4 } should change the seats in the table, keep every other field, and answer the whole workshop.`
          },
          {
            name: 'PATCH can change the title alone',
            req: {
              method: 'PATCH',
              path: `/workshops/${tiles.id}`,
              json: { title: 'Pressed and carved tiles' },
              headers: staff
            },
            ok: (res, after) =>
              res.status === 200 &&
              same(row(after, tiles.id), { ...tiles, title: 'Pressed and carved tiles' }),
            values: [tiles.id, 'carved'],
            hint: 'Only the title should change; day, seats and priceCents stay as they were in the table.'
          },
          {
            name: 'PUT replaces every field',
            req: { method: 'PUT', path: `/workshops/${glaze.id}`, json: ashWood, headers: staff },
            ok: (res, after) =>
              res.status === 200 &&
              same(res.json, { ...ashWood, id: glaze.id }) &&
              same(row(after, glaze.id), { ...ashWood, id: glaze.id }),
            values: [glaze.id, ashWood.priceCents, 'wood'],
            hint: `PUT /workshops/${glaze.id} should store all four fields it sends and answer the whole workshop.`
          },
          {
            name: 'PATCH on an id with no row answers 404',
            req: { method: 'PATCH', path: '/workshops/4900', json: { seats: 3 }, headers: staff },
            ok: (res, after) =>
              res.status === 404 && errorCode(res) === 'not_found' && !row(after, 4900),
            values: [4900],
            hint: (res, after) =>
              row(after, 4900)
                ? 'A change to an id with no row added a row. An update should only change rows that are already there.'
                : 'No row has this id, so nothing changed. update should return undefined then, so the route answers 404. The result of run() says how many rows the statement changed.'
          },
          {
            name: 'PUT on an id with no row answers 404',
            req: { method: 'PUT', path: '/workshops/4901', json: jugs, headers: staff },
            ok: (res, after) => res.status === 404 && !row(after, 4901),
            values: [4901],
            hint: 'No row has this id, so PUT should answer 404 and add nothing.'
          }
        ]
      }
    ])
  },

  async remove(t) {
    return checkApp(t, [
      {
        workshops,
        requests: [
          {
            name: 'DELETE removes the row and answers 204',
            req: { method: 'DELETE', path: `/workshops/${tiles.id}`, headers: staff },
            ok: (res, after) => res.status === 204 && !row(after, tiles.id),
            values: [tiles.id],
            hint: `DELETE /workshops/${tiles.id} should take that row out of the table and answer 204.`
          },
          {
            name: 'Deleting it again answers 404',
            req: { method: 'DELETE', path: `/workshops/${tiles.id}`, headers: staff },
            ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
            hint: 'The row is gone, so the second DELETE removed nothing. remove should return false then. The result of run() says how many rows the statement removed.'
          },
          {
            name: 'An id that never had a row answers 404',
            req: { method: 'DELETE', path: '/workshops/4900', headers: staff },
            ok: (res) => res.status === 404,
            values: [4900],
            hint: 'No row has this id, so DELETE should answer 404.'
          },
          {
            name: 'The other workshops stay',
            req: { path: '/workshops' },
            ok: (res, after) =>
              same(
                after.workshops,
                workshops.filter((w) => w.id !== tiles.id)
              ),
            hint: 'Only the workshop with that id should be removed.'
          }
        ]
      }
    ])
  }
}
