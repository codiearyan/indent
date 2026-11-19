import { isDeepStrictEqual } from 'node:util'
import { broken, checkApp, errorCode, sandbox } from '../../shared/checks-lib.mjs'

const seed = [
  { code: 'TW-01', name: 'Heron', type: 'single', hourlyCents: 1800, available: true },
  { code: 'TW-02', name: 'Otter', type: 'double', hourlyCents: 2600, available: true },
  { code: 'TW-03', name: 'Pike', type: 'single', hourlyCents: 1800, available: false }
]
const [heron, otter, pike] = seed
const kestrel = { code: 'TW-09', name: 'Kestrel', type: 'single', hourlyCents: 1900 }
const same = (a, b) => isDeepStrictEqual(a, b)

export const checks = {
  async store(t) {
    const dir = await sandbox(t, { '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const r = await t.call(dir, '.grader/drive.mjs', 'runScenarios')
    if (!r.ok) return broken('createBoatStore can be called', r)
    const s = r.value
    if (Object.values(s).some((x) => /Not implemented/.test(x.thrown?.message))) {
      return [
        {
          name: 'createBoatStore is implemented',
          passed: false,
          message: `createBoatStore still throws 'Not implemented'. Replace that line with your code.`,
          output: s.list.thrown?.message
        }
      ]
    }
    const v = (name) => s[name].value
    const cases = [
      ['list() returns the seed boats in order', 'list', () => same(v('list'), seed),
        'list() should return every seed boat, in the order they were given.'],
      ['get() finds a boat by code', 'get', () => same(v('get').found, otter),
        'get(code) should return the boat with that code.'],
      ['get() of an unknown code is undefined', 'get', () => v('get').missing === 'undefined',
        'get(code) should return undefined when there is no such boat, not throw and not return null.'],
      ['create() adds a boat', 'create', () =>
        same(v('create').created, { ...kestrel, available: true }) &&
        same(v('create').found, { ...kestrel, available: true }) &&
        v('create').count === 4,
        'After create(boat), the store should return it from create, find it with get and list 4 boats.'],
      ['create() refuses a duplicate code with 409', 'duplicate', () =>
        s.duplicate.thrown?.status === 409 && s.duplicate.thrown.code === 'conflict',
        "Creating a boat whose code is already taken should throw an HttpError with status 409 and code 'conflict'."],
      ['update() merges changes and keeps the code', 'update', () =>
        same(v('update').updated, { ...otter, hourlyCents: 2700 }) &&
        same(v('update').found, { ...otter, hourlyCents: 2700 }) &&
        v('update').moved === 'undefined',
        'update(code, changes) should change only the given fields, return the whole boat, and never change its code.'],
      ['update() of an unknown code is undefined', 'update', () => v('update').missing === 'undefined',
        'update() should return undefined for a code the store does not have, and add nothing.'],
      ['remove() deletes once', 'remove', () =>
        same(v('remove'), { removed: true, after: 'undefined', again: false, count: 2 }),
        'remove(code) should return true and delete the boat, then return false for the same code.'],
      ['Changing returned objects never changes the store', 'copies', () =>
        same(v('copies'), ['Heron', 'Otter', 'Pike', 'Kestrel']),
        'Some object you handed out (or one handed to you) is the same object the store keeps. Store and return copies.'],
      ['Two stores from one seed are separate', 'separate', () => v('separate') === 3,
        'Removing a boat from one store changed another store made from the same seed array.']
    ]
    return cases.map(([name, key, ok, hint]) => {
      let passed = false
      try {
        passed = ok()
      } catch {}
      const got = s[key].thrown ? `threw ${JSON.stringify(s[key].thrown)}` : JSON.stringify(s[key].value)
      return { name, passed, message: passed ? undefined : hint, output: `scenario ${key}: ${got}` }
    })
  },

  async 'create-read'(t) {
    const dir = await sandbox(t)
    return checkApp(t, dir, [
      {
        name: 'GET /boats/:code answers 200 with the boat',
        req: { path: '/boats/TW-02' },
        ok: (res) => res.status === 200 && same(res.json, otter),
        hint: 'GET /boats/TW-02 should answer 200 with that boat from the store.'
      },
      {
        name: 'GET of an unknown code answers 404',
        req: { path: '/boats/TW-99' },
        ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
        hint: "A code the store does not have should answer 404 with code 'not_found'."
      },
      {
        name: 'POST /boats answers 201 with the new boat',
        req: { method: 'POST', path: '/boats', json: kestrel },
        ok: (res) => res.status === 201 && same(res.json, { ...kestrel, available: true }),
        hint: 'Creating a boat should answer 201 Created with the stored boat, as validateBoat returned it.'
      },
      {
        name: 'The 201 has a location header',
        req: { method: 'POST', path: '/boats', json: { ...kestrel, code: 'TW-10', name: 'Grebe' } },
        ok: (res) => res.status === 201 && res.headers.location === '/boats/TW-10',
        hint: 'A 201 should tell the client where the new boat lives, in a location header.'
      },
      {
        name: 'The new boat can be read back',
        req: { path: '/boats/TW-09' },
        ok: (res) => res.status === 200 && res.json?.name === 'Kestrel',
        hint: 'After POST /boats, GET /boats/TW-09 should find the boat.'
      },
      {
        name: 'GET /boats lists the new boats too',
        req: { path: '/boats' },
        ok: (res) => res.status === 200 && Array.isArray(res.json) && res.json.length === 5,
        hint: 'GET /boats should list the boats from the store, including the ones just created.'
      },
      {
        name: 'A duplicate code answers 409',
        req: { method: 'POST', path: '/boats', json: { ...heron } },
        ok: (res) => res.status === 409 && errorCode(res) === 'conflict',
        hint: "Creating a boat with a code that already exists should answer 409 with code 'conflict'."
      },
      {
        name: 'An invalid boat answers 400',
        req: { method: 'POST', path: '/boats', json: { code: 'TW-11', hourlyCents: 'cheap' } },
        ok: (res) => res.status === 400 && errorCode(res) === 'validation_failed',
        hint: 'Run the body through validateBoat before it reaches the store.'
      },
      {
        name: 'Broken JSON answers 400',
        req: { method: 'POST', path: '/boats', body: '{"code": "TW-12",' },
        ok: (res) => res.status === 400 && errorCode(res) === 'invalid_json',
        hint: 'Read the body with readJson so broken JSON gets its 400.'
      }
    ], { boats: seed })
  },

  async 'update-delete'(t) {
    const dir = await sandbox(t)
    return checkApp(t, dir, [
      {
        name: 'PATCH answers 200 with the whole updated boat',
        req: { method: 'PATCH', path: '/boats/TW-02', json: { hourlyCents: 2700 } },
        ok: (res) => res.status === 200 && same(res.json, { ...otter, hourlyCents: 2700 }),
        hint: 'PATCH should change only the fields sent and answer 200 with the whole boat.'
      },
      {
        name: 'The change is stored',
        req: { path: '/boats/TW-02' },
        ok: (res) => res.status === 200 && res.json?.hourlyCents === 2700 && res.json?.name === 'Otter',
        hint: 'After the PATCH, GET /boats/TW-02 should show the new price and the old name.'
      },
      {
        name: 'PATCH of an unknown code answers 404',
        req: { method: 'PATCH', path: '/boats/TW-99', json: { name: 'Ghost' } },
        ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
        hint: "Updating a boat that does not exist should answer 404 with code 'not_found'."
      },
      {
        name: 'PATCH validates the fields it gets',
        req: { method: 'PATCH', path: '/boats/TW-01', json: { hourlyCents: 'free' } },
        ok: (res) => res.status === 400 && errorCode(res) === 'validation_failed',
        hint: 'Run the PATCH body through validateBoat in partial mode.'
      },
      {
        name: 'PATCH cannot change the code',
        req: { method: 'PATCH', path: '/boats/TW-01', json: { code: 'TW-50' } },
        ok: (res) => res.status === 400 && errorCode(res) === 'validation_failed',
        hint: 'A boat\'s code is its address. A PATCH that tries to change it should be refused with 400.'
      },
      {
        name: 'DELETE answers 204 with no body',
        req: { method: 'DELETE', path: '/boats/TW-03' },
        ok: (res) => res.status === 204 && res.text === '',
        hint: 'Deleting a boat should answer 204 No Content, with an empty body.'
      },
      {
        name: 'A deleted boat is gone',
        req: { path: '/boats/TW-03' },
        ok: (res) => res.status === 404,
        hint: 'After DELETE /boats/TW-03, reading it should answer 404.'
      },
      {
        name: 'Deleting it again answers 404',
        req: { method: 'DELETE', path: '/boats/TW-03' },
        ok: (res) => res.status === 404 && errorCode(res) === 'not_found',
        hint: "Deleting a boat that does not exist should answer 404 with code 'not_found'."
      },
      {
        name: 'Other boats are untouched',
        req: { path: '/boats' },
        ok: (res) => res.status === 200 && same(res.json, [heron, { ...otter, hourlyCents: 2700 }]),
        hint: 'After one PATCH and one DELETE, GET /boats should list exactly the two remaining boats.'
      }
    ], { boats: seed })
  }
}
