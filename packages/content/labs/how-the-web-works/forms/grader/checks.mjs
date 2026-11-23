import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { cases, extraHeaderNames, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/forms.js'
const FORM_TYPE = 'application/x-www-form-urlencoded'
const token = () => randomUUID().slice(0, 8)

const entries = (text) => [...new URLSearchParams(text)]

function bodyCase(name, fields) {
  return {
    name,
    args: [fields],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'formBody stopped with an error. Read it below.'
      const v = outcome.value
      if (v.kind === 'object' && Object.keys(v.value).length === 0) {
        return 'formBody gave back an object, not text. If it is a URLSearchParams, it can write itself out as text.'
      }
      if (v.kind !== 'string') return `formBody gave back ${kindText(v)}, not the text of a body.`
      const want = Object.entries(fields)
      if (v.value.startsWith('?'))
        return 'The body starts with a question mark. That mark belongs to an address, not to a body.'
      if (isDeepStrictEqual(entries(v.value), want)) return null
      if (v.value.trim().startsWith('{'))
        return 'formBody gave back JSON. A form body is written like the question mark part of an address, not like JSON.'
      const got = entries(v.value)
      const special = (text) => /[&=+%#]/.test(text)
      if (got.length !== want.length || got.some(([n], i) => n !== want[i]?.[0])) {
        if (got.length > want.length && want.some(([, value]) => special(value)))
          return `A server reading this body finds ${got.length} names where formBody was handed ${want.length}. A value with & or = in it splits in two unless it is encoded.`
        return 'The names in this body are not the ones formBody was handed, in their order. Build the body from the fields it gets on each call.'
      }
      if (want.some(([, value]) => special(value)))
        return 'A server reading this body finds values that are not the ones formBody was handed. Characters like +, % and & have jobs in this encoding, so a value with them must be encoded to arrive as typed.'
      return 'A server reading this body finds values that are not the ones formBody was handed.'
    }
  }
}

/** What is wrong with the method and path of the one form request a function sent, or null. */
function postProblem(fn, { received, outcome }, path) {
  if (received.length === 0) {
    if (outcome.kind === 'threw' && /GET\/HEAD method cannot have body/.test(outcome.message)) {
      return `fetch refused to send the request: it was a GET with a body. This form is sent with POST.`
    }
    return (
      fetchMistake(fn, outcome) ??
      "The check's server never received a request. Send it with fetch and wait for the answer."
    )
  }
  if (received.length > 1) return `${fn} sent ${received.length} requests for one form. One is enough.`
  const r = received[0]
  if (r.path !== path) return `${fn} sent its request to ${r.path}, not to the path the task gives.`
  if (r.method === 'GET' && r.query.length)
    return `${fn} sent the fields in the question mark part of a GET. That is what a form with method get sends; this form is sent with POST, with the fields in its body.`
  if (r.method !== 'POST') return `${fn} sent a ${r.method} request. This form is sent with POST.`
  return null
}

const typeOf = (r) => r.headers['content-type'] ?? ''

function textProblem(fn, outcome, body) {
  const mistake = fetchMistake(fn, outcome)
  if (mistake) return mistake
  if (outcome.value.kind !== 'string' || outcome.value.value !== body)
    return `${fn} gave back something other than the text of the body the server answered with.`
  return null
}

function sendCase(name, fields, status = 200) {
  const path = '/forms/request'
  const body =
    status === 200
      ? `Thank you, request ${token()} is on the list.`
      : `That song is already on the list, check ${token()}.`
  return {
    name,
    args: ['$base', fields],
    headers: ['content-type'],
    bodies: true,
    routes: [
      {
        method: 'POST',
        path,
        when: { header: 'content-type', startsWith: FORM_TYPE },
        answers: [{ status, body }]
      },
      {
        method: 'POST',
        path,
        answers: [{ status: 415, body: 'This form is read as a form body.' }]
      },
      { path, answers: [{ status: 405, body: 'This form is sent with POST.' }] }
    ],
    judge: (r) => {
      const problem = postProblem('sendRequestForm', r, path)
      if (problem) return problem
      const sent = r.received[0]
      const type = typeOf(sent)
      if (type.startsWith('multipart/form-data'))
        return 'The request carried a multipart body, the kind for a form with a file. This form has no file, and the server reads it as a form body, so it answered 415.'
      if (type.startsWith('application/json'))
        return 'The request carried JSON. This server takes the request form the way a form on a page sends it, so it answered 415.'
      if (sent.body === '[object Object]')
        return 'The server received the words [object Object] as the body. That is what an object becomes when fetch is handed it as it is: turn the fields into a form body first.'
      if (!type.toLowerCase().startsWith(FORM_TYPE)) {
        const others = extraHeaderNames(sent).filter((n) => n !== 'content-type')
        return `The request said content-type: ${type || 'nothing'}${type.startsWith('text/plain') ? ', the label fetch gives to a body of text' : ''}, so the server answered 415. ${others.length ? 'A server finds a header by its exact name, so compare the spelling with the lesson.' : 'The lesson shows how a form body gets the content type of a form.'}`
      }
      if (!isDeepStrictEqual(entries(sent.body), Object.entries(fields)))
        return 'The server read names and values from the body that are not the fields sendRequestForm was handed. If Task 1 builds the body, get it to pass first.'
      const v = r.outcome.value
      if (status !== 200 && r.outcome.kind === 'returned' && v.kind !== 'string' && v.kind !== 'response')
        return `The server turned this slip down with a ${status}, and sendRequestForm gave back ${kindText(v)}. The task asks for the text of the answer whatever the status: it says why.`
      return textProblem('sendRequestForm', r.outcome, body)
    }
  }
}

/** The parts of a multipart body, or a plain message about why they cannot be found. */
function parts(type, body) {
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(type)
  if (!boundary) return { problem: 'no boundary' }
  const edge = `--${boundary[1] ?? boundary[2]}`
  const pieces = body.split(edge)
  if (pieces.length < 3) return { problem: 'no parts' }
  return {
    list: pieces.slice(1, -1).map((piece) => {
      const text = piece.replace(/^\r\n/, '').replace(/\r\n$/, '')
      const end = text.indexOf('\r\n\r\n')
      const head = end === -1 ? text : text.slice(0, end)
      const disposition = /content-disposition:[^\r\n]*/i.exec(head)?.[0] ?? ''
      const field = (key) => new RegExp(`;\\s*${key}="([^"]*)"`, 'i').exec(disposition)?.[1]
      return {
        name: field('name'),
        filename: field('filename'),
        content: end === -1 ? '' : text.slice(end + 4)
      }
    })
  }
}

function jingleCase(name, entrant, fileName, script) {
  const path = '/forms/jingle'
  const body = `Thank you, entry ${token()} is in the competition.`
  return {
    name,
    args: ['$base', entrant, fileName, script],
    headers: ['content-type'],
    bodies: true,
    routes: [
      {
        method: 'POST',
        path,
        when: { header: 'content-type', startsWith: 'multipart/form-data' },
        answers: [{ status: 200, body }]
      },
      {
        method: 'POST',
        path,
        answers: [{ status: 415, body: 'This form carries a file, so it is read as multipart/form-data.' }]
      },
      { path, answers: [{ status: 405, body: 'This form is sent with POST.' }] }
    ],
    judge: (r) => {
      const problem = postProblem('enterJingle', r, path)
      if (problem) return problem
      const sent = r.received[0]
      const type = typeOf(sent)
      if (!type.toLowerCase().startsWith('multipart/form-data')) {
        if (type.startsWith(FORM_TYPE))
          return 'The request carried a form body with names and values only. A file needs the kind of body made of parts.'
        if (sent.body === '[object FormData]')
          return 'The server received the words [object FormData]. A FormData is handed to fetch as the body itself, not turned into text first.'
        return `The request said content-type: ${type || 'nothing'}, not multipart/form-data, so the server answered 415.`
      }
      const found = parts(type, sent.body)
      if (found.problem === 'no boundary')
        return 'The content-type says multipart/form-data but has no boundary, so the server cannot find where the parts start and end. A content-type of your own replaced the one fetch writes for a FormData: leave that header to fetch.'
      if (found.problem) return 'The server could not find any parts in the body.'
      const list = found.list
      const names = list.map((p) => p.name)
      const who = list.find((p) => p.name === 'entrant')
      const file = list.find((p) => p.name === 'script')
      if (!who || !file || list.length !== 2) {
        return `The body has ${list.length === 1 ? 'one part' : `${list.length} parts`}${names.length ? `, named ${names.join(', ')}` : ''}. The task asks for two: one named entrant and one named script.`
      }
      if (who.filename !== undefined) return 'The entrant part was sent as a file. It is a plain value.'
      if (who.content !== entrant) return "The entrant part does not hold the entrant's name enterJingle was handed."
      if (file.filename === undefined)
        return 'The script part was sent as a plain value, with no file name. The task asks for it as a file, the way a file box on a form sends it.'
      if (file.filename !== fileName)
        return `The script file is called ${file.filename}, not the file name enterJingle was handed.`
      if (file.content !== script) return 'The contents of the script file are not the script enterJingle was handed.'
      return textProblem('enterJingle', r.outcome, body)
    }
  }
}

export const checks = {
  body(t) {
    return cases(t, {
      file: FILE,
      fn: 'formBody',
      list: [
        bodyCase('Writes two plain values', { song: `Kite Hill ${token()}`, from: 'Dilys' }),
        bodyCase('Keeps &, =, + and % as typed', {
          song: `Fish & Chips = 50% + more ${token()}`,
          from: 'Ina #3'
        }),
        bodyCase('Writes three names in order, one with letters beyond English', {
          from: `Côr y Cwm ${token()}`,
          song: 'Ar Lan y Môr',
          note: 'for Nain, aged 90'
        }),
        bodyCase('Writes nothing for no fields', {})
      ]
    })
  },

  send(t) {
    return cases(t, {
      file: FILE,
      fn: 'sendRequestForm',
      list: [
        sendCase('Sends the request form', { song: `Low Tide ${token()}`, from: 'Huw & Mared' }),
        sendCase('Sends other fields as typed', {
          song: `100% Rain ${token()}`,
          from: 'the + club',
          table: '7'
        }),
        sendCase(
          'Gives back the text of a refusal too',
          { song: `Kite Hill ${token()}`, from: 'Dilys' },
          409
        )
      ]
    })
  },

  jingle(t) {
    return cases(t, {
      file: FILE,
      fn: 'enterJingle',
      list: [
        jingleCase(
          'Sends an entry with its script as a file',
          `Osian ${token()}`,
          `osian-${token()}.txt`,
          `Heronsgate on the hill,\nplaying music, never still.\ncheck ${token()}`
        ),
        jingleCase(
          'Sends another entry',
          'Bethan & Huw',
          `jingle-${token()}.txt`,
          `One line only, check ${token()}`
        )
      ]
    })
  }
}
