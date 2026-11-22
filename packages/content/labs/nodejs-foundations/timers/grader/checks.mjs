import { box, broken, errorLine, fail, hasStack, lines, pass, report, reports, run } from '../../grading.mjs'

// Every run keeps the script's standard input open, like a terminal where nobody types. Once the
// rota has said its last line, Check ends that input itself: a pipe, unlike a terminal, can keep a
// script alive after it stopped reading, and that differs between systems. Whether the script had
// closed its input by then is read from INPUT, which counts how each readline on standard input
// was closed: by the script, or by the input ending.
const INPUT = `import readline from 'node:readline'
const seen = { byScript: 0, byEnd: 0 }
const close = readline.Interface.prototype.close
readline.Interface.prototype.close = function (...args) {
  if (this.input === process.stdin && !this.closed) {
    if (process.stdin.readableEnded) seen.byEnd++
    else seen.byScript++
  }
  return close.apply(this, args)
}
process.on('exit', () => process.stderr.write('\\u0000input ' + JSON.stringify(seen) + '\\n'))
`

// Added for the Ctrl+C task. After the first line of output it raises SIGINT the way Ctrl+C does:
// the script's listeners run, and with none, the script stops on the spot. Doing it inside the
// script works the same on every system; on Windows one program cannot send another SIGINT
// without ending it outright.
const CTRL_C = `const write = process.stdout.write.bind(process.stdout)
let sent = false
process.stdout.write = (chunk, ...rest) => {
  const done = write(chunk, ...rest)
  if (!sent && String(chunk).includes('\\n')) {
    sent = true
    setImmediate(() => {
      if (process.listenerCount('SIGINT') === 0) {
        process.stderr.write('\\u0000no-listener\\n')
        process.exit(130)
      }
      process.emit('SIGINT', 'SIGINT')
    })
  }
  return done
}
`

const turn = (plot) => `${plot}: your turn at the tap.`
const EVERYONE = 'Everyone has had a turn.'
const ROTA = ['K2', 'J1', 'K4', 'J3']
const rotaText = (plots) => plots.join('\r\n') + '\r\n\r\n'

const out = (r) => lines(r.stdout).map((l) => l.trim()).filter((l) => l !== '')
const clean = (r) => ({ ...r, stderr: r.stderr.split('\n').filter((l) => !l.startsWith('\u0000')).join('\n') })
const inputSeen = (r) => {
  const line = r.stderr.split('\n').find((l) => l.startsWith('\u0000input '))
  return line ? JSON.parse(line.slice(7)) : { byScript: 0, byEnd: 0 }
}

/**
 * Runs rota.js with its input open. `typed[i]` is typed as soon as turn i + 1 shows, and the input
 * ends once the rota has said its last line.
 */
function rota(dir, args, { from, typed = [], preload = '.check/input.mjs' } = {}) {
  let turns = 0
  return run(dir, 'rota.js', args, {
    from,
    preload,
    onLine: (line, type) => {
      if (line.endsWith('your turn at the tap.') && typed[turns++] !== undefined) type(`${typed[turns - 1]}\n`)
      if (line.trim() === EVERYONE || line.trim().startsWith('Stopped')) type(null)
    }
  })
}

/** Why a run that should call every turn and end did not, in words, or null. */
function wholeRota(r, plots) {
  const got = out(r)
  const wanted = [...plots.map(turn), EVERYONE]
  if (/ENOENT/.test(r.stderr) && /rota\.txt/.test(r.stderr)) {
    return 'Run from another folder, rota.js could not find rota.txt. Build its path from the script\'s own folder.'
  }
  if (hasStack(r.stderr)) return `rota.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
  if (r.timedOut) {
    if (got.join('\n') === wanted.join('\n')) {
      return 'Everyone had a turn, but the script did not end, so Check stopped it after 5 seconds. Something still keeps it running: the timer goes on until clearInterval stops it.'
    }
    if (got.length > wanted.length) return 'After everyone had a turn, the timer kept going. Stop it with clearInterval when the last turn is over.'
    return 'rota.js did not get through the rota within 5 seconds, so Check stopped it. Each turn lasts the seconds typed after the script name, and Check typed a small number.'
  }
  if (got.join('\n') === wanted.join('\n')) return r.code === 0 ? null : `rota.js ended with exit code ${r.code}. A rota that ran to the end ends with 0.`
  if (got.length === 1 && got[0] === wanted[0]) return 'Only the first turn was called. setTimeout runs its function once; a job that repeats needs setInterval.'
  if (got.join('\n') === wanted.slice(0, -1).join('\n')) return 'Every turn was called, but then nothing said that everyone has had a turn.'
  if (got.some((l) => /undefined/.test(l))) return 'A turn was called for undefined: the timer went on past the end of the rota.'
  if (got.some((l) => /^(A1|A4|B1|B3|C2):/.test(l))) {
    return 'The turns are the starter\'s rota, not the rota.txt beside the script. Read rota.txt when the script runs, from the script\'s own folder.'
  }
  if (got.length > 0 && !wanted.includes(got[0])) return 'The lines should read like the task\'s example, word for word, with the plots in the order of rota.txt.'
  return 'Call one plot\'s turn at a time, in the order of rota.txt, then say that everyone has had a turn.'
}

/** Why a run that should have stopped after the first turn did not, in words, or null. */
function stopped(r, plots, how, after = 1) {
  const got = out(r)
  const wanted = [...plots.slice(0, after).map(turn), plots.length > after ? `Stopped. Next up: ${plots[after]}.` : 'Stopped. Nobody is next.']
  const at = after
  if (hasStack(r.stderr)) return `After ${how}, rota.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
  if (got[0] !== wanted[0]) return wholeRota(clean(r), plots) ?? 'The first turn should be called as in task 1.'
  if (at > 1 && /^Stopped/.test(got[1] ?? '')) return 'The rota stopped when wait was typed. Only a line that says stop stops it; other lines are ignored.'
  if (got.length > at && got[at] !== wanted[at] && got.slice(at).every((l) => l.endsWith('your turn at the tap.') || l === EVERYONE)) {
    return got.includes(EVERYONE)
      ? `After ${how}, nothing stopped: the rota ran to the end. ${how === 'Ctrl+C' ? 'Listen for SIGINT on process' : 'Read the lines typed into the terminal'}, and stop the rota when it comes.`
      : `After ${how}, the turns kept coming. Stop the rota when it comes.`
  }
  if (got.length === at) return `After ${how}, the script ended without saying who is next.`
  if (got[at] !== wanted[at]) {
    if (/undefined/.test(got[at])) return `After ${how} on a rota where every plot has been called, nobody is next. Say so as the task does.`
    if (/^Stopped\. Next up: /.test(got[at])) return `After ${how}, the plot named as next up is not right. It is the plot whose turn would have come next.`
    if (plots.length === at && /^Stopped/.test(got[at])) return `After ${how} on a rota of one plot, nobody is next. Say so as the task does.`
    return `After ${how}, print the line from the task: Stopped, and who is next.`
  }
  if (got.length > at + 1) return `After ${how}, the rota printed more lines after it stopped. Stop the timer too.`
  if (r.timedOut) return `After ${how}, the rota stopped, but the script did not end, so Check stopped it after 5 seconds. Something still keeps it running, such as the timer.`
  if (inputSeen(r).byEnd > 0) {
    return `After ${how}, the rota stopped, but the script was still reading what is typed. In a terminal it would wait for the next line and never end; Check ended its input to finish the run. Close what reads the input when the rota stops.`
  }
  if (r.code !== 0) return `After ${how}, rota.js ended with exit code ${r.code}. Stopping when asked is not a failure: it ends with 0.`
  return null
}

const early = async (name, r, dir) => (r.timedOut ? null : broken(name, clean(r), dir, 'rota.js'))

export const checks = {
  async turns(t) {
    const dir = await box(t, { 'rota.txt': rotaText(ROTA), '.check/input.mjs': INPUT })
    const r = await rota(dir, ['0.05'], { from: 'shed' })
    const name = 'Every plot gets its turn, in order, and then the script ends by itself'
    const stop = await early(name, r, dir)
    if (stop) return [stop]
    const m1 = wholeRota(clean(r), ROTA)
    const results = [m1 ? fail(name, m1, report(clean(r))) : pass(name, report(clean(r)))]

    const none = clean(await rota(dir, []))
    const word = clean(await rota(dir, ['soon']))
    const name2 = 'With no seconds, or seconds that are not a number, one line on standard error and exit code 1'
    let m2 = null
    for (const [x, how] of [[none, 'With no seconds'], [word, 'With node rota.js soon']]) {
      if (x.timedOut || out(x).length > 0) m2 = `${how}, the rota started anyway. Check the seconds before anything else.`
      else if (hasStack(x.stderr)) m2 = `${how}, rota.js stopped with an error: ${errorLine(x.stderr) ?? 'see the output'}. Check the seconds and print one plain line.`
      else if (lines(x.stderr).length !== 1 || x.code !== 1) m2 = `${how}, print one line on standard error that says what to type, and end with exit code 1.`
      if (m2) break
    }
    results.push(m2 ? fail(name2, m2, reports(none, word)) : pass(name2, reports(none, word)))
    return results
  },

  async stop(t) {
    const dir = await box(t, { 'rota.txt': rotaText(ROTA), '.check/input.mjs': INPUT })
    // Each line is typed only once a turn shows; a turn lasts 0.8 seconds, far longer than typing takes.
    const r = await rota(dir, ['0.8'], { typed: ['wait', 'stop'] })
    const name = 'Typing stop stops the rota, says who is next, and the script ends'
    const stopEarly = await early(name, r, dir)
    if (stopEarly) return [stopEarly]
    const typed = 'Check typed wait as soon as the first turn showed, and stop as soon as the second did.'
    const m1 = stopped(r, ROTA, 'stop was typed', 2)
    const results = [m1 ? fail(name, m1, `${typed}\n${report(clean(r))}`) : pass(name, `${typed}\n${report(clean(r))}`)]

    const one = await box(t, { 'rota.txt': 'H5\n', '.check/input.mjs': INPUT })
    const r2 = await rota(one, ['0.8'], { typed: ['stop'] })
    const name2 = 'On a rota of one plot, stop says nobody is next'
    const m2 = stopped(r2, ['H5'], 'stop was typed')
    results.push(m2 ? fail(name2, m2, report(clean(r2))) : pass(name2, report(clean(r2))))

    const whole = await rota(dir, ['0.05'])
    const name3 = 'When nobody types stop, the rota still closes its input after the last turn'
    let m3 = wholeRota(clean(whole), ROTA)
    if (!m3 && inputSeen(whole).byEnd > 0) {
      m3 = 'After everyone had a turn, the script was still reading what is typed. In a terminal it would wait for a line and never end; Check ended its input to finish the run. Close what reads the input when the rota is over, too.'
    }
    const o3 = `Check typed nothing.\n${report(clean(whole))}`
    results.push(m3 ? fail(name3, m3, o3) : pass(name3, o3))
    return results
  },

  async 'ctrl-c'(t) {
    const dir = await box(t, { 'rota.txt': rotaText(ROTA), '.check/ctrl-c.mjs': INPUT + CTRL_C })
    const r = await rota(dir, ['0.8'], { preload: '.check/ctrl-c.mjs' })
    const name = 'Ctrl+C after the first turn stops the rota the same way, and the script ends'
    const stop = await early(name, r, dir)
    if (stop) return [stop]
    const said = 'Check raised SIGINT inside the script as soon as the first turn showed, which runs its SIGINT listeners the way Ctrl+C does.'
    const output = `${said}\n${report(clean(r))}`
    const message = r.stderr.includes('\u0000no-listener')
      ? 'The script has no listener for SIGINT, so Ctrl+C stopped it on the spot, in the middle of the rota, without saying who is next. Listen for SIGINT on process.'
      : stopped(r, ROTA, 'Ctrl+C')
    return [message ? fail(name, message, output) : pass(name, output)]
  }
}
