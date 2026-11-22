import { basename, extname, join, relative, resolve } from 'node:path'
import {
  box,
  broken,
  errorLine,
  fail,
  hasStack,
  lines,
  pass,
  read,
  report,
  reports,
  run,
  samePath,
  slashStrings
} from '../../grading.mjs'

const where = (r) => (r.from === '.' ? 'the top folder' : `the folder ${r.from}`)

/** The detail for a script that puts a path together from text with slashes in it, or null. */
async function slashes(name, dir, script, output, advice) {
  const found = slashStrings((await read(dir, script)) ?? '')
  if (found.length === 0) return null
  return fail(
    name,
    `${script} has a slash written into its text to work with a path. Windows separates folders with \\ and macOS and Linux with /, so a path built by hand mixes the two on Windows, and one taken apart at a slash goes wrong there. ${advice}`,
    `${output}\n\nIn ${script}: ${found.join(', ')}`
  )
}

/** The value after `label` on its line of output, or null. */
const after = (r, label) => {
  const line = lines(r.stdout).find((l) => l.startsWith(label))
  return line === undefined ? null : line.slice(label.length).trim()
}

export const checks = {
  async where(t) {
    const dir = await box(t)
    const runs = await Promise.all([run(dir, 'where.js'), run(dir, 'where.js', [], { from: 'water' })])
    const results = []
    for (const r of runs) {
      const name = `node ${relative(join(dir, r.from), join(dir, 'where.js'))} from ${where(r)} names both folders`
      const early = await broken(name, r, dir, 'where.js')
      if (early) return [early]
      const runFrom = after(r, 'Run from:')
      const scriptIn = after(r, 'Script in:')
      let message
      if (hasStack(r.stderr)) {
        message = /__dirname/.test(r.stderr)
          ? '__dirname is not there in a module like yours: Node stopped with a ReferenceError. The lesson shows what a module has in its place.'
          : `where.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      } else if (runFrom === null || scriptIn === null) {
        message = 'where.js should print two lines, one that starts with Run from: and one that starts with Script in:, as in the task.'
      } else if (!(await samePath(runFrom, join(dir, r.from)))) {
        message = /^file:/.test(runFrom)
          ? 'Run from: shows a file URL, not a path. Print the folder the command was typed in.'
          : `Run from: should show the folder the command was typed in, here ${where(r)}.`
      } else if (/^file:/.test(scriptIn)) {
        message = 'Script in: shows a file URL that starts with file:, not a path. A module has its folder as a plain path too.'
      } else if (await samePath(scriptIn, join(dir, 'where.js'))) {
        message = 'Script in: shows the path of the script file itself. It should show the folder that holds it.'
      } else if (!(await samePath(scriptIn, dir))) {
        message =
          r.from === '.'
            ? 'Script in: should show the folder that holds where.js.'
            : 'Script in: shows the folder the command was typed in, not the folder that holds where.js. Run it from the water folder, with node ../where.js, to see the two differ.'
      }
      results.push(message ? fail(name, message, report(r)) : pass(name, report(r)))
    }
    return results
  },

  async total(t) {
    const readings = '2031-03-02,north,212\n2031-03-02,south,198\n2031-03-09,north,307\n2031-03-09,east,95\n2031-03-16,south,240\n'
    const dir = await box(t, { 'water/readings.txt': readings })
    const runs = await Promise.all([
      run(dir, 'water-total.js'),
      run(dir, 'water-total.js', [], { from: 'water' }),
      run(dir, 'water-total.js', [], { from: 'gate-shed' })
    ])
    const results = []
    for (const r of runs) {
      const name = `node ${relative(join(dir, r.from), join(dir, 'water-total.js'))} from ${where(r)} adds up the readings`
      const early = await broken(name, r, dir, 'water-total.js')
      if (early) return [early]
      const printed = lines(r.stdout)
      let message
      if (/ENOENT/.test(r.stderr)) {
        const path = /'([^']+)'/.exec(errorLine(r.stderr) ?? '')?.[1] ?? ''
        message = relative(path, join(t.workspace, r.from, 'water', 'readings.txt')) === ''
          ? `water-total.js built the path from the folder the command was typed in, ${where(r)}, so it looked for ${path}. That is the folder process.cwd() gives. Build it from the script's own folder instead.`
          : /^(\/|[A-Za-z]:)/.test(path)
          ? `water-total.js could not find ${path}. Check the folder names in the path against where readings.txt really is.`
          : `water-total.js looked for ${path} in ${where(r)}, the folder the command was typed in, and it is not there. A path like that is relative to where the command was typed. Build the path from the script's own folder instead.`
      } else if (hasStack(r.stderr)) {
        message = `water-total.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      } else if (printed.length === 1 && printed[0] === 'Total: 1052 litres' && r.code === 0) {
        message = null
      } else if (/2622/.test(r.stdout)) {
        message = 'The total is the one for the readings in the starter, not for the file as it is now. Add up what is in water/readings.txt when the script runs.'
      } else if (/NaN/.test(r.stdout)) {
        message = 'The total is NaN: something that is not a number was added in. Leave out blank lines, and turn the litres, the third part of each line, into a number.'
      } else if (!/^Total: \S+ litres$/.test(printed[0] ?? '')) {
        message = 'The line should read like the example in the task: Total:, the number, and the word litres.'
      } else {
        message = 'The total is not right. Add the litres, the third part of each line, as numbers.'
      }
      results.push(message ? fail(name, message, report(r)) : pass(name, report(r)))
    }
    const slash = await slashes('The path to the readings is built with node:path', dir, 'water-total.js', report(runs[0]), "Let node:path's join place the separators: give it each folder and file name as its own argument.")
    results.push(slash ?? pass('The path to the readings is built with node:path', ''))
    return results
  },

  async info(t) {
    const dir = await box(t)
    const cases = [
      { args: [join('water', 'readings.txt')], from: '.' },
      { args: [join('..', 'notices', 'gate-code.md')], from: 'water' },
      { args: ['seed-list'], from: 'gate-shed' }
    ]
    const runs = await Promise.all(cases.map((c) => run(dir, 'file-info.js', c.args, { from: c.from })))
    const results = []
    for (const [i, r] of runs.entries()) {
      const typed = cases[i].args[0]
      const name = `${r.command} from ${where(r)} describes ${typed}`
      const early = await broken(name, r, dir, 'file-info.js')
      if (early) return [early]
      const full = after(r, 'Full path:')
      const expected = resolve(dir, r.from, typed)
      let message
      if (hasStack(r.stderr)) {
        message = `file-info.js stopped with an error: ${errorLine(r.stderr) ?? 'see the output'}.`
      } else if (full === null || after(r, 'Name:') === null || after(r, 'Extension:') === null) {
        message = 'file-info.js should print three lines that start with Full path:, Name: and Extension:, as in the task.'
      } else if (full === typed) {
        message = 'Full path: shows the path as it was typed. Turn it into a full path that starts at the top of the disk.'
      } else if (relative(full, expected) !== '') {
        message =
          relative(full, resolve(dir, typed)) === ''
            ? `Full path: was worked out from the script's folder. A path a person types is relative to the folder they typed it in, here ${where(r)}.`
            : `Full path: is not where ${typed} is when it is typed in ${where(r)}.`
      } else if (after(r, 'Name:') !== basename(typed)) {
        message = 'Name: should be the last part of the path, the file\'s name with its extension, and no folder.'
      } else if (after(r, 'Extension:') !== (extname(typed) || 'none')) {
        message = extname(typed)
          ? 'Extension: should be the end of the name from the last dot on, dot included.'
          : 'A name with no dot has no extension, so Extension: should say none.'
      }
      results.push(message ? fail(name, message, report(r)) : pass(name, report(r)))
    }
    const none = await run(dir, 'file-info.js')
    const noneName = 'node file-info.js with no path gets one line on standard error and exit code 1'
    results.push(
      none.code === 1 && none.stdout.trim() === '' && none.stderr.trim() !== '' && !hasStack(none.stderr)
        ? pass(noneName, report(none))
        : fail(
            noneName,
            hasStack(none.stderr)
              ? 'With no path, Node stopped with an error and a stack trace. Check for a missing path yourself, as in the first issue, and print one plain line.'
              : 'With no path, the script should print one line on standard error that says what to type, nothing on standard output, and end with exit code 1.',
            report(none)
          )
    )
    const slash = await slashes('The name and the extension come from node:path', dir, 'file-info.js', reports(...runs), 'Let node:path take the path apart: it has a function for the name and one for the extension.')
    results.push(slash ?? pass('The name and the extension come from node:path', ''))
    return results
  }
}
