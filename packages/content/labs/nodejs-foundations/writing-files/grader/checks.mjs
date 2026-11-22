import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
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
  slashStrings
} from '../../grading.mjs'

// Loaded before list-reports.js: most systems list a folder in name order, so a script that never
// sorts would pass by luck. Reversed, it cannot.
const REVERSED = `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const back = (names) => (Array.isArray(names) ? [...names].reverse() : names)
const { readdir, readdirSync } = fs
const promised = fs.promises.readdir
fs.promises.readdir = async (...args) => back(await promised(...args))
fs.readdirSync = (...args) => back(readdirSync(...args))
fs.readdir = (...args) => {
  const done = args.pop()
  readdir(...args, (error, names) => done(error, back(names)))
}
syncBuiltinESMExports()
`

const LIST = 'Cassius Pembury\nMorwenna Brand\nRennick Roe\n'
const names = (text) => (text ?? '').split(/\r?\n/).filter((l) => l.trim() !== '')
const show = (label, text) => `${label}:\n${text === null ? '  (no such file)' : text === '' ? '  (empty)' : text.replace(/\n$/, '').split('\n').map((l) => `  ${l}`).join('\n')}`

/** Why a run stopped on an error, in words about files, or null. */
function fileError(r, script) {
  if (!hasStack(r.stderr)) return null
  const error = errorLine(r.stderr) ?? 'see the output'
  if (/ENOENT/.test(error)) {
    return `${script} stopped with ENOENT: ${error}. Look at the path in it: a file or folder on the way to it is not there, or the path is relative to the folder the command was typed in.`
  }
  if (/EEXIST/.test(error)) {
    return `${script} stopped with EEXIST: ${error}. Making a folder that is already there is refused, unless you tell mkdir that is fine.`
  }
  return `${script} stopped with an error: ${error}.`
}

export const checks = {
  async add(t) {
    const dir = await box(t, { 'waiting-list.txt': LIST })
    const first = await run(dir, 'add-to-list.js', ['Elsbeth', 'Pennock'])
    const second = await run(dir, 'add-to-list.js', ['Ludovic Achterberg'], { from: 'gate-shed' })
    const early = (await broken('add-to-list.js adds names', first, dir, 'add-to-list.js')) ?? (await broken('add-to-list.js adds names', second, dir, 'add-to-list.js'))
    if (early) return [early]
    const after = await read(dir, 'waiting-list.txt')
    const wanted = [...names(LIST), 'Elsbeth Pennock', 'Ludovic Achterberg']
    const output = `${reports(first, second)}\n\n${show('waiting-list.txt before', LIST)}\n${show('waiting-list.txt after', after)}`
    const name = 'Two names are added to the end of the waiting list, from any folder'
    const got = names(after)
    let message = fileError(first, 'add-to-list.js') ?? fileError(second, 'add-to-list.js')
    if (message) {
      // already said
    } else if (got.join('\n') === wanted.join('\n')) {
      const raw = after.split(/\r?\n/)
      message = raw.slice(0, -1).includes('')
        ? 'A blank line ended up in the list. The line break goes after each name, not before it.'
        : raw.at(-1) !== ''
          ? 'The last name has no line break after it, so the next name added would land on its line. End each name with a line break.'
          : null
    } else if (!got.includes('Cassius Pembury')) {
      message = 'The names that were on the list before are gone: the file was replaced instead of added to. Write in a way that keeps what is there.'
    } else if (got.some((l) => /Pennock.*Achterberg|Roe.*Elsbeth/.test(l))) {
      message = 'Two names ended up on one line. Each name goes on a line of its own, so end each one with a line break.'
    } else if (got.includes('Elsbeth') || got.includes('Pennock')) {
      message = 'Only part of the name was added. A name typed as two words, Elsbeth Pennock, reaches the script as two arguments; add all of them, with a space between.'
    } else if (!got.includes('Ludovic Achterberg') && (await read(dir, 'gate-shed/waiting-list.txt')) !== null) {
      message = 'Run from another folder, the name went into a new waiting-list.txt in that folder. Build the path from the script\'s own folder, as in the last issue.'
    } else if (got.includes('Ludovic Achterberg') && !got.includes('Elsbeth Pennock')) {
      message = 'The first name is missing from the list. Each run should add its name.'
    } else {
      message = 'The list should be the names it had, in order, then each new name on a line of its own.'
    }
    const results = [message ? fail(name, message, output) : pass(name, output)]

    const dir2 = await box(t, { 'waiting-list.txt': LIST })
    const none = await run(dir2, 'add-to-list.js')
    const noneName = 'With no name, one line on standard error, exit code 1, and the list unchanged'
    const unchanged = (await read(dir2, 'waiting-list.txt')) === LIST
    let noneMessage
    if (hasStack(none.stderr)) noneMessage = `With no name, the script stopped with an error: ${errorLine(none.stderr) ?? 'see the output'}. Check for a missing name yourself and print one plain line.`
    else if (!unchanged) noneMessage = 'With no name, the waiting list changed. Nothing should be written when there is no name.'
    else if (none.stdout.trim() !== '' || none.stderr.trim() === '' || none.code !== 1) {
      noneMessage = 'With no name, print one line on standard error that says what to type, nothing on standard output, and end with exit code 1.'
    }
    results.push(noneMessage ? fail(noneName, noneMessage, report(none)) : pass(noneName, report(none)))
    return results
  },

  async next(t) {
    const dir = await box(t, { 'waiting-list.txt': LIST })
    const first = await run(dir, 'next-on-list.js')
    const mid = await read(dir, 'waiting-list.txt')
    const second = await run(dir, 'next-on-list.js', [], { from: 'gate-shed' })
    const end = await read(dir, 'waiting-list.txt')
    for (const r of [first, second]) {
      const early = await broken('next-on-list.js offers the plot', r, dir, 'next-on-list.js')
      if (early) return [early]
    }
    const output = `${show('waiting-list.txt before', LIST)}\n\n${report(first)}\n${show('waiting-list.txt after', mid)}\n\n${report(second)}\n${show('waiting-list.txt after', end)}`
    const name = 'Two runs offer the plot to the first two names and take them off the list'
    let message = fileError(first, 'next-on-list.js') ?? fileError(second, 'next-on-list.js')
    if (message) {
      // already said
    } else if (lines(first.stdout)[0] !== 'Offer the plot to Cassius Pembury.') {
      message = /Thaddeus|Rennick/.test(first.stdout)
        ? 'The plot went to the wrong name. The one who has waited longest is at the top of the list.'
        : 'The first run should print one line like the example in the task, with the first name on the list in it.'
    } else if (names(mid).length === 3 && names(end).length === 3) {
      message = 'The name offered the plot is still on the list. Write the list back without it.'
    } else if (names(mid).length > 3) {
      message = 'The list got longer: the rest of the names were added to the end instead of replacing what was there.'
    } else if (names(mid).join('\n') !== 'Morwenna Brand\nRennick Roe') {
      message = 'After the first run, the list should be the other names, in the order they were in.'
    } else if (mid.includes('Morwenna BrandRennick')) {
      message = 'The names left ran together on one line. Each name goes on a line of its own.'
    } else if (!/\n$/.test(mid)) {
      message = 'The last name left has no line break after it, so a name add-to-list.js adds next would land on its line. End every name with a line break.'
    } else if (lines(second.stdout)[0] !== 'Offer the plot to Morwenna Brand.' || names(end).join('\n') !== 'Rennick Roe') {
      message = (await read(dir, 'gate-shed/waiting-list.txt')) !== null || /ENOENT/.test(second.stderr)
        ? 'Run from another folder, the script did not use the waiting list beside it. Build the path from the script\'s own folder.'
        : 'The second run should offer the plot to the next name and leave only the last one.'
    }
    const results = [message ? fail(name, message, output) : pass(name, output)]

    const dir2 = await box(t, { 'waiting-list.txt': '' })
    const empty = await run(dir2, 'next-on-list.js')
    const emptyName = 'An empty list says nobody is waiting'
    const emptyOk = lines(empty.stdout).join('\n') === 'Nobody is waiting.' && empty.code === 0 && names(await read(dir2, 'waiting-list.txt')).length === 0
    results.push(
      emptyOk
        ? pass(emptyName, report(empty))
        : fail(
            emptyName,
            hasStack(empty.stderr)
              ? `With an empty list, the script stopped with an error: ${errorLine(empty.stderr) ?? 'see the output'}.`
              : /undefined/.test(empty.stdout)
                ? 'With an empty list, the plot was offered to undefined. Check whether anyone is waiting first.'
                : 'With an empty list, print the one line from the task, end with exit code 0, and write no names.',
            report(empty)
          )
    )
    return results
  },

  async report(t) {
    const plots = 'K1,Cassius Pembury\nK2,\nK3,Morwenna Brand\nK4,\nK5,\nK6,Rennick Roe\nK7,Elsbeth Pennock\n'
    const list = 'Ludovic Achterberg\nSeverine Ottoway\n'
    const old = 'Plots: 1\nFree: 1\nWaiting: 0\n'
    const expected = 'Plots: 7\nFree: 3\nWaiting: 2'
    const results = []

    const fresh = await box(t, { 'plots.txt': plots, 'waiting-list.txt': list, reports: null })
    const r1 = await run(fresh, 'monthly-report.js', ['2031-04'], { from: 'gate-shed' })
    const early = await broken('monthly-report.js writes the report', r1, fresh, 'monthly-report.js')
    if (early) return [early]
    const got1 = await read(fresh, 'reports/2031-04.txt')
    const name1 = 'node monthly-report.js 2031-04 makes the reports folder and writes the report'
    let m1 = fileError(r1, 'monthly-report.js')
    if (m1) {
      if (/ENOENT/.test(r1.stderr) && /reports/.test(errorLine(r1.stderr) ?? '')) {
        m1 = 'The script stopped with ENOENT because the reports folder is not there yet. Writing a file does not make its folder: make the folder first.'
      }
    } else if (got1 === null) {
      m1 = (await read(fresh, 'gate-shed/reports/2031-04.txt')) !== null
        ? 'The report went into a reports folder inside the folder the command was typed in. Build its path from the script\'s own folder.'
        : 'There is no reports/2031-04.txt beside the script. The file is named after the month typed, in a folder called reports.'
    } else if (got1.replace(/\r\n/g, '\n').replace(/\n+$/, '') !== expected) {
      m1 = /Plots: 12\b/.test(got1)
        ? 'The report counts the starter\'s plot list, not the file as it is. Read plots.txt and waiting-list.txt when the script runs.'
        : 'The report should be three lines, Plots:, Free: and Waiting:, each with its count from plots.txt and waiting-list.txt.'
    }
    results.push(m1 ? fail(name1, m1, `${report(r1)}\n${show('reports/2031-04.txt', got1)}`) : pass(name1, `${report(r1)}\n${show('reports/2031-04.txt', got1)}`))

    const again = await box(t, { 'plots.txt': plots, 'waiting-list.txt': list, 'reports/2031-03.txt': old })
    const r2 = await run(again, 'monthly-report.js', ['2031-05'])
    const got2 = await read(again, 'reports/2031-05.txt')
    const name2 = 'node monthly-report.js 2031-05 works when the reports folder is already there'
    let m2 = fileError(r2, 'monthly-report.js')
    if (m2) {
      // already said
    } else if (got2 === null || got2.replace(/\r\n/g, '\n').replace(/\n+$/, '') !== expected) {
      m2 = 'With the reports folder already there, reports/2031-05.txt should still be written, with the same three lines.'
    } else if ((await read(again, 'reports/2031-03.txt')) !== old) {
      m2 = 'The report that was already in the folder changed or went. Only the month typed gets written.'
    }
    results.push(m2 ? fail(name2, m2, `${report(r2)}\n${show('reports/2031-05.txt', got2)}`) : pass(name2, report(r2)))

    const none = await box(t, { reports: null })
    const r3 = await run(none, 'monthly-report.js')
    const name3 = 'With no month, one line on standard error, exit code 1, and no report'
    const written = await readdir(join(none, 'reports')).catch(() => [])
    results.push(
      r3.code === 1 && r3.stdout.trim() === '' && r3.stderr.trim() !== '' && !hasStack(r3.stderr) && written.length === 0
        ? pass(name3, report(r3))
        : fail(
            name3,
            written.length
              ? `With no month, the script still wrote ${written.join(', ')}. Check for the month before you write anything.`
              : 'With no month, print one line on standard error that says what to type, nothing on standard output, and end with exit code 1.',
            report(r3)
          )
    )

    const found = slashStrings((await read(fresh, 'monthly-report.js')) ?? '')
    results.push(
      found.length === 0
        ? pass('The path of the report is built with node:path', '')
        : fail(
            'The path of the report is built with node:path',
            'monthly-report.js has a slash written into its text to build a path. Let join place the separators, as in the last issue: the folder and the file name each as their own argument.',
            found.join(', ')
          )
    )
    return results
  },

  async list(t) {
    const files = {
      'reports/2031-01.txt': 'Plots: 7\n',
      'reports/2030-11.txt': 'Plots: 7\n',
      'reports/2030-12.txt': 'Plots: 7\n',
      'reports/notes.md': 'Ask about the hose.\n'
    }
    const many = await box(t, { reports: null, ...files, '.check/reversed.mjs': REVERSED })
    const missing = await box(t, { reports: null })
    const empty = await box(t, { reports: null, 'reports/notes.md': 'Ask about the hose.\n' })
    const [r1, r2, r3] = await Promise.all([
      run(many, 'list-reports.js', [], { from: 'gate-shed', preload: '.check/reversed.mjs' }),
      run(missing, 'list-reports.js'),
      run(empty, 'list-reports.js')
    ])
    const early = await broken('list-reports.js lists the reports', r1, many, 'list-reports.js')
    if (early) return [early]
    const results = []
    const out1 = lines(r1.stdout)
    const name1 = 'With three reports and a note, the months are listed oldest first'
    let m1 = fileError(r1, 'list-reports.js')
    if (m1) {
      // already said
    } else if (out1.join('\n') === '2030-11\n2030-12\n2031-01' && r1.code === 0) {
      m1 = null
    } else if (out1.some((l) => l.includes('notes'))) {
      m1 = 'notes.md is not a report. List only the files whose extension is .txt.'
    } else if (out1.some((l) => l.endsWith('.txt'))) {
      m1 = 'Each line should be the month alone, the name without its .txt.'
    } else if (out1.length === 1 && /,/.test(out1[0])) {
      m1 = 'The months came out on one line. Print each on a line of its own.'
    } else if ([...out1].sort().join('\n') === '2030-11\n2030-12\n2031-01') {
      m1 = 'The months are all there, but not oldest first. A folder lists its files in no promised order, so sort them yourself.'
    } else if (out1[0] === 'No reports yet.') {
      m1 = 'Run from another folder, the script found no reports. Look for the reports folder beside the script.'
    } else {
      m1 = 'Print one line per report: its month, oldest first.'
    }
    results.push(m1 ? fail(name1, m1, report(r1)) : pass(name1, report(r1)))

    const name2 = 'With no reports folder, or no report in it, it says there are none'
    const ok = (r) => lines(r.stdout).join('\n') === 'No reports yet.' && r.code === 0
    let m2
    if (!ok(r2)) {
      m2 = /ENOENT/.test(r2.stderr)
        ? 'With no reports folder, the script stopped with ENOENT. That is no reports yet, not a failure: catch it and print the line from the task.'
        : 'With no reports folder, print the line from the task and end with exit code 0.'
    } else if (!ok(r3)) {
      m2 = 'With a reports folder that holds no .txt file, print the line from the task too.'
    }
    results.push(m2 ? fail(name2, m2, reports(r2, r3)) : pass(name2, reports(r2, r3)))
    return results
  }
}
