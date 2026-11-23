import { randomUUID } from 'node:crypto'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/cookies.js'
const token = () => randomUUID().slice(0, 8)
const HOUR = 60 * 60 * 1000
// A time of the check's own, years before today, so nothing depends on the clock of this computer.
const someTime = () => 1_000_000_000_000 + Math.floor(Math.random() * 10_000_000) * 1000

const pairsOf = (header) =>
  (header ?? '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)

const sameSet = (a, b) =>
  a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

const ATTRIBUTES = /^(path|domain|max-age|expires|secure|httponly|samesite)\b/i

function playlistCase(name, { setCookies, refused = false }) {
  const presenter = `Presenter ${token()}`
  const key = `key-${token()}`
  const playlist = `Tonight's playlist, check ${token()}`
  const expected = setCookies.map((c) => c.split(';')[0].trim())
  const routes = [
    {
      method: 'POST',
      path: '/studio/sign-in',
      when: { header: 'content-type', startsWith: 'application/json' },
      answers: [
        refused
          ? { status: 403, body: 'That presenter and key do not go together.' }
          : {
              status: 200,
              headers: { 'set-cookie': setCookies },
              body: `Signed in as ${presenter}.`
            }
      ]
    },
    {
      method: 'POST',
      path: '/studio/sign-in',
      answers: [{ status: 415, body: 'Send the presenter and the key as JSON.' }]
    },
    {
      method: 'GET',
      path: '/studio/playlist',
      when: { header: 'cookie', pairs: expected },
      answers: [{ status: 200, body: playlist }]
    },
    { method: 'GET', path: '/studio/playlist', answers: [{ status: 401, body: 'Sign in first.' }] }
  ]
  return {
    name,
    args: ['$base', presenter, key],
    headers: ['content-type', 'cookie'],
    bodies: true,
    routes,
    judge: ({ received, outcome }) => {
      if (received.length === 0) {
        return (
          fetchMistake('playlistAs', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      const signIn = received[0]
      if (signIn.path !== '/studio/sign-in')
        return `playlistAs sent its first request to ${signIn.path}. It signs in first, at the path the task gives.`
      if (signIn.method !== 'POST')
        return `The sign-in was a ${signIn.method}. A sign-in sends data, with POST.`
      if (!signIn.headers['content-type']?.toLowerCase().startsWith('application/json'))
        return "The sign-in's content-type did not say JSON, so the server could not read it. Part 2 showed how to send JSON."
      let sent
      try {
        sent = JSON.parse(signIn.body)
      } catch {
        return 'The body of the sign-in is not JSON.'
      }
      if (sent?.presenter !== presenter || sent?.key !== key)
        return 'The JSON of the sign-in does not hold the presenter and the key playlistAs was handed, under the names presenter and key.'
      const extra = Object.keys(sent).filter((k) => k !== 'presenter' && k !== 'key')
      if (extra.length)
        return `The JSON of the sign-in also holds ${extra.join(', ')}. It holds the presenter and the key, and nothing else.`
      if (refused) {
        if (received.length > 1)
          return 'The server refused the sign-in, but playlistAs went on to ask for the playlist. Without a sign-in there is nothing to ask with: throw an Error at once.'
        if (outcome.kind === 'threw' && outcome.notError)
          return 'playlistAs threw text, not an Error. The issue on the families of statuses shows how to make one.'
        if (outcome.kind === 'threw') return null
        return `The server refused the sign-in with a 403, so playlistAs must throw an Error. It gave back ${outcome.kind === 'returned' ? kindText(outcome.value) : 'nothing'}.`
      }
      if (received.length === 1) {
        return (
          fetchMistake('playlistAs', outcome) ??
          'playlistAs signed in, but never asked for the playlist.'
        )
      }
      if (received.length > 2)
        return `playlistAs sent ${received.length} requests. Two are enough: the sign-in and the playlist.`
      const ask = received[1]
      if (ask.path !== '/studio/playlist')
        return `The second request went to ${ask.path}, not to the playlist.`
      if (ask.method !== 'GET')
        return `The playlist was asked for with ${ask.method}. Reading it is a GET.`
      const cookie = ask.headers.cookie
      if (cookie === undefined)
        return 'The playlist request carried no cookie header, so to the server it came from someone who never signed in. fetch keeps no cookies by itself: send back what the sign-in set.'
      const got = pairsOf(cookie)
      if (got.some((p) => ATTRIBUTES.test(p)))
        return "The cookie header carried the cookies' attributes too, like Path or Max-Age. Only name=value goes back to the server: the attributes are instructions for whoever keeps the cookie."
      if (/,/.test(cookie) && !sameSet(got, expected))
        return 'The cookie header has a comma in it. Cookies in one cookie header are separated by a semicolon and a space. If you read the set-cookie lines with headers.get, it joined them with commas: the lesson shows how to get them one by one.'
      if (!sameSet(got, expected)) {
        const names = expected.map((p) => p.slice(0, p.indexOf('=')))
        const gotNames = got.map((p) => p.split('=')[0])
        const stray = got.find((p) => !p.includes('=') || !names.includes(p.split('=')[0]))
        if (stray)
          return `The cookie header carried '${stray}', which is not one of the cookies the sign-in set. A set-cookie line can have a comma of its own, inside an Expires date, so cutting the lines apart at commas breaks them. The lesson shows how to read them one by one.`
        const missing = names.filter((n) => !gotNames.includes(n))
        if (missing.length)
          return `The cookie header did not carry ${missing.join(' and ')}. Send back every cookie the sign-in set.`
        return 'The cookie header has the right cookies, but not every value is whole. A value may itself contain =: only the first = separates the name from the value, and everything up to the first semicolon belongs to it.'
      }
      const mistake = fetchMistake('playlistAs', outcome)
      if (mistake) return mistake
      if (outcome.value.kind !== 'string')
        return `playlistAs gave back ${kindText(outcome.value)}, not the text of the playlist.`
      if (outcome.value.value !== playlist)
        return 'playlistAs did not give back the body of the playlist answer.'
      return null
    }
  }
}

/** Why a cookie does or does not go with a request, in the check's own words. */
function verdict(c, url, now) {
  const host = url.hostname
  if (c.hostOnly && host !== c.domain)
    return {
      goes: false,
      why: `it belongs to ${c.domain} alone, with no Domain attribute, and this request is for ${host}`
    }
  if (!c.hostOnly && host !== c.domain && !host.endsWith(`.${c.domain}`))
    return {
      goes: false,
      why: `its domain is ${c.domain}, and ${host} is neither that host nor one under it. A host under it ends with a dot and the domain, not only the same letters`
    }
  const p = url.pathname
  if (!(
    p === c.path ||
    (p.startsWith(c.path) && (c.path.endsWith('/') || p[c.path.length] === '/'))
  ))
    return {
      goes: false,
      why: `its path is ${c.path}, and ${p} is not that path or one under it. A path is only under it when the next character is a slash`
    }
  if (c.secure && url.protocol !== 'https:')
    return { goes: false, why: 'it is Secure, and this request is not over https' }
  if (c.expires !== null && c.expires <= now) return { goes: false, why: 'it expired before now' }
  return { goes: true }
}

function missedWhy(c, url) {
  if (c.httpOnly)
    return `${c.name} is HttpOnly. That keeps it from a page's scripts, not from requests: it still goes with every request it matches.`
  if (c.expires === null)
    return `${c.name} has no expires time: it lives until the browser closes, so it still goes.`
  if (!c.hostOnly && url.hostname !== c.domain)
    return `${c.name} has the domain ${c.domain}, so it also goes to hosts under it, like ${url.hostname}.`
  return `${c.name} matches this request's host, path and scheme, and has not expired, so it goes with it.`
}

function headerCase(name, jar, address, now) {
  const url = new URL(address)
  const expected = jar.filter((c) => verdict(c, url, now).goes).map((c) => `${c.name}=${c.value}`)
  return {
    name,
    args: [jar, address, now],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'cookieHeader stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'string')
        return `cookieHeader gave back ${kindText(v)}, not the text of a cookie header.`
      if (expected.length === 0) {
        if (v.value === '') return null
      } else if (sameSet(v.value.split('; '), expected)) return null
      if (
        /,/.test(v.value) &&
        sameSet(
          v.value.split(',').map((p) => p.trim()),
          expected
        )
      )
        return 'The cookies are separated by commas. In a cookie header they are separated by a semicolon and a space.'
      const got = pairsOf(v.value)
      if (got.some((p) => ATTRIBUTES.test(p)))
        return 'The header carries more than name=value. Only the name and the value of each cookie go in it.'
      for (const c of jar) {
        const v2 = verdict(c, url, now)
        if (!v2.goes && got.includes(`${c.name}=${c.value}`))
          return `${c.name} must not go with this request: ${v2.why}.`
      }
      const missed = jar.filter(
        (c) => verdict(c, url, now).goes && !got.includes(`${c.name}=${c.value}`)
      )
      if (url.port && missed.length > 0 && missed.length === expected.length)
        return `${missed[0].name} should go with this request. Cookies do not look at the port: the host and the path decide.`
      const lapsed = missed.find((c) => c.expires !== null && !c.httpOnly)
      if (lapsed)
        return `${lapsed.name} has not expired at the time cookieHeader is handed, so it goes with this request. Compare expires with that now, not the clock.`
      if (missed.length) return missedWhy(missed[0], url)
      return expected.length === 0
        ? "No cookie goes with this request, so the header is empty text, ''."
        : 'The right cookies are there, but not written as name=value, separated by a semicolon and a space.'
    }
  }
}

function cookie(name, fields) {
  return {
    name,
    value: fields.value ?? token(),
    domain: fields.domain,
    hostOnly: fields.hostOnly ?? true,
    path: fields.path ?? '/',
    secure: fields.secure ?? false,
    httpOnly: fields.httpOnly ?? false,
    expires: fields.expires === undefined ? null : fields.expires
  }
}

function headerCases() {
  const site = `fen${token()}.example`
  const now = someTime()
  const later = now + 2 * HOUR
  const earlier = now - 2 * HOUR
  const jar = [
    cookie('session', {
      domain: site,
      path: '/studio',
      secure: true,
      httpOnly: true,
      expires: later
    }),
    cookie('lang', { domain: site, hostOnly: false, expires: later }),
    cookie('quiz', { domain: site, expires: earlier }),
    cookie('tab', { domain: site, path: '/studio' })
  ]
  return [
    headerCase(
      'Sends the cookies that match, HttpOnly ones too',
      jar,
      `https://${site}/studio/playlist`,
      now
    ),
    headerCase('Sends a cookie at exactly its path', jar, `https://${site}/studio`, now),
    headerCase(
      'Leaves out a path that only starts with the same letters',
      jar,
      `https://${site}/studios/old`,
      now
    ),
    headerCase('Leaves out cookies for a path above theirs', jar, `https://${site}/shows`, now),
    headerCase(
      'Leaves out Secure cookies without https',
      jar,
      `http://${site}/studio/playlist`,
      now
    ),
    headerCase(
      'Sends a Domain cookie to a host under it, and only that',
      jar,
      `https://shop.${site}/studio/mugs`,
      now
    ),
    headerCase(
      'Leaves out a host that only ends with the same letters',
      jar,
      `https://west${site}/studio`,
      now
    ),
    headerCase('Ignores the port', jar, `https://${site}:8443/studio/`, now),
    headerCase(
      'Leaves out cookies once they expire',
      jar,
      `https://${site}/studio/playlist`,
      later + HOUR
    ),
    headerCase('Gives empty text when nothing goes', jar, `https://other${token()}.example/`, now)
  ]
}

function attributesOf(text) {
  const [first, ...rest] = text.split(';').map((p) => p.trim())
  const attrs = new Map()
  for (const part of rest.filter(Boolean)) {
    const at = part.indexOf('=')
    const name = (at < 0 ? part : part.slice(0, at)).trim().toLowerCase()
    attrs.set(name, at < 0 ? '' : part.slice(at + 1).trim())
  }
  return { first, attrs }
}

function sessionCase(name, path, seconds) {
  const id = randomUUID()
  return {
    name,
    args: [id, path, seconds],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'sessionCookie stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'string')
        return `sessionCookie gave back ${kindText(v)}, not the text of a set-cookie header.`
      if (/^set-cookie\s*:/i.test(v.value))
        return 'The text starts with the name of the header. sessionCookie gives back only its value, the part after set-cookie: .'
      const { first, attrs } = attributesOf(v.value)
      if (first !== `session=${id}`)
        return first.startsWith('session=')
          ? 'The cookie is called session, but its value is not the id sessionCookie was handed, exactly as it is.'
          : 'The text must start with the cookie itself: its name, session, then =, then the id. The attributes come after it.'
      if (attrs.has('domain'))
        return 'The cookie has a Domain attribute, which sends it to every host under that domain too. Without one, it goes back only to the host that set it.'
      if (!attrs.has('path'))
        return 'The cookie has no Path attribute. Without one, a browser picks a path from the address of the sign-in, which may not be the one the task asks for.'
      if (attrs.get('path') !== path)
        return `The Path attribute is not the path sessionCookie was handed, exactly as it is.`
      if (!attrs.has('max-age'))
        return attrs.has('expires')
          ? 'The cookie says when it ends with Expires, which needs a date and a clock. sessionCookie is handed a number of seconds: the lesson names the attribute that takes those.'
          : 'The cookie does not say how long it lasts, so it would end when the browser closes.'
      const age = Number(attrs.get('max-age'))
      if (age === seconds * 1000)
        return 'Max-Age is a thousand times too big. It counts seconds, like the number sessionCookie is handed.'
      if (age !== seconds) return 'Max-Age is not the number of seconds sessionCookie was handed.'
      if (!attrs.has('secure'))
        return 'The cookie can still travel over plain http. One attribute keeps it to https.'
      if (!attrs.has('httponly'))
        return "A page's scripts can still read this cookie. One attribute keeps it out of their reach, so a script that should not be there cannot copy it."
      const site = attrs.get('samesite')
      if (site === undefined)
        return 'The cookie does not say whether it goes with requests that other sites start. Say it with the attribute the lesson names.'
      if (site.toLowerCase() === 'none')
        return 'SameSite=None sends the cookie with requests that every other site starts, which is the opposite of what the task asks.'
      if (site.toLowerCase() === 'strict')
        return 'SameSite=Strict also keeps the cookie off a link someone follows from another site, so a presenter who opens the studio from an email would look signed out. The task asks for the value that still allows that.'
      if (site.toLowerCase() !== 'lax')
        return `SameSite=${site} is not one of the values the lesson lists.`
      return null
    }
  }
}

function whoCase(name, cookieOf, expect) {
  const now = someTime()
  const people = { a: `Mererid ${token()}`, b: `Cai ${token()}` }
  const ids = { a: token() + token(), b: `${token()}==`, old: token() + token() }
  const sessions = {
    [ids.a]: { presenter: people.a, expires: now + HOUR },
    [ids.b]: { presenter: people.b, expires: now + 3 * HOUR },
    [ids.old]: { presenter: `Iolo ${token()}`, expires: now - HOUR }
  }
  const header = cookieOf(ids, people)
  const expected = expect === null ? null : people[expect]
  return {
    name,
    args: [header, sessions, now],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') {
        if (header === null && /null/.test(outcome.message))
          return 'whoIsThis stopped with an error for a request with no cookie header. cookie is null then: handle that before you read anything from it.'
        return 'whoIsThis stopped with an error. Read it below.'
      }
      const v = outcome.value
      if (expected === null) {
        if (v.kind === 'null') return null
        if (v.kind === 'undefined')
          return 'whoIsThis gave back undefined. When nobody is signed in, the task asks for null.'
        if (v.kind === 'string' && header?.includes(`presenter=${v.value}`))
          return `whoIsThis believed the presenter cookie. Anyone can put any name in a cookie, so it proves nothing. Who is signed in comes only from a session the server made and still keeps.`
        if (header?.includes(`session=${ids.old}`))
          return 'This session expired before now, so it no longer signs anyone in.'
        if (header === null) return 'The request had no cookie header, so nobody is signed in.'
        if (/(^|;\s*)session=/.test(header))
          return "The server keeps no session with this request's id. A session counts only when the server made it."
        return 'The request has no cookie called exactly session, so nobody is signed in. A cookie whose name only contains the word is another cookie.'
      }
      if (v.kind === 'string' && v.value === expected) return null
      if (v.kind === 'string' && header.includes(`presenter=${v.value}`))
        return 'whoIsThis believed the presenter cookie. Anyone can put any name in a cookie, so it proves nothing. Who is signed in comes only from the session cookie, looked up in the sessions the server keeps.'
      if (v.kind === 'object')
        return 'whoIsThis gave back the whole session. The task asks for the presenter only.'
      if (expect === 'b')
        return 'whoIsThis did not find this session, which has not expired at the time it is handed. Its id has = in it: only the first = in a cookie separates the name from the value.'
      return `This request's session belongs to a presenter, and has not expired at the time whoIsThis is handed, but whoIsThis gave back ${kindText(v)}. Compare expires with that now, not the clock. Cookies in the header may come with or without a space after each semicolon.`
    }
  }
}

export const checks = {
  signin(t) {
    return cases(t, {
      file: FILE,
      fn: 'playlistAs',
      list: [
        playlistCase('Brings back the one cookie the sign-in set', {
          setCookies: [
            `session=${token()}${token()}; Path=/studio; Max-Age=3600; HttpOnly; SameSite=Lax`
          ]
        }),
        playlistCase('Brings back every cookie, one with a date in it', {
          setCookies: [
            `session=${token()}; Path=/studio; HttpOnly; SameSite=Strict`,
            `shown=${token()}; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT`
          ]
        }),
        playlistCase('Keeps a value that has = in it', {
          setCookies: [`pass=${token()}==; Path=/studio; HttpOnly`, `layout=wide; Max-Age=600`]
        }),
        playlistCase('Throws when the sign-in is refused', { setCookies: [], refused: true })
      ]
    })
  },

  header(t) {
    return cases(t, { file: FILE, fn: 'cookieHeader', list: headerCases() })
  },

  session(t) {
    return cases(t, {
      file: FILE,
      fn: 'sessionCookie',
      list: [
        sessionCase('Writes a session cookie for a path', `/desk-${token()}`, 3600),
        sessionCase('Writes a session cookie for the whole site', '/', 900),
        sessionCase('Writes a session cookie for a long shift', `/studio/${token()}`, 43200)
      ]
    })
  },

  trust(t) {
    return cases(t, {
      file: FILE,
      fn: 'whoIsThis',
      list: [
        whoCase('Finds the presenter of a session', (ids) => `session=${ids.a}`, 'a'),
        whoCase(
          'Trusts the session, not the presenter cookie',
          (ids, p) => `presenter=${p.b}; session=${ids.a}`,
          'a'
        ),
        whoCase(
          'Reads cookies without a space between them',
          (ids) => `theme=dark;session=${ids.a};lang=cy`,
          'a'
        ),
        whoCase('Keeps an = inside a session id', (ids) => `session=${ids.b}`, 'b'),
        whoCase('Gives null for a presenter cookie alone', (_, p) => `presenter=${p.a}`, null),
        whoCase(
          'Gives null for a session the server never made',
          () => `session=${token()}${token()}`,
          null
        ),
        whoCase('Gives null for an expired session', (ids) => `session=${ids.old}`, null),
        whoCase(
          'Gives null for another cookie whose name has session in it',
          (ids) => `oldsession=${ids.a}`,
          null
        ),
        whoCase('Gives null when there is no cookie header', () => null, null)
      ]
    })
  }
}
