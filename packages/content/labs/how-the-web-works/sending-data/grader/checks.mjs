import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { cases, extraHeaderNames, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/send.js'
const PATH = '/api/requests'
const token = () => randomUUID().slice(0, 8)
const newId = () => 100 + Math.floor(Math.random() * 9000)

const JSON_TYPE = { 'content-type': 'application/json; charset=utf-8' }

/** The check server's routes: the answer for a JSON POST, and 415 for any other body. */
function routes(answer) {
  return [
    { method: 'POST', path: PATH, when: { header: 'content-type', startsWith: 'application/json' }, answers: [answer] },
    {
      method: 'POST',
      path: PATH,
      answers: [
        {
          status: 415,
          headers: JSON_TYPE,
          body: JSON.stringify({ error: 'Song requests are read as JSON, and this body did not say it was JSON.' })
        }
      ]
    }
  ]
}

/** What is wrong with the one request a function sent, or null. */
function sentProblem(fn, { received, outcome }, song, from) {
  if (received.length === 0) {
    if (outcome.kind === 'threw' && /GET\/HEAD method cannot have body/.test(outcome.message)) {
      return `fetch refused to send the request: it was a GET with a body. ${fn} adds something new, and the lesson names the method for that.`
    }
    return (
      fetchMistake(fn, outcome) ??
      "The check's server never received a request. Send it with fetch and wait for the answer."
    )
  }
  if (received.length > 1)
    return `${fn} sent ${received.length} requests to add one song request. One is enough.`
  const r = received[0]
  if (r.path !== PATH) return `${fn} sent its request to ${r.path}, not to the path the task gives.`
  if (r.method !== 'POST') {
    return `${fn} sent a ${r.method} request. ${r.method === 'GET' ? 'GET asks to read. ' : ''}The lesson names the method that adds something new.`
  }
  if (r.body === '[object Object]') {
    return 'The server received the words [object Object] as the body. That is what an object becomes when it is turned into text without being written as JSON first.'
  }
  const type = r.headers['content-type']
  if (!type?.toLowerCase().startsWith('application/json')) {
    const others = extraHeaderNames(r).filter((n) => n !== 'content-type')
    if (type?.startsWith('text/plain')) {
      return `The request said content-type: ${type}, the label fetch adds to a body of text when nobody sets one${others.length ? `, and it also carried ${others.join(', ')}` : ''}. So the server answered 415, whatever the body held. ${others.length ? 'A server finds a header by its exact name, so compare the spelling with the lesson.' : 'Say what kind of body it is: the lesson shows how.'}`
    }
    return `The request said content-type: ${type ?? 'nothing'}, which does not name JSON, so the server answered 415.`
  }
  let sent
  try {
    sent = JSON.parse(r.body)
  } catch {
    return 'The request says it is JSON, but its body is not JSON. Text built by hand breaks on quotes and other characters: let JSON.stringify write it.'
  }
  if (sent === null || typeof sent !== 'object' || Array.isArray(sent))
    return 'The body is JSON, but not an object with song and from.'
  const keys = Object.keys(sent).sort()
  if (!isDeepStrictEqual(keys, ['from', 'song'])) {
    return `The JSON object has ${keys.length ? keys.join(', ') : 'nothing in it'}. The task asks for song and from, and nothing else.`
  }
  if (sent.song !== song || sent.from !== from)
    return `song and from in the body are not the ones ${fn} was handed.`
  return null
}

const created = (id, song, from, location) => ({
  status: 201,
  headers: { ...JSON_TYPE, location },
  body: JSON.stringify({ id, song, from })
})

function addCase(name, song, from) {
  const id = newId()
  return {
    name,
    args: ['$base', song, from],
    headers: ['content-type'],
    bodies: true,
    routes: routes(created(id, song, from, `${PATH}/${id}`)),
    judge: (r) => {
      const problem = sentProblem('addRequest', r, song, from) ?? fetchMistake('addRequest', r.outcome)
      if (problem) return problem
      const v = r.outcome.value
      if (v.kind === 'number' && v.value === id) return null
      if (v.kind === 'object')
        return 'addRequest gave back everything the server answered. The task asks for the id in it.'
      if (v.kind === 'string' && v.value === String(id))
        return 'addRequest gave back the id as text. In the JSON it is a number, and reading it as JSON keeps it one.'
      if (v.kind === 'string')
        return 'addRequest gave back text. The answer is JSON: read it as JSON, then take the id from it.'
      return `addRequest gave back ${kindText(v)}, not the id the server gave the new request.`
    }
  }
}

function addressCase(name, song, from, location) {
  const id = newId()
  return {
    name,
    args: ['$base', song, from],
    headers: ['content-type'],
    bodies: true,
    routes: routes(created(id, song, from, location)),
    judge: (r) => {
      const problem =
        sentProblem('requestAddress', r, song, from) ?? fetchMistake('requestAddress', r.outcome)
      if (problem) return problem
      const v = r.outcome.value
      const loc = location.replaceAll('$base', r.base)
      const expected = new URL(loc, r.base).href
      if (v.kind === 'url')
        return 'requestAddress gave back a URL object. The task asks for the whole address as text, which a URL keeps in href.'
      if (v.kind !== 'string') return `requestAddress gave back ${kindText(v)}, not an address as text.`
      if (v.value === expected) return null
      if (v.value === loc)
        return 'requestAddress gave back the location exactly as it came. This one is only a path, and the task asks for a whole address, with the scheme and host of the server that answered.'
      if (v.value.includes(String(id)) && !loc.includes(String(id)))
        return 'The address was built from the id. The server decides where a new thing lives, and the location header says where: read it from there.'
      if (v.value === `${r.base}${PATH}`)
        return 'That is the address the request was sent to, not where the new song request lives. The location header of the answer says that.'
      if (v.value.endsWith('/undefined') || v.value.endsWith('/null'))
        return "The address ends in the word undefined or null, so the location was not read. The headers of an answer are not a plain object: read one with headers.get and the header's name."
      if (/^https?:\/\/.*https?:\/\//.test(v.value))
        return 'The address has two addresses in it. This location is already a whole address, so joining it to the base by hand breaks it. new URL with two values handles both kinds.'
      return 'The address is not where the location header of the answer says the new song request lives, as a whole address.'
    }
  }
}

function tryCase(name, song, from, status, error) {
  const id = newId()
  const answer =
    status === 201
      ? created(id, song, from, `${PATH}/${id}`)
      : { status, headers: JSON_TYPE, body: JSON.stringify({ error }) }
  const expected = status === 201 ? { added: true, id } : { added: false, reason: error }
  return {
    name,
    args: ['$base', song, from],
    headers: ['content-type'],
    bodies: true,
    routes: routes(answer),
    judge: (r) => {
      const problem = sentProblem('tryRequest', r, song, from) ?? fetchMistake('tryRequest', r.outcome)
      if (problem) return problem
      const v = r.outcome.value
      if (v.kind !== 'object')
        return `tryRequest gave back ${kindText(v)}, not an object with added and ${status === 201 ? 'id' : 'reason'}.`
      const got = v.value
      if (isDeepStrictEqual(got, expected)) return null
      if (status === 201) {
        if (got.added !== true)
          return 'The server answered 201 Created, so added must be true. Look at which statuses the code treats as added.'
        if (got.id !== id) return 'id is not the id in the JSON the server answered with.'
        return 'For an answer that added the request, the object has added and id, and nothing else.'
      }
      if (got.added !== false)
        return `The server answered ${status}, a client error, so added must be false.`
      if (typeof got.reason === 'object' && got.reason !== null)
        return 'reason is the whole JSON object. The task asks for the error written inside it.'
      if (got.reason !== error) {
        return typeof got.reason === 'string' && got.reason.length < 30 && !got.reason.includes(' is ')
          ? 'reason looks like the reason on the status line. The task asks for the error the server wrote in the JSON of its body, which says what to change.'
          : 'reason is not the error the server wrote in the JSON of its body.'
      }
      return 'For an answer that did not add the request, the object has added and reason, and nothing else.'
    }
  }
}

export const checks = {
  add(t) {
    return cases(t, {
      file: FILE,
      fn: 'addRequest',
      list: [
        addCase('Adds a song with quotes in its name', `The "Long" Way Home ${token()}`, 'Ina & Rhodri'),
        addCase('Adds another song', `Côr Harbour Hymn ${token()}`, `Mr Pryce, check ${token()}`)
      ]
    })
  },

  address(t) {
    return cases(t, {
      file: FILE,
      fn: 'requestAddress',
      list: [
        addressCase('Builds the address from a path', `Lantern Light ${token()}`, 'Nell', `${PATH}/r-${token()}`),
        addressCase(
          'Keeps a whole address on this server',
          `Ferry Bells ${token()}`,
          'Osian',
          `$base/kept/requests/${token()}`
        ),
        addressCase(
          'Keeps a whole address on another server',
          `Grey Harbour ${token()}`,
          'Mared',
          `http://requests.heronsgate.example/${token()}`
        )
      ]
    })
  },

  try(t) {
    return cases(t, {
      file: FILE,
      fn: 'tryRequest',
      list: [
        tryCase('Says a request was added', `Kite Hill ${token()}`, 'Dilys', 201),
        tryCase('Gives the reason for a 409', `Kite Hill ${token()}`, 'Dilys', 409, `That song is already on tonight's list, check ${token()}.`),
        tryCase('Gives the reason for a 400', `Low Tide ${token()}`, 'Huw', 400, `Requests are for songs on our shelf, check ${token()}.`),
        tryCase('Gives the reason for a 422', `Quarry Road ${token()}`, 'Bethan', 422, `Say who it is from in fewer words, check ${token()}.`)
      ]
    })
  }
}
