import { attempt, codeOnly, fail, outcomeCases, refusal, tasks } from '../../grading.mjs'

const FILE = 'BookingDesk.java'
const value = (r, name) => r.values[name]?.value

/** Mistakes of a method that should throw: made and never thrown, printed, given back instead. */
const notThrown = (method) => [
  {
    when: (r, x, runs, { section }) => r.case.throws && !x && /\bnew\s+IllegalArgumentException\b/.test(codeOnly(section)) && !/\bthrow\s+new\s+IllegalArgumentException\b/.test(codeOnly(section)),
    hint: `${method} makes an IllegalArgumentException with new, and never throws it. Making an exception does nothing by itself: throw is the word that stops the method and hands it to the caller.`
  },
  {
    when: (r, x) => r.case.throws && !x && r.lines.length > 0,
    hint: `${method} prints a message where the task asks it to throw. A message on the screen lets the program carry on with a value that cannot be; a thrown exception stops it and tells the caller.`
  }
]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  tasks: {
    fares: {
      task: 1,
      cases: [
        attempt({ name: 'An adult pays the adult fare', call: 'Fares.fareFor(52)', type: 'int', expected: { got: 320 }, hint: 'fareFor should give back 320 for 16 and over.' }),
        attempt({ name: 'Under 16 pays the child fare', call: 'Fares.fareFor(15)', type: 'int', expected: { got: 160 }, hint: 'fareFor should give back 160 for an age under 16.' }),
        attempt({ name: '16 pays the adult fare', call: 'Fares.fareFor(16)', type: 'int', expected: { got: 320 }, hint: 'fareFor should give back 320 for 16 and over.' }),
        attempt({ name: 'A baby of 0 is not refused', call: 'Fares.fareFor(0)', type: 'int', expected: { got: 160 }, hint: '0 is an age a baby can have: only an age below 0 is refused.' }),
        attempt({ name: 'Refuses an age below 0, naming it', call: 'Fares.fareFor(-7)', type: 'int', throws: 'IllegalArgumentException', names: ['-7'], hint: 'An age below 0 should be refused with an IllegalArgumentException.', namesHint: 'fareFor throws the right exception, and its message should name the age it was handed, so whoever reads it knows what to change.' }),
        attempt({ name: 'Refuses -1, naming it', call: 'Fares.fareFor(-1)', type: 'int', throws: 'IllegalArgumentException', names: ['-1'], hint: 'An age below 0 should be refused with an IllegalArgumentException.', namesHint: 'fareFor throws the right exception, and its message should name the age it was handed, so whoever reads it knows what to change.' })
      ],
      judge: outcomeCases({
        file: FILE,
        mistakes: [
          ...notThrown('fareFor'),
          {
            when: (r, x) => r.case.throws && !x,
            hint: 'fareFor gives back a fare for an age that cannot be, so the mistake carries on as a price. The task asks it to refuse: throw an IllegalArgumentException.'
          }
        ]
      })
    },

    sailing: {
      task: 2,
      cases: [
        attempt({ name: 'Books places that are free', setup: ['Sailing s = new Sailing(10);'], call: 's.book(4)', type: 'boolean', after: { 's.free()': 's.free()' }, expected: { got: true, 's.free()': 6 }, hint: 'book should take the places and give back true while there are enough free.' }),
        attempt({ name: 'Books the very last places', setup: ['Sailing s = new Sailing(7);'], call: 's.book(7)', type: 'boolean', after: { 's.free()': 's.free()' }, expected: { got: true, 's.free()': 0 }, hint: 'Asking for exactly the places free should still book them.' }),
        attempt({ name: 'Too many places is a false, not a mistake', setup: ['Sailing s = new Sailing(10);', 's.book(3);'], call: 's.book(8)', type: 'boolean', after: { 's.free()': 's.free()' }, expected: { got: false, 's.free()': 7 }, hint: 'When too few places are free, book should give back false and change nothing.', full: true }),
        attempt({ name: 'Refuses 0 places, naming them', setup: ['Sailing s = new Sailing(10);'], call: 's.book(0)', type: 'boolean', after: { 's.free()': 's.free()' }, throws: 'IllegalArgumentException', names: ['0'], expected: { 's.free()': 10 }, hint: 'Fewer than 1 place should be refused with an IllegalArgumentException, and nothing changed.', namesHint: 'book throws the right exception, and its message should name the places it was handed.' }),
        attempt({ name: 'Refuses -3 places and changes nothing', setup: ['Sailing s = new Sailing(10);', 's.book(2);'], call: 's.book(-3)', type: 'boolean', after: { 's.free()': 's.free()' }, throws: 'IllegalArgumentException', names: ['-3'], expected: { 's.free()': 8 }, hint: 'Fewer than 1 place should be refused with an IllegalArgumentException, and nothing changed.', namesHint: 'book throws the right exception, and its message should name the places it was handed.', changed: true }),
        attempt({ name: 'Each sailing keeps its own seats', setup: ['Sailing a = new Sailing(9);', 'Sailing b = new Sailing(4);'], call: 'b.book(1)', type: 'boolean', after: { 'a.free()': 'a.free()', 'b.free()': 'b.free()' }, expected: { got: true, 'a.free()': 9, 'b.free()': 3 }, hint: 'Each sailing should count only its own seats.' })
      ],
      judge: outcomeCases({
        file: FILE,
        mistakes: [
          {
            when: (r) => value(r, 'b.free()') !== undefined && value(r, 'a.free()') === value(r, 'b.free()'),
            hint: 'Check made two sailings, and the first now has the second one\'s seats. The seats free are shared by every sailing: a field with static in front belongs to the class. Each needs its own.'
          },
          {
            when: (r, x) => r.case.throws && x?.name === r.case.throws && value(r, 's.free()') !== String(r.case.expected['s.free()']),
            hint: 'book threw the right exception, but only after it had changed the seats free, so a refused booking still took places. Refuse first, before anything changes.'
          },
          {
            when: (r, x) => r.case.full && x,
            hint: 'book throws when too many places are asked for. That is not a mistake in the calling code, only a full boat: the task asks for false, so the caller can offer another crossing.'
          },
          ...notThrown('book'),
          {
            when: (r, x) => r.case.throws && !x && value(r, 'got') === 'false',
            hint: 'book gives back false for fewer than 1 place. false means the boat is full; asking for 0 or fewer places is a mistake in the calling code, and the task asks book to throw.'
          }
        ]
      })
    },

    crossings: {
      task: 3,
      cases: [
        attempt({ name: 'board gives back the boarding line', call: 'Crossings.board(11, false)', type: 'String', expected: { got: 'Boarding the 11:00 crossing' }, hint: 'In calm weather board should give back Boarding the, the hour with :00, and crossing.' }),
        attempt({ name: 'board throws CancelledException in a gale, naming the crossing', call: 'Crossings.board(9, true)', type: 'String', throws: 'CancelledException', names: ['9:00'], hint: 'In a gale board should throw a CancelledException.', namesHint: 'board throws a CancelledException in a gale, and its message should name the crossing, as in 9:00.' }),
        attempt({ name: 'board refuses an hour that cannot be, whatever the weather', call: 'Crossings.board(25, true)', type: 'String', throws: 'IllegalArgumentException', names: ['25'], hint: 'An hour above 23 should be refused with an IllegalArgumentException, even in a gale.', namesHint: 'board refuses the hour with the right exception, and its message should name the hour.' }),
        attempt({ name: 'board refuses a negative hour', call: 'Crossings.board(-2, false)', type: 'String', throws: 'IllegalArgumentException', names: ['-2'], hint: 'An hour below 0 should be refused with an IllegalArgumentException.', namesHint: 'board refuses the hour with the right exception, and its message should name the hour.' }),
        {
          name: 'board says it may throw CancelledException',
          refuse: true,
          code: ['String s = Crossings.board(9, false);'],
          error: /^unreported exception CancelledException; must be caught or declared to be thrown/,
          allowed: 'Check called board with no try around it, and Java let it: board does not say it may throw CancelledException. A checked exception has to be named after throws on the first line of the method, so every caller knows to deal with it.',
          other: 'Check called board with no try around it, and Java refused it for another reason than the task is about. The task asks board to say it may throw CancelledException, by its own name: the message below names what it says instead.'
        },
        attempt({ name: 'A caller can catch CancelledException by its name', setup: ['String said = "nothing caught";', 'try { Crossings.board(18, true); } catch (CancelledException e) { said = e.getMessage(); }'], call: 'said', type: 'String', expected: {}, byName: true, hint: 'A caller of board should be able to catch CancelledException by its own name.', show: 'try {\n    Crossings.board(18, true);\n} catch (CancelledException e) {\n    said = e.getMessage();\n}' }),
        {
          name: 'A caller of notice needs no try',
          code: ['String s = Crossings.notice(12, false);'],
          reads: { s: 's' },
          after: { s: 's' },
          expected: { s: 'Boarding the 12:00 crossing' },
          hint: 'Check called notice with no try around it, as the task says a caller can, and notice should give back what board gives back.'
        },
        attempt({ name: 'notice gives back the boarding line', call: 'Crossings.notice(16, false)', type: 'String', expected: { got: 'Boarding the 16:00 crossing' }, hint: 'In calm weather notice should give back what board gives back.' }),
        attempt({ name: 'notice says the crossing is cancelled', setup: ['String m = null;', 'try { Crossings.board(7, true); } catch (Exception e) { m = e.getMessage(); }'], call: 'Crossings.notice(7, true)', type: 'String', after: { 'the message board throws': 'm' }, expected: {}, hint: 'In a gale notice should give back Cancelled: and the message of the CancelledException board throws.', cancelled: true, show: 'String got = Crossings.notice(7, true);' }),
        attempt({ name: 'notice lets a wrong hour reach the caller', call: 'Crossings.notice(31, false)', type: 'String', throws: 'IllegalArgumentException', names: ['31'], hint: 'An hour that cannot be is a mistake in the calling code: notice should let board\'s IllegalArgumentException reach its caller.' })
      ],
      judge: (runs, ctx) => {
        const details = outcomeCases({
          file: FILE,
          mistakes: [
            ...notThrown('board'),
            {
              when: (r, x) => r.case.throws === 'CancelledException' && !x && value(r, 'got') === null,
              hint: 'board gives back null in a gale, and the caller has to remember to look for it. The task asks it to throw a CancelledException, which the caller cannot miss.'
            },
            {
              when: (r, x) => r.case.throws === 'IllegalArgumentException' && /notice/.test(r.call) && !x,
              hint: 'notice caught the IllegalArgumentException of an hour that cannot be. That is a mistake in the calling code: catch only CancelledException, the exception a gale brings, and let anything else reach the caller.'
            }
          ]
        })(runs, ctx)
        // Two cases compare with what the learner's own board says.
        const own = runs
          .filter((r) => r.case.cancelled || r.case.byName)
          .map((r) => {
            const d = details.find((x) => x.name === r.case.name)
            if (!d?.passed) return d
            if (r.case.cancelled) {
              const m = value(r, 'the message board throws')
              return value(r, 'got') === `Cancelled: ${m}` && m !== null
                ? d
                : fail(r.case.name, 'In a gale notice should give back Cancelled: and then the message of the CancelledException board throws, exactly as the exception holds it.', d.output)
            }
            return /18:00/.test(value(r, 'got') ?? '') ? d : fail(r.case.name, 'Check caught a CancelledException from board by its name, and its message does not name the crossing, as in 18:00.', d.output)
          })
        return [
          ...details.map((d) => own.find((o) => o?.name === d.name) ?? d),
          ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
        ]
      }
    }
  }
})
