import { randomBytes } from 'node:crypto'
import {
  checkCases,
  cookieNamed,
  dilys,
  errorCode,
  hashParts,
  kofi,
  noLeaks,
  people,
  publicOf,
  same,
  seed,
  sunniva
} from '../../shared/checks-lib.mjs'

const HOUR = 60 * 60 * 1000
const SESSION_MS = 8 * HOUR
const clock = 1_900_000_000_000 + 37 * 60 * 1000
const raku = seed[1]
const token = () => randomBytes(32).toString('base64url')
const options = { workshops: seed, staff: people, staffKey: 'check-key-7', sessions: true, clock }
const me = (t, more = {}) => ({
  path: '/me',
  headers: t === undefined ? {} : { cookie: `session=${t}` },
  ...more
})
const signOut = (t) => ({
  method: 'POST',
  path: '/sign-out',
  headers: t === undefined ? {} : { cookie: `session=${t}` }
})
const signedInAs = (person, id) => (res) =>
  res.status === 200 && same(res.json, { staff: publicOf(person, id) })
const notSignedIn = (res) => res.status === 401 && errorCode(res) === 'not_signed_in'

const leakMessages = {
  password: 'A password showed up where it should not.',
  hash: 'A password hash showed up where it should not.',
  token:
    'A session token showed up where it should not. Whoever holds a token is signed in as that person, with no password needed.'
}
const secretsOf = (hashes, tokens) => (c, run) => [
  ...people.map((p) => ({ kind: 'password', value: p.password })),
  ...hashParts(hashes).map((value) => ({ kind: 'hash', value })),
  ...[...tokens, ...run.sessions.map((s) => s.token)].map((value) => ({ kind: 'token', value }))
]

const dropped = (res) => {
  const cookie = cookieNamed(res, 'session')
  if (!cookie || cookie.value !== '') return false
  const gone =
    Number(cookie.attrs['max-age']) <= 0 ||
    (typeof cookie.attrs.expires === 'string' && Date.parse(cookie.attrs.expires) < Date.now())
  return gone && (cookie.attrs.path === undefined || cookie.attrs.path === '/')
}

export const checks = {
  async 'sign-out'(t) {
    const k1 = token()
    const k2 = token()
    const s1 = token()
    const sessions = [
      { token: k1, as: kofi.email, expiresAt: clock + 4 * HOUR },
      { token: k2, as: kofi.email, expiresAt: clock + 4 * HOUR },
      { token: s1, as: sunniva.email, expiresAt: clock + 4 * HOUR }
    ]
    const unmounted = (r) =>
      r.responses[0].status === 404
        ? 'Nothing answered POST /sign-out. Look at whether the sign-in router has that route.'
        : undefined
    const cases = [
      {
        name: 'Signing out answers 204',
        requests: [signOut(k1)],
        ok: (r) => r.res.status === 204 && r.res.text === '',
        hint: (r) => unmounted(r) ?? 'POST /sign-out should answer 204 with no body.'
      },
      {
        name: 'The session is removed from the store',
        requests: [signOut(k1)],
        ok: (r) => r.sessions.find((s) => s.token === k1)?.session === null,
        hint: (r) =>
          unmounted(r) ??
          'After signing out, the session store still holds this session. Deleting only the cookie leaves the token working for anyone who copied it.'
      },
      {
        name: 'The old cookie no longer signs in',
        requests: [signOut(k1), me(k1)],
        ok: (r) => notSignedIn(r.res),
        hint: (r) =>
          unmounted(r) ??
          'The same cookie still signed a request in after signing out. The server has to forget the session, not only the browser.'
      },
      {
        name: 'The browser is told to drop the cookie',
        requests: [signOut(k1)],
        ok: (r) => dropped(r.res),
        hint: (r) =>
          unmounted(r) ??
          'The answer should tell the browser to drop the session cookie: the same name and path, an empty value, and a date in the past.'
      },
      {
        name: 'Only that session ends',
        requests: [signOut(k1), me(s1)],
        ok: (r) => signedInAs(sunniva, 2)(r.res),
        hint: (r) => unmounted(r) ?? 'Kofi signing out should leave Sunniva signed in.'
      },
      {
        name: 'Kofi stays signed in on his other computer',
        requests: [signOut(k1), me(k2)],
        ok: (r) => signedInAs(kofi, 1)(r.res),
        hint: (r) =>
          unmounted(r) ??
          "Signing out ends the session of this cookie only. Kofi's other session should still work."
      },
      {
        name: 'Signing out with no session still answers 204',
        requests: [signOut()],
        ok: (r) => r.res.status === 204 && r.sessions.every((s) => s.session !== null),
        hint: (r) =>
          unmounted(r) ??
          "Someone who is not signed in can still press Sign out, for example in a second tab. Answer 204, and end nobody else's session."
      },
      {
        name: 'Signing out with an unknown token answers 204',
        requests: [signOut(token())],
        ok: (r) => r.res.status === 204,
        hint: (r) =>
          unmounted(r) ??
          'A token the store does not know has nothing to end. Answer 204 all the same.'
      }
    ].map((c) => ({ sessions, ...c }))
    const { details, runs, hashes } = await checkCases(t, cases, options, [
      'src/middleware/readSession.js'
    ])
    if (!runs) return details
    return [
      ...details,
      noLeaks(
        'No token reaches a log or an answer',
        cases,
        runs,
        secretsOf(hashes, [k1, k2, s1]),
        leakMessages
      )
    ]
  },

  async expires(t) {
    const signIn = {
      method: 'POST',
      path: '/sign-in',
      json: { email: dilys.email, password: dilys.password }
    }
    const session = (r) => r.sessions[0]?.session
    const cookie = (r) => cookieNamed(r.res, 'session')
    const signedIn = (r) =>
      r.res.status !== 200 || !cookie(r)
        ? 'The right password should still answer 200 and send the session cookie.'
        : undefined
    const cases = [
      {
        name: 'The session ends eight hours after sign-in',
        requests: [signIn],
        ok: (r) =>
          session(r)?.expiresAt === clock + SESSION_MS &&
          session(r)?.staffId === r.ids[dilys.email],
        hint: (r) => {
          const at = session(r)?.expiresAt
          if (signedIn(r)) return signedIn(r)
          if (at === undefined) return 'The saved session has no expiresAt.'
          if (typeof at === 'number' && Math.abs(at - (Date.now() + SESSION_MS)) < 10 * 60 * 1000) {
            return 'expiresAt is eight hours after the real time, not after the time now() gives. The app reads its clock from now(), so the checks can move it.'
          }
          return 'expiresAt is not eight hours after the time now() gives, counted in milliseconds like now() itself, or the session lost its staffId.'
        }
      },
      {
        name: 'The session follows the clock it is given',
        clock: clock + 3 * HOUR,
        requests: [signIn],
        ok: (r) => session(r)?.expiresAt === clock + 3 * HOUR + SESSION_MS,
        hint: (r) =>
          signedIn(r) ??
          (session(r)?.expiresAt === undefined
            ? 'The saved session has no expiresAt.'
            : 'Started three hours later, the session should end three hours later too. Look at which clock you read.')
      },
      {
        name: 'The cookie lasts as long as the session',
        requests: [signIn],
        ok: (r) => cookie(r)?.attrs['max-age'] === String(SESSION_MS / 1000),
        hint: (r) => {
          if (signedIn(r)) return signedIn(r)
          const age = cookie(r)?.attrs['max-age']
          if (age === undefined)
            return 'The cookie has no Max-Age, so the browser keeps it until it closes, or forever. Give it the same lifetime as the session.'
          return `The cookie's Max-Age is ${age} seconds, not eight hours. Look at which unit the cookie option you used is counted in.`
        }
      },
      {
        name: 'The cookie keeps its other settings',
        requests: [signIn],
        ok: (r) =>
          cookie(r)?.attrs.httponly === true &&
          /^(lax|strict)$/i.test(String(cookie(r)?.attrs.samesite)) &&
          cookie(r)?.attrs.path === '/',
        hint: (r) =>
          signedIn(r) ?? 'The cookie should still be HttpOnly, with SameSite Lax and the path /.'
      }
    ]
    const { details } = await checkCases(t, cases, options, ['src/middleware/readSession.js'])
    return details
  },

  async expired(t) {
    const s = token()
    const d = token()
    const ending = [{ token: s, as: sunniva.email, expiresAt: clock + HOUR }]
    const ended = [
      { token: s, as: sunniva.email, expiresAt: clock - 1 },
      { token: d, as: dilys.email, expiresAt: clock + 4 * HOUR }
    ]
    const stillCounted =
      'This session was still counted after its end. Look at where readSession decides whether a session counts, and which clock it reads.'
    const cases = [
      {
        name: 'A session before its end still counts',
        sessions: ending,
        requests: [me(s, { advance: 59 * 60 * 1000 })],
        ok: (r) => signedInAs(sunniva, 2)(r.res),
        hint: 'One minute before its end, the session should still sign the request in.'
      },
      {
        name: 'A session at its end no longer counts',
        sessions: ending,
        requests: [me(s, { advance: HOUR })],
        ok: (r) => notSignedIn(r.res),
        hint: (r) =>
          r.res.status === 200
            ? 'At the moment of expiresAt this session still counted. A session has ended from the moment the clock reaches expiresAt, not only after it.'
            : 'An ended session should leave req.staff unset, so GET /me answers 401.'
      },
      {
        name: 'A session past its end no longer counts',
        sessions: ending,
        requests: [me(s, { advance: 2 * HOUR })],
        ok: (r) => notSignedIn(r.res),
        hint: stillCounted
      },
      {
        name: 'An ended session is removed from the store',
        sessions: ending,
        requests: [me(s, { advance: 2 * HOUR })],
        ok: (r) => r.sessions.find((x) => x.token === s)?.session === null,
        hint: (r) =>
          r.res.status === 200
            ? stillCounted
            : 'The ended session is still in the store. Remove it when you find it has ended, so the store does not fill up with old sessions.'
      },
      {
        name: 'Another session still counts',
        sessions: ended,
        requests: [me(d)],
        ok: (r) => signedInAs(dilys, 3)(r.res),
        hint: "Sunniva's session ended, and Dilys's did not. Hers should still sign the request in."
      },
      {
        name: 'An ended session cannot change workshops',
        sessions: ended,
        requests: [
          {
            method: 'PATCH',
            path: '/workshops/12',
            json: { seats: 4 },
            headers: { cookie: `session=${s}` }
          }
        ],
        ok: (r) => notSignedIn(r.res),
        hint: stillCounted
      },
      {
        name: 'Reads still work with an ended session',
        sessions: ended,
        requests: [{ path: '/workshops/12', headers: { cookie: `session=${s}` } }],
        ok: (r) => r.res.status === 200 && same(r.res.json, raku),
        hint: 'An ended session is simply not signed in. Reading workshops should still work.'
      }
    ]
    const { details, runs, hashes } = await checkCases(t, cases, options)
    if (!runs) return details
    return [
      ...details,
      noLeaks(
        'No token reaches a log or an answer',
        cases,
        runs,
        secretsOf(hashes, [s, d]),
        leakMessages
      )
    ]
  }
}
