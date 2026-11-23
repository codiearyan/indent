import { isDeepStrictEqual } from 'node:util'
import { blocker, box, call, fail, pass, report, run, said, usesUtil } from '../../checks-helpers.mjs'

// The check's own table of flags, for a tool of its own: never the shop's.
const TABLE = {
  quiet: { short: 'q' },
  all: {},
  width: { value: 'columns', short: 'w' },
  find: { value: 'text' },
  note: { value: 'text' }
}
const TABLE_SHOWN = 'the table quiet (-q) and all as switches, width (-w), find and note taking a value'
const shown = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))
const callShown = (args) => `readArgs(${JSON.stringify(args)}, ${TABLE_SHOWN})`

/** What readArgs gave, as the learner would print it, with undefined fields named. */
function gave(value) {
  if (value === null || typeof value !== 'object') return shown(value)
  const { command, values, flags, ...rest } = value
  const extra = Object.keys(rest).length ? `, and also ${JSON.stringify(rest)}` : ''
  return `{ command: ${shown(command)}, values: ${shown(values)}, flags: ${shown(flags)}${extra} }`
}

const UTIL = (found) =>
  fail(
    'Your own reader',
    `${found.file} uses ${found.what}. In this issue you write the reader of the arguments yourself, from plain JavaScript, so Node's own reader in node:util is not used here. The lesson says where it is for later.`,
    `${found.file}: ${found.what}`
  )

/** Calls readArgs once per case and judges each result with `why`, which names the cause. */
async function directCases(b, cases) {
  const replies = await Promise.all(cases.map((c) => call(b, 'src/args.js', 'readArgs', [c.args, TABLE])))
  return { replies, results: cases.map((c, i) => judge(c, replies[i])) }
}

function judge(c, reply) {
  const name = c.name
  if (!reply.ok) {
    if (reply.missing) return fail(name, 'src/args.js has no export named readArgs. Keep the name and the export from the starter.', reply.error)
    return fail(name, `readArgs threw here, but these words hold nothing wrong.${c.threw ? ` ${c.threw}` : ''}`, `${callShown(c.args)}\nthrew ${reply.error}`)
  }
  const got = reply.value
  const output = `${callShown(c.args)}\ngave ${gave(got)}`
  const want = { command: c.want.command, values: c.want.values, flags: c.want.flags }
  const normal = got && typeof got === 'object' ? { command: got.command, values: got.values, flags: got.flags } : got
  if (isDeepStrictEqual(normal, want)) return pass(name, output)
  return fail(name, why(c, got), output)
}

// The cause, from the clues in what readArgs gave. It names what to look at, never the result.
function why(c, got) {
  if (got === null || typeof got !== 'object' || !Array.isArray(got.values) || got.flags === null || typeof got.flags !== 'object') {
    return 'readArgs should return an object with three parts: command, values (an array) and flags (an object).'
  }
  const flagWords = c.args.filter((w) => w.startsWith('-') && w !== '-')
  if (typeof got.command === 'string' && got.command.startsWith('-') && got.command !== '-' && !c.want.values.includes(got.command) && got.command !== c.want.command) {
    return 'A flag became the command. The command is the first plain word, wherever the flags stand: before it, between the values or after them.'
  }
  if (c.want.command === undefined && got.command !== undefined) {
    return 'With no plain word at all, command should be undefined: not an empty text, not null.'
  }
  const flagValues = Object.values(c.want.flags)
  const early = got.values.find((w) => flagWords.includes(w) && !c.want.values.includes(w) && !flagValues.includes(w))
  if (early) return `${early} ended up among the values. A word that starts with - is a flag, unless it is - alone.`
  for (const [flag, value] of Object.entries(c.want.flags)) {
    const long = got.flags[flag]
    const short = Object.entries(TABLE).find(([n]) => n === flag)?.[1].short
    if (long === undefined && short && got.flags[short] !== undefined) {
      return `A short flag was kept under its letter. -${short} is the short form of --${flag}, so it goes in flags under the long name, as if --${flag} had been typed.`
    }
    if (typeof long === 'number' || (typeof value === 'string' && long === Number(value))) {
      return 'A value came out as a number. A value stays the text that was typed: whoever uses it turns it into a number.'
    }
    if (value === true && typeof long === 'string') {
      return `--${flag} is a switch, yet it took the next word as its value. Only a flag whose entry in the table has a value takes one; a switch is just true, and the word after it is a word of its own.`
    }
    if (value === true && long !== true) return `--${flag} was given, so flags should hold it as true, under its long name.`
    if (typeof value === 'string' && long === undefined) {
      return c.hints?.lost ?? `--${flag} was given with a value, but flags does not hold it.`
    }
    if (typeof value === 'string' && long !== value) return c.hints?.value ?? `The value of --${flag} is not the word that was typed for it.`
  }
  const extra = Object.keys(got.flags).find((k) => !(k in c.want.flags))
  if (extra) return c.hints?.extra ?? `flags holds ${extra}, which was not given as a flag. Only the flags typed go in.`
  const stray = got.values.find((w) => flagWords.includes(w) && !c.want.values.includes(w))
  if (stray) return `${stray} ended up among the values. A word that starts with - is a flag, unless it is - alone.`
  if (c.want.values.includes('-') && !got.values.includes('-')) {
    return 'A lone - is a plain word, not a flag: by custom it names standard input, so it belongs with the values.'
  }
  if (got.command !== c.want.command && got.values.includes(c.want.command)) {
    return 'The command should be the first plain word, and values the plain words after it.'
  }
  if (got.values.includes(got.command) && got.command !== undefined && !c.want.values.includes(got.command)) {
    return 'The command is in values too. values holds only the plain words after the command.'
  }
  return c.hints?.other ?? 'Compare what readArgs gave with what the task says, word by word: which word is the command, which are values, which are flags.'
}

/** Earlier tasks first: plain words, then switches. */
async function needsWords(b) {
  const r = await call(b, 'src/args.js', 'readArgs', [['stamp', 'a.txt', '--quiet', 'b.txt'], TABLE])
  const ok = r.ok && isDeepStrictEqual(
    { command: r.value?.command, values: r.value?.values, flags: r.value?.flags },
    { command: 'stamp', values: ['a.txt', 'b.txt'], flags: { quiet: true } }
  )
  if (ok || !r.ok) return { r, early: undefined }
  return {
    r,
    early: fail(
      'Task 1 first',
      'This task needs task 1 first: plain words and switches are not read right yet.',
      `${callShown(['stamp', 'a.txt', '--quiet', 'b.txt'])}\ngave ${gave(r.value)}`
    )
  }
}

/** One run of the tool itself, which prints what readArgs made of its words. */
async function toolCase(b, name, args, want) {
  const r = await run(b, args)
  let printed
  try {
    printed = JSON.parse(r.stdout)
  } catch {}
  if (printed && isDeepStrictEqual({ command: printed.command, values: printed.values, flags: printed.flags }, want)) {
    return pass(name, report(r))
  }
  return fail(name, 'Typed on the command line, these words did not come out as they should. Look at what orders.js printed for them.', report(r))
}

async function start(t) {
  const b = await box(t, { noUtil: true })
  const found = await usesUtil(b)
  return { b, found }
}

export const checks = {
  async words(t) {
    const { b, found } = await start(t)
    if (found) return [UTIL(found)]
    const cases = [
      { name: 'A command and its values', args: ['stamp', 'a.txt', 'b.txt'], want: { command: 'stamp', values: ['a.txt', 'b.txt'], flags: {} } },
      { name: 'Switches before, between and after', args: ['--quiet', 'stamp', 'a.txt', '--all', 'b.txt'], want: { command: 'stamp', values: ['a.txt', 'b.txt'], flags: { quiet: true, all: true } } },
      { name: 'A short switch, and a lone -', args: ['stamp', '-q', '-', 'b.txt'], want: { command: 'stamp', values: ['-', 'b.txt'], flags: { quiet: true } }, threw: 'A lone - is a plain word, not a flag.' },
      { name: 'No words at all', args: [], want: { command: undefined, values: [], flags: {} } }
    ]
    const { replies, results } = await directCases(b, cases)
    const tool = await toolCase(b, 'The tool reads its own words', ['-h', 'list', 'press-1.txt', 'press-2.txt', '--version'], {
      command: 'list',
      values: ['press-1.txt', 'press-2.txt'],
      flags: { help: true, version: true }
    })
    const stop = blocker('readArgs is written', replies, 'readArgs()')
    return stop ? [stop] : [...results, tool]
  },

  async values(t) {
    const { b, found } = await start(t)
    if (found) return [UTIL(found)]
    const { r: probe, early } = await needsWords(b)
    const stop0 = blocker('readArgs is written', [probe], 'readArgs()')
    if (stop0) return [stop0]
    if (early) return [early]
    const cases = [
      { name: '--name value', args: ['stamp', '--width', '80', 'a.txt'], want: { command: 'stamp', values: ['a.txt'], flags: { width: '80' } }, hints: { extra: 'flags holds a name that was not given. The word after --width is its value, not a flag or a plain word of its own.' } },
      {
        name: '--name=value, split at the first =',
        args: ['--find=ink=black', 'stamp'],
        want: { command: 'stamp', values: [], flags: { find: 'ink=black' } },
        hints: {
          value: 'The value of --find=... is not everything after the first =. Only the first = separates the name from the value; any = after it belongs to the value.',
          lost: 'The flag was written as --find=..., with its value in the same word. Split that word at its first =: the name before it, the value after it.',
          extra: 'flags holds a name that was not typed. In --find=..., only what comes before the first = is the name.'
        },
        threw: 'In --find=..., only what comes before the first = is the name of the flag.'
      },
      { name: 'A short flag with a value', args: ['stamp', '-w', '72', '-q'], want: { command: 'stamp', values: [], flags: { width: '72', quiet: true } } },
      {
        name: 'A value that starts with -',
        args: ['stamp', '--find', '-x', 'a.txt', '--note', '--quiet'],
        want: { command: 'stamp', values: ['a.txt'], flags: { find: '-x', note: '--quiet' } },
        hints: {
          lost: 'A flag that takes a value takes the next word, whatever it looks like: a word after it that starts with - is still its value, not a flag.',
          value: 'A flag that takes a value takes the next word, whatever it looks like: a word after it that starts with - is still its value, not a flag.',
          extra: 'A word that came right after a flag that takes a value was read as a flag of its own. That word is the value, whatever it looks like.'
        },
        threw: 'A flag that takes a value takes the next word, whatever it looks like, even one that starts with -.'
      },
      {
        name: '-- ends the flags',
        args: ['stamp', '--quiet', '--', '--width', '-q', '-'],
        want: { command: 'stamp', values: ['--width', '-q', '-'], flags: { quiet: true } },
        hints: {
          other: 'After --, every word is a plain value, even one that looks like a flag, and -- itself is not one of the values.',
          extra: 'A word after -- was read as a flag. After --, every word is a plain value, even one that looks like a flag.'
        },
        threw: 'After --, every word is a plain value, even one that looks like a flag.'
      }
    ]
    const { replies, results } = await directCases(b, cases)
    const tool = await toolCase(b, 'The tool reads its own words', ['list', '--paper=linen', '-n', '3', 'press-1.txt'], {
      command: 'list',
      values: ['press-1.txt'],
      flags: { paper: 'linen', limit: '3' }
    })
    const stop = blocker('readArgs is written', replies, 'readArgs()')
    return stop ? [stop] : [...results, tool]
  },

  async wrong(t) {
    const { b, found } = await start(t)
    if (found) return [UTIL(found)]
    const { r: probe, early } = await needsWords(b)
    const stop0 = blocker('readArgs is written', [probe], 'readArgs()')
    if (stop0) return [stop0]
    if (early) return [early]
    const cases = [
      { name: 'An unknown flag', args: ['stamp', '--colour', 'a.txt'], message: 'unknown flag --colour' },
      { name: 'An unknown flag with a value', args: ['--colour=red', 'stamp'], message: 'unknown flag --colour', hint: 'The flag here was typed with =red after it. The message names the flag as typed, without the value.' },
      { name: 'An unknown short flag', args: ['stamp', '-x'], message: 'unknown flag -x' },
      {
        name: 'Names every object has are unknown too',
        args: ['stamp', '--constructor'],
        message: 'unknown flag --constructor',
        notThrown: 'constructor is not in the table, yet it was taken as a flag. Every object answers to names like constructor and toString, so ask whether the table has the name as its own.'
      },
      { name: 'A value that is missing', args: ['stamp', 'a.txt', '--width'], message: '--width needs a value' },
      { name: 'A short flag missing its value', args: ['stamp', '-w'], message: '-w needs a value', hint: 'The flag was typed as -w. The message names the flag as it was typed.' },
      { name: 'A switch given a value', args: ['stamp', '--quiet=yes'], message: '--quiet takes no value' }
    ]
    const replies = await Promise.all(cases.map((c) => call(b, 'src/args.js', 'readArgs', [c.args, TABLE])))
    const stop = blocker('readArgs is written', replies.filter((r) => !r.ok && /Not implemented|SyntaxError|RefusedImport/.test(r.error)), 'readArgs()')
    if (stop) return [stop]
    const results = cases.map((c, i) => {
      const r = replies[i]
      const output = `${callShown(c.args)}\n${r.ok ? `gave ${gave(r.value)}` : `threw ${r.error}`}`
      if (r.ok) {
        return fail(c.name, `readArgs gave a result here instead of throwing. When a flag is not in the table, or a value is missing, it should throw an Error that says so, so nothing runs on words the tool did not understand.${c.notThrown ? ` ${c.notThrown}` : ''}`, output)
      }
      const message = r.error.replace(/^\w*Error(?: \[\w+\])?: /, '')
      if (message === c.message) return pass(c.name, output)
      if (/TypeError|Cannot read/.test(r.error)) return fail(c.name, `readArgs threw an error of its own making here, not the plain message the task asks for.${c.hint ? ` ${c.hint}` : ''}`, output)
      return fail(c.name, `The message is not in the words the task gives for this mistake. ${c.hint ?? 'Compare it with them letter for letter: the flag goes in as it was typed.'}`, output)
    })
    const r = await run(b, ['count', '--colour', 'press-1.txt'])
    const tool = said(r, 'orders: unknown flag --colour')
      ? pass('The tool says what is wrong', report(r))
      : fail('The tool says what is wrong', 'Typed on the command line, an unknown flag did not end in the plain message the task asks for.', report(r))
    return [...results, tool]
  }
}

