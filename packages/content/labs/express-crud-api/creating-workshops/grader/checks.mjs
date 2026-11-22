import {
  checkApp,
  checkValidate,
  errorCode,
  hasMessage,
  isJson,
  same,
  seed
} from '../../shared/checks-lib.mjs'

const bowls = { title: 'Throwing bowls', day: 'tue', seats: 6, priceCents: 4400 }
const all = ['title', 'day', 'seats', 'priceCents']

export const checks = {
  async create(t) {
    return checkApp(
      t,
      [
        {
          name: 'POST /workshops answers 201 with the saved workshop',
          req: { method: 'POST', path: '/workshops', json: bowls },
          ok: (res) => res.status === 201 && isJson(res) && same(res.json, { ...bowls, id: 16 }),
          hint: 'A valid POST should answer 201 Created with the workshop as the store saved it, id included. Is the JSON body being read at all?'
        },
        {
          name: 'The 201 has a location header',
          req: { method: 'POST', path: '/workshops', json: { ...bowls, title: 'Throwing jugs' } },
          ok: (res) => res.status === 201 && res.headers.location === `/workshops/${res.json?.id}`,
          hint: 'A 201 should say where the new workshop lives, in a location header made from its id.'
        },
        {
          name: 'The new workshop can be read back',
          req: { path: '/workshops/16' },
          ok: (res) => res.status === 200 && same(res.json, { ...bowls, id: 16 }),
          hint: 'After the POST, GET /workshops/16 should find the workshop in the store.'
        },
        {
          name: 'Only the four fields are saved',
          req: { method: 'POST', path: '/workshops', json: { ...bowls, id: 99, featured: true } },
          ok: (res) =>
            res.status === 201 &&
            res.json?.id === 18 &&
            !('featured' in res.json) &&
            same(Object.keys(res.json).sort(), ['day', 'id', 'priceCents', 'seats', 'title']),
          hint: 'A client should not choose the id or add fields of its own. Save only title, day, seats and priceCents, and let the store pick the id.'
        },
        {
          name: 'The list has the new workshops',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && Array.isArray(res.json) && res.json.length === 6,
          hint: 'GET /workshops should list the workshops just created after the ones that were there.'
        }
      ],
      { workshops: seed }
    )
  },

  async validate(t) {
    return checkValidate(t, [
      {
        name: 'A good workshop has no problems',
        body: bowls,
        want: [],
        hint: 'A workshop with a title, a day, 6 seats and a price should give an empty list.'
      },
      {
        name: 'A blank title is a problem',
        body: { ...bowls, title: '   ' },
        want: ['title'],
        hint: 'A title made only of spaces is empty once trimmed.'
      },
      {
        name: 'A title that is not text is a problem',
        body: { ...bowls, title: 42 },
        want: ['title'],
        hint: 'The title has to be text.'
      },
      {
        name: 'A title of 80 characters is fine',
        body: { ...bowls, title: 'a'.repeat(80) },
        want: [],
        hint: 'Look at the limit on the title: 80 characters is still allowed.'
      },
      {
        name: 'A title of 81 characters is too long',
        body: { ...bowls, title: 'a'.repeat(81) },
        want: ['title'],
        hint: 'Look at the limit on the title: one more than it is too long.'
      },
      {
        name: 'A day must be one of the short names',
        body: { ...bowls, day: 'Tuesday' },
        want: ['day'],
        hint: 'Only the short names in DAYS are days here.'
      },
      {
        name: 'Seats from 1 to 20 are fine',
        body: { ...bowls, seats: 20 },
        want: [],
        hint: 'Look at the edges of the seats rule: both ends are allowed.'
      },
      {
        name: 'Zero seats is a problem',
        body: { ...bowls, seats: 0 },
        want: ['seats'],
        hint: 'A workshop needs at least one seat.'
      },
      {
        name: 'Too many seats is a problem',
        body: { ...bowls, seats: 21 },
        want: ['seats'],
        hint: 'Look at the top of the seats rule.'
      },
      {
        name: 'Half a seat is a problem',
        body: { ...bowls, seats: 2.5 },
        want: ['seats'],
        hint: 'Seats are whole numbers.'
      },
      {
        name: 'Seats sent as text are a problem',
        body: { ...bowls, seats: '6' },
        want: ['seats'],
        hint: 'JSON can carry numbers. A number inside quotes is text, and it should not pass.'
      },
      {
        name: 'A free workshop is fine',
        body: { ...bowls, priceCents: 0 },
        want: [],
        hint: 'Look at the bottom of the price rule.'
      },
      {
        name: 'A negative price is a problem',
        body: { ...bowls, priceCents: -100 },
        want: ['priceCents'],
        hint: 'A price below zero makes no sense.'
      },
      {
        name: 'A price in part cents is a problem',
        body: { ...bowls, priceCents: 44.5 },
        want: ['priceCents'],
        hint: 'Prices are whole numbers of cents.'
      },
      {
        name: 'Several problems come in field order',
        body: { seats: 6, day: 'someday', title: '' },
        want: ['title', 'day', 'priceCents'],
        hint: 'Every wrong or missing field is listed, in the order title, day, seats, priceCents.'
      },
      {
        name: 'Fields that are not checked do not matter',
        body: { ...bowls, featured: true },
        want: [],
        hint: 'Only the four fields are checked. Other fields are not a problem here.'
      },
      {
        name: 'An empty object is missing everything',
        body: {},
        want: all,
        hint: 'Every field is missing from an empty object.'
      },
      {
        name: 'No body at all gets all four names',
        want: all,
        hint: 'When nothing was sent, validateWorkshop gets undefined. That should not crash.'
      },
      {
        name: 'null gets all four names',
        body: null,
        want: all,
        hint: 'null is not a workshop. Be careful: typeof null is "object".'
      },
      {
        name: 'An array gets all four names',
        body: [bowls],
        want: all,
        hint: 'An array is not a workshop, even though typeof says "object".'
      },
      {
        name: 'Text gets all four names',
        body: 'Throwing bowls',
        want: all,
        hint: 'A string is not a workshop.'
      }
    ])
  },

  async reject(t) {
    return checkApp(
      t,
      [
        {
          name: 'A bad workshop answers 400 validation_failed',
          req: {
            method: 'POST',
            path: '/workshops',
            json: { title: 'Raku again', day: 'fri', seats: 30, priceCents: 6500 }
          },
          ok: (res) =>
            res.status === 400 &&
            isJson(res) &&
            errorCode(res) === 'validation_failed' &&
            hasMessage(res),
          hint: "A body validateWorkshop finds problems in should answer 400 with { error: { code: 'validation_failed', message, fields } }."
        },
        {
          name: 'The error lists the fields to fix',
          req: {
            method: 'POST',
            path: '/workshops',
            json: { title: '', day: 'fri', priceCents: -5 }
          },
          ok: (res) =>
            res.status === 400 && same(res.json?.error?.fields, ['title', 'seats', 'priceCents']),
          hint: 'The error should carry fields: the list validateWorkshop returned, so the page can mark each one.'
        },
        {
          name: 'A POST with no body answers 400',
          req: { method: 'POST', path: '/workshops' },
          ok: (res) =>
            res.status === 400 &&
            errorCode(res) === 'validation_failed' &&
            same(res.json?.error?.fields, all),
          hint: 'With no JSON body, req.body is undefined. That should be a 400 with every field listed, not a crash.'
        },
        {
          name: 'An array answers 400',
          req: {
            method: 'POST',
            path: '/workshops',
            json: [{ title: 'Coil pots', day: 'mon', seats: 9, priceCents: 3000 }]
          },
          ok: (res) => res.status === 400 && errorCode(res) === 'validation_failed',
          hint: 'A list is not one workshop.'
        },
        {
          name: 'Nothing bad was saved',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, seed),
          hint: 'After only bad POSTs the list should be exactly what it was. Check the body before the store sees it.'
        },
        {
          name: 'A good workshop is still created',
          req: { method: 'POST', path: '/workshops', json: bowls },
          ok: (res) => res.status === 201 && same(res.json, { ...bowls, id: 16 }),
          hint: 'A valid POST should still answer 201 with the saved workshop.'
        }
      ],
      { workshops: seed }
    )
  }
}
