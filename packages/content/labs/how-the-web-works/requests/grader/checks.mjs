import { randomUUID } from 'node:crypto'
import {
  cases,
  extraHeaderNames,
  fetchMistake,
  kindText,
  TURNED_AWAY
} from '../../shared/checks-lib.mjs'

const FILE = 'src/requests.js'
const token = () => randomUUID().slice(0, 8)

function lineProblem(v, method, address) {
  if (v.kind !== 'string') return `requestLine gave back ${kindText(v)}, not the line as text.`
  const url = new URL(address)
  const target = url.pathname + url.search
  const expected = `${method.toUpperCase()} ${target} HTTP/1.1`
  if (v.value === expected) return null
  const [m, t, version, ...rest] = v.value.split(' ')
  if (m !== method.toUpperCase()) {
    return m?.toUpperCase() === method.toUpperCase()
      ? 'The method is not in capital letters. A request line always writes it in capitals, whatever it was handed.'
      : 'The line does not start with the method it was handed.'
  }
  if (t?.includes(url.host) || t?.includes('://')) {
    return 'The line has the scheme or the host in it. The request line carries only the path and the question mark part; the host travels in a header of its own.'
  }
  if (url.search && t === url.pathname) {
    return 'The question mark part is missing. It travels with the path, right after it.'
  }
  if (t !== target)
    return 'The middle of the line is not the path of the address with its question mark part.'
  if (version !== 'HTTP/1.1' || rest.length) {
    return 'The line does not end with one space and HTTP/1.1, the version of the conversation.'
  }
  return 'The line is not the method, the path with its question mark part and the version, with one space between each.'
}

const lineCase = (name, method, address) => ({
  name,
  args: [method, address],
  network: false,
  judge: ({ outcome }) =>
    outcome.kind === 'threw'
      ? 'requestLine stopped with an error. Read it below.'
      : lineProblem(outcome.value, method, address)
})

/** What is wrong with the method and path of the one removal request, or null. */
function removalProblem(fn, { received, outcome, turnedAway }, id) {
  if (turnedAway) return TURNED_AWAY
  if (received.length === 0) {
    return (
      fetchMistake(fn, outcome) ??
      "The check's server never received a request. Send the request with fetch and wait for it."
    )
  }
  if (received.length > 1)
    return `${fn} sent ${received.length} requests to remove one song request. One is enough.`
  const r = received[0]
  if (r.path !== `/requests/${id}`) {
    return `${fn} asked for ${r.path}, not the path of song request ${id} that the task gives.`
  }
  if (r.method !== 'DELETE') {
    return `${fn} sent a ${r.method} request. ${r.method === 'GET' ? 'GET is what fetch sends when it is given no method, and it asks to read.' : `${r.method} does not remove.`} The lesson lists the method that removes.`
  }
  return null
}

function bodyProblem(fn, outcome, body) {
  const mistake = fetchMistake(fn, outcome)
  if (mistake) return mistake
  if (outcome.value.kind !== 'string' || outcome.value.value !== body) {
    return `${fn} gave back something other than the text of the body the server answered with.`
  }
  return null
}

function removeCase(name, id) {
  const body = `Request ${id} is gone, check ${token()}`
  return {
    name,
    args: ['$base', id],
    routes: [{ method: 'DELETE', path: `/requests/${id}`, answers: [{ status: 200, body }] }],
    judge: (r) =>
      removalProblem('removeRequest', r, id) ?? bodyProblem('removeRequest', r.outcome, body)
  }
}

function keyProblem(r, key) {
  const auth = r.headers.authorization
  if (auth === undefined) {
    const others = extraHeaderNames(r)
    if (r.target.includes(key)) {
      return 'The key went into the address, where it would be written into logs and history. It belongs in a header.'
    }
    return others.length
      ? `The server received no authorization header, but it did receive ${others.join(', ')}. A server finds a header by its exact name, so compare the spelling with the task's.`
      : 'The server received no authorization header. Look at how the lesson hands headers to fetch.'
  }
  if (/^bearer [^ ]+$/i.test(auth) && auth.slice(7) === key) return null
  if (auth === key)
    return 'The authorization header holds only the key. The task says which word and space go in front of it.'
  if (auth.includes(key))
    return `The authorization header is "${auth}". It must be the word Bearer, one space and the key, and nothing else.`
  return 'The authorization header does not hold the key that removeAsStudio was handed.'
}

function studioCase(name, id) {
  const key = `chk-${token()}`
  const body = `Request ${id} is off the list, check ${token()}`
  return {
    name,
    args: ['$base', id, key],
    headers: ['authorization'],
    routes: [{ method: 'DELETE', path: `/requests/${id}`, answers: [{ status: 200, body }] }],
    judge: (r) =>
      removalProblem('removeAsStudio', r, id) ??
      keyProblem(r.received[0], key) ??
      bodyProblem('removeAsStudio', r.outcome, body)
  }
}

function acceptCase(name, type) {
  const path = `/schedule/${token()}`
  const body = `The schedule as ${type}, check ${token()}`
  return {
    name,
    args: ['$base', path, type],
    headers: ['accept'],
    routes: [
      { method: 'GET', path, answers: [{ status: 200, headers: { 'content-type': type }, body }] }
    ],
    judge: ({ received, outcome }) => {
      if (received.length === 0) {
        return (
          fetchMistake('fetchAs', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for it."
        )
      }
      const r = received[0]
      if (received.length > 1)
        return `fetchAs sent ${received.length} requests for one page. One is enough.`
      if (r.path !== path) return `fetchAs asked for ${r.path}, not the path it was handed.`
      if (r.method !== 'GET')
        return `fetchAs sent a ${r.method} request. Asking for a page is a GET.`
      if (r.headers.accept !== type) {
        const others = extraHeaderNames(r)
        if (r.headers['content-type'] === type) {
          return `The server received content-type: ${type}. That header says what kind of body a request carries, not what kind of answer it wants back.`
        }
        if (r.headers.accept === '*/*') {
          return others.length
            ? `The server received accept: */*, the value fetch sends by itself, and also ${others.join(', ')}. A server finds a header by its exact name, so compare the spelling with the task's.`
            : 'The server received accept: */*, the value fetch sends when nobody sets one, so the header you meant to send did not arrive. Look at how the lesson hands headers to fetch.'
        }
        return `The server received accept: ${r.headers.accept}, not the type fetchAs was handed.`
      }
      return bodyProblem('fetchAs', outcome, body)
    }
  }
}

export const checks = {
  line(t) {
    return cases(t, {
      file: FILE,
      fn: 'requestLine',
      list: [
        lineCase('Writes the line of a removal', 'delete', 'http://127.0.0.1:7420/requests/88'),
        lineCase(
          'Keeps the question mark part',
          'GET',
          'http://127.0.0.1:7420/shows?day=sunday&page=2'
        ),
        lineCase(
          'Writes the line for another method and host',
          'put',
          'https://heronsgate.example/shows/brass-on-sunday'
        ),
        lineCase('Writes the line for an address with no path', 'get', 'http://studio-desk.example')
      ]
    })
  },

  remove(t) {
    return cases(t, {
      file: FILE,
      fn: 'removeRequest',
      list: [removeCase('Removes song request 88', 88), removeCase('Removes song request 7', 7)]
    })
  },

  studio(t) {
    return cases(t, {
      file: FILE,
      fn: 'removeAsStudio',
      list: [studioCase('Sends the key it is handed', 88), studioCase('Sends another key', 512)]
    })
  },

  accept(t) {
    return cases(t, {
      file: FILE,
      fn: 'fetchAs',
      list: [
        acceptCase('Asks for HTML', 'text/html'),
        acceptCase('Asks for another kind', 'text/csv')
      ]
    })
  }
}
