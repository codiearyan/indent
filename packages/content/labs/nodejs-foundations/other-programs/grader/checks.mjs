import { readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { box, lines, put } from '../../grading.mjs'
import { LATE, notListening, portTrouble, serve, serverReport, serverReports, unanswered } from '../../serving.mjs'

const pass = (name, output) => ({ name, passed: true, output })
const fail = (name, message, output) => ({ name, passed: false, message, output })

// Every run gets the report tool as the starter gives it, whatever the workspace holds, and
// readings of Check's own.
const TOOL = await readFile(new URL('../starter/tools/water-report.js', import.meta.url), 'utf8')
const WATER = {
  'water/2026-04.txt': '2026-04-02T19:00,well,140\r\n2026-04-02T19:05,east,75\r\n# meter swapped\r\n2026-04-09T19:00,well,96\r\n',
  'water/2026-05.txt': '2026-05-07T19:00,east,12\n',
  'water/2026-06.txt': null,
  'water/2026-07.txt': null
}
const APRIL = ['Water report for 2026-04', 'east: 75 litres', 'well: 236 litres', 'Total: 311 litres']
const MAY = ['Water report for 2026-05', 'east: 12 litres', 'Total: 12 litres']
const CANNOT = 'The report could not be made.'
const notMonth = (month) => `Not a month: "${month}". Write it like 2026-06.`

const report = (month) => (month === undefined ? '/report' : `/report?month=${encodeURIComponent(month)}`)
const bodyLines = (r) => lines(r.body.replace(/\r/g, '')).map((l) => l.trim()).filter((l) => l !== '')
const isText = (r) => /^text\/plain\b.*charset=utf-8/i.test(r.type ?? '')

async function start(t, port, options, months, between) {
  const dir = await box(t, { 'tools/water-report.js': TOOL, ...WATER, ...(options.files ?? {}) })
  const s = await serve(dir, 'server.js', { env: { PORT: String(port) }, children: true, from: 'shed', ...options }, async (send) => {
    for (const [i, month] of months.entries()) {
      if (between?.[i]) await between[i](dir)
      await send('GET', report(month))
    }
  })
  return { dir, s }
}

async function early(name, s, dir, port) {
  const stop = await notListening(name, s, dir, 'server.js')
  if (stop) return stop
  const message = portTrouble(s, port) ?? (s.late ? LATE : null)
  return message ? fail(name, message, serverReport(s)) : null
}

const shellUsed = (s) => s.spawns.some((x) => x.shell)
const SHELL =
  'The server ran the report through a shell, with the month glued into the text of a command. A shell reads signs such as & and ; in that text as more commands, so anyone who can open the address could run any program on the laptop. Give the program and each argument separately, with no shell.'

/** Why the way the server started the report is wrong, in words, or null. Not about shells. */
function howTrouble(s) {
  const sync = s.spawns.find((x) => x.sync)
  if (sync) {
    return `The server ran the report with ${sync.sync}, which makes the whole server wait while the report runs: nobody else gets an answer meanwhile. Use a way that waits without stopping the server, such as execFile.`
  }
  const byName = s.spawns.find((x) => !x.shell && x.file !== process.execPath)
  if (byName) {
    return `The server ran a program named ${byName.file}, found by its name. Run the report with process.execPath, the very Node that runs the server, so it works the same on every computer.`
  }
  return null
}

/** Why the answer to a month with readings is not the report, in words, or null. */
function reportTrouble(r, wanted, s) {
  const missing = unanswered(r, s)
  if (missing) return missing
  if (r.status === 501) return `${r.request} still got the starter's answer, Not written yet.`
  if (s.spawns.length === 0) return `${r.request} was answered without running the water report. The report is the society's own program: run it, and answer with what it prints.`
  const got = bodyLines(r)
  const month = new URL(r.path, 'http://localhost').searchParams.get('month')
  const plain = s.spawns.filter((x) => !x.shell)
  if (plain.length > 0 && !plain.some((x) => x.args.includes(month))) {
    return `${r.request} ran the report with ${JSON.stringify(plain.at(-1).args.slice(1))} after the script, not the month in the query, ${month}.`
  }
  if (r.status !== 200 && plain.some((x) => x.args[0] !== undefined && !isAbsolute(x.args[0]))) {
    return `${r.request} could not run the report: the server gave its path as ${plain.find((x) => !isAbsolute(x.args[0])).args[0]}, which is looked for from the folder the server was started in, and Check started it from another one. Build the path from the server's own folder.`
  }
  if (r.status !== 200) return `${r.request} got status ${r.status}, but that month has readings: the report makes it and ends with exit code 0, which is 200.`
  if (got.join('\n') === wanted.join('\n')) return isText(r) ? null : `${r.request} should say it is plain text in UTF-8.`
  if (got.length > 0 && got.length < wanted.length && got.every((l, i) => l === wanted[i])) {
    return `${r.request} got only the start of the report: the server answered before the report had finished printing. Wait until the program has ended and all it printed has arrived.`
  }
  if (got.length === 0) return `${r.request} got an empty body. Answer with what the report printed on its standard output.`
  if (got.some((l) => /2026-06|north|pond/.test(l))) return `${r.request} got the report of another month. Give the report the month from the query.`
  return `${r.request} should be answered with exactly what the report printed, and nothing else.`
}

export const checks = {
  async 'run-report'(t) {
    const name = 'GET /report?month= answers with what the water report printed'
    const { dir, s } = await start(t, 4423, {}, ['2026-04', '2026-05'])
    const stop = await early(name, s, dir, 4423)
    if (stop) return [stop]
    const said = 'Check started the server from the folder shed, with readings of its own.'
    const [april, may] = s.replies
    const message = reportTrouble(april, APRIL, s) ?? howTrouble(s) ?? reportTrouble(may, MAY, s)
    return [message ? fail(name, message, `${said}\n${serverReport(s)}`) : pass(name, `${said}\n${serverReport(s)}`)]
  },

  async 'exit-code'(t) {
    const name = 'Exit code 2 is answered 400 and exit code 3 is 404, each with the report\'s own reason'
    const months = ['2026-13', '2025-01', undefined, '2026-05']
    const { dir, s } = await start(t, 5419, {}, months)
    const stop = await early(name, s, dir, 5419)
    if (stop) return [stop]
    const [bad, none, empty, good] = s.replies
    let message = null
    for (const [r, status, reason, code] of [
      [bad, 400, notMonth('2026-13'), 2],
      [none, 404, 'No readings for 2025-01.', 3],
      [empty, 400, notMonth(''), 2]
    ]) {
      const missing = unanswered(r, s)
      if (missing) message = r === empty ? `${missing} With no month in the address, give the report an empty month.` : missing
      else if (r.status === 501) message = `${r.request} still got the starter's answer, Not written yet.`
      else if (r.status === 200) message = `${r.request} got status 200, though the report ended with exit code ${code}. Read the exit code, not only what was printed.`
      else if (r.status === 500) message = `${r.request} got 500. The report did run: its exit code ${code} says what was wrong, and that is ${status}.`
      else if (r.status !== status) message = `${r.request} got status ${r.status}. The report ended with exit code ${code}, which the task answers with ${status}.`
      else if (r === empty && /"(null|undefined)"/.test(r.body)) message = `${r.request}, with no month, gave the report the word ${/"null"/.test(r.body) ? 'null' : 'undefined'}. With no month in the address, give it an empty month.`
      else if (bodyLines(r).join(' ') !== reason) message = `${r.request} got ${r.status} with "${bodyLines(r).join(' ')}". The body should be the reason the report printed on its standard error, as it is.`
      else if (!isText(r)) message = `${r.request} should say it is plain text in UTF-8.`
      if (message) break
    }
    message ??= reportTrouble(good, MAY, s)
    return [message ? fail(name, message, serverReport(s)) : pass(name, serverReport(s))]
  },

  async 'cannot-run'(t) {
    const name = 'When the report program is missing, 500 and a plain line, and the server keeps going'
    const name2 = 'When Node itself cannot be started, 500 too, and the server keeps going'
    const gone = await start(t, 4423, { files: { 'tools/water-report.js': null } }, ['2026-04', '2026-05', '2026-04'], [null, null, (dir) => put(dir, 'tools/water-report.js', TOOL)])
    const stop = await early(name, gone.s, gone.dir, 4423)
    if (stop) return [stop]
    const said = 'Check removed tools/water-report.js, then put it back before the last request.'
    const judge = (r, s) => {
      const missing = unanswered(r, s)
      if (missing) return `${missing.replace(/\.$/, '')}. A program that cannot run, or fails, must not take the server down with it.`
      if (r.status === 501) return `${r.request} still got the starter's answer, Not written yet.`
      if (r.status === 200) return `${r.request} got status 200, though no report was made.`
      if (r.status === 404 || r.status === 400) return `${r.request} got ${r.status}. The report did not say the month was wrong: it could not run at all, and the task answers that with 500.`
      if (r.status !== 500) return `${r.request} got status ${r.status}. A report that could not be made is 500.`
      if (bodyLines(r).join(' ') !== CANNOT) return `${r.request} got 500 with "${bodyLines(r).join(' ').slice(0, 80)}". The body should be the line from the task, and nothing about the error itself.`
      return null
    }
    const [a, b, back] = gone.s.replies
    let m1 = judge(a, gone.s) ?? judge(b, gone.s)
    if (!m1) m1 = reportTrouble(back, APRIL, gone.s)
    const results = [m1 ? fail(name, m1, `${said}\n${serverReport(gone.s)}`) : pass(name, `${said}\n${serverReport(gone.s)}`)]

    const noNode = await start(t, 5419, { noNode: true }, ['2026-04', '2026-05'])
    const said2 = 'Check started the server with process.execPath naming a program that is not there.'
    let m2 = (await early(name2, noNode.s, noNode.dir, 5419))?.message ?? null
    const [c, d] = noNode.s.replies
    if (!m2 && c?.answered && c.status === 200) {
      m2 = shellUsed(noNode.s)
        ? 'The report ran though process.execPath named a program that is not there: the server asks a shell to find a program called node instead.'
        : (howTrouble(noNode.s) ?? 'The report ran though process.execPath named a program that is not there.')
    }
    m2 ??= judge(c, noNode.s) ?? judge(d, noNode.s)
    results.push(m2 ? fail(name2, m2, `${said2}\n${serverReport(noNode.s)}`) : pass(name2, `${said2}\n${serverReport(noNode.s)}`))
    return results
  },

  async 'no-shell'(t) {
    const name = 'The month reaches the report as one argument, as it was typed, with no shell'
    const months = ['2026-04&echo INJECTED', '2026-04;echo INJECTED', '$(echo INJECTED)', '2026-04 2026-05', '"2026-04"']
    const { dir, s } = await start(t, 4423, {}, months)
    const stop = await early(name, s, dir, 4423)
    if (stop) return [stop]
    const said = 'Check asked for months with signs that a shell would read as commands.'
    const output = `${said}\n${serverReport(s)}`
    let message = null
    if (s.replies.some((r) => r.status === 501)) message = 'GET /report still gets the starter\'s answer, Not written yet.'
    else if (shellUsed(s)) message = SHELL
    else message = howTrouble(s)
    if (!message) {
      for (const [i, r] of s.replies.entries()) {
        const month = months[i]
        const missing = unanswered(r, s)
        if (missing) message = missing
        else if (r.status === 200) message = `${r.request} got a report, though "${month}" is not a month. The server changed the month before giving it to the report: pass it on as it was typed.`
        else if (bodyLines(r).join(' ') !== notMonth(month)) {
          message = `${r.request} got "${bodyLines(r).join(' ')}". The report should have been given the month exactly as it was typed, in one argument, and said so in its reason.`
        } else if (r.status !== 400) message = `${r.request} got status ${r.status}. The report ended with exit code 2: that is 400.`
        if (message) break
      }
    }
    return [message ? fail(name, message, output) : pass(name, output)]
  }
}
