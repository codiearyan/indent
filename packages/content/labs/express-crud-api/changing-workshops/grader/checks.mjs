import { checkApp, checkValidate, errorCode, same, seed } from '../../shared/checks-lib.mjs'

const [planters, raku, coil] = seed
const raku2 = { title: 'Raku and smoke firing', day: 'sat', seats: 6, priceCents: 7000 }

export const checks = {
  async put(t) {
    return checkApp(
      t,
      [
        {
          name: 'PUT answers 200 with the replaced workshop',
          req: { method: 'PUT', path: '/workshops/12', json: raku2 },
          ok: (res) => res.status === 200 && same(res.json, { ...raku2, id: 12 }),
          hint: 'PUT /workshops/12 with all four fields should answer 200 with the whole saved workshop, keeping its id.'
        },
        {
          name: 'The replacement is stored',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 200 && same(res.json, { ...raku2, id: 12 }),
          hint: 'After the PUT, GET /workshops/12 should show the new fields.'
        },
        {
          name: 'PUT needs every field',
          req: {
            method: 'PUT',
            path: '/workshops/11',
            json: { title: 'Slab-built planters', day: 'mon', seats: 7 }
          },
          ok: (res) =>
            res.status === 400 &&
            errorCode(res) === 'validation_failed' &&
            same(res.json?.error?.fields, ['priceCents']),
          hint: 'A PUT replaces the whole workshop, so a body without priceCents is not complete. Check it the same way POST does.'
        },
        {
          name: 'The bad PUT changed nothing',
          req: { path: '/workshops/11' },
          ok: (res) => res.status === 200 && same(res.json, planters),
          hint: 'A refused PUT should leave the workshop as it was.'
        },
        {
          name: 'PUT cannot change the id or add fields',
          req: { method: 'PUT', path: '/workshops/15', json: { ...coil, id: 40, featured: true } },
          ok: (res) => res.status === 200 && same(res.json, coil),
          hint: 'The id comes from the path, and only the four fields are saved.'
        },
        {
          name: 'PUT of an unknown id answers 404',
          req: { method: 'PUT', path: '/workshops/99', json: raku2 },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: "Replacing a workshop that does not exist should answer 404 with code 'not_found', and create nothing."
        },
        {
          name: 'An unknown id answers 404 before the body is checked',
          req: { method: 'PUT', path: '/workshops/98', json: { title: 'Raku' } },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: 'There is no workshop 98, so what is wrong with the body does not matter yet. Ask about the id first.'
        },
        {
          name: 'No workshop was added',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && Array.isArray(res.json) && res.json.length === 3,
          hint: 'PUT changes workshops that exist. It should never add one.'
        }
      ],
      { workshops: seed }
    )
  },

  async patch(t) {
    const partial = { partial: true }
    const validated = await checkValidate(t, [
      {
        name: 'Partial mode checks only the fields sent',
        body: { seats: 4 },
        options: partial,
        want: [],
        hint: 'With { partial: true }, the fields that were not sent are not problems.'
      },
      {
        name: 'Partial mode still checks what was sent',
        body: { seats: 0, title: 'Raku' },
        options: partial,
        want: ['seats'],
        hint: 'With { partial: true }, every field that was sent still follows its rule.'
      },
      {
        name: 'Partial mode with nothing to change',
        body: {},
        options: partial,
        want: [],
        hint: 'An empty object sends no field, so in partial mode there is nothing wrong with it.'
      },
      {
        name: 'Partial mode still refuses what is not an object',
        body: [1],
        options: partial,
        want: ['title', 'day', 'seats', 'priceCents'],
        hint: 'An array is not a workshop in partial mode either.'
      },
      {
        name: 'Without partial nothing changes',
        body: { seats: 4 },
        want: ['title', 'day', 'priceCents'],
        hint: 'Without options, validateWorkshop should work exactly as it did for POST.'
      }
    ])
    const routed = await checkApp(
      t,
      [
        {
          name: 'PATCH answers 200 with the whole changed workshop',
          req: { method: 'PATCH', path: '/workshops/12', json: { seats: 4 } },
          ok: (res) => res.status === 200 && same(res.json, { ...raku, seats: 4 }),
          hint: 'PATCH should change only the fields it was sent and answer 200 with the whole workshop.'
        },
        {
          name: 'The change is stored and the rest is kept',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 200 && same(res.json, { ...raku, seats: 4 }),
          hint: 'After the PATCH, GET /workshops/12 should show the new seats and the old title, day and price.'
        },
        {
          name: 'PATCH checks the fields it gets',
          req: { method: 'PATCH', path: '/workshops/11', json: { priceCents: -1 } },
          ok: (res) =>
            res.status === 400 &&
            errorCode(res) === 'validation_failed' &&
            same(res.json?.error?.fields, ['priceCents']),
          hint: 'A field sent in a PATCH still has to follow its rule. Use validateWorkshop in partial mode.'
        },
        {
          name: 'PATCH cannot change the id or add fields',
          req: {
            method: 'PATCH',
            path: '/workshops/15',
            json: { id: 40, featured: true, day: 'wed' }
          },
          ok: (res) => res.status === 200 && same(res.json, { ...coil, day: 'wed' }),
          hint: 'The id comes from the path, and only the four fields are saved.'
        },
        {
          name: 'PATCH of an unknown id answers 404',
          req: { method: 'PATCH', path: '/workshops/99', json: { seats: 3 } },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: "Changing a workshop that does not exist should answer 404 with code 'not_found'."
        },
        {
          name: 'An unknown id answers 404 before the body is checked',
          req: { method: 'PATCH', path: '/workshops/98', json: { seats: 0 } },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: 'There is no workshop 98, so what is wrong with the body does not matter yet. Ask about the id first.'
        }
      ],
      { workshops: seed }
    )
    return [...validated, ...routed]
  },

  async delete(t) {
    return checkApp(
      t,
      [
        {
          name: 'DELETE answers 204 with no body',
          req: { method: 'DELETE', path: '/workshops/12' },
          ok: (res) => res.status === 204 && res.text === '',
          hint: (res) =>
            res.status === 404
              ? 'Workshop 12 is in the store, but the route did not find it. Think about what type an id from the path arrives as, and what type the store uses.'
              : 'Removing a workshop should answer 204 No Content, with an empty body.'
        },
        {
          name: 'A removed workshop is gone',
          req: { path: '/workshops/12' },
          ok: (res) => res.status === 404,
          hint: 'After DELETE /workshops/12, reading it should answer 404.'
        },
        {
          name: 'Removing it again answers 404',
          req: { method: 'DELETE', path: '/workshops/12' },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: "Removing a workshop that is not there should answer 404 with code 'not_found'."
        },
        {
          name: 'An id that is not a number answers 404',
          req: { method: 'DELETE', path: '/workshops/all' },
          ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
          hint: 'No workshop has an id like that, so there is nothing to remove.'
        },
        {
          name: 'The other workshops are untouched',
          req: { path: '/workshops' },
          ok: (res) => res.status === 200 && same(res.json, [planters, coil]),
          hint: 'After one DELETE, GET /workshops should list exactly the workshops that are left.'
        }
      ],
      { workshops: seed }
    )
  }
}
