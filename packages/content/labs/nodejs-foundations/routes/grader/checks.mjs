import { box, lines } from '../../grading.mjs'
import { LATE, notListening, portTrouble, serve, serverReport, unanswered } from '../../serving.mjs'

const pass = (name, output) => ({ name, passed: true, output })
const fail = (name, message, output) => ({ name, passed: false, message, output })

const PLOTS = 'K1,Odile Brannock\r\nK2,\r\nK3,Femi Adeyemi\r\nL1,\r\nL2,Gerrit Vos\r\nM1,\r\n\r\n'
const HOME = 'Marrowfield Allotment Society. Try /plots or /free.'
const LIST = ['K1: Odile Brannock', 'K2: free', 'K3: Femi Adeyemi', 'L1: free', 'L2: Gerrit Vos', 'M1: free']
const FREE = 'Free plots: K2, L1, M1.'

const bodyLines = (r) => lines(r.body.replace(/\r/g, '')).map((l) => l.trim()).filter((l) => l !== '')
const bodyLine = (r) => bodyLines(r).join(' ')

/** Starts the server with plots of its own on `port`, sends each [method, path] and gives back the run. */
async function ask(t, port, requests) {
  const dir = await box(t, { 'plots.txt': PLOTS })
  const s = await serve(dir, 'server.js', { env: { PORT: String(port) } }, async (send) => {
    for (const [method, path] of requests) await send(method, path)
  })
  return { dir, s }
}

/** The detail for a run that never listened, on another port, or that set headers late, or null. */
async function early(name, s, dir, port) {
  const stop = await notListening(name, s, dir, 'server.js')
  if (stop) return stop
  const message = portTrouble(s, port) ?? (s.late ? LATE : null)
  return message ? fail(name, message, serverReport(s)) : null
}

const crashed = (s) => s.replies.map((r) => unanswered(r, s)).find(Boolean) ?? null

/** Why one answer is not the one wanted, in words, or null. `want` is { status, body | lines }. */
function answerTrouble(r, want, s) {
  const missing = unanswered(r, s)
  if (missing) return missing
  if (want.status === 200 && r.status !== 200) {
    if (r.status === 404 && r.path.includes('?')) {
      return `${r.request} got 404, as if the address were not there. The part after ? is the query, not part of the path: compare the path alone.`
    }
    if (r.status === 404) return `${r.request} got 404, but ${r.path} is one of the addresses the server answers.`
    return `${r.request} got status ${r.status}. It is an address the server answers, with 200.`
  }
  if (want.status === 200 && !/^text\/plain\b.*charset=utf-8/i.test(r.type ?? '')) {
    return `${r.request} was answered with Content-Type ${r.type ?? '(none)'}. Every answer of this server is plain text in UTF-8.`
  }
  if (want.lines) {
    const got = bodyLines(r)
    if (got.join('\n') === want.lines.join('\n')) return null
    if (got.join(' ') === FREE) return `${r.request} got the free plots. It should get every plot, one a line.`
    if (got.some((l) => /,/.test(l))) return `${r.request} got the lines of plots.txt as they are. Write each plot as in the task, with its holder or free.`
    if (got.some((l) => /^A\d/.test(l))) return `${r.request} has the starter's plots, not those of the plots.txt beside the script.`
    return `${r.request} should list every plot of plots.txt, one a line, as in the task.`
  }
  if (want.body === undefined || bodyLine(r) === want.body) return null
  return `${r.request} got "${bodyLine(r)}". Compare it with the task, word for word.`
}

export const checks = {
  async routes(t) {
    const name = 'GET /, GET /plots and GET /free each get their own answer'
    const { dir, s } = await ask(t, 4211, [['GET', '/plots'], ['GET', '/free'], ['GET', '/']])
    const stop = await early(name, s, dir, 4211)
    if (stop) return [stop]
    const [list, free, home] = s.replies
    let message = crashed(s)
    if (!message && bodyLine(list) === bodyLine(free) && bodyLine(free) === bodyLine(home)) {
      message = 'Every address got the same answer. Look at the path of each request, and answer each address in its own way.'
    }
    message ??=
      answerTrouble(list, { status: 200, lines: LIST }, s) ??
      answerTrouble(free, { status: 200, body: FREE }, s) ??
      answerTrouble(home, { status: 200, body: HOME }, s)
    return [message ? fail(name, message, serverReport(s)) : pass(name, serverReport(s))]
  },

  async 'not-found'(t) {
    const name = 'An address that is not there gets 404 and a line that names it'
    const name2 = 'A method other than GET at a known address gets 405, with Allow: GET'
    const requests = [
      ['GET', '/gate'],
      ['GET', '/plots/K2'],
      ['POST', '/compost'],
      ['POST', '/plots'],
      ['DELETE', '/free'],
      ['PUT', '/'],
      ['GET', '/plots']
    ]
    const { dir, s } = await ask(t, 5307, requests)
    const stop = await early(name, s, dir, 5307)
    if (stop) return [stop]
    const crash = crashed(s)
    if (crash) return [fail(name, crash, serverReport(s))]
    const [gate, deeper, compost, post, del, put, after] = s.replies

    let m1 = null
    for (const [r, path] of [[gate, '/gate'], [deeper, '/plots/K2'], [compost, '/compost']]) {
      if (r.status === 200) m1 = `${r.request} got status 200, as if all were well. An address the server does not have is answered with 404.`
      else if (r.status === 405) m1 = `${r.request} got 405, but the address itself is not there. That is 404, whatever the method.`
      else if (r.status !== 404) m1 = `${r.request} got status ${r.status}. An address that is not there is 404.`
      else if (bodyLine(r) !== `No page at ${path}.`) m1 = `${r.request} got 404 with "${bodyLine(r)}". The body should be the line from the task, with the path asked for.`
      else if (!/^text\/plain\b.*charset=utf-8/i.test(r.type ?? '')) m1 = `${r.request} should say it is plain text in UTF-8, like every answer.`
      if (m1) break
    }
    const results = [m1 ? fail(name, m1, serverReport(s)) : pass(name, serverReport(s))]

    let m2 = null
    for (const [r, path] of [[post, '/plots'], [del, '/free'], [put, '/']]) {
      if (r.status === 200) m2 = `${r.request} was answered as if it were a GET. Look at the method of the request too, not only its path.`
      else if (r.status === 404) m2 = `${r.request} got 404, but ${path} is there: only the method is wrong. That is 405.`
      else if (r.status !== 405) m2 = `${r.request} got status ${r.status}. A method the address does not take is 405.`
      else if (r.headers.allow === undefined) m2 = `${r.request} got 405 without an Allow header, which says the methods the address does take.`
      else if (r.headers.allow.trim() !== 'GET') m2 = `${r.request} got 405 with Allow: ${r.headers.allow}. These addresses take GET, and only GET.`
      else if (bodyLine(r) !== `Only GET works at ${path}.`) m2 = `${r.request} got 405 with "${bodyLine(r)}". The body should be the line from the task, with the path asked for.`
      if (m2) break
    }
    m2 ??= answerTrouble(after, { status: 200, lines: LIST }, s)
    if (m2 === null && after.headers.allow !== undefined) m2 = 'GET /plots, after a 405, still had an Allow header. Set it only on the 405 answer.'
    results.push(m2 ? fail(name2, m2, serverReport(s)) : pass(name2, serverReport(s)))
    return results
  },

  async query(t) {
    const name = 'GET /free?row= gives the free plots of that row, in either case'
    const name2 = 'A query does not change which address it is'
    const requests = [
      ['GET', '/free?row=L'],
      ['GET', '/free?row=k'],
      ['GET', '/free?row=Q'],
      ['GET', '/free?season=spring&row=M'],
      ['GET', '/free?row=%4C'],
      ['GET', '/free?row='],
      ['GET', '/plots?sort=holder'],
      ['GET', '/?from=noticeboard'],
      ['GET', '/free']
    ]
    const { dir, s } = await ask(t, 4211, requests)
    const stop = await early(name, s, dir, 4211)
    if (stop) return [stop]
    const crash = crashed(s)
    if (crash) return [fail(name, crash, serverReport(s))]
    const [l, k, q, m, encoded, empty, plots, home, all] = s.replies

    let m1 = null
    const rows = [
      [l, 'Free plots in row L: L1.'],
      [k, 'Free plots in row K: K2.'],
      [q, 'No free plots in row Q.'],
      [m, 'Free plots in row M: M1.'],
      [encoded, 'Free plots in row L: L1.'],
      [empty, FREE]
    ]
    for (const [r, wanted] of rows) {
      m1 = answerTrouble(r, { status: 200 }, s)
      if (m1) break
      const got = bodyLine(r)
      if (got === wanted) continue
      if (got === FREE && r !== m) m1 = `${r.request} got every free plot. Read row from the query, and keep only the plots of that row.`
      else if (r === k && /row k/i.test(got)) m1 = 'GET /free?row=k should give row K: people type the letter in either case. Name the row in capitals.'
      else if (r === m) m1 = 'GET /free?season=spring&row=M did not find row M. A query can hold several names, in any order; read them with the URL tools, not by cutting the text.'
      else if (r === encoded) m1 = 'GET /free?row=%4C asks for row L: %4C is how an address writes L in code. The URL tools decode it for you; cutting the text by hand does not.'
      else if (r === empty) m1 = 'GET /free?row= has an empty row, which counts as no row: give every free plot, as without a query.'
      else if (r === q) m1 = `GET /free?row=Q got "${got}". A row with no free plots gets the line from the task that says so.`
      else m1 = `${r.request} got "${got}". Compare it with the task, word for word.`
      break
    }
    const results = [m1 ? fail(name, m1, serverReport(s)) : pass(name, serverReport(s))]

    const m2 =
      answerTrouble(plots, { status: 200, lines: LIST }, s) ??
      answerTrouble(home, { status: 200, body: HOME }, s) ??
      answerTrouble(all, { status: 200, body: FREE }, s)
    results.push(m2 ? fail(name2, m2, serverReport(s)) : pass(name2, serverReport(s)))
    return results
  }
}
