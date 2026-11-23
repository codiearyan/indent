import { codeOnly, fail, near, objectCases, pass, ran, refusal, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value
const q = (s) => JSON.stringify(s)
const boardAll = (v, names) => names.map((n) => `${v}.board(${q(n)});`).join(' ')

/** One of Boat's own fields made static: every boat would share it. A list shows only once boarded. */
const shared = (section) => {
  const field = /\bstatic\s+(?:final\s+)?[\w<>,\s]*?\b(name|seats|aboard)\s*[;=]/.exec(codeOnly(section))?.[1]
  return field
    ? [
        fail(
          `Each boat has its own ${field}`,
          `${field} has static in front, so it belongs to the class and every boat would share it. Each boat needs its own ${field}.`
        )
      ]
    : []
}

/** A field of Boat that Check's own code tries to change from outside. */
const outside = (field, line) => ({
  name: `Keeps ${field} private`,
  refuse: true,
  field,
  code: ['Boat a = new Boat("Tern", 9);', line]
})

export const checks = tasks({
  file: 'Manifest.java',
  objects: true,
  tasks: {
    fields: {
      task: 1,
      cases: [
        {
          name: 'Gives back its name and seats, with nobody aboard',
          code: ['Boat a = new Boat("Tern", 9);'],
          reads: { 'a.getName()': 'a.getName()', 'a.getSeats()': 'a.getSeats()', 'a.countAboard()': 'a.countAboard()' },
          expected: { 'a.getName()': 'Tern', 'a.getSeats()': 9, 'a.countAboard()': 0 }
        },
        {
          name: 'Each boat keeps its own values',
          code: ['Boat a = new Boat("Skua", 30);', 'Boat b = new Boat("Fulmar", 4);'],
          reads: { 'a.getName()': 'a.getName()', 'a.getSeats()': 'a.getSeats()', 'b.getName()': 'b.getName()', 'b.getSeats()': 'b.getSeats()' },
          expected: { 'a.getName()': 'Skua', 'a.getSeats()': 30, 'b.getName()': 'Fulmar', 'b.getSeats()': 4 }
        },
        outside('name', 'a.name = "Skua";'),
        outside('seats', 'a.seats = 99;'),
        outside('aboard', 'a.aboard = null;')
      ].map((c) => ({ ...c, hint: 'getName and getSeats should give back what the boat was made with, and countAboard how many are aboard: nobody, on a new boat.' })),
      judge: (runs, { section }) => [
        ...shared(section),
        ...objectCases({
          types: { 'a.getName()': 'String', 'a.getSeats()': 'int', 'a.countAboard()': 'int' },
          mistakes: [
            {
              when: (r) => value(r, 'a.getName()') === 'Fulmar' || (value(r, 'b.getSeats()') !== undefined && value(r, 'a.getSeats()') === '4'),
              hint: 'Check made two boats, and the first one now gives back the second one\'s values. A field with static in front belongs to the class, so every boat shares it; each boat needs its own.'
            },
            {
              when: (r) => value(r, 'a.getName()') === null || value(r, 'a.getSeats()') === '0',
              hint: 'A getter gives back null or 0, so the constructor never sets that field. Inside the constructor, a parameter\'s name hides the field\'s: the word this reaches the field.'
            }
          ]
        })(runs),
        ...runs
          .filter((r) => r.case.refuse)
          .map((r) =>
            refusal(r, {
              error: new RegExp(`\\b${r.case.field} has private access`),
              allowed: `Check's own code changed ${r.case.field} from outside Boat, and Java let it: ${r.case.field} is not private. With private in front, only code inside Boat may use it.`,
              other: /cannot find symbol/.test(r.errors[0]?.message ?? '')
                ? `Check cannot find a field called ${r.case.field} in Boat. The task names the three fields: write them with exactly those names.`
                : undefined
            })
          )
      ]
    },

    rule: {
      task: 2,
      needs: [1],
      cases: [
        {
          name: 'Boards while seats are free',
          code: ['Boat a = new Boat("Tern", 2);', 'boolean first = a.board("Seonag");', 'boolean second = a.board("Dougal");'],
          reads: { first: 'first', second: 'second', 'a.countAboard()': 'a.countAboard()' },
          expected: { first: true, second: true, 'a.countAboard()': 2 },
          hint: 'While a seat is free, board should add the passenger and give back true.'
        },
        {
          name: 'Refuses a passenger when the boat is full',
          code: ['Boat a = new Boat("Tern", 2);', boardAll('a', ['Seonag', 'Dougal']), 'boolean third = a.board("Eilidh");'],
          reads: { third: 'third', 'a.countAboard()': 'a.countAboard()' },
          expected: { third: false, 'a.countAboard()': 2 },
          seats: 2,
          hint: 'On a full boat, board should change nothing and give back false.'
        },
        {
          name: 'Refuses a second passenger on a boat of one seat',
          code: ['Boat a = new Boat("Skua", 1);', 'boolean first = a.board("Rab");', 'boolean second = a.board("Wen");'],
          reads: { first: 'first', second: 'second', 'a.countAboard()': 'a.countAboard()' },
          expected: { first: true, second: false, 'a.countAboard()': 1 },
          seats: 1,
          hint: 'A boat of one seat takes one passenger, then board gives back false.'
        },
        {
          name: 'Lands a passenger who is aboard',
          code: ['Boat a = new Boat("Fulmar", 3);', boardAll('a', ['Mhairi', 'Torquil']), 'boolean off = a.land(new String("Mhairi"));'],
          show: 'Boat a = new Boat("Fulmar", 3);\na.board("Mhairi"); a.board("Torquil");\nboolean off = a.land("Mhairi");',
          // A name made while the program runs, as a real one would be, so == cannot pass for equals.
          reads: { off: 'off', 'a.countAboard()': 'a.countAboard()' },
          expected: { off: true, 'a.countAboard()': 1 },
          hint: 'land should take the passenger of that name off and give back true.'
        },
        {
          name: 'Lands nobody who is not aboard',
          code: ['Boat a = new Boat("Fulmar", 3);', boardAll('a', ['Mhairi']), 'boolean off = a.land("Lachie");'],
          reads: { off: 'off', 'a.countAboard()': 'a.countAboard()' },
          expected: { off: false, 'a.countAboard()': 1 },
          hint: 'When nobody of that name is aboard, land should change nothing and give back false.'
        },
        {
          name: 'Frees a seat when someone lands',
          code: ['Boat a = new Boat("Tern", 1);', 'a.board("Ishbel");', 'a.land("Ishbel");', 'boolean next = a.board("Morag");'],
          reads: { next: 'next', 'a.countAboard()': 'a.countAboard()' },
          expected: { next: true, 'a.countAboard()': 1 },
          hint: 'Once someone has landed, their seat is free again, and board should take the next passenger.'
        },
        {
          name: 'Each boat keeps its own passengers',
          code: ['Boat a = new Boat("Tern", 4);', 'Boat b = new Boat("Skua", 4);', boardAll('a', ['Rab', 'Wen']), boardAll('b', ['Eilidh'])],
          reads: { 'a.countAboard()': 'a.countAboard()', 'b.countAboard()': 'b.countAboard()' },
          expected: { 'a.countAboard()': 2, 'b.countAboard()': 1 },
          hint: 'Each boat should count only the passengers boarded on it.'
        }
      ],
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        return objectCases({
          types: { first: 'boolean', third: 'boolean', off: 'boolean' },
          mistakes: [
            {
              when: (r) => value(r, 'b.countAboard()') !== undefined && value(r, 'a.countAboard()') === '3',
              hint: 'Check boarded two boats, and each counts the other\'s passengers too: the list of who is aboard is shared by every boat. A field with static in front belongs to the class; each boat needs its own list.'
            },
            {
              when: (r) => r.case.seats !== undefined && Number(value(r, 'a.countAboard()')) > r.case.seats,
              hint: 'board lets a passenger on a full boat, so the boat has more aboard than seats. That is the one rule board is there to keep.'
            },
            {
              when: (r) => r.case.seats !== undefined && (value(r, 'third') === 'true' || value(r, 'second') === 'true'),
              hint: 'board gives back true for a passenger it did not take on. true means the passenger is aboard.'
            },
            {
              when: (r) => value(r, 'second') === 'false' && r.case.expected.second === true,
              hint: 'board refuses a passenger while a seat is still free. The boat is full only when the number aboard has reached the seats.'
            },
            {
              when: (r) => r.case.name.startsWith('Lands a') && value(r, 'off') === 'false' && /==/.test(code) && !/\.equals\s*\(/.test(code),
              hint: 'land says nobody of that name is aboard, and they are. Two texts are compared with ==, which asks whether they are the very same object, not whether they hold the same letters.'
            },
            {
              when: (r) => r.case.name.startsWith('Lands nobody') && value(r, 'off') === 'true',
              hint: 'land gives back true for a passenger who was not aboard. true means someone was taken off.'
            }
          ]
        })(runs)
      }
    },

    copy: {
      task: 3,
      needs: [1, 2],
      cases: [
        {
          name: 'Gives back the names aboard, in order',
          code: ['Boat a = new Boat("Tern", 5);', boardAll('a', ['Rab', 'Seonag', 'Wen']), 'java.util.List<String> got = a.passengers();'],
          show: 'Boat a = new Boat("Tern", 5);\na.board("Rab"); a.board("Seonag"); a.board("Wen");\nArrayList<String> got = a.passengers();',
          reads: { got: 'got' },
          expected: { got: ['Rab', 'Seonag', 'Wen'] },
          hint: 'passengers should give back a list of the names aboard, in the order they boarded.'
        },
        {
          name: 'Gives back an empty list for an empty boat',
          code: ['Boat a = new Boat("Skua", 2);', 'java.util.List<String> got = a.passengers();'],
          show: 'Boat a = new Boat("Skua", 2);\nArrayList<String> got = a.passengers();',
          reads: { got: 'got' },
          expected: { got: [] },
          hint: 'A boat with nobody aboard gives back an empty list, not null.'
        },
        {
          name: 'Changing the list it gave back leaves the boat alone',
          code: ['Boat a = new Boat("Fulmar", 5);', boardAll('a', ['Eilidh', 'Torquil']), 'java.util.List<String> got = a.passengers();', 'if (got != null) { got.add("Dougal"); got.remove("Eilidh"); }'],
          show: 'Boat a = new Boat("Fulmar", 5);\na.board("Eilidh"); a.board("Torquil");\nArrayList<String> got = a.passengers();\ngot.add("Dougal"); got.remove("Eilidh");',
          reads: { 'a.countAboard()': 'a.countAboard()', 'a.passengers()': 'a.passengers()' },
          expected: { 'a.countAboard()': 2, 'a.passengers()': ['Eilidh', 'Torquil'] },
          hint: 'Changing the list passengers gave back should never change who is aboard.'
        }
      ],
      judge: objectCases({
        mistakes: [
          {
            when: (r) => r.case.name.startsWith('Changing') && (value(r, 'a.countAboard()') !== '2' || r.values['a.passengers()']?.items?.includes('Dougal')),
            hint: 'Check added a name to the list passengers gave back and took one off, and the boat changed too. passengers hands out the boat\'s own list, so the caller holds a second name for it and can get round board\'s rule. Give back a new list with the same names.'
          },
          {
            when: (r) => r.values.got?.value === null,
            hint: 'passengers gives back null. It should give back a list, an empty one when nobody is aboard.'
          }
        ]
      })
    },

    'to-string': {
      task: 4,
      needs: [1, 2],
      cases: [
        {
          name: 'Says what an empty boat is',
          code: ['Boat a = new Boat("Tern", 9);'],
          reads: { 'String.valueOf(a)': 'String.valueOf(a)' },
          expected: { 'String.valueOf(a)': 'Tern: 0 aboard, 9 free' }
        },
        {
          name: 'Says what a boat with passengers is',
          code: ['Boat a = new Boat("Skua", 4);', boardAll('a', ['Morag', 'Lachie', 'Ishbel'])],
          reads: { 'String.valueOf(a)': 'String.valueOf(a)' },
          expected: { 'String.valueOf(a)': 'Skua: 3 aboard, 1 free' }
        },
        {
          name: 'Is what printing a boat shows',
          code: ['Boat a = new Boat("Fulmar", 2);', boardAll('a', ['Rab', 'Wen']), 'System.out.println(a);'],
          expected: {},
          prints: 'Fulmar: 2 aboard, 0 free'
        }
      ].map((c) => ({ ...c, hint: 'toString should give back the name, how many are aboard and how many seats are free, in the form the task shows.' })),
      judge: (runs) => {
        const said = (r) => (r.case.prints ? r.lines.at(-1) : value(r, 'String.valueOf(a)')) ?? ''
        const want = (r) => r.case.prints ?? r.case.expected['String.valueOf(a)']
        const typed = runs.every((r) => said(r) === said(runs[0]))
        return runs.map((r) => {
          const output = ran(r)
          if (said(r) === want(r) && (r.case.prints || !r.lines.includes(want(r)))) return pass(r.case.name, output)
          const hint = /^Boat@[0-9a-f]+$/.test(said(r))
            ? 'A boat shows as Boat, an @ and a code: the toString every object gets from Java. Boat has no toString of its own yet, or its first line is not exactly as the lesson shows.'
            : r.lines.includes(want(r))
              ? 'toString prints the line instead of giving it back. Whoever asks for a boat\'s text decides what to do with it, printing or not: toString only gives it back.'
              : typed
                ? 'toString gives back the same text for every boat Check makes. Build it from the boat\'s own fields.'
                : said(r).replace(/\d+/g, '#') === want(r).replace(/\d+/g, '#')
                  ? 'The words are right, and a number is not. The first is how many are aboard, the second how many seats are still free.'
                  : near(said(r), want(r))
                  ? 'The text is nearly right. Compare it with the task letter by letter: the colon, the comma, the spaces and the words count.'
                  : r.case.hint
          return fail(r.case.name, hint, output)
        })
      }
    }
  }
})
