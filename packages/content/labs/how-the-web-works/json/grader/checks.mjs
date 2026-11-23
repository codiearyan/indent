import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/json.js'
const token = () => randomUUID().slice(0, 8)

const lineOf = (s) => `${s.name}, ${s.day} at ${s.time}, with ${s.presenter}`

function lineCase(name, show, text) {
  const expected = lineOf(show)
  return {
    name,
    args: [text],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') {
        return outcome.name === 'SyntaxError'
          ? 'showLine stopped with a SyntaxError, but the text it was handed is JSON. Look at what was handed to JSON.parse: it should be the text showLine gets, as it is.'
          : 'showLine stopped with an error. Read it below.'
      }
      const v = outcome.value
      if (v.kind === 'object')
        return 'showLine gave back the show itself. The task asks for one line of text about it.'
      if (v.kind !== 'string') return `showLine gave back ${kindText(v)}, not a line of text.`
      if (v.value === expected) return null
      if (v.value.includes('undefined')) {
        return "undefined appears in the line, so a property was read that is not there. Text has no name or time of its own: read the show out of the JSON text first, then take each part from what that gives back, with the task's names."
      }
      if (v.value.includes('"') && !show.name.includes('"')) {
        return 'The line has double quotes from the JSON text in it. Read the values out of the JSON instead of cutting the text up.'
      }
      if (!v.value.startsWith(show.name)) {
        return "The line does not start with the whole name of the show showLine was handed. Build it from the text it gets on each call, and let JSON.parse read that text: cutting it at commas or quotes breaks on a name that has them."
      }
      if (!v.value.includes(show.day) || !v.value.includes(show.time)) {
        return 'The day or the time in the line is not the one in the JSON text showLine was handed. Take each part from the text it gets on each call.'
      }
      return "The line is not the name, a comma and a space, the day, ' at ', the time, ', with ' and the presenter, as in the task's example."
    }
  }
}

function namesCase(name, shows) {
  const path = '/api/shows'
  const body = JSON.stringify(shows)
  return {
    name,
    args: ['$base'],
    routes: [
      {
        method: 'GET',
        path,
        answers: [{ status: 200, headers: { 'content-type': 'application/json' }, body }]
      }
    ],
    judge: ({ received, outcome }) => {
      if (received.length === 0) {
        return (
          fetchMistake('showNames', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      if (received[0].path !== path)
        return `showNames asked for ${received[0].path}, not the page the task gives.`
      if (received.length > 1)
        return `showNames sent ${received.length} requests. One answer holds every show.`
      if (outcome.kind === 'threw' && /\.map is not a function/.test(outcome.message)) {
        return 'showNames called map on something that is not a list. If it was the body read as text, it is one piece of text: read it as JSON. If it was the reading itself, it is a promise: wait for it with await.'
      }
      const mistake = fetchMistake('showNames', outcome)
      if (mistake) return mistake
      const v = outcome.value
      if (v.kind === 'string')
        return 'showNames gave back text. The body is JSON: read it as JSON to get the list of shows.'
      if (v.kind !== 'array') return `showNames gave back ${kindText(v)}, not a list.`
      if (isDeepStrictEqual(v.value, shows.map((s) => s.name))) return null
      if (v.value.some((x) => typeof x === 'object' && x !== null))
        return 'showNames gave back the shows themselves. The task asks for a list of their names only.'
      if (v.value.length !== shows.length)
        return `showNames gave back ${v.value.length} ${v.value.length === 1 ? 'name' : 'names'}, but the server sent ${shows.length === 1 ? 'one show' : `${shows.length} shows`}.`
      return 'The names are not the names of the shows this server sent, in its order.'
    }
  }
}

const DAYS = ['monday', 'tuesday', 'thursday', 'saturday', 'sunday']
const TIMES = ['06:15', '14:30', '19:45', '23:05', '10:50']
let shown = 0

const show = (name) => {
  const n = shown++
  return {
    slug: `show-${token()}`,
    name,
    presenter: `Presenter ${token()}`,
    day: DAYS[n % DAYS.length],
    time: TIMES[(n * 2) % TIMES.length]
  }
}

function readCase(name, type, body, expect) {
  const path = `/data/${token()}`
  const headers = type === null ? {} : { 'content-type': type }
  return {
    name,
    args: [`$base${path}`],
    routes: [{ path, answers: [{ status: 200, headers, body }] }],
    judge: ({ received, outcome }) => {
      if (received.length === 0) {
        return (
          fetchMistake('readJson', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      if (received[0].path !== path)
        return `readJson asked for ${received[0].path}, not the address it was handed.`
      if (received.length > 1)
        return `readJson sent ${received.length} requests for one page. One answer holds the content-type and the body.`
      const said = type === null ? 'no content-type at all' : `content-type: ${type}`
      if (expect === 'throw') {
        if (outcome.kind === 'threw' && outcome.name === 'SyntaxError') return null
        if (outcome.kind === 'threw') return fetchMistake('readJson', outcome)
        return `This answer says it is JSON but its body is not, and readJson gave back ${outcome.value.kind === 'null' ? 'null' : kindText(outcome.value)}. The task asks for the error from reading it to come out of readJson, so nothing may catch it.`
      }
      if (outcome.kind === 'threw') {
        if (/Cannot read properties of null/.test(outcome.message)) {
          return 'readJson read from null. An answer with no content-type gives null for that header, and a method cannot be called on null: decide what no content-type means first.'
        }
        if (outcome.name === 'SyntaxError' && type?.toLowerCase().startsWith('application/json')) {
          return `readJson stopped with a SyntaxError on an answer with ${said}. That is another type whose name only starts like JSON's: compare the whole type, the part before any semicolon.`
        }
        if (outcome.name === 'SyntaxError') {
          return `readJson stopped with a SyntaxError on an answer with ${said}. The body was read as JSON although the answer does not say it is JSON. Look at the content-type before you read the body.`
        }
        return fetchMistake('readJson', outcome)
      }
      const mistake = fetchMistake('readJson', outcome)
      if (mistake) return mistake
      const v = outcome.value
      if (expect === null) {
        if (v.kind === 'null') return null
        return `This answer has ${said}, so readJson must give back null${body.trim().startsWith('{') ? '. Its body happens to look like JSON, but the server says it is not, and the task says to go by what the server says' : ''}.`
      }
      if (v.kind === 'null' && type !== type.toLowerCase()) {
        return `readJson gave back null for an answer with ${said}. A type ignores capital letters, like a header name, so this says JSON too.`
      }
      if (v.kind === 'null') {
        return type.includes(';')
          ? `readJson gave back null for an answer with ${said}. That says JSON, with a charset after it, so comparing the whole header with one value is not enough.`
          : `readJson gave back null for an answer with ${said}, which says the body is JSON.`
      }
      if (v.kind === 'string' && v.value === body)
        return 'readJson gave back the body as text. Read it as JSON to get the value it holds.'
      if (!isDeepStrictEqual(v.value, JSON.parse(body)))
        return 'readJson gave back something other than the value in the body of this answer.'
      return null
    }
  }
}

export const checks = {
  line(t) {
    const fish = show('Fish, Chips and Folk')
    const quoted = show('The "Very" Late Show')
    const plain = show(`Hymns at Harbour Lights ${token()}`)
    const { slug, name, presenter, day, time } = plain
    return cases(t, {
      file: FILE,
      fn: 'showLine',
      list: [
        lineCase('Reads a show with commas in its name', fish, JSON.stringify(fish)),
        lineCase('Reads a show with quotes in its name', quoted, JSON.stringify(quoted)),
        lineCase(
          'Reads a show written over several lines, in another order',
          plain,
          JSON.stringify({ time, presenter, id: 7, name, day, slug, live: true }, null, 2)
        )
      ]
    })
  },

  names(t) {
    return cases(t, {
      file: FILE,
      fn: 'showNames',
      list: [
        namesCase('Gives the names of three shows, in order', [
          show(`Morning Tide ${token()}`),
          show('Côr y Cwm, live'),
          show(`Night Ferry ${token()}`)
        ]),
        namesCase('Gives the name of the only show', [show(`Quiet Hour ${token()}`)]),
        namesCase('Gives an empty list when there are no shows', [])
      ]
    })
  },

  read(t) {
    const one = { name: `Harbour ${token()}`, minutes: 45, live: false, guests: ['Ina', 'Rhodri'] }
    const list = [{ id: 1 }, { id: 2, note: `check ${token()}` }]
    return cases(t, {
      file: FILE,
      fn: 'readJson',
      list: [
        readCase('Reads an answer that is JSON', 'application/json', JSON.stringify(one), 'value'),
        readCase(
          'Reads JSON with a charset after its type',
          'application/json; charset=utf-8',
          JSON.stringify(list),
          'value'
        ),
        readCase(
          'Reads JSON that holds text',
          'application/json',
          JSON.stringify(`Just a sentence, check ${token()}`),
          'value'
        ),
        readCase(
          'Gives null for plain text that looks like JSON',
          'text/plain; charset=utf-8',
          JSON.stringify({ name: `Not JSON ${token()}` }),
          null
        ),
        readCase(
          'Gives null for a web page',
          'text/html',
          `<!doctype html><title>Bad gateway</title><p>check ${token()}</p>`,
          null
        ),
        readCase(
          'Reads JSON whose type is in capital letters',
          'Application/JSON; charset=UTF-8',
          JSON.stringify({ song: `Seven Bridges ${token()}`, plays: 3 }),
          'value'
        ),
        readCase(
          'Gives null for another type that starts like JSON',
          'application/json-seq',
          `\u001e${JSON.stringify({ song: `Kite Hill ${token()}` })}\n`,
          null
        ),
        readCase('Gives null when there is no content-type', null, '[1, 2, 3]', null),
        readCase(
          'Lets the error out for a body that says JSON and is not',
          'application/json',
          `{"name": "Half a show ${token()}`,
          'throw'
        )
      ]
    })
  }
}
