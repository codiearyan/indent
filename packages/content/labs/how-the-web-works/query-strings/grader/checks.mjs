import { randomUUID } from 'node:crypto'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/search.js'
const BASE = 'http://127.0.0.1:7420'
const token = () => randomUUID().slice(0, 8)

const valueCase = (name, address, key, expected) => ({
  name,
  args: [address, key],
  network: false,
  judge: ({ outcome }) => {
    if (outcome.kind === 'threw')
      return 'queryValue stopped with an error for this address. Read it below.'
    const v = outcome.value
    if (expected === null) {
      if (v.kind === 'null') return null
      return `This address has no value called ${key}, so queryValue must give back null. It gave back ${v.kind === 'string' ? `'${v.value}'` : kindText(v)}.`
    }
    if (v.kind === 'string' && v.value === expected) return null
    if (v.kind === 'string' && /%[0-9A-F]{2}|\+/i.test(v.value)) {
      return 'The value still has its codes in it, like %26 or +. The server reads them as the characters they stand for, so the value must be decoded the way the server would read it.'
    }
    return `queryValue did not give back the value called ${key} as the server would read it.`
  }
})

/** Why the value a server would read from the address is not the one that was typed, or null. */
function valueProblem(label, typed, url) {
  const got = url.searchParams.get(label)
  if (got === typed) return null
  if (got === null) return `The server would find no ${label} in this address.`
  const seen = `The server would read ${label} as "${got}".`
  if (typed.includes('&') && typed.startsWith(got)) {
    return `${seen} An & in the question mark part ends one value and starts the next, so an & that belongs to a value must be encoded.`
  }
  if (typed.includes('#') && typed.startsWith(got)) {
    return `${seen} Everything after a # is never sent to the server at all, so a # that belongs to a value must be encoded.`
  }
  if (typed.includes('+') && got === typed.replaceAll('+', ' ')) {
    return `${seen} A + in the question mark part stands for a space, so a + that belongs to a value must be encoded.`
  }
  return `${seen} That is not what was typed. Let URL encode the values for you, as the lesson shows.`
}

function addressProblem(v, artist, title) {
  if (v.kind === 'url')
    return 'searchAddress gave back a URL object, not text. The task asks for the address as text.'
  if (v.kind !== 'string') return `searchAddress gave back ${kindText(v)}, not the address as text.`
  let url
  try {
    url = new URL(v.value)
  } catch {
    return 'searchAddress gave back text that is not a whole address. It needs the scheme and host from base in front.'
  }
  if (url.origin !== BASE) return 'The address does not point at the server it was given as base.'
  if (url.pathname !== '/songs/search')
    return `The path of the address is ${url.pathname}, not the search page the task names.`
  const artistProblem = valueProblem('artist', artist, url)
  if (artistProblem) return artistProblem
  if (title === undefined) {
    if (url.searchParams.has('title')) {
      return `No title was given, but the address still has a title in it ("${url.searchParams.get('title')}"). When title is not given, leave it out of the address.`
    }
    return null
  }
  return valueProblem('title', title, url)
}

const addressCase = (name, artist, title) => ({
  name,
  args: title === undefined ? [BASE, artist] : [BASE, artist, title],
  network: false,
  judge: ({ outcome }) =>
    outcome.kind === 'threw'
      ? 'searchAddress stopped with an error. Read it below.'
      : addressProblem(outcome.value, artist, title)
})

function searchCase(name, artist, title, body) {
  return {
    name,
    args: title === undefined ? ['$base', artist] : ['$base', artist, title],
    routes: [
      {
        path: '/songs/search',
        answers: [{ status: 200, headers: { 'content-type': 'text/plain' }, body }]
      }
    ],
    judge: ({ received, outcome, base }) => {
      if (received.length === 0) {
        return (
          fetchMistake('searchSongs', outcome) ??
          "The check's server never received a request. Send the request with fetch and wait for it."
        )
      }
      if (received.length > 1)
        return `searchSongs sent ${received.length} requests for one search. One is enough.`
      const r = received[0]
      if (r.path !== '/songs/search')
        return `searchSongs asked for ${r.path}, not for the search page.`
      const url = new URL(r.target, base)
      const sent =
        valueProblem('artist', artist, url) ??
        (title === undefined ? null : valueProblem('title', title, url))
      if (sent) return sent.replaceAll('would read', 'read')
      if (title === undefined && url.searchParams.has('title')) {
        return `No title was given, but the request still had a title in it ("${url.searchParams.get('title')}"). Leave it out when it is not given.`
      }
      const mistake = fetchMistake('searchSongs', outcome)
      if (mistake) return mistake
      if (outcome.value.kind !== 'string' || outcome.value.value !== body) {
        return 'searchSongs gave back something other than the text of the body the server answered with.'
      }
      return null
    }
  }
}

function pageProblem(v, address, expectedPage) {
  if (v.kind === 'url')
    return 'nextPage gave back a URL object, not text. The task asks for the address as text.'
  if (v.kind !== 'string') return `nextPage gave back ${kindText(v)}, not the address as text.`
  let url
  try {
    url = new URL(v.value)
  } catch {
    return 'nextPage gave back text that is not a whole address.'
  }
  const before = new URL(address)
  if (url.searchParams.getAll('page').length > 1) {
    return 'The address has page in it more than once, so the server cannot know which one counts. Change the value that is there instead of adding another.'
  }
  const page = url.searchParams.get('page')
  if (page !== expectedPage) {
    const old = before.searchParams.get('page')
    if (page === `${old ?? '1'}1`) {
      return `page became ${page}. Every value in the question mark part is text, and + joins two texts, so it must be turned into a number before adding one.`
    }
    if (old === null) {
      return `This address has no page, so it is on page 1, but nextPage gave page ${page === null ? 'nothing' : page}.`
    }
    return `page became ${page === null ? 'nothing' : page}, which is not one more than the page the address was on.`
  }
  if (url.origin !== before.origin || url.pathname !== before.pathname) {
    return 'The address no longer points at the same server and path. Only page should change.'
  }
  for (const [key, value] of before.searchParams) {
    if (key !== 'page' && url.searchParams.get(key) !== value) {
      return `${key} changed or went missing. Every value other than page stays as it was.`
    }
  }
  return null
}

const pageCase = (name, address, expectedPage) => ({
  name,
  args: [address],
  network: false,
  judge: ({ outcome }) =>
    outcome.kind === 'threw'
      ? 'nextPage stopped with an error for this address. Read it below.'
      : pageProblem(outcome.value, address, expectedPage)
})

export const checks = {
  read(t) {
    const address = `${BASE}/shows/search?presenter=Corrie+%26+Bex&day=fri%2Fsat&note=50%25+more`
    return cases(t, {
      file: FILE,
      fn: 'queryValue',
      list: [
        valueCase('Reads a value with an & in it', address, 'presenter', 'Corrie & Bex'),
        valueCase('Reads a value with a % and a space in it', address, 'note', '50% more'),
        valueCase('Reads a value with a slash in it', address, 'day', 'fri/sat'),
        valueCase('Gives null for a name that is not there', address, 'page', null)
      ]
    })
  },

  build(t) {
    return cases(t, {
      file: FILE,
      fn: 'searchAddress',
      list: [
        addressCase(
          'Keeps an & and a # as they were typed',
          'Corrie & the Hedgecutters',
          'Half Past #9'
        ),
        addressCase('Keeps a + and a % as they were typed', 'Brannock + Vale', '100% Rain'),
        addressCase('Leaves out a title that was not given', 'The Quiet Orchard')
      ]
    })
  },

  async search(t) {
    const a = token()
    const b = token()
    const results = await cases(t, {
      file: FILE,
      fn: 'searchSongs',
      list: [
        searchCase(
          'Sends the artist and title as typed',
          'Corrie & the Hedgecutters',
          'Half Past #9',
          `Half Past #9, check ${a}`
        ),
        searchCase(
          'Sends a search with no title',
          'Brannock + Vale',
          undefined,
          `Weather Vane, check ${b}`
        )
      ]
    })
    if (results.every((d) => d.passed) || results.length === 1) return results
    const [built] = await checks.build(t)
    if (built.passed) return results
    const note =
      ' If searchSongs uses searchAddress, Task 2 is not right yet: get it to pass first.'
    return results.map((d) => (d.passed ? d : { ...d, message: d.message + note }))
  },

  next(t) {
    return cases(t, {
      file: FILE,
      fn: 'nextPage',
      list: [
        pageCase(
          'Goes from page 9 to page 10',
          `${BASE}/songs/search?artist=Corrie+%26+the+Hedgecutters&page=9`,
          '10'
        ),
        pageCase(
          'Goes to page 2 from an address with no page',
          `${BASE}/shows?day=friday&presenter=Bex`,
          '2'
        ),
        pageCase(
          'Keeps every other value',
          `${BASE}/songs/search?page=3&artist=Brannock+%2B+Vale&title=rain`,
          '4'
        )
      ]
    })
  }
}
