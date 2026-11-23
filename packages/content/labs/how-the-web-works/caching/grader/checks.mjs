import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/cache.js'
const token = () => randomUUID().slice(0, 8)
const SECOND = 1000
// A time of the check's own, years before today, so nothing depends on the clock of this computer.
const someTime = () => 1_000_000_000_000 + Math.floor(Math.random() * 10_000_000) * SECOND

const COPY_KEYS = ['body', 'cacheControl', 'etag', 'storedAt']

/** The keep rules the check expects, worked out from the header as the lesson teaches them. */
function rulesOf(header) {
  const names = new Map(
    (header ?? '')
      .split(',')
      .filter((p) => p.trim())
      .map((p) => {
        const [name, value = ''] = p.split('=')
        return [name.trim().toLowerCase(), value.trim().replaceAll('"', '')]
      })
  )
  if (names.has('no-store')) return { store: false, freshFor: 0 }
  if (names.has('no-cache') || !names.has('max-age')) return { store: true, freshFor: 0 }
  return { store: true, freshFor: Number(names.get('max-age')) }
}

const seconds = (n) => `${n} ${n === 1 ? 'second' : 'seconds'}`

const has = (header, name) => new RegExp(`(^|,)\\s*${name}\\s*(=|,|$)`, 'i').test(header ?? '')

function keepCase(name, header) {
  const expected = rulesOf(header)
  return {
    name,
    args: [header],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'keepRules stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'object')
        return `keepRules gave back ${kindText(v)}, not an object with store and freshFor.`
      const got = v.value
      if (isDeepStrictEqual(got, expected)) return null
      const keys = Object.keys(got).sort()
      if (!isDeepStrictEqual(keys, ['freshFor', 'store']))
        return `The object has ${keys.join(', ') || 'nothing in it'}. It needs store and freshFor, spelt as the task gives them, and nothing else.`
      if (typeof got.store !== 'boolean') return 'store is true or false, not text.'
      if (typeof got.freshFor !== 'number' || Number.isNaN(got.freshFor))
        return 'freshFor is a number of seconds. The number in a header arrives as text: turn it into a number.'
      if (got.store !== expected.store) {
        if (expected.store)
          return has(header, 'no-cache')
            ? 'no-cache does not mean "do not keep". It means: keep the copy, but ask the server before every use. Only one directive says an answer may not be kept at all.'
            : `This answer may be kept, so store is true. Only one directive in the lesson says an answer may not be kept at all, and ${header === null ? 'there is no header here' : 'it is not in this header'}.`
        return 'This header says the answer may not be kept at all, so store is false, whatever else the header says.'
      }
      if (!expected.store)
        return 'An answer that may not be kept may not be used later either: freshFor is 0.'
      if (got.freshFor === expected.freshFor * 1000)
        return 'freshFor is a thousand times too big. max-age counts seconds, and so does freshFor.'
      if (expected.freshFor === 0) {
        if (has(header, 'no-cache'))
          return 'With no-cache, a copy must be confirmed before every use, even when the header also gives a max-age: the stricter directive wins, so freshFor is 0.'
        if (header === null)
          return 'With no cache-control at all, the answer gives no lifetime. The studio screens do not guess one: freshFor is 0, so they ask each time.'
        if (has(header, 's-maxage'))
          return 's-maxage is the lifetime for a cache that many people share. A studio screen keeps its own copy and reads only max-age; with no max-age, freshFor is 0.'
        return 'This header gives no max-age, so a copy has no lifetime and freshFor is 0.'
      }
      if (has(header, 's-maxage') && got.freshFor !== expected.freshFor)
        return 'freshFor is not the max-age of this header. s-maxage is another directive, for caches that many people share: read the directive called exactly max-age.'
      return 'freshFor is not the number of seconds in max-age. Directive names ignore capital letters, come in any order, with or without a space after each comma, and the number may be in double quotes.'
    }
  }
}

function freshCase(name, cacheControl, ageSeconds) {
  const storedAt = someTime()
  const now = storedAt + ageSeconds * SECOND
  const copy = {
    body: `[{"name":"Check show ${token()}"}]`,
    etag: `"${token()}"`,
    cacheControl,
    storedAt
  }
  const { store, freshFor } = rulesOf(cacheControl)
  const expected = store && ageSeconds < freshFor
  return {
    name,
    args: [copy, now],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'isFresh stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind !== 'boolean') return `isFresh gave back ${kindText(v)}, not true or false.`
      if (v.value === expected) return null
      const age = `This copy is ${seconds(ageSeconds)} old`
      if (expected) {
        return `${age} at the time isFresh is handed, and its lifetime is ${freshFor} seconds, so it is still fresh, but isFresh said it was stale. Use the now it is handed, not the clock. now and storedAt count milliseconds, while max-age counts seconds: compare the two in the same unit.`
      }
      if (!store) return 'This copy says it may not be kept at all, so it is never fresh.'
      if (freshFor === 0)
        return has(cacheControl, 'no-cache')
          ? 'This copy says no-cache: it must be confirmed with the server before every use, so it is never fresh.'
          : 'This copy has no lifetime, so it is never fresh: the screen must ask the server.'
      if (ageSeconds === freshFor)
        return `${age} and its lifetime is ${freshFor} seconds. A copy is fresh only while its age is less than its lifetime; at the very end of it, it is stale.`
      return `${age} and its lifetime is ${freshFor} seconds, so it is stale, but isFresh said it was fresh. now and storedAt count milliseconds, while max-age counts seconds: compare the two in the same unit.`
    }
  }
}

/** The server the refresh cases talk to: a 304 for the right validator, otherwise its answer. */
function listingsRoutes(path, { current, notModified, answer }) {
  return [
    ...(notModified
      ? [
          {
            method: 'GET',
            path,
            when: { header: 'if-none-match', value: current },
            answers: [{ status: 304, headers: notModified }]
          }
        ]
      : []),
    { method: 'GET', path, answers: [answer] }
  ]
}

/** What is wrong with the request a refresh sent, or null. */
function requestProblem(fn, r, path, etag) {
  if (r.received.length === 0) {
    return (
      fetchMistake(fn, r.outcome) ??
      "The check's server never received a request. Send it with fetch and wait for the answer."
    )
  }
  if (r.received.length > 1) return `${fn} sent ${r.received.length} requests. One is enough.`
  const sent = r.received[0]
  if (sent.path !== path) return `${fn} asked for ${sent.path}, not the address it was handed.`
  if (sent.method !== 'GET')
    return `${fn} sent a ${sent.method} request. Reading the listings is a GET.`
  const asked = sent.headers['if-none-match']
  if (etag === null) {
    if (asked !== undefined)
      return `The copy ${fn} was handed has no etag, so there is nothing to ask with, but the request carried if-none-match: ${asked}. Send that header only when the copy has an etag.`
    return null
  }
  if (asked === undefined) {
    const elsewhere = ['etag', 'if-modified-since', 'if-match'].find(
      (h) => sent.headers[h] !== undefined
    )
    return elsewhere
      ? `The copy's etag went back to the server under ${elsewhere}. The server only answers "not changed" when the etag comes back under the header the lesson names for that question.`
      : `The request did not carry the copy's etag, so the server could not tell that ${fn} already had a copy, and sent the whole body again.`
  }
  if (asked === etag) return null
  if (asked === etag.replace(/^W\//, '').replaceAll('"', '') || asked === etag.replaceAll('"', ''))
    return 'The etag went back without its double quotes. The quotes, and a W/ in front, are part of an etag: send it exactly as it came.'
  if (asked === etag.replace(/^W\//, ''))
    return 'The etag went back without the W/ in front. It is part of the etag: send it exactly as it came.'
  return "The if-none-match header did not carry the copy's own etag, exactly as it came."
}

/** What is wrong with the copy a refresh gave back, or null. */
function copyProblem(fn, outcome, expected, { copy, notModified, now }) {
  if (outcome.kind === 'threw' && notModified) {
    if (/stopped with an error/.test(fetchMistake(fn, outcome) ?? ''))
      return `${fn} threw when the server answered 304. A 304 is not an error: it is the short answer "you already have it". Note that response.ok is true only from 200 to 299, so it is false for a 304.`
  }
  const mistake = fetchMistake(fn, outcome)
  if (mistake) return mistake
  const v = outcome.value
  if (v.kind !== 'object') return `${fn} gave back ${kindText(v)}, not a copy.`
  const got = v.value
  const keys = Object.keys(got).sort()
  if (!isDeepStrictEqual(keys, COPY_KEYS))
    return `The copy has ${keys.join(', ') || 'nothing in it'}. A copy has body, etag, cacheControl and storedAt, spelt as the task gives them, and nothing else.`
  if (got.body !== expected.body) {
    if (notModified && got.body === '')
      return 'The body of the copy is empty. A 304 has no body: the body to keep is the one the copy already had.'
    return notModified
      ? 'The server said the copy has not changed, so the copy keeps the body it already had.'
      : 'The body of the copy is not the new body the server sent with its 200.'
  }
  if (got.storedAt !== now) {
    if (copy && got.storedAt === copy.storedAt)
      return `storedAt is still the old time. Once the server says the copy is still good, it is as good as new from that moment: storedAt is the time ${fn} was handed.`
    return `storedAt is not the time ${fn} was handed. The check passes its own time, so use that, not the clock.`
  }
  if (got.cacheControl !== expected.cacheControl) {
    if (notModified && copy && got.cacheControl === copy.cacheControl)
      return "cacheControl is still the copy's old one. The 304 carries the cache-control to use from now on: take it from the answer."
    return "cacheControl is not the answer's cache-control header, or null when it has none."
  }
  if (got.etag !== expected.etag)
    return "etag is not the answer's etag header, or null when it has none."
  return null
}

function refreshCase(name, { etag, status }) {
  const path = `/l-${token()}/api/listings`
  const now = someTime()
  const copy =
    etag === undefined
      ? null
      : {
          body: `[{"name":"Kept show ${token()}"}]`,
          etag,
          cacheControl: 'max-age=60',
          storedAt: now - 3600 * SECOND
        }
  const newBody = `[{"name":"New show ${token()}"}]`
  const fresh = {
    etag: `"v-${token()}"`,
    'cache-control': `max-age=${100 + Math.floor(Math.random() * 900)}`
  }
  const notModified = status === 304 ? { etag, 'cache-control': fresh['cache-control'] } : null
  const answer =
    status === 500
      ? { status, body: 'The listings file could not be read.' }
      : status === 'bare'
        ? { status: 200, body: newBody }
        : { status: 200, headers: { 'content-type': 'application/json', ...fresh }, body: newBody }
  const expected =
    status === 304
      ? { body: copy.body, etag, cacheControl: fresh['cache-control'], storedAt: now }
      : status === 'bare'
        ? { body: newBody, etag: null, cacheControl: null, storedAt: now }
        : { body: newBody, etag: fresh.etag, cacheControl: fresh['cache-control'], storedAt: now }
  return {
    name,
    args: [`$base${path}`, copy, now],
    headers: ['if-none-match'],
    routes: listingsRoutes(path, { current: etag, notModified, answer }),
    judge: (r) => {
      const problem = requestProblem('refresh', r, path, copy?.etag ?? null)
      if (problem) return problem
      if (status === 500) {
        if (r.outcome.kind === 'threw' && r.outcome.notError)
          return 'refresh threw text, not an Error. The lesson shows how to make one.'
        if (r.outcome.kind === 'threw') return null
        return 'The server answered 500, which is neither 200 nor 304, so refresh must throw an Error instead of giving back a copy.'
      }
      return copyProblem('refresh', r.outcome, expected, { copy, notModified, now })
    }
  }
}

function listingsCase(name, { cacheControl, ageSeconds, empty }) {
  const path = `/s-${token()}/api/listings`
  const now = someTime()
  const etag = `"k-${token()}"`
  const copy = empty
    ? null
    : {
        body: `[{"name":"Kept show ${token()}"}]`,
        etag,
        cacheControl,
        storedAt: now - ageSeconds * SECOND
      }
  const { store, freshFor } = rulesOf(cacheControl)
  const fresh = !empty && store && ageSeconds < freshFor
  const newBody = `[{"name":"New show ${token()}"}]`
  const later = `max-age=${100 + Math.floor(Math.random() * 900)}`
  const notModified = empty ? null : { etag, 'cache-control': later }
  const answer = {
    status: 200,
    headers: { 'content-type': 'application/json', etag: `"n-${token()}"`, 'cache-control': later },
    body: newBody
  }
  const expected = fresh
    ? copy
    : empty
      ? { body: newBody, etag: answer.headers.etag, cacheControl: later, storedAt: now }
      : { body: copy.body, etag, cacheControl: later, storedAt: now }
  return {
    name,
    args: [`$base${path}`, copy, now],
    headers: ['if-none-match'],
    routes: listingsRoutes(path, { current: etag, notModified, answer }),
    judge: (r) => {
      if (fresh) {
        if (r.received.length > 0)
          return `This copy is ${seconds(ageSeconds)} old and its lifetime is ${seconds(freshFor)}, so it is still fresh, but listings sent ${r.received.length === 1 ? 'a request' : `${r.received.length} requests`}. A fresh copy is the right answer by itself: no request is needed.`
        const mistake = fetchMistake('listings', r.outcome)
        if (mistake) return mistake
        if (isDeepStrictEqual(r.outcome.value.value, copy)) return null
        return 'A fresh copy is given back as it is, nothing in it changed.'
      }
      if (empty && r.outcome.kind === 'threw' && /properties of null/.test(r.outcome.message))
        return 'listings stopped with an error when it was handed no copy. copy is null when nothing is kept yet: check for that before you read anything from the copy.'
      if (r.received.length === 0 && r.outcome.kind === 'returned') {
        if (empty) return 'There is no copy yet, so listings must ask the server.'
        if (freshFor === 0)
          return 'This copy says no-cache, so it must be confirmed with the server before every use, but listings sent no request.'
        return `This copy is ${seconds(ageSeconds)} old and its lifetime is ${seconds(freshFor)}, so it may not be used without asking, but listings sent no request. Showing a copy past its lifetime is how stale listings stay on a screen.`
      }
      return (
        requestProblem('listings', r, path, copy?.etag ?? null) ??
        copyProblem('listings', r.outcome, expected, { copy, notModified, now })
      )
    }
  }
}

/** Adds a note to failed details when an earlier task the function may use is not right yet. */
async function withNote(t, details, earlier) {
  if (details.every((d) => d.passed) || details.length === 1) return details
  const broken = []
  for (const [task, fn] of earlier) {
    if (!(await checks[task](t)).every((d) => d.passed))
      broken.push(`${fn} (Task ${TASK_NUMBER[task]})`)
  }
  if (broken.length === 0) return details
  const note = ` If you use ${broken.join(' or ')}, get ${broken.length === 1 ? 'it' : 'them'} to pass first: ${broken.length === 1 ? 'it is' : 'they are'} not right yet.`
  return details.map((d) => (d.passed ? d : { ...d, message: d.message + note }))
}

const TASK_NUMBER = { keep: 1, fresh: 2, refresh: 3 }

export const checks = {
  keep(t) {
    return cases(t, {
      file: FILE,
      fn: 'keepRules',
      list: [
        keepCase('Reads a max-age', 'max-age=900'),
        keepCase('Reads max-age among other directives', 'public, max-age=45'),
        keepCase('Ignores capital letters and order', 'Private,Max-Age=120'),
        keepCase('Reads a number in double quotes', 'max-age="75", must-revalidate'),
        keepCase('Keeps but always asks for no-cache', 'no-cache'),
        keepCase('Lets no-cache win over max-age', 'max-age=900, no-cache'),
        keepCase('Does not keep with no-store', 'no-store'),
        keepCase('Lets no-store win, in any letters', 'max-age=900, No-Store'),
        keepCase('Leaves s-maxage to shared caches', 's-maxage=900'),
        keepCase('Reads max-age, not s-maxage', 's-maxage=900, max-age=20'),
        keepCase('Gives no lifetime when there is no header', null)
      ]
    })
  },

  async fresh(t) {
    return withNote(
      t,
      await cases(t, {
        file: FILE,
        fn: 'isFresh',
        list: [
          freshCase('Says a copy just stored is fresh', 'max-age=300', 0),
          freshCase('Says a copy is fresh near the end of its lifetime', 'max-age=300', 299),
          freshCase('Says a copy is stale at the end of its lifetime', 'max-age=300', 300),
          freshCase('Says an old copy is stale', 'max-age=300', 3600),
          freshCase('Counts the age in seconds', 'Public, Max-Age=90', 45),
          freshCase('Says a no-cache copy is never fresh', 'no-cache', 1),
          freshCase('Says a no-store copy is never fresh', 'no-store', 0),
          freshCase(
            'Says a copy is never fresh with no-store and a max-age',
            'max-age=300, no-store',
            10
          ),
          freshCase(
            'Says a copy is never fresh with no-cache and a max-age',
            'no-cache, max-age=300',
            10
          ),
          freshCase('Says a copy with no cache-control is never fresh', null, 0)
        ]
      }),
      [['keep', 'keepRules']]
    )
  },

  refresh(t) {
    return cases(t, {
      file: FILE,
      fn: 'refresh',
      list: [
        refreshCase('Keeps the copy when the server says it has not changed', {
          etag: `"c-${token()}"`,
          status: 304
        }),
        refreshCase('Sends a weak etag back as it came', { etag: `W/"w-${token()}"`, status: 304 }),
        refreshCase('Takes the new body when the listings changed', {
          etag: `"old-${token()}"`,
          status: 200
        }),
        refreshCase('Asks plainly when nothing is kept yet', { etag: undefined, status: 200 }),
        refreshCase('Asks plainly when the copy has no etag', { etag: null, status: 'bare' }),
        refreshCase('Throws for a server error', { etag: `"e-${token()}"`, status: 500 })
      ]
    })
  },

  async listings(t) {
    return withNote(
      t,
      await cases(t, {
        file: FILE,
        fn: 'listings',
        list: [
          listingsCase('Uses a fresh copy without asking', {
            cacheControl: 'max-age=300',
            ageSeconds: 100
          }),
          listingsCase('Asks about a stale copy', { cacheControl: 'max-age=300', ageSeconds: 400 }),
          listingsCase('Asks at the end of the lifetime', {
            cacheControl: 'max-age=120',
            ageSeconds: 120
          }),
          listingsCase('Asks about a no-cache copy every time', {
            cacheControl: 'no-cache',
            ageSeconds: 1
          }),
          listingsCase('Asks when nothing is kept yet', { empty: true })
        ]
      }),
      [
        ['fresh', 'isFresh'],
        ['refresh', 'refresh']
      ]
    )
  }
}
