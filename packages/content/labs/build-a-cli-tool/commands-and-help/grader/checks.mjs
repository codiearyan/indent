import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { blocker, box, call, expected, fail, LATE, lines, once, pass, report, reports, run, WEEK } from '../../checks-helpers.mjs'

const FILES = { 'week.txt': WEEK, 'late.txt': LATE }
const WANT = {
  count: { flags: ['paper', 'by', 'help'], run: 'countOrders' },
  list: { flags: ['paper', 'limit', 'help'], run: 'listOrders' },
  check: { flags: ['help'], run: 'checkOrders' }
}

// The check's own tables, for a tool of its own, to show the help is written from what it is given.
const OWN_COMMANDS = {
  stamp: { summary: 'Stamp each order with the day it left', flags: ['date', 'quiet', 'help'] },
  sort: { summary: 'Sort the orders by when they are due', flags: ['help'] }
}
const OWN_FLAGS = {
  date: { value: 'day', about: 'the day to stamp on them' },
  quiet: { short: 'q', about: 'say nothing while it works' },
  reverse: { about: 'the last ones first' },
  help: { short: 'h', about: 'show what this does' },
  version: { about: 'say which version this is' }
}
const SHOP_WORDS = ['Count the orders', 'List the orders', 'only the orders on this paper', 'at most this many orders', 'show this help']

/** The learner's COMMANDS, each run named by its function. */
const describeCommands = (b) => call(b, 'src/commands.js', '@COMMANDS', [])

function tableProblem(described) {
  if (!described.ok) return described.missing ? 'src/commands.js should export COMMANDS, the table of commands.' : undefined
  const table = described.value
  if (table === null || typeof table !== 'object' || Array.isArray(table)) return 'COMMANDS should be an object with one entry for each command.'
  for (const [name, want] of Object.entries(WANT)) {
    const entry = table[name]
    if (!entry) return `COMMANDS has no entry for ${name}.`
    if (typeof entry.summary !== 'string' || entry.summary.trim() === '' || entry.summary.includes('\n')) {
      return `The ${name} entry needs a summary: one line of text that says what the command does.`
    }
    if (!Array.isArray(entry.flags) || !isDeepStrictEqual([...entry.flags].sort(), [...want.flags].sort())) {
      return `The flags of the ${name} entry are not the ones the task lists for it. They are names from src/flags.js, as an array.`
    }
    if (entry.run?.fn !== want.run) return `The run of the ${name} entry should be the shop's own function for it, from src/shop.js.`
  }
  return undefined
}

/** The result lines of a run, with the notes set aside wherever they went. */
const resultLines = (r, notes) => lines(r.stdout).filter((l) => !notes.includes(l))

async function commandCase(t, b, name, args, command, flags) {
  const want = await expected(t, command, FILES, flags)
  const r = await run(b, args, { files: FILES })
  const got = resultLines(r, want.notes)
  const texts = want.results.map((x) => x.text)
  if (isDeepStrictEqual(got, texts)) return pass(name, report(r))
  const said = `${r.stdout}${r.stderr}`
  if (/orders: unknown command/.test(said)) {
    return fail(name, `orders said ${command} is an unknown command. main() should find each command of the table in COMMANDS.`, report(r))
  }
  if (got.length === 0) return fail(name, `The tool printed no result for ${command}. main() should run the command it finds in COMMANDS with readOrders(values), the flags and out.`, report(r))
  return fail(name, `The results are not what the shop's ${command} gives for these files and flags. Pass the run function readOrders(values), the flags as readArgs gave them, and out, and print nothing else.`, report(r))
}

async function unknownCase(b, word) {
  const r = await run(b, [word, 'week.txt'], { files: FILES })
  const all = [...lines(r.stdout), ...lines(r.stderr)]
  if (all.some((l) => l.startsWith(`orders: unknown command ${word}`))) return pass(`${word} is not a command`, report(r))
  const builtIn = ['constructor', 'toString'].includes(word)
  return fail(
    `${word} is not a command`,
    builtIn
      ? `${word} was taken as a command. Every object answers to names like constructor and toString, so ask whether COMMANDS has the word as its own entry.`
      : 'A word that is not a command should end in an error whose message starts with unknown command and the word.',
    report(r)
  )
}

/** Each must about a help text, as [what is wrong, test]: the first that fails is the cause. */
function helpProblems(text, wants) {
  if (typeof text !== 'string') return 'It should return the help as one text.'
  const all = text.split('\n')
  // A short form such as -q must stand as a word of its own: --quiet holds the letters -q too.
  const has = (l, p) => (/^-\w$/.test(p) ? new RegExp(`(^|[\\s,(\\[])${p}(?![\\w-])`).test(l) : l.includes(p))
  const line = (...parts) => all.some((l) => parts.every((p) => has(l, p)))
  for (const [message, ok] of wants(line, text)) if (!ok) return message
  return undefined
}

const toolWants = (commands, flags) => (line, text) => [
  [`The usage line should say how to run the tool: orders, then <command>.`, line('orders', '<command>')],
  ...Object.entries(commands).map(([name, c]) => [`There should be a line for the command ${name} that holds its name and its summary.`, line(name, c.summary)]),
  ...['help', 'version'].map((name) => {
    const f = flags[name]
    return [`There should be a line for --${name} that holds --${name}${f.short ? `, -${f.short}` : ''} and its about text.`, line(`--${name}`, f.about, ...(f.short ? [`-${f.short}`] : []))]
  }),
  ['The help names something that is not in the table it was given. Write every part of it from commands and flags.', !SHOP_WORDS.some((w) => text.includes(w))]
]

const commandWants = (name, commands, flags) => (line, text) => [
  [`The usage line should say how to run this command: orders, then ${name}.`, line('orders', name)],
  ['The help of a command should hold its summary.', text.includes(commands[name].summary)],
  ...commands[name].flags.map((flagName) => {
    const f = flags[flagName]
    const parts = [`--${flagName}`, f.about, ...(f.short ? [`-${f.short}`] : []), ...(f.value ? [`<${f.value}>`] : [])]
    return [`There should be a line for --${flagName} that holds --${flagName}${f.short ? `, -${f.short}` : ''}${f.value ? ` and <${f.value}>` : ''}, and its about text.`, line(...parts)]
  }),
  ...Object.keys(flags)
    .filter((f) => !commands[name].flags.includes(f))
    .map((f) => [`The help of ${name} has a line for --${f}, which ${name} does not take. Write a line only for each flag the command lists.`, !line(`--${f}`)]),
  ['The help names something that is not in the table it was given. Write every part of it from commands and flags.', !SHOP_WORDS.some((w) => text.includes(w))]
]

export const checks = {
  async table(t) {
    const b = await box(t)
    const described = await describeCommands(b)
    const runs = await Promise.all([
      run(b, ['count', 'week.txt', 'late.txt'], { files: FILES }),
      run(b, ['list', '--paper', 'cotton', 'week.txt', 'late.txt'], { files: FILES })
    ])
    const stop = blocker('Your code is written', [described, ...runs], 'main() in orders.js')
    if (stop) return [stop]
    const problem = tableProblem(described)
    const results = [
      problem
        ? fail('COMMANDS holds the three commands', problem, described.ok ? JSON.stringify(described.value, null, 2) : described.error)
        : pass('COMMANDS holds the three commands', JSON.stringify(described.value, null, 2))
    ]
    results.push(
      ...once(
        await Promise.all([
          commandCase(t, b, 'count runs from the table', ['count', 'week.txt', 'late.txt'], 'count', {}),
          commandCase(t, b, 'list runs, with its flag', ['list', 'week.txt', '--paper', 'cotton', 'late.txt'], 'list', { paper: 'cotton' }),
          commandCase(t, b, 'check runs', ['check', 'week.txt', 'late.txt'], 'check', {}),
          commandCase(t, b, 'count runs with --by', ['--by', 'paper', 'count', 'late.txt', 'week.txt'], 'count', { by: 'paper' }).then(async (r) => {
            // The files go in the order typed: late.txt first.
            if (r.passed) return r
            const want = await expected(t, 'count', { 'late.txt': LATE, 'week.txt': WEEK }, { by: 'paper' })
            const again = await run(b, ['--by', 'paper', 'count', 'late.txt', 'week.txt'], { files: FILES })
            return isDeepStrictEqual(resultLines(again, want.notes), want.results.map((x) => x.text)) ? pass(r.name, report(again)) : r
          })
        ])
      )
    )
    results.push(...(await Promise.all(['frobnicate', 'constructor', 'toString'].map((w) => unknownCase(b, w)))))
    return results
  },

  async help(t) {
    const b = await box(t)
    const [tool, stamp, sort] = await Promise.all([
      call(b, 'src/commands.js', 'toolHelp', [OWN_COMMANDS, OWN_FLAGS]),
      call(b, 'src/commands.js', 'commandHelp', ['stamp', OWN_COMMANDS, OWN_FLAGS]),
      call(b, 'src/commands.js', 'commandHelp', ['sort', OWN_COMMANDS, OWN_FLAGS])
    ])
    const stop = blocker('Your help is written', [tool, stamp, sort], 'toolHelp() or commandHelp()')
    if (stop) return [stop]
    const direct = (name, reply, wants, what) => {
      const output = `${what}, with the check's own table of a stamp and a sort command, gave:\n${reply.ok ? reply.value : `threw ${reply.error}`}`
      if (!reply.ok) return fail(name, reply.missing ? `src/commands.js should export ${what.split('(')[0]}.` : `${what.split('(')[0]} threw here.`, output)
      const problem = helpProblems(reply.value, wants)
      return problem ? fail(name, problem, output) : pass(name, output)
    }
    const results = [
      direct('The tool help, from the table it is given', tool, toolWants(OWN_COMMANDS, OWN_FLAGS), 'toolHelp(commands, flags)'),
      direct('The help of a command, from the table', stamp, commandWants('stamp', OWN_COMMANDS, OWN_FLAGS), "commandHelp('stamp', commands, flags)"),
      direct('The help of a command with one flag', sort, commandWants('sort', OWN_COMMANDS, OWN_FLAGS), "commandHelp('sort', commands, flags)")
    ]

    // The tool itself: its help must be what its own functions write from its own table.
    const described = await describeCommands(b)
    const flags = await call(b, 'src/flags.js', '@FLAGS', [])
    if (tableProblem(described) || !described.ok) {
      results.push(fail('The tool shows its help', 'This part needs task 1 first: COMMANDS does not hold the three commands yet.', described.ok ? JSON.stringify(described.value) : described.error))
    } else {
      const [mine, listHelp] = await Promise.all([
        call(b, 'src/commands.js', 'toolHelp', [described.value, flags.value]),
        call(b, 'src/commands.js', 'commandHelp', ['list', described.value, flags.value])
      ])
      const [long, short, none, list] = await Promise.all([run(b, ['--help']), run(b, ['-h']), run(b, []), run(b, ['list', '--help', 'week.txt'], { files: FILES })])
      const same = (r, text) => r.stdout.trim() === String(text).trim() && r.stdout.trim() !== ''
      const toolOk = [long, short, none].every((r) => same(r, mine.value))
      results.push(
        toolOk
          ? pass('--help, -h and no command show the tool help', reports(long, short, none))
          : fail(
              '--help, -h and no command show the tool help',
              'Each of these should print on standard output what toolHelp gives for COMMANDS and FLAGS, and nothing else.',
              reports(long, short, none)
            ),
        same(list, listHelp.value)
          ? pass('list --help shows the help of list', report(list))
          : fail('list --help shows the help of list', 'A command with --help should print on standard output what commandHelp gives for it, and not run.', report(list))
      )
    }

    // The version comes from package.json, whichever folder the tool runs in.
    const pkgPath = join(b.dir, 'package.json')
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    const given = pkg.version
    await writeFile(pkgPath, JSON.stringify({ ...pkg, version: '4.12.0' }, null, 2))
    const [v1, v2] = await Promise.all([run(b, ['--version']), run(b, ['list', '--version', 'week.txt'], { files: FILES })])
    const output = `package.json says version 4.12.0 for this run.\n${reports(v1, v2)}`
    const both = `${v1.stdout}${v1.stderr}${v2.stdout}${v2.stderr}`
    let message
    if ([v1, v2].every((r) => r.stdout.trim() === '4.12.0')) message = undefined
    else if (both.includes(given)) message = 'The version is typed into the code. Read it from package.json, so it changes when package.json does.'
    else if (/ENOENT/.test(both)) message = 'orders looked for package.json in the folder it was run from. Check runs it from another folder, as a person might: read the package.json that sits next to orders.js.'
    else message = '--version should print the version from package.json, alone on its line, on standard output, and nothing else.'
    results.push(message ? fail('--version prints the version', message, output) : pass('--version prints the version', output))
    return results
  },

  async nearest(t) {
    const b = await box(t)
    const NAMES = ['stamp', 'sort', 'split', 'merge']
    const cases = [
      ['stmp', NAMES, 'stamp', 'A letter is missing from the word.'],
      ['xort', NAMES, 'sort', 'The word differs from a name in its first letter only.'],
      ['srot', NAMES, 'sort', 'Two letters of a name changed places: two replacements.'],
      ['mergee', NAMES, 'merge', 'The word has one letter more than the name, so a change can add or remove a letter, not only replace one.'],
      ['spit', NAMES, 'split', 'The word has one letter less than the name.'],
      ['ca', ['cat', 'car'], 'cat', 'Two names are equally near: the one that comes first in names wins.'],
      ['ca', ['car', 'cat'], 'car', 'Two names are equally near: the one that comes first in names wins.'],
      ['spare', NAMES, undefined, 'Even the nearest name needs three changes here, more than two, so there is no name to offer.'],
      ['print', NAMES, undefined, 'No name is near this word at all, so there is no name to offer.'],
      ['sort', [], undefined, 'With no names at all, there is nothing to offer.']
    ]
    const replies = await Promise.all(cases.map(([word, names]) => call(b, 'src/commands.js', 'nearest', [word, names])))
    const stop = blocker('nearest is written', replies, 'nearest()')
    if (stop) return [stop]
    const shown = (v) => (v === undefined ? 'undefined' : JSON.stringify(v))
    const results = once(
      cases.map(([word, names, want, why], i) => {
        const r = replies[i]
        const name = `nearest(${shown(word)}, ${shown(names)})`
        const output = `${name} ${r.ok ? `gave ${shown(r.value)}` : `threw ${r.error}`}`
        if (r.ok && r.value === want) return pass(name, output)
        if (!r.ok) return fail(name, r.missing ? 'src/commands.js should export nearest.' : 'nearest threw here.', output)
        return fail(name, why, output)
      })
    )
    const tool = await Promise.all([
      run(b, ['cuont', 'week.txt'], { files: FILES }),
      run(b, ['lsit']),
      run(b, ['print', '--paper', 'linen'])
    ])
    const wants = [
      'orders: unknown command cuont (did you mean count?)',
      'orders: unknown command lsit (did you mean list?)',
      'orders: unknown command print (orders --help lists the commands)'
    ]
    const ok = tool.every((r, i) => [...lines(r.stdout), ...lines(r.stderr)].includes(wants[i]))
    const table = tableProblem(await describeCommands(b))
    results.push(
      !ok && table
        ? fail('The tool offers the nearest command', 'This part needs task 1 first: COMMANDS does not hold the three commands yet, so there is no command to offer.', reports(...tool))
        : ok
        ? pass('The tool offers the nearest command', reports(...tool))
        : fail(
            'The tool offers the nearest command',
            'An unknown command should end in the message the task gives: with the nearest command when there is one near enough, and with where to find the commands when there is none.',
            reports(...tool)
          )
    )
    return results
  }
}
