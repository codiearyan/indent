import { randomBytes } from 'node:crypto'
import {
  bowls,
  broken,
  checkCases,
  dilys,
  errorCode,
  hashParts,
  hasMessage,
  isJson,
  kofi,
  noLeaks,
  notImplemented,
  people,
  publicOf,
  same,
  sandbox,
  seed,
  sunniva
} from '../../shared/checks-lib.mjs'

const raku = seed[1]
const token = () => randomBytes(32).toString('base64url')
const tokens = { kofi: token(), sunniva: token(), dilys: token() }
const sessions = [
  { token: tokens.kofi, as: kofi.email },
  { token: tokens.sunniva, as: sunniva.email },
  { token: tokens.dilys, as: dilys.email }
]
const as = (who) => ({ cookie: `session=${tokens[who]}` })
const options = { workshops: seed, staff: people, staffKey: 'check-key-7', sessions: true }
const withSessions = (list) => list.map((c) => ({ sessions, ...c }))

const oldKey = (hint) => (r) =>
  errorCode(r.res) === 'unauthorized'
    ? 'This answer still comes from the old staff key check, which signedIn should replace in front of the workshops router.'
    : hint
const notSignedIn = (res) =>
  res.status === 401 && isJson(res) && errorCode(res) === 'not_signed_in' && hasMessage(res)
const forbidden = (res) =>
  res.status === 403 && isJson(res) && errorCode(res) === 'forbidden' && hasMessage(res)

export const checks = {
  async 'signed-in'(t) {
    const { details } = await checkCases(
      t,
      withSessions([
        {
          name: 'Anyone can list workshops',
          requests: [{ path: '/workshops' }],
          ok: (r) => r.res.status === 200 && same(r.res.json, seed),
          hint: 'GET requests should go through for everyone, signed in or not.'
        },
        {
          name: 'Anyone can read one workshop',
          requests: [{ path: '/workshops/12' }],
          ok: (r) => r.res.status === 200 && same(r.res.json, raku),
          hint: 'GET requests should go through for everyone, signed in or not.'
        },
        {
          name: 'A change from someone not signed in answers 401',
          requests: [{ method: 'POST', path: '/workshops', json: bowls }],
          ok: (r) => notSignedIn(r.res),
          hint: (r) =>
            errorCode(r.res) === 'unauthorized'
              ? 'This answer still comes from the old staff key check, which signedIn should replace in front of the workshops router.'
              : "A change from someone who is not signed in should answer 401 with { error: { code: 'not_signed_in', message } }."
        },
        {
          name: 'The old staff key no longer lets a change through',
          requests: [
            {
              method: 'PATCH',
              path: '/workshops/12',
              json: { seats: 4 },
              headers: { 'x-staff-key': 'check-key-7' }
            }
          ],
          ok: (r) => notSignedIn(r.res),
          hint: 'A change with only the shared staff key should answer 401 not_signed_in now. Anyone who ever saw that key could change workshops; a change has to come from someone signed in.'
        },
        {
          name: 'A refused change changes nothing',
          requests: [
            { method: 'PATCH', path: '/workshops/12', json: { seats: 4 } },
            { method: 'DELETE', path: '/workshops/11' },
            { path: '/workshops' }
          ],
          ok: (r) => r.res.status === 200 && same(r.res.json, seed),
          hint: (r) =>
            r.res.status !== 200
              ? 'GET requests should go through for everyone, signed in or not.'
              : 'A refused request must stop before the route runs. Look at what your middleware does after it answers.'
        },
        {
          name: 'Someone signed in can create a workshop',
          requests: [{ method: 'POST', path: '/workshops', json: bowls, headers: as('kofi') }],
          ok: (r) => r.res.status === 201 && same(r.res.json, { ...bowls, id: 16 }),
          hint: oldKey(
            'A request with the session cookie of a staff member should reach the route and create the workshop.'
          )
        },
        {
          name: 'Someone signed in can change a workshop',
          requests: [
            { method: 'PATCH', path: '/workshops/12', json: { seats: 4 }, headers: as('sunniva') }
          ],
          ok: (r) => r.res.status === 200 && same(r.res.json, { ...raku, seats: 4 }),
          hint: oldKey('A signed-in staff member should be able to change a workshop.')
        },
        {
          name: 'A made-up session cannot change anything',
          requests: [
            {
              method: 'PATCH',
              path: '/workshops/12',
              json: { seats: 4 },
              headers: { cookie: `session=${token()}` }
            }
          ],
          ok: (r) => notSignedIn(r.res),
          hint: oldKey(
            'A session cookie the store does not know is not a sign-in. Look at what signedIn checks.'
          )
        },
        {
          name: 'Signing in and unknown paths still answer',
          requests: [
            {
              method: 'POST',
              path: '/sign-in',
              json: { email: dilys.email, password: dilys.password }
            },
            { method: 'POST', path: '/kilns', json: bowls }
          ],
          ok: (r) =>
            r.responses[0].status === 200 &&
            r.res.status === 404 &&
            errorCode(r.res) === 'not_found',
          hint: 'The guard belongs to the workshops, not the whole app. Signing in must still work, and a path nobody serves should still get the JSON 404.'
        }
      ]),
      options,
      ['src/middleware/allow.js']
    )
    return details
  },

  async allow(t) {
    const units = [
      { name: 'allow() answers 401 when nobody is signed in', roles: ['owner'], want: 401 },
      {
        name: 'allow() answers 403 for another role',
        roles: ['owner'],
        role: 'teacher',
        want: 403
      },
      { name: 'allow() lets the right role through', roles: ['owner'], role: 'owner', want: 200 },
      { name: 'allow() takes several roles', roles: ['owner', 'desk'], role: 'desk', want: 200 },
      {
        name: 'allow() still refuses a role not listed',
        roles: ['owner', 'desk'],
        role: 'teacher',
        want: 403
      }
    ]
    const r = await t.call(await sandbox(t), '.grader/harness.mjs', 'allows', [
      units.map(({ roles, role }) => ({ roles, role }))
    ])
    if (!r.ok) return broken('allow can be called', r.error)
    const unwritten = r.value.find((x) => notImplemented(x.thrown) || notImplemented(x.res?.text))
    if (unwritten) return broken('allow is written', unwritten.thrown ?? unwritten.res.text)
    const unitResults = units.map((u, i) => {
      const { res, thrown } = r.value[i]
      const passed =
        !thrown &&
        res &&
        !res.error &&
        !res.late &&
        (u.want === 200
          ? res.status === 200 && res.json?.reached === true
          : u.want === 401
            ? notSignedIn(res)
            : forbidden(res))
      const message =
        u.want === 200
          ? `A request signed in as ${u.role} should go on to the route when allow(${u.roles.map((x) => `'${x}'`).join(', ')}) guards it.`
          : u.want === 401
            ? "With no req.staff, nobody is signed in: answer 401 with { error: { code: 'not_signed_in', message } }, and the route never runs."
            : "Signed in, but with a role that is not listed: answer 403 with { error: { code: 'forbidden', message } }, and the route never runs. 401 would tell them to sign in, which would not help."
      return {
        name: u.name,
        passed: Boolean(passed),
        message: passed
          ? undefined
          : res?.late
            ? 'It answered, then went on and answered again. Once a middleware answers, it must not call next().'
            : message,
        output: `allow(${u.roles.map((x) => `'${x}'`).join(', ')}) in front of DELETE /workshops/11, ${u.role ? `signed in as ${u.role}` : 'not signed in'}\n${
          thrown
            ? `threw ${thrown}`
            : (res?.error ??
              `-> ${res.status} ${res.text}${res.late ? `\n(then) ${res.late}` : ''}`)
        }`
      }
    })
    const { details } = await checkCases(
      t,
      withSessions([
        {
          name: 'The owner can remove a workshop',
          requests: [{ method: 'DELETE', path: '/workshops/11', headers: as('dilys') }],
          ok: (r) => r.res.status === 204 && !r.workshops.some((w) => w.id === 11),
          hint: 'Dilys owns the studio, and her DELETE should still remove the workshop with 204.'
        },
        {
          name: 'A teacher cannot remove a workshop',
          requests: [{ method: 'DELETE', path: '/workshops/11', headers: as('kofi') }],
          ok: (r) => forbidden(r.res) && r.workshops.some((w) => w.id === 11),
          hint: (r) =>
            r.res.status === 204
              ? 'Kofi is a teacher, and his DELETE removed the workshop. Look at what guards the DELETE route in src/routes/workshops.js.'
              : 'Kofi is signed in but is not the owner: his DELETE should answer 403 forbidden and leave the workshop where it is.'
        },
        {
          name: 'The front desk cannot remove a workshop',
          requests: [{ method: 'DELETE', path: '/workshops/15', headers: as('sunniva') }],
          ok: (r) => forbidden(r.res),
          hint: 'Only the owner removes workshops. A signed-in member of the front desk gets 403 forbidden.'
        },
        {
          name: 'A teacher can still change a workshop',
          requests: [
            { method: 'PATCH', path: '/workshops/12', json: { seats: 4 }, headers: as('kofi') }
          ],
          ok: (r) => r.res.status === 200 && same(r.res.json, { ...raku, seats: 4 }),
          hint: 'Only DELETE is for the owner. Every signed-in member can still create and change workshops.'
        },
        {
          name: 'Someone not signed in still gets 401',
          requests: [{ method: 'DELETE', path: '/workshops/11' }],
          ok: (r) => notSignedIn(r.res),
          hint: 'A DELETE from someone not signed in should answer 401 not_signed_in, not 403.'
        }
      ]),
      options,
      ['src/middleware/signedIn.js']
    )
    return [...unitResults, ...details]
  },

  async 'staff-list'(t) {
    const unmounted = (r) =>
      r.res.status === 404
        ? 'Nothing answered GET /staff. Look at whether createApp mounts the staff router, and where.'
        : undefined
    const cases = withSessions([
      {
        name: 'The owner sees every member',
        requests: [{ path: '/staff', headers: as('dilys') }],
        ok: (r) =>
          r.res.status === 200 &&
          same(
            r.res.json,
            people.map((p, i) => publicOf(p, i + 1))
          ),
        hint: (r) =>
          unmounted(r) ??
          "GET /staff for the owner should answer 200 with every member as { id, name, email, role }, in the store's order, and nothing else."
      },
      {
        name: 'A teacher is not allowed to see it',
        requests: [{ path: '/staff', headers: as('kofi') }],
        ok: (r) => forbidden(r.res),
        hint: (r) =>
          unmounted(r) ??
          (r.res.status === 200
            ? 'Kofi is not the owner and still saw the staff list. Look at what guards /staff where createApp mounts it.'
            : 'A signed-in member who is not the owner should get 403 forbidden.')
      },
      {
        name: 'The front desk is not allowed to see it',
        requests: [{ path: '/staff', headers: as('sunniva') }],
        ok: (r) => forbidden(r.res),
        hint: (r) =>
          unmounted(r) ?? 'A signed-in member who is not the owner should get 403 forbidden.'
      },
      {
        name: 'Someone not signed in gets 401',
        requests: [{ path: '/staff' }],
        ok: (r) => notSignedIn(r.res),
        hint: (r) =>
          unmounted(r) ??
          (r.res.status === 200
            ? 'Someone who is not signed in saw the staff list. This read is not open to everyone, so it needs its own guard.'
            : 'Someone not signed in should get 401 not_signed_in.')
      },
      {
        name: 'Workshops are still open to read',
        requests: [{ path: '/workshops' }],
        ok: (r) => r.res.status === 200 && same(r.res.json, seed),
        hint: 'The staff list has its own guard. Reading workshops should stay open to everyone.'
      }
    ])
    const { details, runs, hashes } = await checkCases(t, cases, options, [
      'src/middleware/allow.js',
      'src/middleware/signedIn.js'
    ])
    if (!runs) return details
    const secrets = () => [
      ...people.map((p) => ({ kind: 'password', value: p.password })),
      ...hashParts(hashes).map((value) => ({ kind: 'hash', value })),
      ...Object.values(tokens).map((value) => ({ kind: 'token', value }))
    ]
    return [
      ...details,
      noLeaks('No password, hash or token reaches a log or an answer', cases, runs, secrets, {
        password: 'A password showed up where it should not.',
        hash: 'A password hash showed up in the staff list or the log. A list of hashes is exactly what someone needs to guess passwords offline. Leave the hash out of every member.',
        token:
          'A session token showed up where it should not. Whoever holds a token is signed in as that person.'
      })
    ]
  }
}
