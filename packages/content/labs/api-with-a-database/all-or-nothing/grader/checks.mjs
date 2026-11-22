import {
  checkApp,
  errorCode,
  glaze,
  openDay,
  same,
  saggar,
  tiles
} from '../../shared/checks-lib.mjs'

const guests = (workshop, count, from) =>
  Array.from({ length: count }, (_, i) => ({
    id: from + i,
    workshopId: workshop.id,
    name: `${workshop.title} guest ${i + 1}`
  }))
const countFor = (after, workshop) =>
  after.bookings.filter((b) => b.workshopId === workshop.id).length
const isBooking = (b, workshopId, name) =>
  Number.isInteger(b?.id) && same(b, { id: b.id, workshopId, name })
const post = (workshopId, name) => ({
  method: 'POST',
  path: '/bookings',
  json: { workshopId, name }
})
const group = (workshopId, names) => ({
  method: 'POST',
  path: '/bookings/group',
  json: { workshopId, names }
})
const insertsOf = (res) =>
  (res.runs ?? []).filter(
    (r) => r.method === 'run' && /insert/i.test(r.sql) && /bookings/i.test(r.sql)
  )

const marsh = 'Ottilie Marsh'
const halloran = 'Wynn Halloran'
const trio = ['Ama Quist', 'Benno Sarre', 'Cleo Dunmore']

export const checks = {
  async full(t) {
    // saggar has 1 place left, glaze has every place, the open hour is full to the last seat.
    const bookings = [...guests(saggar, 4, 100), ...guests(openDay, 12, 200)]
    return checkApp(t, [
      {
        workshops: [glaze, saggar, openDay],
        bookings,
        requests: [
          {
            name: 'The last place can be booked',
            req: post(saggar.id, marsh),
            ok: (res) => res.status === 201 && isBooking(res.json, saggar.id, marsh),
            values: ['Marsh', saggar.id],
            hint: 'This workshop has one place left, so the booking should go through with 201, as before.'
          },
          {
            name: 'A booking when no place is left answers 409',
            req: post(saggar.id, halloran),
            ok: (res) => res.status === 409 && errorCode(res) === 'full',
            hint: (res) =>
              res.status === 201
                ? 'Every place is taken now, but the booking went through. Look at the places left before you add a booking, and how you compare them.'
                : "With no place left, book should return { problem: 'full' } so the route answers 409."
          },
          {
            name: 'A workshop that is full to the last seat answers 409',
            req: post(openDay.id, halloran),
            ok: (res) => res.status === 409 && errorCode(res) === 'full',
            values: [openDay.id],
            hint: 'Twelve seats and twelve bookings leave no place, so this booking should be refused.'
          },
          {
            name: 'A workshop with places left still takes bookings',
            req: post(glaze.id, halloran),
            ok: (res) => res.status === 201 && isBooking(res.json, glaze.id, halloran),
            values: ['Halloran', glaze.id],
            hint: "This workshop has no bookings at all, but it was refused. Count only this workshop's bookings, not every booking in the table."
          },
          {
            name: 'A workshop that is not there still answers 404',
            req: post(4900, marsh),
            ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
            hint: "With no such workshop, book should still return { problem: 'not_found' }."
          },
          {
            name: 'A refused booking adds nothing',
            req: { path: '/health' },
            ok: (res, after) =>
              countFor(after, saggar) === 5 &&
              countFor(after, openDay) === 12 &&
              countFor(after, glaze) === 1,
            hint: (res, after) =>
              countFor(after, saggar) > saggar.seats || countFor(after, openDay) > openDay.seats
                ? `A refused booking should add nothing. The bookings table ended with ${countFor(after, saggar)} bookings for a workshop of ${saggar.seats} seats and ${countFor(after, openDay)} for one of ${openDay.seats}.`
                : 'The table should end with one more booking on each workshop that still had a place, and none on the full ones.'
          }
        ]
      }
    ])
  },

  async group(t) {
    // Every case starts again: tiles has 9 places left, saggar 2.
    const fresh = (request) => ({
      workshops: [tiles, saggar],
      bookings: guests(saggar, 3, 100),
      requests: [request]
    })
    return checkApp(t, [
      fresh({
        name: 'A group that fits is booked in full',
        req: group(tiles.id, trio),
        ok: (res, after) =>
          res.status === 201 &&
          Array.isArray(res.json) &&
          res.json.length === 3 &&
          res.json.every((b, i) => isBooking(b, tiles.id, trio[i])) &&
          res.json.every((b) => after.bookings.some((row) => same(row, b))),
        values: ['Quist', 'Sarre', tiles.id],
        hint: (res) =>
          res.status !== 201
            ? 'All three fit, so the group should be booked and answer 201.'
            : 'The answer should be the list of new bookings, each { id, workshopId, name } with the id the database gave it, in the order of the names, and each a row of the bookings table.'
      }),
      fresh({
        name: 'A group too big for the places left is refused whole',
        req: group(saggar.id, ['Dara Venn', 'Edda Vale', 'Fitz Ober']),
        ok: (res, after) =>
          res.status === 409 && errorCode(res) === 'full' && countFor(after, saggar) === 3,
        values: ['Venn', saggar.id],
        hint: (res, after) =>
          res.status === 201
            ? 'Three people were booked onto two places. Compare the places left with the size of the whole group before you book anyone.'
            : countFor(after, saggar) > 3
              ? `The answer said ${res.status}, but ${countFor(after, saggar) - 3} of the group were booked anyway. Either the whole group is booked or none of it: decide before the first booking goes in.`
              : "Two places are left and three people asked, so bookGroup should return { problem: 'full' } and book nobody."
      }),
      fresh({
        name: 'A group that takes the last places exactly is booked',
        req: group(saggar.id, ['Gus Rand', 'Hedy Ash']),
        ok: (res, after) =>
          res.status === 201 &&
          Array.isArray(res.json) &&
          res.json.length === 2 &&
          countFor(after, saggar) === 5,
        values: ['Rand', saggar.id],
        hint: 'Two places are left and two people asked, so the whole group fits and should be booked.'
      }),
      fresh({
        name: 'A workshop that is not there answers 404',
        req: group(4900, trio),
        ok: (res, after) =>
          res.status === 404 && errorCode(res) === 'not_found' && after.bookings.length === 3,
        hint: "With no such workshop, bookGroup should return { problem: 'not_found' } and book nobody."
      })
    ])
  },

  async atomic(t) {
    // A group added by one INSERT is all or nothing by itself, and the check cannot make it fail
    // halfway, so that way passes too.
    const wholeGroup = (after) =>
      !after.open && trio.every((n) => after.bookings.some((b) => b.name === n))
    const oneStatement = (res, after) =>
      res.status === 201 && insertsOf(res).length === 1 && wholeGroup(after)
    return checkApp(t, [
      {
        workshops: [tiles],
        failSecond: true,
        requests: [
          {
            name: 'When the database fails halfway, the error reaches the error handler',
            req: group(tiles.id, trio),
            ok: (res, after) => res.status === 500 || oneStatement(res, after),
            may500: true,
            hint: (res) =>
              res.status === 201
                ? 'The check made the database fail on the second booking of the group, yet the answer said the group was booked. Let the error go on after you have undone the group.'
                : 'The check made the database fail on the second booking of the group. After undoing the group, let the error go on to the error handler, which answers 500.'
          },
          {
            name: 'No booking of that group stays',
            req: { path: '/health' },
            ok: (res, after) =>
              wholeGroup(after) || !after.bookings.some((b) => trio.includes(b.name)),
            hint: (res, after) =>
              after.open
                ? 'A transaction was still open when the requests were done, so nothing after the failure was ever saved. Every way out of the group booking has to end the transaction: saved when all went well, undone when something failed.'
                : 'The first booking of the group was saved before the second one failed. The bookings of a group should go in together or not at all.'
          },
          {
            name: 'The next booking still works and is saved',
            req: post(tiles.id, marsh),
            ok: (res, after) =>
              res.status === 201 &&
              !after.open &&
              after.bookings.some((b) => isBooking(b, tiles.id, marsh)),
            hint: (res, after) =>
              after.open
                ? 'This booking answered, but it ran inside the transaction the failed group left open, and it was never saved. After a failure, undo the transaction before you let the error go on.'
                : 'After a failed group, a plain booking should still go through and be saved.'
          }
        ]
      }
    ])
  }
}
