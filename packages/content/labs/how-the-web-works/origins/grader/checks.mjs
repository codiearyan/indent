import { randomUUID } from 'node:crypto'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/origins.js'
const token = () => randomUUID().slice(0, 8)

const partsOf = (value) =>
  String(value ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

const sameSet = (a, b) =>
  a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

/** The headers object a function gave back, with names in small letters, or a message. */
function headersOf(fn, value) {
  if (value?.kind !== 'object')
    return { problem: `${fn} gave back ${kindText(value)}, not an object of headers.` }
  const headers = {}
  for (const [name, v] of Object.entries(value.value)) headers[name.toLowerCase()] = v
  const notText = Object.entries(headers).find(([, v]) => typeof v !== 'string')
  if (notText)
    return { problem: `The value of ${notText[0]} is not text. A header's value is always text.` }
  return { headers }
}

function sameCase(name, a, b) {
  const expected = new URL(a).origin === new URL(b).origin
  return {
    name,
    args: [a, b],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'sameOrigin stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'boolean') return `sameOrigin gave back ${kindText(v)}, not true or false.`
      if (v.value === expected) return null
      const [x, y] = [new URL(a), new URL(b)]
      if (expected) {
        if (a.split('/')[2] === b.split('/')[2])
          return 'These two addresses differ only after the host, in the path or the question mark part, which is not part of the origin.'
        return "These two addresses have the same origin once the scheme and host are read the way URL reads them: a host ignores capital letters, and a port that is the scheme's usual one is the same as no port."
      }
      if (x.protocol !== y.protocol)
        return `The hosts match, but one address is ${x.protocol.slice(0, -1)} and the other ${y.protocol.slice(0, -1)}. The scheme is part of the origin.`
      if (x.hostname === y.hostname)
        return 'The hosts match, but the ports do not. The port is part of the origin, even when one address does not write it.'
      return `The hosts are ${x.hostname} and ${y.hostname}: different hosts are different origins, even when one sits under the other or starts the same way.`
    }
  }
}

function readCase(name, { allow, credentials, withCookies, same = false }) {
  const path = `/p-${token()}/api/now-playing`
  const site = `https://hall${token()}.example`
  const page = same ? `$base/whats-on.html` : `${site}/whats-on.html`
  const body = `{"song":"Check song ${token()}"}`
  const headers = { 'content-type': 'application/json', vary: 'Origin' }
  const allowed = typeof allow === 'function' ? allow(site) : allow
  if (allowed !== undefined) headers['access-control-allow-origin'] = allowed
  if (credentials !== undefined) headers['access-control-allow-credentials'] = credentials
  const mayRead =
    same ||
    (withCookies ? allowed === site && credentials === 'true' : allowed === '*' || allowed === site)
  return {
    name,
    args: [page, `$base${path}`, withCookies],
    headers: ['origin'],
    routes: [
      {
        method: 'GET',
        path,
        when: { header: 'origin', value: site },
        answers: [{ status: 200, headers, body }]
      },
      {
        method: 'GET',
        path,
        answers: [
          { status: 200, headers: { 'content-type': 'application/json', vary: 'Origin' }, body }
        ]
      }
    ],
    judge: ({ received, outcome, base }) => {
      if (received.length === 0) {
        return (
          fetchMistake('readAsPage', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      if (received.length > 1) return `readAsPage sent ${received.length} requests. One is enough.`
      const sent = received[0]
      if (sent.path !== path)
        return `readAsPage asked for ${sent.path}, not the address it was handed.`
      if (!same) {
        const origin = sent.headers.origin
        if (origin === undefined)
          return 'The request carried no origin header. A browser adds one to every request a page sends to another origin, so the server knows whose page is asking.'
        if (origin !== site)
          return `The origin header said ${origin}. It carries the page's origin only: its scheme, host and port, with no path and no slash at the end.`
      }
      const ownError =
        outcome.kind === 'threw' &&
        /stopped with an error/.test(fetchMistake('readAsPage', outcome) ?? '')
      if (!mayRead) {
        if (outcome.kind === 'threw' && outcome.notError)
          return 'readAsPage threw text, not an Error.'
        if (ownError) return null
        if (outcome.kind === 'threw') return fetchMistake('readAsPage', outcome)
        if (allowed === undefined)
          return 'The answer has no access-control-allow-origin header, so a browser would not let the page read it. readAsPage must throw an Error.'
        if (allowed === '*' && withCookies)
          return 'The answer allows * and the request carries cookies. A browser never lets a page read an answer to a request with cookies that way: it needs the exact origin, and access-control-allow-credentials: true. readAsPage must throw an Error.'
        if (allowed === site && withCookies)
          return `The request carries cookies, and the answer does not say access-control-allow-credentials: true, exactly. A browser would not let the page read it, so readAsPage must throw an Error.`
        if (allowed.includes(','))
          return `The answer allows ${allowed}. The header names one origin, never a list, so a browser refuses it. readAsPage must throw an Error.`
        return `The answer allows ${allowed}, which is not the page's origin, ${site}, exactly. Comparing as "contains" or "starts with" lets the wrong page read it. readAsPage must throw an Error.`
      }
      if (ownError) {
        if (same)
          return `The page and the address share an origin, ${new URL(base).origin}, so a browser lets the page read the answer without any access-control header.`
        return `A browser would let the page read this answer: it allows ${allowed}${withCookies ? ' and says access-control-allow-credentials: true' : ''}. readAsPage threw instead.`
      }
      const mistake = fetchMistake('readAsPage', outcome)
      if (mistake) return mistake
      if (outcome.value.kind !== 'string')
        return `readAsPage gave back ${kindText(outcome.value)}, not the body as text.`
      if (outcome.value.value !== body)
        return 'readAsPage did not give back the body of the answer.'
      return null
    }
  }
}

function allowCase(name, origin, allowed) {
  const lets = allowed.includes(origin)
  return {
    name,
    args: [origin, allowed],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'allowOrigin stopped with an error. Read it below.'
      const { problem, headers } = headersOf('allowOrigin', outcome.value)
      if (problem) return problem
      const acao = headers['access-control-allow-origin']
      if (acao === '*')
        return "access-control-allow-origin: * lets every page on every site read the answer. Only the origins in the list may, so name the request's origin."
      if (lets) {
        if (acao === undefined)
          return `${origin} is in the list, so the answer needs access-control-allow-origin to let its page read it.`
        if (acao !== origin)
          return "access-control-allow-origin must name the request's own origin, exactly as it came."
      } else if (acao !== undefined) {
        if (origin === null)
          return 'This request had no origin header, so no page asked: the answer gets no access-control-allow-origin.'
        if (origin === 'null')
          return 'A page with no origin of its own, such as one opened from a file, sends origin: null. It is not in the list, so it must not get access-control-allow-origin.'
        return `${origin} is not in the list, exactly as written, so the answer must not have access-control-allow-origin. An origin that only starts with a listed one, or has another port, is a different origin.`
      }
      if (!partsOf(headers.vary).some((p) => p.toLowerCase() === 'origin'))
        return headers.vary === undefined
          ? 'The answer has no vary header. Without vary: Origin, a cache may keep the answer made for one page and hand it to another.'
          : 'The vary header does not name Origin. It is a list of the request headers the answer depends on.'
      return null
    }
  }
}

function preflightCase(name, method, headers) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  const forms = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain']
  const unsafe = Object.keys(lower).filter((n) =>
    n === 'content-type'
      ? !forms.includes(lower[n].split(';')[0].trim().toLowerCase())
      : !['accept', 'accept-language', 'content-language'].includes(n)
  )
  const methodUnsafe = !['GET', 'HEAD', 'POST'].includes(method)
  const expected = methodUnsafe || unsafe.length > 0
  return {
    name,
    args: [method, headers],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'needsPreflight stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'boolean') return `needsPreflight gave back ${kindText(v)}, not true or false.`
      if (v.value === expected) return null
      if (methodUnsafe)
        return `${method} is not one of the three methods a page may send to another origin without asking first.`
      if (expected) {
        const name = unsafe[0]
        if (name === 'content-type')
          return `The content-type is ${lower[name]}. Only three types go without asking first, and the type is the part before any semicolon, compared whole.`
        return `The request sets ${Object.keys(headers).find((k) => k.toLowerCase() === name)}, which is not one of the headers a page may set without asking first.`
      }
      if (lower['content-type'])
        return `The content-type is ${lower['content-type']}, one of the three types that go without asking. Read the type before any semicolon, and ignore capital letters.`
      return `${method} with ${Object.keys(headers).length ? 'only these headers' : 'no headers of its own'} goes straight away. Header names ignore capital letters.`
    }
  }
}

function answerCase(name, { origin, method, asked, rules, ok }) {
  const request = {
    method: 'OPTIONS',
    path: `/api/requests/${token()}`,
    headers: {
      ...(origin === undefined ? {} : { origin }),
      'access-control-request-method': method,
      ...(asked === undefined ? {} : { 'access-control-request-headers': asked })
    }
  }
  return {
    name,
    args: [request, rules],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'answerPreflight stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'object')
        return `answerPreflight gave back ${kindText(v)}, not { status, headers }.`
      const got = v.value
      if (got.body !== undefined && got.body !== '' && got.body !== null)
        return 'The answer has a body. The request that asks first only asks: it gets headers and no body, and the page itself comes with the real request after it.'
      if (got.headers === null || typeof got.headers !== 'object' || Array.isArray(got.headers))
        return 'The object needs status and headers, and headers is an object of header names and values.'
      const { problem, headers } = headersOf('answerPreflight', {
        kind: 'object',
        value: got.headers
      })
      if (problem) return problem
      const allowing = Object.keys(headers).filter((n) => n.startsWith('access-control-allow-'))
      if (!ok) {
        if (got.status !== 403)
          return `This request asks for something the rules do not allow, so the status is 403. It was ${got.status}.`
        if (allowing.length)
          return `A refused request gets no access-control-allow- header, but this answer has ${allowing.join(', ')}.`
        return null
      }
      if (got.status === 200)
        return 'The status is 200. An answer that allows the request has nothing in it but headers: the task asks for 204 No Content.'
      if (got.status !== 204) {
        if (got.status === 403) {
          const exact = (asked ?? '')
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)
          if (!exact.every((n) => rules.headers.includes(n)))
            return 'answerPreflight refused, but the origin, the method it asks about (in access-control-request-method, not the request\'s own OPTIONS) and every header it asks about are allowed by the rules. Header names ignore capital letters.'
          if (asked?.includes(','))
            return 'answerPreflight refused, but every header the request asks about is in the rules. access-control-request-headers is a list, separated by commas.'
          return 'answerPreflight refused, but the origin, the method and every header this request asks about are allowed by the rules. The method it asks about is in access-control-request-method; the request itself is always OPTIONS.'
        }
        return `The status is ${got.status}. An allowed request that asks first gets 204.`
      }
      const acao = headers['access-control-allow-origin']
      if (acao === '*')
        return "access-control-allow-origin: * lets every site's pages in. Name the request's origin."
      if (acao !== origin)
        return "access-control-allow-origin must name the request's origin, exactly as it came."
      const methods = partsOf(headers['access-control-allow-methods'])
      if (methods.includes('*'))
        return 'access-control-allow-methods must list the methods of rules, not *.'
      if (!sameSet(methods, rules.methods))
        return 'access-control-allow-methods must list the methods of rules, separated by commas.'
      const names = partsOf(headers['access-control-allow-headers']).map((n) => n.toLowerCase())
      if (
        !sameSet(
          names,
          rules.headers.map((n) => n.toLowerCase())
        )
      )
        return 'access-control-allow-headers must list the headers of rules, separated by commas.'
      return null
    }
  }
}

function answerCases() {
  const a = `https://site${token()}.example`
  const b = `https://hall${token()}.example`
  const rules = {
    origins: [a, b],
    methods: ['GET', 'POST', 'DELETE'],
    headers: ['Content-Type', 'authorization']
  }
  return [
    answerCase('Allows a JSON POST from a trusted page', {
      origin: a,
      method: 'POST',
      asked: 'content-type',
      rules,
      ok: true
    }),
    answerCase('Allows a list of headers from another trusted page', {
      origin: b,
      method: 'DELETE',
      asked: 'authorization,content-type',
      rules,
      ok: true
    }),
    answerCase('Allows a request that asks about no headers', {
      origin: a,
      method: 'DELETE',
      asked: undefined,
      rules,
      ok: true
    }),
    answerCase('Refuses a page that is not trusted', {
      origin: `https://quiz${token()}.example`,
      method: 'POST',
      asked: 'content-type',
      rules,
      ok: false
    }),
    answerCase('Refuses a page that only starts like a trusted one', {
      origin: `${a}.net`,
      method: 'POST',
      asked: 'content-type',
      rules,
      ok: false
    }),
    answerCase('Refuses a method that is not allowed', {
      origin: a,
      method: 'PUT',
      asked: 'content-type',
      rules,
      ok: false
    }),
    answerCase('Refuses a header that is not allowed', {
      origin: b,
      method: 'POST',
      asked: 'content-type,x-debug',
      rules,
      ok: false
    }),
    answerCase('Refuses a request with no origin', {
      origin: undefined,
      method: 'POST',
      asked: 'content-type',
      rules,
      ok: false
    })
  ]
}

/**
 * Adds a note to failed details when an earlier task the function may use is not right yet. When
 * the function seems unwritten, the 'Not implemented' may come from the earlier one it calls.
 */
async function withNote(t, details, task, fn, number) {
  if (details.every((d) => d.passed)) return details
  const unwritten = details.length === 1 && details[0].name.endsWith(' is written')
  if (details.length === 1 && !unwritten) return details
  const result = await checks[task](t)
  if (unwritten) {
    if (!(result.length === 1 && result[0].name.endsWith(' is written'))) return details
    const own = details[0].name.replace(' is written', '')
    const message = `Check got 'Not implemented' when it called ${own}. If ${own} is written and uses ${fn}, the error comes from there: write Task ${number} first. If not, replace that line in ${own} with your code.`
    return [{ ...details[0], message }]
  }
  if (result.every((d) => d.passed)) return details
  const note = ` If you use ${fn}, Task ${number} is not right yet: get it to pass first.`
  return details.map((d) => (d.passed ? d : { ...d, message: d.message + note }))
}

export const checks = {
  same(t) {
    return cases(t, {
      file: FILE,
      fn: 'sameOrigin',
      list: [
        sameCase(
          'Says two pages of one site share an origin',
          'https://fen.example/now',
          'https://fen.example/listings?day=friday'
        ),
        sameCase('Tells http from https', 'http://fen.example/', 'https://fen.example/'),
        sameCase('Tells two ports apart', 'https://fen.example:8443/', 'https://fen.example/'),
        sameCase(
          'Treats the usual port as no port',
          'https://fen.example:443/a',
          'https://fen.example/b'
        ),
        sameCase(
          'Treats the usual http port as no port',
          'http://fen.example:80/',
          'http://fen.example/shows'
        ),
        sameCase(
          'Ignores capital letters in the host',
          'https://FEN.example/x',
          'https://fen.example/y'
        ),
        sameCase(
          'Tells a host under another apart',
          'https://www.fen.example/',
          'https://fen.example/'
        ),
        sameCase('Tells a longer host apart', 'https://fen.example/', 'https://fen.example.net/')
      ]
    })
  },

  async read(t) {
    return withNote(
      t,
      await cases(t, {
        file: FILE,
        fn: 'readAsPage',
        list: [
          readCase("Reads an answer that allows the page's origin", {
            allow: (site) => site,
            withCookies: false
          }),
          readCase('Reads an answer that allows every origin', { allow: '*', withCookies: false }),
          readCase('Reads an answer from its own origin', { same: true, withCookies: false }),
          readCase('Reads with cookies when credentials are allowed', {
            allow: (site) => site,
            credentials: 'true',
            withCookies: true
          }),
          readCase('Throws when the answer allows no origin', { withCookies: false }),
          readCase('Throws when an origin that only starts like it is allowed', {
            allow: (site) => `${site}.net`,
            withCookies: false
          }),
          readCase('Throws when the same host on another port is allowed', {
            allow: (site) => `${site}:8443`,
            withCookies: false
          }),
          readCase('Throws when a list of origins is allowed', {
            allow: (site) => `${site}, https://radio.example`,
            withCookies: false
          }),
          readCase('Throws for * with cookies', {
            allow: '*',
            credentials: 'true',
            withCookies: true
          }),
          readCase('Throws with cookies when credentials are not allowed', {
            allow: (site) => site,
            withCookies: true
          })
        ]
      }),
      'same',
      'sameOrigin',
      1
    )
  },

  allow(t) {
    const site = `https://hall${token()}.example`
    const other = `https://radio${token()}.example`
    const list = [site, other]
    return cases(t, {
      file: FILE,
      fn: 'allowOrigin',
      list: [
        allowCase('Lets a trusted page read', site, list),
        allowCase('Lets the other trusted page read', other, list),
        allowCase('Leaves out a page that is not trusted', `https://quiz${token()}.example`, list),
        allowCase('Leaves out a page that only starts like a trusted one', `${site}.net`, list),
        allowCase('Leaves out a trusted host on another port', `${site}:8443`, list),
        allowCase('Leaves out an origin that is only part of a trusted one', site, [
          `${site}:8443`,
          other
        ]),
        allowCase('Leaves out a request with no origin', null, list),
        allowCase("Leaves out the origin of a page that has none, 'null'", 'null', list)
      ]
    })
  },

  preflight(t) {
    return cases(t, {
      file: FILE,
      fn: 'needsPreflight',
      list: [
        preflightCase('Sends a plain GET straight away', 'GET', {}),
        preflightCase('Sends a GET with accept straight away', 'GET', {
          Accept: 'application/json'
        }),
        preflightCase('Sends a HEAD with accept-language straight away', 'HEAD', {
          'Accept-Language': 'cy, en'
        }),
        preflightCase('Sends a POST of plain text straight away', 'POST', {
          'Content-Type': 'text/plain;charset=UTF-8'
        }),
        preflightCase('Reads a form type in any letters', 'POST', {
          'content-type': 'Application/X-WWW-Form-Urlencoded'
        }),
        preflightCase('Reads a form type with parameters', 'POST', {
          'CONTENT-TYPE': 'multipart/form-data; boundary=fen'
        }),
        preflightCase('Asks first for a JSON POST', 'POST', { 'content-type': 'application/json' }),
        preflightCase('Asks first for a type that only starts like a form type', 'POST', {
          'Content-Type': 'text/plain+fen'
        }),
        preflightCase('Asks first for DELETE', 'DELETE', {}),
        preflightCase('Asks first for PUT, whatever its headers', 'PUT', {
          'content-type': 'text/plain'
        }),
        preflightCase('Asks first for an authorization header', 'GET', {
          Authorization: 'Bearer fen-7'
        }),
        preflightCase('Asks first for a header of its own', 'GET', { 'X-Studio-Screen': '2' })
      ]
    })
  },

  async answer(t) {
    return withNote(
      t,
      await cases(t, { file: FILE, fn: 'answerPreflight', list: answerCases() }),
      'allow',
      'allowOrigin',
      3
    )
  }
}
