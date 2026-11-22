import { randomUUID } from 'node:crypto'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/address.js'
const token = () => randomUUID().slice(0, 8)

function partsProblem(v, expected) {
  if (v.kind !== 'object') {
    return `addressParts gave back ${kindText(v)}, not an object. Give back one object with the four parts as its properties.`
  }
  const got = v.value
  const missing = ['scheme', 'host', 'port', 'path'].filter((k) => !(k in got))
  if (missing.length) {
    return `The object has no ${missing.join(', no ')}. It needs all four properties, named exactly scheme, host, port and path.`
  }
  const problems = []
  if (got.scheme !== expected.scheme) {
    problems.push(
      typeof got.scheme === 'string' && got.scheme.endsWith(':')
        ? 'scheme still ends with its colon; the scheme is only the word before it.'
        : 'scheme is not the word at the very start of the address, before the colon.'
    )
  }
  if (got.host !== expected.host) {
    problems.push(
      typeof got.host === 'string' && got.host.includes(':')
        ? 'host has the port in it. The host is only the name of the computer, without the colon and the port.'
        : 'host is not the name of the computer that comes after the two slashes.'
    )
  }
  if (got.port !== expected.port) {
    if (typeof got.port === 'string' && got.port !== '') {
      problems.push('port is text. The task asks for a number.')
    } else if (!expected.written) {
      problems.push(
        `This address writes no port, so port must be the one its scheme uses when none is written. The lesson says which number goes with ${expected.scheme}.`
      )
    } else {
      problems.push('port is not the number written after the colon that follows the host.')
    }
  }
  if (got.path !== expected.path) {
    problems.push('path is not the part after the host, starting with its slash.')
  }
  return problems.length ? problems.join(' ') : null
}

const partsCase = (name, address, expected) => ({
  name,
  args: [address],
  network: false,
  judge: (r) =>
    r.outcome.kind === 'threw'
      ? `addressParts stopped with an error for this address. Read the error below.`
      : partsProblem(r.outcome.value, expected)
})

function joinProblem(v, base, path, expected) {
  if (v.kind === 'url') {
    return 'pageAddress gave back a URL object, not text. The task asks for the address as text.'
  }
  if (v.kind !== 'string') return `pageAddress gave back ${kindText(v)}, not the address as text.`
  if (v.value === expected) return null
  const afterHost = v.value.replace(/^\w+:\/\//, '')
  if (afterHost.includes('//')) {
    return base.endsWith('/')
      ? 'The address has two slashes in a row between the host and the path. This base ends with a slash and the path starts with one, so joining the two texts as they are doubles it.'
      : 'The address has two slashes in a row between the host and the path. The path already starts with its own slash.'
  }
  if (!v.value.startsWith(base.replace(/\/$/, ''))) {
    return 'The address does not start with the server it was given. Build it from base and path, not from an address typed into the file.'
  }
  return 'The address is not the server it was given followed by one slash and the path.'
}

const joinCase = (name, base, path) => {
  const expected = base.replace(/\/$/, '') + path
  return {
    name,
    args: [base, path],
    network: false,
    judge: (r) =>
      r.outcome.kind === 'threw'
        ? 'pageAddress stopped with an error. Read it below: both values it gets are text.'
        : joinProblem(r.outcome.value, base, path, expected)
  }
}

function fetchCase(name, path, body) {
  return {
    name,
    args: [`$base${path}`],
    routes: [{ path, answers: [{ status: 200, headers: { 'content-type': 'text/plain' }, body }] }],
    judge: ({ received, outcome }) => {
      const sent = received.filter((r) => r.path === path)
      if (received.length === 0) {
        return (
          fetchMistake('fetchText', outcome) ??
          "fetchText gave back something, but the check's server never received a request. Send a request with fetch to the address fetchText is given."
        )
      }
      if (sent.length === 0) {
        return `fetchText asked for ${received[0].target}, not for the page at the address it was given.`
      }
      if (received.length > 1) {
        return `fetchText sent ${received.length} requests for one page. One request is enough.`
      }
      if (sent[0].method !== 'GET') {
        return `fetchText sent a ${sent[0].method} request. Asking for a page is a GET, which is what fetch sends when you give it nothing but the address.`
      }
      const mistake = fetchMistake('fetchText', outcome)
      if (mistake) return mistake
      if (outcome.value.kind !== 'string' || outcome.value.value !== body) {
        return 'fetchText gave back something other than the text of the body the server answered with.'
      }
      return null
    }
  }
}

export const checks = {
  parts(t) {
    return cases(t, {
      file: FILE,
      fn: 'addressParts',
      list: [
        partsCase(
          'Reads an https address with no port written',
          'https://tickets.heronsgate.example/raffle/2026',
          {
            scheme: 'https',
            host: 'tickets.heronsgate.example',
            port: 443,
            path: '/raffle/2026'
          }
        ),
        partsCase('Reads an address with a port', 'http://127.0.0.1:6041/shows/allotment-hour', {
          scheme: 'http',
          host: '127.0.0.1',
          port: 6041,
          path: '/shows/allotment-hour',
          written: true
        }),
        partsCase('Reads an http address with no port and no path', 'http://studio-desk.example/', {
          scheme: 'http',
          host: 'studio-desk.example',
          port: 80,
          path: '/'
        }),
        partsCase(
          'Reads an https address with its own port',
          'https://heronsgate.example:8443/listen',
          {
            scheme: 'https',
            host: 'heronsgate.example',
            port: 8443,
            path: '/listen',
            written: true
          }
        )
      ]
    })
  },

  join(t) {
    return cases(t, {
      file: FILE,
      fn: 'pageAddress',
      list: [
        joinCase('Joins a base and a path', 'http://127.0.0.1:7310', '/requests'),
        joinCase(
          'Joins a base that ends with a slash',
          'http://127.0.0.1:7310/',
          '/shows/brass-on-sunday'
        ),
        joinCase('Joins an https base', 'https://heronsgate.example', '/listen/live')
      ]
    })
  },

  fetch(t) {
    const a = token()
    const b = token()
    return cases(t, {
      file: FILE,
      fn: 'fetchText',
      list: [
        fetchCase(
          'Reads the body of a page',
          `/listings/${a}`,
          `Hedgerow Hour at 15:00, check ${a}`
        ),
        fetchCase(
          'Reads a body of several lines',
          `/notices/${b}`,
          `Bring a mug to the volunteers' meeting.\nThe van is parked by the hall, check ${b}.`
        )
      ]
    })
  }
}
