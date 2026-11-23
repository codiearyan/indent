import { attempt, codeOnly, fail, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'HutDesk.java'
const got = (r) => r.values.got?.value

/** A catch in the task's lines that catches every kind of exception, or null. */
const broad = (section) => {
  const m = /\bcatch\s*\(\s*(?:final\s+)?(?:[\w.]+\s*\|\s*)*(?:java\.lang\.)?(Exception|Throwable|RuntimeException)(?:\s*\|\s*[\w.]+)*\s+(\w+)\s*\)/.exec(codeOnly(section))
  return m ? `${m[1]} ${m[2]}` : null
}

/** A detail, first, for a catch of every exception where the task names one kind. */
const onlyNamed = (method, what, section, two = false) => {
  const b = broad(section)
  return b
    ? [
        fail(
          `${method} catches only what the task names`,
          `${method} has catch (${b}), which catches every exception of that kind: a mistake in the calling code, or in your own lines, would be hidden too. The task asks to catch only ${two ? `the exceptions ${what} bring: name each of them` : `the exception ${what} brings: name that one`}.`
        )
      ]
    : []
}

/** Mistakes every task of this issue shares: a null hidden, a catch for everything. */
const shared = (method, what, section, parses = false) => [
  {
    when: (r, x) => r.case.throws === 'NullPointerException' && !x && broad(section),
    hint: `${method} caught the NullPointerException that a null brings, so the mistake in the calling code was hidden. catch (${broad(section)}) catches every exception of that kind, this one too: name only the exception ${what} brings.`
  },
  {
    // parseInt(null) throws a NumberFormatException, so a null handed straight to it is caught too.
    when: (r, x) => {
      const code = codeOnly(section)
      return parses && r.case.throws === 'NullPointerException' && !x && /\bparseInt\s*\(/.test(code) && !/\.(?:trim|strip)\s*\(|\bNullPointerException\b/.test(code)
    },
    hint: `${method} carried on with a null, so the mistake in the calling code was hidden. Handed null, Integer.parseInt throws a NumberFormatException, not a NullPointerException, so your catch took it for a typing slip. Leave out the spaces first, before the try: on a null, that line throws the NullPointerException that should reach the caller.`
  },
  {
    when: (r, x) => r.case.throws === 'NullPointerException' && !x,
    hint: `${method} carried on with a null, so the mistake in the calling code was hidden. The task says it must reach the caller: catch only the exception ${what} brings, and leave anything else alone.`
  }
]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  tasks: {
    seats: {
      task: 1,
      cases: [
        attempt({ name: 'Reads a whole number', call: 'Counts.seats("14")', type: 'int', expected: { got: 14 }, hint: 'seats should give back the whole number in the text it is handed.' }),
        attempt({ name: 'Leaves out the spaces around it', call: 'Counts.seats("  6 ")', type: 'int', expected: { got: 6 }, hint: 'seats should leave out any spaces around the number before reading it.' }),
        attempt({ name: 'Gives back 0 for a word', call: 'Counts.seats("seven")', type: 'int', expected: { got: 0 }, hint: 'When the text is not a whole number, seats should give back 0.', bad: true }),
        attempt({ name: 'Gives back 0 for a number with a point', call: 'Counts.seats("4.5")', type: 'int', expected: { got: 0 }, hint: 'When the text is not a whole number, seats should give back 0.', bad: true }),
        attempt({ name: 'Gives back 0 for nothing typed', call: 'Counts.seats("")', type: 'int', expected: { got: 0 }, hint: 'When the text is not a whole number, seats should give back 0.', bad: true }),
        attempt({ name: 'Lets a null reach the caller', call: 'Counts.seats(null)', type: 'int', throws: 'NullPointerException', hint: 'A null is a mistake in the calling code, and its exception should reach the caller.' })
      ],
      judge: (runs, ctx) => {
        const details = outcomeCases({
          file: FILE,
          typed: 'seats gives back the same number whatever text Check hands it. It should read the number in the text it is handed.',
          mistakes: [
            ...shared('seats', 'a text that is not a whole number', ctx.section, true),
            {
              when: (r) => r.case.bad && r.lines.length > 0,
              hint: 'seats prints something when the text is not a number. The task says it prints nothing: it gives back 0 and the caller decides what to show.'
            },
            {
              when: (r) => r.case.bad && got(r) !== '0' && !r.lines.length,
              hint: 'For a text that is not a whole number, seats gives back something other than 0. Look at what the catch gives back.'
            }
          ]
        })(runs, ctx)
        const printed = runs.find((r) => r.lines.length)
        return [
          ...onlyNamed('seats', 'a text that is not a whole number', ctx.section),
          ...details,
          ...(printed && details.every((d) => d.passed)
            ? [fail('Prints nothing', 'seats gives back the right numbers, and also prints something. The task says it prints nothing: the caller decides what to show.', `Check ran:\n  ${printed.call}\nIt printed:\n${printed.lines.map((l) => `  ${l}`).join('\n')}`)]
            : [])
        ]
      }
    },

    summary: {
      task: 2,
      cases: [
        attempt({ name: 'Adds past an entry it cannot read', call: 'Day.summary(new String[] { "3", "four", "4" })', type: 'String', expected: { got: '7 seats, 1 not read' }, hint: 'summary should add up every whole number and count each entry it could not read.', past: true }),
        attempt({ name: 'Goes on after a first entry it cannot read', call: 'Day.summary(new String[] { "seven", " 2 ", "x", "11" })', type: 'String', expected: { got: '13 seats, 2 not read' }, hint: 'summary should add up every whole number and count each entry it could not read.', past: true }),
        attempt({ name: 'Every entry read', call: 'Day.summary(new String[] { "5", "6" })', type: 'String', expected: { got: '11 seats, 0 not read' }, hint: 'When every entry is a whole number, summary should add them all and say 0 not read.' }),
        attempt({ name: 'No entries at all', call: 'Day.summary(new String[] { })', type: 'String', expected: { got: '0 seats, 0 not read' }, hint: 'With no entries, summary should say 0 seats and 0 not read.' }),
        attempt({ name: 'Lets a null entry reach the caller', call: 'Day.summary(new String[] { "5", null, "2" })', type: 'String', throws: 'NullPointerException', hint: 'A null entry is a mistake in the calling code, and its exception should reach the caller.' })
      ],
      judge: (runs, ctx) => [
        ...onlyNamed('summary', 'an entry that is not a whole number', ctx.section),
        ...outcomeCases({
          file: FILE,
          mistakes: [
            ...shared('summary', 'an entry that is not a whole number', ctx.section, true),
            {
              when: (r) => r.case.past && /^\d+ seats, 1 not read$/.test(got(r) ?? '') && got(r) !== r.case.expected.got,
              hint: 'summary stopped adding at the first entry it could not read, so the entries after it were never added. The try is around more than the line that can fail: put it inside the loop, around the reading of one entry.'
            }
          ]
        })(runs, ctx)
      ]
    },

    holder: {
      task: 3,
      cases: [
        attempt({ name: 'Gives back the name in a seat', setup: ['String[] seats = { "Iona", "Lachlan", "Catriona", "Seumas" };'], call: 'Seats.holder(seats, "3")', type: 'String', expected: { got: 'Catriona' }, hint: 'holder should give back the name in that seat: seat 1 is the first name.' }),
        attempt({ name: 'Seat 1 is the first', setup: ['String[] seats = { "Ruaridh", "Iona" };'], call: 'Seats.holder(seats, "1")', type: 'String', expected: { got: 'Ruaridh' }, hint: 'holder should give back the name in that seat: seat 1 is the first name.' }),
        attempt({ name: 'Not a seat number', setup: ['String[] seats = { "Iona", "Lachlan" };'], call: 'Seats.holder(seats, "two")', type: 'String', expected: { got: 'Not a seat number: two' }, hint: 'For a seat number that is not a whole number, holder should give back Not a seat number: and what was typed.' }),
        attempt({ name: 'A seat past the last', setup: ['String[] seats = { "Iona", "Lachlan", "Catriona" };'], call: 'Seats.holder(seats, "7")', type: 'String', expected: { got: 'No such seat: Index 6 out of bounds for length 3' }, hint: 'For a seat the boat does not have, holder should give back No such seat: and the message of the exception Java threw, exactly as the exception holds it.', none: true }),
        attempt({ name: 'Seat 0', setup: ['String[] seats = { "Seumas", "Ruaridh" };'], call: 'Seats.holder(seats, "0")', type: 'String', expected: { got: 'No such seat: Index -1 out of bounds for length 2' }, hint: 'For a seat the boat does not have, holder should give back No such seat: and the message of the exception Java threw, exactly as the exception holds it.', none: true }),
        attempt({ name: 'Lets a null seats reach the caller', call: 'Seats.holder(null, "2")', type: 'String', throws: 'NullPointerException', hint: 'A null seats is a mistake in the calling code, and its exception should reach the caller.' })
      ],
      judge: (runs, ctx) => [
        ...onlyNamed('holder', 'a seat number that is not a whole number, or a seat the boat does not have,', ctx.section, true),
        ...outcomeCases({
          file: FILE,
          mistakes: [
            ...shared('holder', 'a seat number that is not a whole number, or a seat the boat does not have,', ctx.section),
            {
              when: (r) => r.case.none && /^No such seat: /.test(got(r) ?? '') && got(r) !== r.case.expected.got,
              hint: 'holder says No such seat:, and what follows is not the message of the exception Java threw. A caught exception holds its message: the lesson shows how to read it.'
            }
          ]
        })(runs, ctx)
      ]
    }
  }
})
