import { isDeepStrictEqual } from 'node:util'
import { box, errorLine, hasStack } from '../../grading.mjs'
import { LATE, notListening, portTrouble, serve, serverReport, unanswered } from '../../serving.mjs'

const pass = (name, output) => ({ name, passed: true, output })
const fail = (name, message, output) => ({ name, passed: false, message, output })

const NOT_JSON = 'The body is not JSON.'
const NOT_READING = 'A reading needs a tap and its litres.'
const TOO_LARGE = 'The body is too large.'
const show = (value) => JSON.stringify(value)
// The error the server stopped with, without a full stop at the end, or null.
const crash = (s) => (hasStack(s.stderr) ? (errorLine(s.stderr) ?? 'an error').replace(/\.+$/, '') : null)
const isJson = (r) => /^application\/json\b/i.test(r.type ?? '')

/** Starts the server on `port` and runs `talk(send)` once it listens. */
async function start(t, port, talk) {
  const dir = await box(t)
  const s = await serve(dir, 'server.js', { env: { PORT: String(port) } }, talk)
  return { dir, s }
}

async function early(name, s, dir, port) {
  const stop = await notListening(name, s, dir, 'server.js')
  if (stop) return stop
  const message = portTrouble(s, port) ?? (s.late ? LATE : null)
  return message ? fail(name, message, serverReport(s)) : null
}

/** Why a POST of a good reading was not answered with it, in words, or null. */
function savedTrouble(r, reading, s) {
  if (r.status === 501) return `${r.request} still got the starter's answer, Not written yet.`
  if (r.answered && r.sent < r.of) {
    return `${r.request} was answered after ${r.sent} of its ${r.of} pieces had arrived, before the rest of the body. Read every piece until the body ends, then use it.`
  }
  if (!r.answered && r.error && r.sent < r.of) {
    return `${r.request} closed after ${r.sent} of its ${r.of} pieces: the server stopped with ${crash(s) ?? 'an error'} while the body was still arriving. Read every piece until the body ends, then read it as JSON.`
  }
  const missing = unanswered(r, s)
  if (missing) return missing
  if (r.status === 400 && r.json?.error === NOT_JSON) {
    return `${r.request} was refused as not JSON, though it is. The body arrives in pieces: join them all before reading it as JSON.`
  }
  if (r.status === 200) return `${r.request} got status 200. A request that adds something answers 201, Created.`
  if (r.status !== 201) return `${r.request} got status ${r.status}. A reading that was kept is answered with 201.`
  if (r.type === undefined) return `${r.request} was answered without a Content-Type, so the phone cannot know the body is JSON. Say it is application/json.`
  if (!isJson(r)) return `${r.request} was answered with Content-Type ${r.type}. The body is JSON: application/json.`
  if (r.json === undefined) return `${r.request} was answered with a body that is not JSON: ${r.body.trim().slice(0, 80)}. Turn the reading into JSON text first.`
  if (isDeepStrictEqual(r.json, reading)) return null
  if (r.json && typeof r.json === 'object' && 'by' in r.json) return `${r.request} was answered with ${show(r.json)}. Keep only the tap and the litres of a reading.`
  if (typeof r.json?.tap === 'string' && r.json.tap.includes('\uFFFD')) {
    return `${r.request} came back with the â broken: it takes two bytes, and they arrived in two pieces. Join the bytes of every piece first, and turn them into text once, at the end.`
  }
  if (typeof r.json?.litres === 'string') return `${r.request} was answered with litres as text. Keep the litres as the number that was sent.`
  return `${r.request} was answered with ${show(r.json)}. Answer with the reading that was kept: its tap and its litres.`
}

/** Why GET /readings did not give `want`, in words, or null. */
function totalsTrouble(r, want, s, when) {
  const missing = unanswered(r, s)
  if (missing) return missing
  if (r.status === 501) return 'GET /readings still got the starter\'s answer, Not written yet.'
  if (r.status !== 200) return `GET /readings ${when} got status ${r.status}. It is a page that is there: 200.`
  if (r.type === undefined) return 'GET /readings was answered without a Content-Type. Say it is application/json.'
  if (!isJson(r)) return `GET /readings was answered with Content-Type ${r.type}. The body is JSON: application/json.`
  if (r.json === undefined) return `GET /readings was answered with a body that is not JSON: ${r.body.trim().slice(0, 80)}.`
  if (isDeepStrictEqual(r.json, want)) return null
  if (isDeepStrictEqual(r.json, {}) && Object.keys(want).length > 0) {
    return `GET /readings ${when} got {}. If you keep the totals in a Map, JSON turns it into {}: make a plain object of it first.`
  }
  if (Object.values(r.json ?? {}).some((v) => typeof v === 'string')) return `GET /readings ${when} got ${show(r.json)}: litres added as text. Add them as numbers.`
  return `GET /readings ${when} got ${show(r.json)}. It should have each tap's litres added up, from the readings sent since the server started.`
}

const post = (send, reading, parts = 3) => send('POST', '/readings', { body: typeof reading === 'string' ? reading : JSON.stringify(reading), parts })

/** A reading padded with a note to exactly `bytes` bytes of JSON. */
function padded(reading, bytes) {
  const bare = JSON.stringify({ ...reading, note: '' })
  return JSON.stringify({ ...reading, note: 'x'.repeat(bytes - Buffer.byteLength(bare)) })
}

export const checks = {
  async body(t) {
    const name = 'POST /readings reads the whole body, and answers 201 with the reading as JSON'
    const { dir, s } = await start(t, 4319, async (send) => {
      await post(send, { tap: 'west', litres: 31, by: 'Imran' }, 3)
      await post(send, { tap: 'pond', litres: 0.5 }, 4)
      // In 3 pieces, the two bytes of the â fall in different pieces.
      await post(send, { tap: 'Siân\'s shed', litres: 8 }, 3)
    })
    const stop = await early(name, s, dir, 4319)
    if (stop) return [stop]
    const said = 'Check sent each body in pieces, each one only once the server had the one before.'
    const [a, b, c] = s.replies
    const message =
      savedTrouble(a, { tap: 'west', litres: 31 }, s) ??
      (b ? savedTrouble(b, { tap: 'pond', litres: 0.5 }, s) : null) ??
      (c ? savedTrouble(c, { tap: 'Siân\'s shed', litres: 8 }, s) : null)
    return [message ? fail(name, message, `${said}\n${serverReport(s)}`) : pass(name, `${said}\n${serverReport(s)}`)]
  },

  async totals(t) {
    const name = 'GET /readings answers each tap\'s litres as JSON'
    const { dir, s } = await start(t, 5233, async (send) => {
      await send('GET', '/readings')
      await post(send, { tap: 'north', litres: 26 })
      await post(send, { tap: 'south', litres: 4 })
      await post(send, { tap: 'north', litres: 12.5 })
      await send('GET', '/readings')
    })
    const stop = await early(name, s, dir, 5233)
    if (stop) return [stop]
    const [first, ...rest] = s.replies
    const last = rest.at(-1)
    const posts = rest.slice(0, -1)
    let message = totalsTrouble(first, {}, s, 'before any reading')
    if (!message) {
      const broken = posts.find((r) => !(r.answered && r.status === 201))
      if (broken) message = `${broken.request} was not kept: ${savedTrouble(broken, JSON.parse('{}'), s) ?? 'see the answer below'}. Task 1 is not right yet.`
    }
    message ??= totalsTrouble(last, { north: 38.5, south: 4 }, s, 'after three readings')
    return [message ? fail(name, message, serverReport(s)) : pass(name, serverReport(s))]
  },

  async 'bad-json'(t) {
    const name = 'A body that is not JSON gets 400 and an error as JSON'
    const name2 = 'JSON that is not a reading gets 400 too, and nothing is kept'
    const broken = ['{"tap":"north","litres":', 'tap=north&litres=3', '']
    const wrong = ['{"tap":"north"}', '{"tap":"","litres":3}', '{"tap":"north","litres":"12"}', '{"tap":"north","litres":-5}', 'null', '[1,2]']
    const { dir, s } = await start(t, 4319, async (send) => {
      await post(send, { tap: 'east', litres: 7 })
      for (const body of [...broken, ...wrong]) await send('POST', '/readings', { body, parts: body.length > 3 ? 2 : 1 })
      await send('GET', '/readings')
    })
    const stop = await early(name, s, dir, 4319)
    if (stop) return [stop]
    const [good, ...others] = s.replies
    const last = others.pop()
    const notJson = others.slice(0, broken.length)
    const notReading = others.slice(broken.length)

    const judge = (r, error) => {
      if (!r) return 'The server stopped answering before Check had sent every body. Look at its standard error below.'
      if (!r.answered && r.error) {
        const line = crash(s)
        if (line && /SyntaxError/.test(line)) return `${r.request} closed with no answer: the server stopped with ${line}. A body that is not JSON makes JSON.parse throw; catch it.`
        if (line) return `${r.request} closed with no answer: the server stopped with ${line}. The body was JSON, but not an object with a tap and litres: check what JSON.parse gave back before you use it.`
        return unanswered(r, s)
      }
      const missing = unanswered(r, s)
      if (missing) return missing
      if (r.status === 501) return `${r.request} still got the starter's answer.`
      if (r.status === 201 || r.status === 200) return `${r.request} got status ${r.status}, as if the reading were good.`
      if (r.status !== 400) return `${r.request} got status ${r.status}. A body the server cannot use is the sender's mistake: 400.`
      if (!isJson(r) || r.json === undefined) return `${r.request} got 400, but its body should be JSON too, with an error, and say so in its Content-Type.`
      if (r.json?.error !== error) return `${r.request} got 400 with ${r.body.trim()}. Its error should be the one from the task: ${error === NOT_JSON ? 'the body is not JSON' : 'the body is JSON, but not a reading'}.`
      return null
    }
    let m1 = savedTrouble(good, { tap: 'east', litres: 7 }, s)
    if (m1) m1 = `The good reading sent first was not kept, so Task 1 is not right yet: ${m1}`
    for (const r of notJson) m1 ??= judge(r, NOT_JSON)
    const results = [m1 ? fail(name, m1, serverReport(s)) : pass(name, serverReport(s))]

    let m2 = notJson.some((r) => !r.answered && r.error)
      ? 'The server stopped on an earlier body that was not JSON, so these got no answer. Catch the error JSON.parse throws.'
      : null
    for (const r of notReading) m2 ??= judge(r, NOT_READING)
    if (!m2 && last && !(last.answered && isDeepStrictEqual(last.json, { east: 7 }))) {
      m2 = last.answered ? `After the refused bodies, GET /readings got ${last.body.trim()}. Only the good reading, east 7, was kept: a refused body changes nothing.` : unanswered(last, s)
    }
    results.push(m2 ? fail(name2, m2, serverReport(s)) : pass(name2, serverReport(s)))
    return results
  },

  async 'too-large'(t) {
    const name = 'A body of more than 1024 bytes gets 413, and the server stops reading it'
    const name2 = 'A body of exactly 1024 bytes is still kept'
    const big = padded({ tap: 'north', litres: 9 }, 3000)
    const withLength = padded({ tap: 'south', litres: 9 }, 1500)
    const edge = padded({ tap: 'west', litres: 2 }, 1024)
    const { dir, s } = await start(t, 5233, async (send) => {
      await send('POST', '/readings', { body: big, parts: 15, chunked: true })
      await send('POST', '/readings', { body: withLength, parts: 3 })
      await send('POST', '/readings', { body: edge, parts: 4 })
      await send('GET', '/readings')
    })
    const stop = await early(name, s, dir, 5233)
    if (stop) return [stop]
    const said = 'Check sent a body of 3000 bytes in 15 pieces without saying its length, then one of 1500 bytes that says it, then one of exactly 1024 bytes.'
    const output = `${said}\n${serverReport(s)}`
    const [chunked, long, exact, totals] = s.replies

    let m1 = null
    for (const r of [chunked, long]) {
      if (r?.status === 501) m1 = `${r.request} still got the starter's answer, Not written yet.`
      else if (!r) m1 = 'The server stopped answering before Check had sent every body. Look at its standard error below.'
      else if (r.answered && r.status === 201) {
        m1 = r === chunked
          ? `${r.request} was kept, though it is far over the limit. A sender may not say how long its body is, as here: count the bytes as the pieces arrive.`
          : `${r.request} was kept, though it is over the limit of 1024 bytes.`
      } else if (r.answered && r.status === 400) m1 = `${r.request} got 400. A body that is too large is refused with 413, before it is read as JSON.`
      else if (r.answered && r.status !== 413) m1 = `${r.request} got status ${r.status}. A body that is too large is 413.`
      else if (!r.answered) m1 = unanswered(r, s)
      else if (!isJson(r) || r.json?.error !== TOO_LARGE) m1 = `${r.request} got 413 with ${r.body.trim().slice(0, 80)}. Its body should be JSON with the error from the task.`
      else if (r === chunked && r.sent === r.of) {
        m1 = `${r.request} was refused only after all ${r.of} pieces had arrived. Stop reading as soon as the body is over the limit: a body without end would never be refused.`
      }
      if (m1) break
    }
    const results = [m1 ? fail(name, m1, output) : pass(name, output)]

    let m2 = null
    if (!exact) m2 = 'The server stopped answering before Check could send the body of 1024 bytes.'
    else if (exact.answered && exact.status === 413) m2 = 'The body of exactly 1024 bytes got 413. The limit is more than 1024 bytes: 1024 itself is fine.'
    else m2 = savedTrouble(exact, { tap: 'west', litres: 2 }, s)
    if (!m2 && !(totals?.answered && isDeepStrictEqual(totals.json, { west: 2 }))) {
      m2 = totals?.answered ? `GET /readings got ${totals.body.trim()} at the end. Only the body of 1024 bytes was kept: one refused as too large changes nothing.` : 'The server did not answer GET /readings at the end.'
    }
    results.push(m2 ? fail(name2, m2, output) : pass(name2, output))
    return results
  }
}
