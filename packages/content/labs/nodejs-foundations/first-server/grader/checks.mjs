import { box, errorLine, hasStack, lines, put } from '../../grading.mjs'
import { LATE, notListening, portTrouble, serve, serverReport, serverReports, unanswered } from '../../serving.mjs'

const pass = (name, output) => ({ name, passed: true, output })
const fail = (name, message, output) => ({ name, passed: false, message, output })

const PLOTS = 'K1,Odile Brannock\r\nK2,\r\nK3,Femi Adeyemi\r\nL1,\r\n\r\n'
const FREE = 'Free plots: K2, L1.'
const LATER = 'L1,\nL2,\n'
const FREE_LATER = 'Free plots: L1, L2.'
const NONE = 'K1,Odile Brannock\n'
const NONE_FREE = 'No plots are free.'
const TYPE = 'text/plain; charset=utf-8'

const out = (s) => lines(s.stdout).map((l) => l.trim()).filter((l) => l !== '')
const errLines = (s) => lines(s.stderr).filter((l) => l.trim() !== '')
const bodyLine = (r) => r.body.trim()

/** Why an answer is not the free plots it should be, in words, or null. */
function freeTrouble(r, wanted, when, s) {
  const missing = unanswered(r, s)
  if (missing) return missing
  const got = bodyLine(r)
  if (got === wanted) return null
  if (got === FREE && wanted !== FREE) return `${when}, the answer still had the free plots from when the server started. Read plots.txt each time a request comes, so a change shows without a restart.`
  if (/A3|B2|C3/.test(got)) return 'The free plots are the starter\'s list, not the plots.txt beside the script. Read the file when a request comes.'
  if (r.status === 500 || /cannot be read/.test(got)) {
    return `For ${r.request}, the server could not read plots.txt. Check started it from another folder: build the file's path from the script's own folder.`
  }
  if (got === '') return `For ${r.request}, the answer was empty. Send the free plots as its body.`
  if (/undefined|\[object/.test(got)) return `For ${r.request}, the answer was ${got}. Send the text of the free plots, not what a promise or a list turns into.`
  return `For ${r.request}, the answer should read like the task's example, word for word, with the free plots of plots.txt in their order.`
}

/** Why the listening line is not right, or null. */
function listeningTrouble(s, port) {
  const wanted = [`Listening on http://localhost:${port}`, `Listening on http://localhost:${s.listening.port}`]
  const first = out(s)[0]
  if (first === undefined) return 'Once it was listening, the server printed nothing. Print where it listens, as in the task.'
  if (wanted.includes(first)) return null
  return `Once it was listening, the server printed "${first}". Print the line from the task, with the port it listens on.`
}

const first = async (name, s, dir) => notListening(name, s, dir, 'server.js')

export const checks = {
  async answer(t) {
    const dir = await box(t, { 'plots.txt': PLOTS })
    const name = 'Every request gets the free plots, read when it comes, on the port in PORT'
    const replies = []
    const s = await serve(dir, 'server.js', { env: { PORT: '4127' }, from: 'gate' }, async (send) => {
      replies.push(await send('GET', '/'))
      await put(dir, 'plots.txt', LATER)
      replies.push(await send('GET', '/plots/K2'))
      await put(dir, 'plots.txt', NONE)
      replies.push(await send('GET', '/water'))
    })
    const stop = await first(name, s, dir)
    if (stop) return [stop]
    const ran = 'Check started the server from the folder gate, then changed plots.txt between requests.'
    const output = `${ran}\n${serverReport(s)}`
    const enoent = /ENOENT/.test(s.stderr) && /plots\.txt/.test(s.stderr)
    const message =
      portTrouble(s, 4127) ??
      (enoent ? 'Started from another folder, the server could not find plots.txt. Build its path from the script\'s own folder.' : null) ??
      freeTrouble(replies[0], FREE, 'At first', s) ??
      freeTrouble(replies[1], FREE_LATER, 'After plots.txt changed', s) ??
      freeTrouble(replies[2], NONE_FREE, 'With no free plots', s) ??
      listeningTrouble(s, 4127)
    return [message ? fail(name, message, output) : pass(name, output)]
  },

  async kind(t) {
    const dir = await box(t, { 'plots.txt': PLOTS })
    const name = 'Every answer says it is plain text, with status 200'
    const name2 = 'When plots.txt cannot be read, status 500 and a plain line, and the server keeps going'
    const replies = []
    const s = await serve(dir, 'server.js', { env: { PORT: '5263' } }, async (send) => {
      replies.push(await send('GET', '/'))
      await put(dir, 'plots.txt', null)
      replies.push(await send('GET', '/free'))
      replies.push(await send('GET', '/'))
      await put(dir, 'plots.txt', LATER)
      replies.push(await send('GET', '/'))
    })
    const stop = await first(name, s, dir)
    if (stop) return [stop]
    const output = `Check removed plots.txt after the first request and put a new one back before the last.\n${serverReport(s)}`

    const ok = replies[0]
    let m1 = unanswered(ok, s) ?? portTrouble(s, 5263) ?? (s.late ? LATE : null)
    if (!m1 && ok.status !== 200) m1 = `With plots.txt there, the answer had status ${ok.status}. A good answer has status 200.`
    if (!m1 && ok.type === undefined) m1 = 'The answer has no Content-Type header, so a browser has to guess what it is. Say it is plain text, in UTF-8.'
    if (!m1 && !/^text\/plain\b/i.test(ok.type)) m1 = `The answer says its Content-Type is ${ok.type}. It is plain text, in UTF-8.`
    if (!m1 && !/;\s*charset=utf-8\s*$/i.test(ok.type)) m1 = 'The Content-Type says plain text but not which characters it uses. Add the charset, UTF-8, after a semicolon.'
    if (!m1 && bodyLine(ok) !== FREE) m1 = freeTrouble(ok, FREE, 'At first', s)
    const results = [m1 ? fail(name, m1, output) : pass(name, output)]

    const [, gone, again, back] = replies
    let m2 = null
    if (!gone.answered && hasStack(s.stderr)) {
      m2 = `With plots.txt gone, the server stopped with an error: ${errorLine(s.stderr) ?? 'see the output'}. An error inside an await that nobody catches ends the whole server. Catch it, and answer with status 500.`
    } else if (s.late) {
      m2 = LATE
    } else {
      m2 = unanswered(gone, s) ?? unanswered(again, s)
    }
    if (!m2 && gone.status === 200) m2 = 'With plots.txt gone, the answer still had status 200, as if all were well. Something went wrong on the server: that is status 500.'
    if (!m2 && gone.status !== 500) m2 = `With plots.txt gone, the answer had status ${gone.status}. A failure on the server's side is 500.`
    if (!m2 && bodyLine(gone) !== 'The plot list cannot be read.') m2 = 'With plots.txt gone, the body should be the line from the task, word for word, and nothing about the error itself.'
    if (!m2 && !/^text\/plain\b.*charset=utf-8/i.test(gone.type ?? '')) m2 = 'With plots.txt gone, the answer should say it is plain text in UTF-8 too.'
    if (!m2 && again.status !== 500) m2 = 'The second request with plots.txt gone was not answered the same way as the first.'
    if (!m2) m2 = unanswered(back, s) ?? (bodyLine(back) === FREE_LATER && back.status === 200 ? null : 'Once plots.txt was back, the answer should be the free plots again, with status 200.')
    results.push(m2 ? fail(name2, m2, output) : pass(name2, output))
    return results
  },

  async port(t) {
    const dir = await box(t, { 'plots.txt': PLOTS })
    const name = 'With PORT not set, or empty, the server listens on 3000'
    const unset = await serve(dir, 'server.js', { env: {} })
    const stop = await first(name, unset, dir)
    if (stop) return [stop]
    const empty = await serve(dir, 'server.js', { env: { PORT: '' } })
    let m1 = null
    for (const [s, how] of [[unset, 'With PORT not set'], [empty, 'With PORT set but empty']]) {
      const asked = s.asked?.asked ?? null
      if (!s.listening) m1 = `${how}, the server did not start. Use 3000 when the setting is missing or empty.`
      else if (asked === null) m1 = `${how}, the server listened without saying which port, so the system picked one. Use 3000 when the setting is missing or empty.`
      else if (Number(asked) !== 3000) m1 = `${how}, the server listened on port ${asked}, not 3000.`
      if (m1) break
    }
    const results = [m1 ? fail(name, m1, serverReports(unset, empty)) : pass(name, serverReports(unset, empty))]

    const name2 = 'A PORT that is not a port is refused: one line on standard error, exit code 1'
    const bad = []
    for (const value of ['abc', '70000', '80.5', '0']) bad.push(await serve(dir, 'server.js', { env: { PORT: value } }))
    let m2 = null
    for (const [i, value] of ['abc', '70000', '80.5', '0'].entries()) {
      const s = bad[i]
      const how = `With PORT=${value}`
      if (s.listening) m2 = `${how}, the server started anyway. Refuse a PORT that is not a whole number from 1 to 65535 before listening.`
      else if (/ERR_SOCKET_BAD_PORT/.test(s.stderr)) m2 = `${how}, the server stopped with Node's own error about the port. Check the setting yourself first, and print one plain line.`
      else if (hasStack(s.stderr)) m2 = `${how}, the server stopped with an error: ${errorLine(s.stderr) ?? 'see the output'}. Print one plain line instead.`
      else if (s.code === null) m2 = `${how}, the server did not end. Refuse the setting and let the script end.`
      else if (errLines(s).length !== 1 || !/PORT/.test(s.stderr)) m2 = `${how}, print one line on standard error that names PORT.`
      else if (out(s).length > 0) m2 = `${how}, something went to standard output. Only the line on standard error belongs to a refusal.`
      else if (s.code !== 1) m2 = `${how}, the script ended with exit code ${s.code}. A refusal ends with 1.`
      if (m2) break
    }
    results.push(m2 ? fail(name2, m2, serverReports(...bad)) : pass(name2, serverReports(...bad)))

    const name3 = 'A port already in use: one line naming the port on standard error, exit code 1'
    const busy = await serve(dir, 'server.js', { env: { PORT: '4127' }, busy: true })
    const said = 'Check made port 4127 look taken by another server.'
    let m3 = null
    if (/EADDRINUSE/.test(busy.stderr) && hasStack(busy.stderr)) {
      m3 = 'With the port in use, the server stopped with an error nobody caught: EADDRINUSE. Listen for the server\'s error event, and say in one line which port is taken.'
    } else if (busy.code === null) m3 = 'With the port in use, the server did not end. Set the exit code to 1 and let it end.'
    else if (errLines(busy).length !== 1 || !busy.stderr.includes('4127')) m3 = 'With the port in use, print one line on standard error that names the port.'
    else if (/^Listening/m.test(busy.stdout)) m3 = 'With the port in use, the server still said it was listening. Say so only once it really is.'
    else if (busy.code !== 1) m3 = `With the port in use, the script ended with exit code ${busy.code}. A server that could not start ends with 1.`
    results.push(m3 ? fail(name3, m3, `${said}\n${serverReport(busy)}`) : pass(name3, `${said}\n${serverReport(busy)}`))
    return results
  },

  async stop(t) {
    const dir = await box(t, { 'plots.txt': PLOTS })
    const name = 'Ctrl+C closes the server, says so, and the script ends with exit code 0'
    const runs = []
    for (const [port, count] of [['4127', 1], ['5263', 3]]) {
      runs.push(
        await serve(dir, 'server.js', { env: { PORT: port }, stopAfter: count }, async (send) => {
          for (let i = 0; i < count; i++) await send('GET', i === 0 ? '/' : `/visit/${i}`)
        })
      )
    }
    const stop = await first(name, runs[0], dir)
    if (stop) return [stop]
    let message = null
    for (const s of runs) {
      const got = out(s)
      const missing = s.replies.map((r) => unanswered(r, s)).find(Boolean)
      if (missing) message = missing
      else if (s.noListener) message = 'The server has no listener for SIGINT, so Ctrl+C ended it on the spot, without a word. Listen for SIGINT on process.'
      else if (s.stillRunning) {
        message = s.closed
          ? 'After Ctrl+C the server closed, but the script did not end. Something else still keeps it running.'
          : 'After Ctrl+C the server was still running. Your listener has to close the server, or nothing stops it.'
      } else if (hasStack(s.stderr)) message = `After Ctrl+C the server stopped with an error: ${errorLine(s.stderr) ?? 'see the output'}.`
      else if (!s.closed) message = 'After Ctrl+C the script ended before the server had closed. Ending the process at once would cut off an answer still on its way: close the server, and let the script end by itself once it has.'
      else if (got.at(-1) !== 'Server stopped.') message = got.includes('Server stopped.') ? 'Server stopped. should be the last line, once the server has closed.' : 'After Ctrl+C, print the line from the task once the server has closed.'
      else if (got.filter((l) => l === 'Server stopped.').length > 1) message = 'Server stopped. was printed more than once.'
      else if (s.code !== 0) message = `After Ctrl+C the script ended with exit code ${s.code}. Stopping when asked is not a failure: it ends with 0.`
      if (message) break
    }
    return [message ? fail(name, message, serverReports(...runs)) : pass(name, serverReports(...runs))]
  }
}
