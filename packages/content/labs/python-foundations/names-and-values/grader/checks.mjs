import {
  aKind,
  cases,
  closeName,
  fail,
  lineCases,
  pass,
  problem,
  runFile,
  show
} from '../../grading.mjs'

const FILE = 'kit_store.py'
const TEAM = 'Brackenridge Mountain Rescue'

const notNumber = (name, hint) => (v) =>
  v?.type === 'str'
    ? `${name} holds text, not a number. A name inside quotes is only text; a variable is used by writing its name without quotes.`
    : v && v.type !== 'int'
      ? `${name} holds ${aKind(v.type)}, not a whole number of ropes.`
      : hint

const store = (ropes_in_store, ropes_taken_out) => ({ ropes_in_store, ropes_taken_out })

export const checks = {
  async team(t) {
    const details = await cases(t, {
      file: FILE,
      task: 1,
      name: 'team_name',
      list: [
        {
          name: 'team_name holds the team name',
          expected: { type: 'str', value: TEAM },
          hint: (v) =>
            v?.type === 'str'
              ? 'team_name holds other text. Compare it with the task letter by letter: capitals and spaces count.'
              : `team_name holds ${aKind(v?.type)}, not text. Text goes inside quotes.`
        }
      ]
    })
    if (!details.every((d) => d.passed)) return details
    const printed = await lineCases(t, {
      file: FILE,
      task: 1,
      list: [{ name: 'Prints the team name', want: TEAM }],
      missing:
        'team_name is right, but the lines under # Task 1 do not print it yet. Print it on the next line.'
    })
    return [...details, ...printed]
  },

  async count(t) {
    const details = await cases(t, {
      file: FILE,
      task: 2,
      name: 'ropes_left',
      typed:
        'Check changed the ropes in the store and ropes_left stayed the same. Build it on the name ropes_in_store, not on a number you typed.',
      list: [
        {
          name: 'Starts with the ropes in the store',
          given: store(12, 3),
          expected: { type: 'int', value: 12 },
          hint: notNumber(
            'ropes_left',
            'ropes_left should start at the number of ropes in the store.'
          )
        },
        {
          name: 'Follows a different count',
          given: store(5, 2),
          expected: { type: 'int', value: 5 },
          hint: notNumber(
            'ropes_left',
            'Check changed the count and ropes_left did not start at it.'
          )
        }
      ]
    })
    if (!details.every((d) => d.passed)) return details
    const printed = await lineCases(t, {
      file: FILE,
      task: 2,
      label: 'Ropes in store:',
      list: [
        {
          name: 'Prints the ropes in the store',
          given: store(12, 3),
          want: 'Ropes in store: 12',
          value: 12
        },
        { name: 'Prints another count', given: store(5, 2), want: 'Ropes in store: 5', value: 5 }
      ],
      wrongValue:
        'The line starts right, but the number after it is not what ropes_left holds. Print the name ropes_left, not a number you typed and not the name in quotes.',
      missing:
        'The lines under # Task 2 do not print the count as the task shows it yet. print can take the text and the name together, with a comma between them.'
    })
    return [...details, ...printed]
  },

  async taken(t) {
    // Task 3 starts from ropes_left as Task 2 should make it, so it is judged by itself.
    const list = [
      ['Takes the ropes that went out', store(12, 5), 7],
      ['Works when every rope went out', store(6, 6), 0],
      ['Works for another night', store(20, 1), 19]
    ]
    const details = await cases(t, {
      file: FILE,
      task: 3,
      name: 'ropes_left',
      typed:
        'Check changed the numbers at the top and ropes_left stayed the same. Build it on the names, not on a number you typed.',
      mistakes: [
        {
          value: (g) => g.ropes_in_store - 4,
          hint: 'ropes_left takes the same number away every night, whatever went out. Use ropes_taken_out, not a number you typed.'
        },
        {
          value: (g) => g.ropes_in_store,
          hint: 'ropes_left did not change under # Task 3. Give it a new value there: what is left once the ropes that went out are taken away. One = gives a name a new value; == only compares two values.'
        }
      ],
      list: list.map(([name, given, value]) => ({
        name,
        given,
        inject: { ropes_left: given.ropes_in_store },
        expected: { type: 'int', value },
        hint: notNumber(
          'ropes_left',
          'ropes_left should be what was in the store with the ropes that went out taken away.'
        )
      }))
    })
    if (!details.every((d) => d.passed)) return details
    const printed = await lineCases(t, {
      file: FILE,
      task: 3,
      label: 'Ropes after the callout:',
      list: list.slice(0, 2).map(([name, given, value]) => ({
        name: `Prints it: ${name.toLowerCase()}`,
        given,
        inject: { ropes_left: given.ropes_in_store },
        want: `Ropes after the callout: ${value}`,
        value
      })),
      wrongValue:
        'The line starts right, but the number after it is not what ropes_left holds now. Print ropes_left after the line that gives it its new value.',
      missing: 'The lines under # Task 3 do not print the new count as the task shows it yet.'
    })
    return [...details, ...printed]
  },

  async names(t) {
    const r = await runFile(t, FILE, { upto: 4, names: ['leader_name', 'kit_officer_name'] })
    const p = problem(r, FILE, 4)
    if (p) return [p]
    const part = r.parts.get(4)
    const holds = (name, text) =>
      part.values[name]?.type === 'str' && part.values[name].value === text
    const named = (name, was, text) => {
      if (holds(name, text))
        return pass(`${name} holds the value ${was} had`, `${name} is ${show(part.values[name])}`)
      const close = closeName(name, part.names)
      return fail(
        `${name} holds the value ${was} had`,
        part.values[name]
          ? `${name} should keep the value ${was} had. Rename the variable, not the value.`
          : close
            ? `Check cannot find ${name}, but there is a variable called ${close}. The new name must match the task letter for letter, underscores included.`
            : `Check cannot find a variable called ${name}. Rename ${was}, keeping its value.`,
        `${name} is ${show(part.values[name])}`
      )
    }
    const gone = !('x' in part.names) && !('y' in part.names)
    return [
      named('leader_name', 'x', 'Rhona'),
      named('kit_officer_name', 'y', 'Dougie'),
      gone
        ? pass('x and y are gone')
        : fail(
            'x and y are gone',
            'x or y is still in the file. Rename them rather than making new variables next to them.'
          )
    ]
  }
}
