import { readFile } from 'node:fs/promises'
import { join, posix } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { blocker, box, call, expected, fail, LATE, lines, once, pass, report, reports, run, WEEK } from '../../checks-helpers.mjs'

const FILES = { 'week.txt': WEEK, 'late.txt': LATE }
const shown = (v) => (v === undefined ? 'undefined' : JSON.stringify(v))
// eslint-disable-next-line no-control-regex
const COLOUR = /\x1b\[[0-9;]*m/g
const plain = (text) => text.replace(COLOUR, '')

async function settingCases(b) {
  const cases = [
    { name: 'The setting fills in a flag not typed', args: [{ paper: 'linen' }, { ORDERS_LIMIT: '4' }], want: { paper: 'linen', limit: '4' } },
    { name: 'A typed flag wins over the setting', args: [{ limit: '9' }, { ORDERS_LIMIT: '4' }], want: { limit: '9' } },
    { name: 'No setting, no flag: nothing added', args: [{ json: true }, {}], want: { json: true } },
    { name: 'A typed flag wins over a broken setting', args: [{ limit: '2' }, { ORDERS_LIMIT: 'lots' }], want: { limit: '2' } },
    { name: 'A setting that is not a whole number above 0', args: [{}, { ORDERS_LIMIT: 'lots' }], throws: true },
    { name: 'A setting of 0', args: [{}, { ORDERS_LIMIT: '0' }], throws: true }
  ]
  const replies = await Promise.all(cases.map((c) => call(b, 'src/settings.js', 'withSettings', c.args)))
  return { replies, results: cases.map((c, i) => judgeSetting(c, replies[i])) }
}

function judgeSetting(c, r) {
  const output = `withSettings(${shown(c.args[0])}, ${shown(c.args[1])}) ${r.ok ? `gave ${shown(r.value)}` : `threw ${r.error}`}`
  if (r.missing) return fail(c.name, 'src/settings.js should export withSettings.', output)
  if (c.throws) {
    if (r.ok) return fail(c.name, 'A setting that is not a whole number above 0 is a mistake in the environment: withSettings should throw an Error that says so, not pass it on.', output)
    return /ORDERS_LIMIT/.test(r.error)
      ? pass(c.name, output)
      : fail(c.name, 'The error should name ORDERS_LIMIT, where the wrong value came from, so the person knows which setting to fix: nobody typed --limit.', output)
  }
  if (!r.ok) {
    return fail(c.name, c.args[0].limit ? 'withSettings threw, but a --limit was typed, so the setting is never used and its value does not matter.' : 'withSettings threw here, though nothing is wrong.', output)
  }
  if (isDeepStrictEqual(r.value, c.want)) return pass(c.name, output)
  if (c.args[1].ORDERS_LIMIT && !c.args[0].limit && r.value && r.value.limit === undefined) {
    return fail(c.name, 'The setting in the environment withSettings was given did not reach the flags. Read ORDERS_LIMIT from env, its second argument: orders.js hands it process.env, and Check an environment of its own.', output)
  }
  if (r.value?.limit === Number(c.want.limit)) return fail(c.name, 'limit came out as a number. A setting stays text, like the value of a typed flag: the shop turns it into a number.', output)
  if (c.args[0].limit && r.value?.limit === c.args[1].ORDERS_LIMIT) {
    return fail(c.name, 'The setting won over the flag that was typed. A setting is the default for this computer; a flag is what the person asked for this once, so the flag wins.', output)
  }
  return fail(c.name, 'withSettings should give back the flags it was given, with limit from ORDERS_LIMIT only when no --limit was typed.', output)
}

const NAMES_BOTH = 'orders/press-1.txt orders/press-2.txt'

export const checks = {
  async settings(t) {
    const b = await box(t)
    const { replies, results } = await settingCases(b)
    const stop = blocker('withSettings is written', replies, 'withSettings()')
    if (stop) return [stop]
    const want = await expected(t, 'list', FILES)
    const all = want.results.map((x) => x.text)
    const [three, flag, broken] = await Promise.all([
      run(b, ['list', 'week.txt', 'late.txt'], { files: FILES, env: { ORDERS_LIMIT: '3' } }),
      run(b, ['list', '-n', '1', 'week.txt', 'late.txt'], { files: FILES, env: { ORDERS_LIMIT: '3' } }),
      run(b, ['list', 'week.txt'], { files: FILES, env: { ORDERS_LIMIT: 'many' } })
    ])
    const toolOk = isDeepStrictEqual(lines(three.stdout), all.slice(0, 3)) && isDeepStrictEqual(lines(flag.stdout), all.slice(0, 1))
    results.push(
      toolOk
        ? pass('The tool takes ORDERS_LIMIT, and a flag wins', reports(three, flag))
        : fail(
            'The tool takes ORDERS_LIMIT, and a flag wins',
            isDeepStrictEqual(lines(three.stdout), all)
              ? 'With ORDERS_LIMIT set, list still showed every order. orders.js should pass the flags through withSettings with the environment of the process before running the command.'
              : 'list should show as many orders as ORDERS_LIMIT says, and as many as -n says when it is typed.',
            reports(three, flag)
          ),
      broken.code === 2 && lines(broken.stderr).length === 1 && broken.stderr.includes('ORDERS_LIMIT') && broken.stdout === ''
        ? pass('A broken setting is named', report(broken))
        : fail('A broken setting is named', 'With ORDERS_LIMIT set to something that is not a whole number, the tool should end like any mistake: one line on standard error that names ORDERS_LIMIT, nothing on standard output, and exit code 2.', report(broken))
    )
    return results
  },

  async colour(t) {
    const b = await box(t)
    const cases = [
      [{ isTTY: true }, {}, true, 'Standard output is a terminal and NO_COLOR is not set: colour is welcome.'],
      [{ isTTY: true }, { NO_COLOR: '1' }, false, 'NO_COLOR is set, so no colour, whatever the stream is.'],
      [{ isTTY: true }, { NO_COLOR: '' }, true, 'NO_COLOR is there but empty, which by custom counts as not set.'],
      [{}, {}, false, 'This stream is not a terminal: it is a file or a pipe, where colour codes would only be junk in the text.'],
      [{ isTTY: false }, {}, false, 'This stream is not a terminal: it is a file or a pipe, where colour codes would only be junk in the text.']
    ]
    const replies = await Promise.all(cases.map(([stream, env]) => call(b, 'src/settings.js', 'useColour', [stream, env])))
    const stop = blocker('useColour is written', replies, 'useColour()')
    if (stop) return [stop]
    const results = once(
      cases.map(([stream, env, want, why], i) => {
        const r = replies[i]
        const name = `useColour(${shown(stream)}, ${shown(env)})`
        const output = `${name} ${r.ok ? `gave ${shown(r.value)}` : `threw ${r.error}`}`
        if (r.ok && r.value === want) return pass(name, output)
        return fail(name, r.missing ? 'src/settings.js should export useColour.' : r.ok ? why : 'useColour threw here.', output)
      })
    )
    const want = await expected(t, 'check', FILES)
    const texts = want.results.map((x) => x.text)
    const term = { TERM: 'xterm-256color' }
    const [tty, noColor, pipe, json] = await Promise.all([
      run(b, ['check', 'week.txt', 'late.txt'], { files: FILES, tty: true, env: term }),
      run(b, ['check', 'week.txt', 'late.txt'], { files: FILES, tty: true, env: { ...term, NO_COLOR: '1' } }),
      run(b, ['check', 'week.txt', 'late.txt'], { files: FILES, env: term }),
      run(b, ['check', '--json', 'week.txt', 'late.txt'], { files: FILES, tty: true, env: term })
    ])
    const out = lines(tty.stdout)
    const red = out.length === texts.length && out.every((l, i) => l.includes('\x1b[31m') && plain(l) === texts[i])
    results.push(
      red
        ? pass('At a terminal, each problem is red', report(tty))
        : fail(
            'At a terminal, each problem is red',
            isDeepStrictEqual(out, texts)
              ? 'Standard output stood in for a terminal, and NO_COLOR was not set, yet the problems came out plain. orders.js should ask useColour about process.stdout and the environment, and colour each problem line of check red.'
              : 'Each problem line of check should be the same text as before, in red: the code for red before it and a code that ends the colour after it.',
            report(tty)
          )
    )
    const clean = (r) => !r.stdout.includes('\x1b') && !r.stderr.includes('\x1b')
    results.push(
      clean(noColor) && isDeepStrictEqual(lines(noColor.stdout), texts)
        ? pass('NO_COLOR means no colour', report(noColor))
        : fail('NO_COLOR means no colour', 'NO_COLOR was set, so nothing the tool prints should hold a colour code.', report(noColor)),
      clean(pipe) && isDeepStrictEqual(lines(pipe.stdout), texts)
        ? pass('Into a pipe or a file, no colour', report(pipe))
        : fail('Into a pipe or a file, no colour', 'Standard output was a pipe here, as it is with > into a file: colour codes would end up in the file as junk. Colour only when useColour says the stream is a terminal.', report(pipe)),
      clean(json)
        ? pass('JSON is never coloured', report(json))
        : fail('JSON is never coloured', 'With --json the output is for a program, so it never holds a colour code, even at a terminal.', report(json))
    )
    return results
  },

  async name(t) {
    const b = await box(t)
    const results = []
    const source = (await readFile(join(b.dir, 'orders.js'), 'utf8').catch(() => '')).replace(/^﻿/, '')
    const first = source.split('\n')[0]
    let shebang
    if (first.endsWith('\r')) {
      shebang = 'The first line ends with a Windows line break. A Unix system reads the \\r as part of the program\'s name and finds no such program: save orders.js with plain line breaks.'
    } else if (!first.startsWith('#!')) {
      shebang = source.includes('#!')
        ? 'The #! line is in orders.js, but not on the very first line. The system only looks at the first two characters of the file.'
        : 'orders.js should start with a #! line that names the program to run it with.'
    } else if (!/^#!\/usr\/bin\/env node\s*$/.test(first)) {
      shebang = 'The first line should run node through /usr/bin/env, which finds node wherever it is installed on this computer, as the lesson shows.'
    }
    const version = await run(b, ['--version'])
    if (!shebang && (version.code !== 0 || !version.stdout.trim())) shebang = 'With the #! line in place, node orders.js --version should still print the version.'
    results.push(shebang ? fail('The first line of orders.js', shebang, `first line: ${shown(first)}\n\n${report(version)}`) : pass('The first line of orders.js', `first line: ${first}\n\n${report(version)}`))

    let pkg
    let bin
    try {
      pkg = JSON.parse(await readFile(join(b.dir, 'package.json'), 'utf8'))
    } catch (error) {
      bin = `package.json is not JSON that can be read: ${error.message}`
    }
    if (pkg) {
      const target = typeof pkg.bin === 'string' ? (pkg.name === 'orders' ? pkg.bin : undefined) : pkg.bin?.orders
      if (pkg.bin === undefined) bin = 'package.json should have a bin entry that gives the tool its name.'
      else if (typeof target !== 'string') bin = 'The bin entry should give the command orders: an object with orders as its key.'
      else if (posix.normalize(target.replaceAll('\\', '/')) !== 'orders.js') bin = 'The command orders should point at orders.js, the file that runs the tool, by its path from package.json.'
    }
    results.push(bin ? fail('The bin entry in package.json', bin, JSON.stringify(pkg?.bin ?? null)) : pass('The bin entry in package.json', JSON.stringify(pkg.bin)))

    results.push(...(await morning(t, b)))
    return results
  },
}

// The three morning commands, run as typed, with the check's own order files at those names.
async function morning(t, b) {
  const name = 'morning.txt, in three commands of orders'
  const text = await readFile(join(b.dir, 'morning.txt'), 'utf8').catch(() => null)
  if (text === null) return [fail(name, 'morning.txt is not there any more. Keep it, with the three commands in it.', '')]
  const commands = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  const shownFile = `morning.txt, without its comments:\n${commands.map((c) => `  ${c}`).join('\n') || '  (nothing)'}`
  if (commands.length !== 3) return [fail(name, `morning.txt should hold three commands, one on each line, and it holds ${commands.length}. Lines that start with # are comments.`, shownFile)]
  const notTool = commands.find((c) => !/^orders\s/.test(c))
  if (notTool) return [fail(name, `A command in morning.txt does not run the tool: each one starts with orders, its new name.`, shownFile)]
  if (commands.some((c) => /[|><'"`;&$*]/.test(c))) {
    return [fail(name, 'A command in morning.txt uses quotes, a pipe, a redirection or a pattern. The tool does all of it now: plain words only, which mean the same in every shell.', shownFile)]
  }
  const files = { 'orders/press-1.txt': WEEK, 'orders/press-2.txt': LATE }
  const both = { 'orders/press-1.txt': WEEK, 'orders/press-2.txt': LATE }
  const runs = await Promise.all(commands.map((c) => run(b, c.split(/\s+/).slice(1), { files })))
  const [count, byPaper, check] = await Promise.all([expected(t, 'count', both), expected(t, 'count', both, { by: 'paper' }), expected(t, 'check', both)])
  const texts = (w) => w.results.map((x) => x.text)
  const asks = [
    [count, 0, 'The first command should count all of today\'s orders, in both order files, as the first old command did.'],
    [byPaper, 0, 'The second command should count the orders on each paper, in both order files.'],
    [check, 1, 'The third command should find the broken lines in both order files, and end with exit code 1 when there are some.']
  ]
  const results = runs.map((r, i) => {
    const [want, code, why] = asks[i]
    // Colour is task 2's: here only the words count.
    const ok = isDeepStrictEqual(lines(plain(r.stdout)), texts(want)) && r.code === code
    const missing = !commands[i].includes('orders/press-1.txt') || !commands[i].includes('orders/press-2.txt')
    return ok
      ? pass(`Morning command ${i + 1}`, report(r))
      : fail(`Morning command ${i + 1}`, missing ? `${why} Name the files by their paths, ${NAMES_BOTH}, as the old commands did.` : why, report(r))
  })
  return [pass(name, shownFile), ...results]
}
