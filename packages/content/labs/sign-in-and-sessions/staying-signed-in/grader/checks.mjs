import { randomBytes } from 'node:crypto'
import {
  broken,
  checkCases,
  cookieNamed,
  errorCode,
  hashParts,
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

const signIn = (who, password = who.password) => ({
  method: 'POST',
  path: '/sign-in',
  json: { email: who.email, password }
})
const me = (cookie) => ({ path: '/me', headers: cookie === undefined ? {} : { cookie } })
const options = { workshops: seed, staff: people, staffKey: 'check-key-7', sessions: true }
const token = () => randomBytes(32).toString('base64url')

export const leakMessages = {
  password:
    'A password showed up where it should not. Anyone who can read the log, or the answer, could sign in as that person.',
  hash: 'A password hash showed up where it should not. With the hash, a password can be guessed on any computer, without ever asking the API.',
  token:
    'A session token showed up where it should not. Whoever holds a token is signed in as that person, with no password needed. Only the cookie may carry it.'
}

/** Every password, hash and session token of a run, for noLeaks(). */
export const secretsOf = (hashes) => (c, run) =>
  [
    ...people.map((p) => ({ kind: 'password', value: p.password })),
    ...hashParts(hashes).map((value) => ({ kind: 'hash', value })),
    ...run.sessions.map((s) => ({ kind: 'token', value: s.token })),
    ...run.responses.flatMap((res) =>
      (res.cookies ?? []).map((line) => ({
        kind: 'token',
        value: line.split(';')[0].split('=')[1] ?? ''
      }))
    )
  ].filter((secret) => secret.kind !== 'token' || secret.value.length >= 16)

export const checks = {
  async token(t) {
    const n = 60
    const r = await t.call(await sandbox(t), '.grader/harness.mjs', 'tokens', [n])
    if (!r.ok) return broken('newToken can be called', r.error)
    const { tokens, thrown, calls } = r.value
    if (thrown) {
      return notImplemented(thrown)
        ? broken('newToken is written', thrown)
        : [
            {
              name: 'newToken returns a token',
              passed: false,
              message: 'newToken threw an error. Read it below.',
              output: thrown
            }
          ]
    }
    const sample = `newToken() gave, among ${n} calls:\n${tokens
      .slice(0, 4)
      .map((x) => JSON.stringify(x))
      .join('\n')}`
    const text = tokens.every((x) => typeof x === 'string')
    const long = text && tokens.every((x) => x.length >= 43)
    const safe = text && tokens.every((x) => /^[A-Za-z0-9_-]+$/.test(x))
    const distinct = new Set(tokens).size === n
    const fromCrypto = calls.random >= n
    const result = (name, passed, message, output = sample) => ({
      name,
      passed,
      message: passed ? undefined : message,
      output
    })
    return [
      result('Returns text', text, 'newToken should return the token as a string.'),
      result(
        'Long enough that guessing is hopeless',
        long,
        'A token is shorter than 32 random bytes written out: 43 characters in base64url, 64 in hex. A shorter token is easier to guess.'
      ),
      result(
        'Safe to put in a cookie as it is',
        safe,
        'A token has characters a cookie would have to encode, such as + / = or spaces. Write the bytes as base64url or hex.'
      ),
      result(
        'Never the same twice, even at the same moment',
        distinct,
        'Two tokens came out the same while Math.random and the clock were held still. A token built from them can be worked out by anyone who knows roughly when it was made.',
        `${sample}\n\n${new Set(tokens).size} of ${n} tokens were different.`
      ),
      result(
        'Made from random bytes of node:crypto',
        fromCrypto,
        'The tokens were not made from the random bytes node:crypto gives. Something built from a counter, the time or Math.random follows a pattern someone can work out.',
        `${sample}\n\nnode:crypto was asked for random bytes ${calls.random} time(s) in ${n} calls.`
      )
    ]
  },

  async cookie(t) {
    const session = (r) => cookieNamed(r.responses[0], 'session')
    const signedInFirst = (r) =>
      r.responses[0].status !== 200
        ? 'The right password did not answer 200 here. The sign-in from the last issue should keep working.'
        : !session(r)
          ? 'A sign-in that works should send a cookie named session. Nothing like it came back.'
          : undefined
    const cases = [
      {
        name: 'A sign-in that works sends a session cookie',
        requests: [signIn(kofi)],
        ok: (r) => r.res.status === 200 && Boolean(session(r)?.value),
        hint: (r) => signedInFirst(r) ?? 'The session cookie came back empty.'
      },
      {
        name: 'Scripts on the page cannot read it',
        requests: [signIn(kofi)],
        ok: (r) => session(r)?.attrs.httponly === true,
        hint: (r) =>
          signedInFirst(r) ??
          'Any script on the page can read this cookie, so one bad script would carry the session away. Look at the cookie options that keep it from scripts.'
      },
      {
        name: "It goes only with requests from the studio's own pages",
        requests: [signIn(kofi)],
        ok: (r) => /^(lax|strict)$/i.test(String(session(r)?.attrs.samesite)),
        hint: (r) =>
          signedInFirst(r) ??
          'The cookie should have SameSite set to Lax (or Strict), so another site cannot make a browser send it along with a change.'
      },
      {
        name: 'It is sent for every path of the API',
        requests: [signIn(kofi)],
        ok: (r) => session(r)?.attrs.path === '/',
        hint: (r) =>
          signedInFirst(r) ??
          'The cookie should have the path /, so it goes with requests to /me and /workshops alike.'
      },
      {
        name: 'Its token is saved as a session for that member',
        requests: [signIn(kofi)],
        ok: (r) =>
          r.sessions.some(
            (s) => s.token === session(r)?.value && s.session?.staffId === r.ids[kofi.email]
          ),
        hint: (r) =>
          signedInFirst(r) ??
          (r.sessions.length === 0
            ? 'Nothing was saved in the session store. Without a saved session, the next request has nothing to find.'
            : "The cookie does not carry a token that the session store holds with this member's staffId.")
      },
      {
        name: 'The answer is still the member, with no token in it',
        requests: [signIn(kofi)],
        ok: (r) =>
          r.res.status === 200 &&
          same(r.res.json, { staff: publicOf(kofi, 1) }) &&
          !((session(r)?.value ?? '').length >= 16 && r.res.text.includes(session(r).value)),
        hint: (r) =>
          signedInFirst(r) ??
          'The body should stay { staff: { id, name, email, role } }. The token travels only in the cookie, where scripts cannot reach it.'
      },
      {
        name: 'Each sign-in gets a token of its own',
        requests: [signIn(kofi), signIn(kofi)],
        ok: (r) => {
          const [a, b] = r.responses.map((res) => cookieNamed(res, 'session')?.value)
          return Boolean(a && b && a !== b && r.sessions.length >= 2)
        },
        hint: (r) =>
          signedInFirst(r) ??
          'Two sign-ins should each make a new token and save a new session. Kofi on two computers is two sessions.'
      },
      {
        name: 'A refused sign-in sends no cookie and saves nothing',
        requests: [signIn(sunniva, 'oxide-blue-78')],
        ok: (r) =>
          r.res.status === 401 && !cookieNamed(r.res, 'session') && r.sessions.length === 0,
        hint: 'A wrong password should still answer 401, with no session cookie and no session saved.'
      }
    ]
    const { details, runs, hashes } = await checkCases(t, cases, options, [
      'src/tokens.js',
      'src/middleware/readSession.js'
    ])
    if (!runs) return details
    return [
      ...details,
      noLeaks(
        'No token, password or hash reaches a log or the body',
        cases,
        runs,
        secretsOf(hashes),
        leakMessages
      )
    ]
  },

  async read(t) {
    const a = token()
    const other = token()
    const signedIn = (r) =>
      r.res.status === 200 && same(r.res.json, { staff: publicOf(sunniva, 2) })
    const notSignedIn = (r) => r.res.status === 401 && errorCode(r.res) === 'not_signed_in'
    const sessions = [{ token: a, as: sunniva.email }]
    const missed =
      'This request carried the cookie of a saved session and was still not signed in. Look at how readSession finds the session cookie in the request, and whether createApp mounts it before the routes.'
    const cases = [
      {
        name: 'A session cookie signs the request in',
        sessions,
        requests: [me(`session=${a}`)],
        ok: signedIn,
        hint: (r) =>
          r.res.status === 200
            ? 'GET /me should answer with exactly the member of this session as { id, name, email, role }. Look at what req.staff is set to.'
            : missed
      },
      {
        name: 'The cookie is found among others',
        sessions,
        requests: [me(`theme=dark; session=${a}; lang=cy`)],
        ok: signedIn,
        hint: (r) =>
          r.res.status === 200
            ? 'GET /me should answer with exactly the member of this session as { id, name, email, role }. Look at what req.staff is set to.'
            : 'This request had its session cookie between two others and was not signed in. A browser sends every cookie of the site in one Cookie header, split by semicolons, and the session cookie may be anywhere in it.'
      },
      {
        name: 'A cookie with a longer name does not count',
        sessions,
        requests: [me(`oldsession=${a}`)],
        ok: notSignedIn,
        hint: 'A cookie named oldsession signed this request in. Only a cookie named exactly session counts, so look at how the name is matched.'
      },
      {
        name: 'No cookie is not signed in',
        sessions,
        requests: [me()],
        ok: notSignedIn,
        hint: 'A request with no cookie at all should leave req.staff unset, so GET /me answers 401.'
      },
      {
        name: 'An unknown token is not signed in',
        sessions,
        requests: [me(`session=${other}`)],
        ok: notSignedIn,
        hint: 'A token the session store does not know should leave req.staff unset.'
      },
      {
        name: 'An empty session cookie is not signed in',
        sessions,
        requests: [me('session=')],
        ok: notSignedIn,
        hint: 'An empty session cookie should leave req.staff unset.'
      },
      {
        name: 'A session whose member is gone is not signed in',
        sessions: [{ token: a, staffId: 99 }],
        requests: [me(`session=${a}`)],
        ok: notSignedIn,
        hint: 'This session belongs to a staff id the staff store no longer has. Leave req.staff unset when the member is not found.'
      },
      {
        name: 'Reads work with or without a session',
        sessions,
        requests: [
          { path: '/workshops' },
          { path: '/workshops/12', headers: { cookie: `session=${other}` } }
        ],
        ok: (r) => r.responses.every((res) => res.status === 200),
        hint: 'Workshops should still be read by anyone. Whatever readSession finds, it should hand the request on.'
      }
    ]
    const { details, runs, hashes } = await checkCases(t, cases, options)
    if (!runs) return details
    const secrets = (c, run) => [
      ...secretsOf(hashes)(c, run),
      { kind: 'token', value: a },
      { kind: 'token', value: other }
    ]
    return [
      ...details,
      noLeaks(
        'No token, password or hash reaches a log or an answer',
        cases,
        runs,
        secrets,
        leakMessages
      )
    ]
  }
}
