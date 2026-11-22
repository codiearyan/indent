import {
  broken,
  checkApp,
  clear,
  errorCode,
  glaze,
  openDay,
  saggar,
  same,
  sandbox,
  showSql,
  tiles,
  workshops
} from '../../shared/checks-lib.mjs'

const show = (value) => JSON.stringify(value, null, 2)
const describeColumns = (columns) =>
  columns.length === 0
    ? 'The bookings table does not exist.'
    : `The bookings table has these columns:\n${columns
        .map(
          (c) => `  ${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PRIMARY KEY' : ''}`
        )
        .join('\n')}`
const TYPES = { id: 'INTEGER', workshopId: 'INTEGER', name: 'TEXT' }

function judgeTables(report) {
  if (report.error) {
    return [
      {
        name: 'createTables runs',
        passed: false,
        message: /Not implemented/.test(report.error)
          ? `Something you call still throws 'Not implemented'. Replace that line with your code.`
          : 'createTables threw on an empty database. Read the error: SQLite says which word of the SQL it could not read.',
        output: `${report.error}\n\n${showSql(report.sql)}`
      }
    ]
  }
  const cols = report.bookings
  const byName = Object.fromEntries(cols.map((c) => [c.name, c]))
  const output = describeColumns(cols)
  const missing = Object.keys(TYPES).filter((name) => !byName[name])
  const wrongType = Object.keys(TYPES).filter(
    (name) => byName[name] && byName[name].type.toUpperCase() !== TYPES[name]
  )
  const key = report.bookingKeys.find((k) => k.from === 'workshopId')
  const results = [
    {
      name: 'The workshops table is still made',
      passed: report.workshops.length === 5,
      message: 'createTables should still make the workshops table, as before.',
      output: `The workshops table has ${report.workshops.length} columns.`
    },
    {
      name: 'The bookings table has its three columns',
      passed: missing.length === 0 && wrongType.length === 0,
      message:
        cols.length === 0
          ? 'No bookings table was made. createTables should make it next to the workshops table.'
          : missing.length > 0
            ? `The bookings table is missing ${missing.join(', ')}. The names are spelled the way the task says.`
            : `Check the type of ${wrongType.join(', ')}: whole numbers are INTEGER and text is TEXT.`,
      output
    },
    {
      name: 'id is the INTEGER PRIMARY KEY',
      passed: byName.id?.pk === 1 && byName.id.type.toUpperCase() === 'INTEGER',
      message:
        'id should be declared exactly INTEGER PRIMARY KEY, so each booking gets the next free id.',
      output
    },
    {
      name: 'workshopId and name cannot be empty',
      passed: Boolean(
        byName.workshopId?.notnull && byName.name?.notnull && report.bookingNoName?.error
      ),
      message: 'A booking without a workshop or without a name should be refused by the database.',
      output: `${output}\n\nAdding a booking with no name: ${report.bookingNoName?.error ?? 'it was saved'}`
    },
    {
      name: 'workshopId must name a real workshop',
      passed:
        Boolean(key) &&
        key.table === 'workshops' &&
        (key.to === null || key.to === 'id') &&
        Boolean(report.bookingMissing?.error) &&
        Boolean(report.bookingOk?.result),
      message: !key
        ? 'workshopId is a plain number for now: the database lets a booking point at a workshop that is not there. Tell it which table and column workshopId refers to.'
        : report.bookingOk?.error
          ? 'A booking for a workshop that exists was refused. Check which table and column workshopId refers to.'
          : 'workshopId should refer to the id of the workshops table.',
      output: `${output}\n\nworkshopId refers to: ${key ? `${key.table}(${key.to ?? 'its primary key'})` : 'nothing'}\nA booking for a workshop that exists: ${report.bookingOk?.error ?? 'saved'}\nA booking for a workshop that does not exist: ${report.bookingMissing?.error ?? 'saved'}`
    },
    {
      name: 'Running it again keeps both tables and their rows',
      passed:
        Boolean(report.again?.ok) &&
        report.after.workshops === report.before.workshops &&
        report.after.bookings === report.before.bookings,
      message: report.again?.error
        ? 'The second call threw because a table is already there. Every start of the server runs createTables, so each table is made only when it does not exist yet.'
        : 'After a second call some rows were gone. createTables should leave tables that already exist, and their rows, as they are.',
      output: report.again?.error
        ? `The second call threw: ${report.again.error}`
        : `Rows before the second call: ${show(report.before)}\nafter: ${show(report.after)}`
    }
  ]
  return missing.length > 0 ? results.slice(0, 2) : results
}

const booked = (res, workshopId, name) =>
  res.status === 201 &&
  Number.isInteger(res.json?.id) &&
  same(res.json, { id: res.json.id, workshopId, name })
const stored = (after, res) => after.bookings.some((b) => same(b, res.json))
const marsh = 'Ottilie Marsh'
const halloran = "Wynn O'Halloran"
// Both workshops already have a booking, so book() is judged the same however far the
// places-left task has got.
const earlier = [
  { id: 71, workshopId: saggar.id, name: 'Esra Dunmore' },
  { id: 72, workshopId: glaze.id, name: 'Senna Okafor' }
]

const bookingHint = (res, after) => {
  if (res.status !== 201) return 'POST /bookings for a workshop that exists should answer 201.'
  if (!Number.isInteger(res.json?.id)) {
    return 'The booking came back without its id. The result of run() says which id the database gave the new row.'
  }
  if (!stored(after, res)) {
    return 'The booking that came back is not a row of the bookings table. Return the id the database gave it, the workshopId and the name.'
  }
  return 'The answer should be the booking as { id, workshopId, name }.'
}

// Bookings per workshop: glaze 3 of 7, saggar 1 of 5, tiles none of 9, the open hour 2 of 12.
const taken = [
  ...[1, 2, 3].map((n) => ({ id: 80 + n, workshopId: glaze.id, name: `Glaze guest ${n}` })),
  { id: 84, workshopId: saggar.id, name: 'Saggar guest' },
  ...[1, 2].map((n) => ({ id: 84 + n, workshopId: openDay.id, name: `Open hour guest ${n}` }))
]
const left = {
  [glaze.id]: { ...glaze, placesLeft: 4 },
  [saggar.id]: { ...saggar, placesLeft: 4 },
  [tiles.id]: { ...tiles, placesLeft: 9 },
  [openDay.id]: { ...openDay, placesLeft: 10 }
}
const fromDatabase = (res) => res.runs.some((run) => run.keys.includes('placesLeft'))

const placesHint = (res) => {
  if (res.status === 404) {
    return 'This workshop has no bookings yet, and it disappeared. A plain JOIN keeps only the workshops that have a matching booking; another kind keeps every workshop.'
  }
  if (res.json && res.json.placesLeft === res.json.seats - 1) {
    return 'A workshop with no bookings shows one place fewer than it has seats. What you count also counts the one row the join makes for a workshop with no bookings: count something that is only there when a booking is.'
  }
  return 'Each workshop should come with placesLeft: its seats minus the number of its bookings.'
}

const listHint = (size) => (res) => {
  const list = Array.isArray(res.json) ? res.json : []
  const empty = list.find((w) => w.id === tiles.id)
  if (size > 1 && list.length === 1) {
    return 'The whole list came back as one row. Counting turns all the rows into one unless the query says what to count them per.'
  }
  if (list.length > 0 && list.length < size) {
    return 'Some workshops are missing from the list. A workshop with no bookings still belongs in it.'
  }
  if (empty && empty.placesLeft === empty.seats - 1) return placesHint({ json: empty })
  if (list.length > 0 && !fromDatabase(res)) {
    return 'placesLeft should come back from the query itself, worked out by the database.'
  }
  return 'The list should hold the workshops that match, in id order, each with placesLeft: its seats minus its bookings.'
}

export const checks = {
  async table(t) {
    const dir = await sandbox(t)
    const r = await t.call(dir, '.grader/harness.mjs', 'tables')
    if (!r.ok) return broken('createTables runs', r.error)
    return clear(judgeTables(r.value))
  },

  async book(t) {
    return checkApp(t, [
      {
        workshops: [glaze, saggar],
        bookings: earlier,
        requests: [
          {
            name: 'POST /bookings adds a booking and answers it',
            req: { method: 'POST', path: '/bookings', json: { workshopId: glaze.id, name: marsh } },
            ok: (res, after) => booked(res, glaze.id, marsh) && stored(after, res),
            values: ['Marsh', glaze.id],
            hint: bookingHint
          },
          {
            name: 'A name with an apostrophe is stored as it is',
            req: {
              method: 'POST',
              path: '/bookings',
              json: { workshopId: saggar.id, name: halloran }
            },
            ok: (res, after) => booked(res, saggar.id, halloran) && stored(after, res),
            values: ['Halloran', saggar.id],
            hint: bookingHint
          },
          {
            name: 'A workshop that is not there answers 404',
            req: { method: 'POST', path: '/bookings', json: { workshopId: 4900, name: marsh } },
            ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
            values: [4900],
            hint: "With no workshop 4900, book should return { problem: 'not_found' } so the route answers 404."
          },
          {
            name: 'Only the two real bookings were added',
            req: { path: '/health' },
            ok: (res, after) =>
              after.bookings.length === 4 &&
              same(after.bookings.slice(0, 2), earlier) &&
              after.bookings.every((b) => b.workshopId !== 4900),
            hint: (res, after) =>
              after.bookings.some((b) => b.workshopId === 4900)
                ? 'A booking for a workshop that does not exist was stored. Check the workshop is there before you add the booking.'
                : 'The bookings table should hold the two bookings that were there before and the two new ones, nothing else.'
          }
        ]
      }
    ])
  },

  async places(t) {
    return checkApp(t, [
      {
        workshops,
        bookings: taken,
        requests: [
          {
            name: 'One workshop comes with its places left',
            req: { path: `/workshops/${glaze.id}` },
            ok: (res) => res.status === 200 && same(res.json, left[glaze.id]),
            values: [glaze.id],
            hint: placesHint
          },
          {
            name: 'A workshop with no bookings has every place left',
            req: { path: `/workshops/${tiles.id}` },
            ok: (res) => res.status === 200 && same(res.json, left[tiles.id]),
            values: [tiles.id],
            hint: placesHint
          },
          {
            name: 'The database works out the places left',
            req: { path: `/workshops/${saggar.id}` },
            ok: (res) => res.status === 200 && fromDatabase(res),
            hint: 'placesLeft should come back from the query itself, worked out by the database, not be added up in JavaScript afterwards.'
          },
          {
            name: 'An id with no row still answers 404',
            req: { path: '/workshops/4900' },
            ok: (res) => res.status === 404,
            values: [4900],
            hint: 'An id with no workshop should still answer 404.'
          },
          {
            name: 'The list gives every workshop its places left',
            req: { path: '/workshops' },
            ok: (res) =>
              res.status === 200 &&
              same(
                res.json,
                workshops.map((w) => left[w.id])
              ) &&
              fromDatabase(res),
            hint: listHint(workshops.length)
          },
          {
            name: 'The filters still work',
            req: { path: '/workshops?day=mon&maxPriceCents=4150' },
            ok: (res) => res.status === 200 && same(res.json, [left[glaze.id], left[tiles.id]]),
            values: ['mon', 4150],
            hint: listHint(2)
          }
        ]
      }
    ])
  }
}
