import { isDeepStrictEqual } from 'node:util'
import { box, broken, errorLine, fail, hasStack, hide, lines, pass, read, report, reports, run } from '../../grading.mjs'

// Runs readPlots from the learner's plots.js on a file and prints what it gives back as JSON.
const DRIVER = `import { join } from 'node:path'
import { readPlots } from '../plots.js'
const result = await readPlots(join(import.meta.dirname, process.argv[2]))
console.log(JSON.stringify(result === undefined ? '(nothing)' : result))
`

// Stands in for plots.js, so free-plots.js is judged on its own. It answers only for the
// plots.txt beside the scripts, and its list differs from that file's.
const stub = (plots) => `import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
export async function readPlots(file) {
  if (file instanceof URL) file = fileURLToPath(file)
  if (typeof file !== 'string' || resolve(file) !== resolve(import.meta.dirname, 'plots.txt')) {
    throw new Error('readPlots was given ' + file + ', not the plots.txt beside the scripts')
  }
  return ${JSON.stringify(plots)}
}
`

const STUB_PLOTS = [
  { plot: 'J1', holder: 'Cassius Pembury' },
  { plot: 'J2', holder: null },
  { plot: 'J3', holder: 'Morwenna Brand' },
  { plot: 'K1', holder: null },
  { plot: 'K2', holder: 'Rennick Roe' },
  { plot: 'K3', holder: null }
]
// What plots.txt holds while the stub answers: a script that reads it itself prints other plots.
const DECOY = 'Q1,\nQ2,Elsbeth Pennock\n'

const show = (v) => JSON.stringify(v)

async function stubbed(t, plots = STUB_PLOTS) {
  return box(t, { 'plots.js': stub(plots), 'plots.txt': DECOY })
}

/** The detail for a free-plots.js run that went wrong in a way the stub can tell, or null. */
function stubTrouble(name, r) {
  if (/readPlots was given/.test(r.stderr)) {
    const given = hide(/Error: readPlots was given (.*), not the plots/.exec(r.stderr)?.[1] ?? '')
    return fail(
      name,
      r.from === '.'
        ? `free-plots.js gave readPlots ${given} instead of the path to plots.txt beside the script.`
        : `Run from another folder, free-plots.js gave readPlots ${given}. Build the path to plots.txt from the script's own folder.`,
      report(r)
    )
  }
  if (lines(r.stdout).includes('Q1')) {
    return fail(
      name,
      'free-plots.js read plots.txt itself instead of asking readPlots in plots.js. Import readPlots and let it do the reading.',
      report(r)
    )
  }
  return null
}

export const checks = {
  async module(t) {
    const unix = 'L1,Cassius Pembury\nL2,\nL3,Morwenna Brand\n'
    const windows = 'M1,\r\nM2,Rennick Roe\r\n\r\nM3,\r\n'
    const dir = await box(t, { '.check/read.mjs': DRIVER, '.check/north.txt': unix, '.check/south.txt': windows })
    const cases = [
      ['north.txt', unix, [
        { plot: 'L1', holder: 'Cassius Pembury' },
        { plot: 'L2', holder: null },
        { plot: 'L3', holder: 'Morwenna Brand' }
      ]],
      ['south.txt', windows, [
        { plot: 'M1', holder: null },
        { plot: 'M2', holder: 'Rennick Roe' },
        { plot: 'M3', holder: null }
      ]]
    ]
    const results = []
    for (const [file, text, expected] of cases) {
      const name = `readPlots reads a list ${file === 'north.txt' ? 'whose lines end with \\n' : 'saved on Windows, with a blank line'}`
      const r = await run(dir, '.check/read.mjs', [file])
      const early = await broken(name, r, dir, 'plots.js')
      if (early) return [early]
      const call = `readPlots on a list of:\n${text.replace(/\r/g, '\\r').replace(/\n$/, '').split('\n').map((l) => `  ${l}`).join('\n')}`
      let got
      try {
        got = JSON.parse(lines(r.stdout).at(-1) ?? '')
      } catch {
        got = undefined
      }
      const output = `${call}\nGave: ${got === undefined ? '(nothing)' : show(got)}\n\n${report(r)}`
      let message
      if (hasStack(r.stderr)) {
        message = `readPlots threw an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      } else if (lines(r.stdout).length > 1) {
        message = 'plots.js printed something of its own when it was imported and called. Leave the printing to the scripts that import it: readPlots only gives back the list.'
      } else if (isDeepStrictEqual(got, expected)) {
        message = null
      } else if (got === '(nothing)') {
        message = 'readPlots gave back nothing. Return the list of plots at the end of the function.'
      } else if (!Array.isArray(got)) {
        message = 'readPlots should give back an array, one object per plot.'
      } else if (typeof got[0] === 'string') {
        message = 'readPlots gave back the lines as text. Each plot should be an object with a plot and a holder.'
      } else if (got.some((p) => p?.holder === '')) {
        message = 'A free plot has holder set to empty text. The task asks for null there, so a free plot is easy to tell apart.'
      } else if (got.some((p) => typeof p?.holder === 'string' && p.holder.endsWith('\r')) || got.some((p) => p?.holder === '\r')) {
        message = 'A holder ends with an invisible \\r. This list was saved on Windows; split it so both line endings work.'
      } else if (got.some((p) => !expected.some((e) => e.plot === p?.plot))) {
        message = 'readPlots gave back plots that are not in the list it was given. Read the file at the path that comes in as file, not one of your own choosing.'
      } else if (got.length > expected.length) {
        message = 'readPlots gave back more plots than the list has: a blank line became a plot. Leave blank lines out.'
      } else if (got.some((p) => !p || !('plot' in p) || !('holder' in p))) {
        message = 'Each object should have exactly two properties, named plot and holder.'
      } else {
        message = 'The list is not right. One object per line that is not blank, in the order of the file, with the plot and its holder.'
      }
      results.push(message ? fail(name, message, output) : pass(name, output))
    }
    return results
  },

  async free(t) {
    const dir = await stubbed(t)
    const allHeld = await stubbed(t, STUB_PLOTS.filter((p) => p.holder !== null))
    const runs = await Promise.all([
      run(dir, 'free-plots.js'),
      run(dir, 'free-plots.js', [], { from: 'gate-shed' }),
      run(allHeld, 'free-plots.js')
    ])
    for (const r of runs) {
      const early = await broken('free-plots.js lists the free plots', r, dir, 'free-plots.js')
      if (early) return [early]
    }
    const results = []
    for (const r of runs.slice(0, 2)) {
      const name = `${r.command} from ${r.from === '.' ? 'the top folder' : `the folder ${r.from}`} lists the free plots readPlots gives`
      const trouble = stubTrouble(name, r)
      if (trouble) {
        results.push(trouble)
        continue
      }
      const out = lines(r.stdout)
      let message
      const awaited = /await\s+(\w+\.)?\w+\(|\.then\(/.test((await read(dir, 'free-plots.js')) ?? '')
      if (hasStack(r.stderr) && !awaited && /is not a function|of undefined/.test(errorLine(r.stderr) ?? '')) {
        message = `free-plots.js stopped with an error: ${errorLine(r.stderr)}. readPlots is async: without await, the script gets a promise instead of the list.`
      } else if (hasStack(r.stderr)) message = `free-plots.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      else if (out.join('\n') === 'J2\nK1\nK3' && r.code === 0) message = null
      else if (out.some((l) => /\{|holder/.test(l))) message = 'Print each free plot by its name alone, like A3, one per line.'
      else if (out.includes('J1')) message = 'A plot with a holder is in the list. Only the plots whose holder is null are free.'
      else if (out.join('\n') === 'No free plots.' && !awaited) {
        message = 'The script said no plot is free, although readPlots gave it free plots. readPlots is async: without await, the script gets a promise instead of the list.'
      } else if (out.join('\n') === 'No free plots.') message = 'The script said no plot is free, although readPlots gave it free plots. A free plot is one whose holder is null.'
      else message = 'Print the name of each free plot, one per line, in the order readPlots gives them.'
      results.push(message ? fail(name, message, report(r)) : pass(name, report(r)))
    }
    const none = runs[2]
    const noneName = 'With no free plot, it says so'
    const noneOk = lines(none.stdout).join('\n') === 'No free plots.' && none.code === 0
    results.push(
      noneOk
        ? pass(noneName, report(none))
        : fail(noneName, stubTrouble(noneName, none)?.message ?? 'When no plot is free, print the line from the task, and end with exit code 0.', report(none))
    )
    return results
  },

  async version(t) {
    const pkgs = [
      { name: 'marrowfield-tools', version: '2.4.1', private: true, type: 'module' },
      { name: 'allotment-kit', version: '0.9.12', private: true, type: 'module' }
    ]
    const results = []
    for (const [i, pkg] of pkgs.entries()) {
      const dir = await box(t, { 'package.json': JSON.stringify(pkg, null, 2) + '\n' })
      const r = await run(dir, 'version.js', [], { from: i === 0 ? '.' : 'gate-shed' })
      const name = `With ${pkg.name} ${pkg.version} in package.json, ${i === 0 ? 'from the top folder' : 'from another folder'}, it prints both`
      const early = await broken(name, r, dir, 'version.js')
      if (early) return [early]
      const out = lines(r.stdout)
      let message
      if (out.length === 1 && out[0] === `${pkg.name} ${pkg.version}` && r.code === 0) message = null
      else if (/ENOENT/.test(r.stderr)) message = 'Run from another folder, version.js could not find package.json. Build its path from the script\'s own folder.'
      else if (hasStack(r.stderr)) message = `version.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      else if (/0\.1\.0/.test(r.stdout)) message = 'version.js printed the version from the starter, not from package.json as it is now. Read the file when the script runs.'
      else if (/undefined/.test(r.stdout)) message = 'A part of the line is undefined. The text of package.json has to become an object before it has a name and a version, and each is spelled as it is in the file.'
      else if (/^\{|"name"/.test(r.stdout.trim())) message = 'version.js printed the file\'s text. Turn the text into an object first, then print its name and version.'
      else message = 'Print one line: the name, one space, and the version, as in the task.'
      results.push(message ? fail(name, message, report(r)) : pass(name, report(r)))
    }
    return results
  },

  async row(t) {
    const dir = await stubbed(t)
    const [j, k, none, unknown, empty, plain] = await Promise.all([
      run(dir, 'free-plots.js', ['--row', 'J']),
      run(dir, 'free-plots.js', ['--row', 'K'], { from: 'gate-shed' }),
      run(dir, 'free-plots.js', ['--row', 'Z']),
      run(dir, 'free-plots.js', ['--colour', 'red']),
      run(dir, 'free-plots.js', ['--row']),
      run(dir, 'free-plots.js')
    ])
    for (const r of [j, k, none, unknown, empty]) {
      const early = await broken('free-plots.js takes --row', r, dir, 'free-plots.js')
      if (early) return [early]
    }
    const results = []
    const rows = [
      [j, 'J2'],
      [k, 'K1\nK3'],
      [none, 'No free plots.']
    ]
    for (const [r, expected] of rows) {
      const name = `${r.command} prints ${expected === 'No free plots.' ? 'that none are free' : 'only the free plots of that row'}`
      const trouble = stubTrouble(name, r)
      if (trouble) {
        results.push(trouble)
        continue
      }
      const out = lines(r.stdout).join('\n')
      let message
      if (hasStack(r.stderr)) message = `free-plots.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      else if (out === expected && r.code === 0) message = null
      else if (out === lines(plain.stdout).join('\n')) message = 'With --row, the script still lists every free plot. Keep only the ones whose name starts with the letter given.'
      else if (/^(row|--row)/i.test(out)) message = 'The option\'s name was used where its value was meant. The letter is the value given with --row.'
      else message = expected === 'No free plots.'
        ? 'When no free plot is in that row, print the line from Task 2.'
        : 'Print the free plots whose name starts with the letter given, one per line.'
      results.push(message ? fail(name, message, report(r)) : pass(name, report(r)))
    }
    const bad = (r, what) => {
      if (r.stderr.trim() === '' && /J2|No free plots/.test(r.stdout)) {
        return `With ${what}, the script carried on and printed plots as if all was well. parseArgs refuses what it was not told about: let it read the options, and print its message.`
      }
      if (hasStack(r.stderr)) return `With ${what}, Node stopped with the error and its stack trace. Catch what parseArgs throws and print its message as one plain line.`
      if (/Unknown option|argument missing/.test(r.stdout)) return `With ${what}, the message went to standard output. A message about a mistake belongs on standard error.`
      if (r.stdout.trim() !== '') return `With ${what}, something went to standard output. The script should list nothing then, only print one line on standard error.`
      if (r.stderr.trim() === '') return `With ${what}, the script printed nothing. Print one line on standard error that says what is wrong.`
      if (r.code !== 1) return `With ${what}, the line is right, but the script ended with exit code ${r.code}. It ends with 1.`
      return null
    }
    const badName = 'An unknown option, or --row with no letter, is refused with exit code 1'
    const badMessage = bad(unknown, 'an option it does not know, --colour') ?? bad(empty, '--row and no letter after it')
    results.push(badMessage ? fail(badName, badMessage, reports(unknown, empty)) : pass(badName, reports(unknown, empty)))
    return results
  }
}
