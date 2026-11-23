import { attempt, codeOnly, explainValue, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'SlipBoard.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message') } : null)

// Every text Check hands over is made while the program runs, so == on two of them is false.
// A \u escape in Check's own code is read by javac as the character itself.
const java = (s) => `new String(${JSON.stringify(s).replace(/ /g, '\\u2003')})`
const shown = (s) => JSON.stringify(s).replace(/ /g, '\\u2003')
const EM = ' '

function judge(mistakes) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainValue })(runs, ctx).map((d, i) => {
      if (d.passed) return d
      const r = runs[i]
      const m = mistakes.find((k) => k.when(r, thrown(r), runs, codeOnly(ctx.section)))
      return m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r, thrown(r)) : m.hint } : d
    })
}

const pad = (s, n, left) => (left ? s.padEnd(n) : s.padStart(n))
const two = (n) => String(n).padStart(2, '0')
const rowOf = (boat, hour, minute, seats) => `${pad(boat, 10, true)} ${two(hour)}:${two(minute)} ${pad(String(seats), 3)}`
const ROWS = [
  ['Gannet', 15, 20, 8],
  ['Greenshank', 7, 0, 120],
  ['Eider', 0, 5, 0],
  ['Guillemot', 23, 59, 45]
]

const OWN_LINE = "Check's own line\n"
const BOARD_ROWS = ['Sandpiper  06:15  40', 'Gannet     18:45   2', 'Razorbill  21:00 140']
const UNEVEN = ['Last boat 22:10', 'Linnet     22:40  16', 'Gannet']
const ruled = (rows) => (rows.length ? rows.map((r) => `${r}\n`).join('') + `${'-'.repeat(Math.max(...rows.map((r) => r.length)))}\n` : '')

function addRowsCase(name, rows, hint) {
  return attempt({
    name,
    setup: [`StringBuilder sb = new StringBuilder(${java(OWN_LINE)});`],
    call: `Sheet.addRows(sb, new ArrayList<>(List.of(${rows.map(java).join(', ')})))`,
    show: `StringBuilder sb = new StringBuilder(${shown(OWN_LINE)});\nSheet.addRows(sb, List.of(${rows.map(shown).join(', ')}));`,
    after: { 'sb afterwards': 'sb.toString()' },
    expected: { 'sb afterwards': OWN_LINE + ruled(rows) },
    kind: 'add',
    rows,
    hint
  })
}

function boardCase(name, title, rows, hint) {
  return attempt({
    name,
    call: `Sheet.board(${java(title)}, new ArrayList<>(List.of(${rows.map(java).join(', ')})))`,
    show: `String got = Sheet.board(${shown(title)}, List.of(${rows.map(shown).join(', ')}));`,
    type: 'String',
    expected: { got: `${title}\n${ruled(rows)}` },
    kind: 'board',
    rows,
    hint
  })
}

const PARTS = [
  [' LQ.2031.0457 ', ['LQ', '2031', '0457']],
  ['lq.2029.0113.R', ['lq', '2029', '0113', 'R']],
  [`${EM}LQ.2031.0458${EM}`, ['LQ', '2031', '0458']]
]
const SAME = [
  ['lq.2031.0457', ' LQ.2031.0457', true],
  [`LQ.2031.0457${EM}`, 'lq.2031.0457', true],
  ['LQ.2031.0457', 'LQ.2031.0457', true],
  ['LQ.2031.0457', 'LQ.2031.0458', false],
  ['LQ.2031.045', 'LQ.2031.0457', false]
]
const DIGITS = [
  ['LQ.2031.0457', 8],
  ['lq.29.13.R', 4],
  ['', 0]
]
const em = (s) => s.includes(EM)
const said = (s) => shown(s).replace(/\\u2003/g, '(an em space)')

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    row: {
      task: 1,
      cases: ROWS.map(([boat, hour, minute, seats]) =>
        attempt({
          name: `row for the ${boat} at ${two(hour)}:${two(minute)}`,
          call: `Board.row(${java(boat)}, ${hour}, ${minute}, ${seats})`,
          show: `String got = Board.row("${boat}", ${hour}, ${minute}, ${seats});`,
          type: 'String',
          after: { 'between brackets': 'got == null ? null : "[" + got + "]"' },
          expected: { got: rowOf(boat, hour, minute, seats) },
          kind: 'row',
          args: [boat, hour, minute, seats],
          hint: 'row should give back the boat on the left of a column 10 wide, a space, the time as two digits, a colon and two digits, a space, and the seats on the right of a column 3 wide.'
        })
      ),
      judge: judge([
        {
          when: (r, x) => !x && /^\s/.test(value(r, 'got') ?? '') && r.case.args[0].length < 10,
          hint: 'The boat\'s name stands on the right of its column, with the spaces before it. The task puts the name on the left, with the spaces after it: a width in a pattern can be told which side to fill.'
        },
        {
          when: (r, x) => !x && / \d:|:\d(?:\s|$)/.test(value(r, 'got') ?? '') && (r.case.args[1] < 10 || r.case.args[2] < 10),
          hint: 'An hour or a minute below 10 shows as one digit. The time on the board always has two digits each side of the colon, as in 07:00.'
        },
        {
          when: (r, x) => !x && typeof value(r, 'got') === 'string' && value(r, 'got').trim() === rowOf(...r.case.args).trim() && value(r, 'got') !== rowOf(...r.case.args),
          hint: 'The row is right apart from the spaces at its end or start. Each column is exactly as wide as the task says: count the characters between the brackets below.'
        },
        {
          when: (r, x) => !x && typeof value(r, 'got') === 'string' && value(r, 'got').replace(/\s+/g, ' ').trim() === rowOf(...r.case.args).replace(/\s+/g, ' ').trim(),
          hint: 'The values are right and the columns do not line up: a column is wider or narrower than the task says. Compare each width with the task, and count the characters between the brackets below.'
        }
      ])
    },

    sheet: {
      task: 2,
      cases: [
        addRowsCase('addRows adds three rows and a line', BOARD_ROWS, 'addRows should add each row and "\\n" to the end of board, then a line of - as long as the longest row, and "\\n".'),
        addRowsCase('addRows with rows of different lengths', UNEVEN, 'The line of - should be as long as the longest row.'),
        addRowsCase('addRows with no rows', [], 'For no rows, addRows should add nothing at all.'),
        boardCase('board gives back the whole board', 'Last boats', BOARD_ROWS, 'board should give back the title and "\\n", then the rows and the line, as addRows adds them.'),
        boardCase('board with no rows', 'No boats today', [], 'With no rows, board should give back the title and "\\n" only.')
      ],
      judge: judge([
        {
          when: (r, x) => !x && /\r\n/.test(value(r, 'sb afterwards') ?? value(r, 'got') ?? '') ,
          hint: 'The lines end in "\\r\\n", which is how a Windows computer ends a line, and Check runs with that line end. The task gives the line end itself: "\\n", the same on every computer.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'add' && r.case.rows.length > 0 && value(r, 'sb afterwards') === OWN_LINE,
          hint: 'addRows leaves the StringBuilder Check handed it as it was. Whatever it builds has to go into that StringBuilder, the caller\'s own: a new one made inside the method, or a text, never reaches the caller.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'add' && !(value(r, 'sb afterwards') ?? '').startsWith(OWN_LINE),
          hint: 'The line Check had already put in the StringBuilder is gone. addRows adds to the end of what board holds, and leaves the rest as it was.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'add' && r.case.rows.length === 0 && value(r, 'sb afterwards') !== OWN_LINE,
          hint: 'For no rows, addRows adds something. The task asks it to add nothing at all, not even a line of no dashes.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'add' && r.case.rows.length > 0 && (value(r, 'sb afterwards') ?? '').startsWith(OWN_LINE + r.case.rows.map((q) => `${q}\n`).join('')),
          hint: 'The rows are right, and the line of - under them is not: it should be as long as the longest row, followed by "\\n".'
        },
        {
          when: (r, x) => !x && r.case.kind === 'add' && r.case.rows.length > 0,
          hint: 'Each row should be added as it is, followed by "\\n": compare what the StringBuilder holds afterwards, below, with the rows Check handed over.'
        }
      ])
    },

    refs: {
      task: 3,
      cases: [
        ...PARTS.map(([ref, parts]) =>
          attempt({
            name: `parts of ${said(ref)}`,
            call: `Refs.parts(${java(ref)})`,
            show: `List<String> got = Refs.parts(${shown(ref)});`,
            type: 'List<String>',
            expected: { got: parts },
            kind: 'parts',
            ref,
            hint: 'parts should give back the pieces between the points, with any space at either end of the reference left off first.'
          })
        ),
        ...SAME.map(([a, b, same]) =>
          attempt({
            name: `sameRef(${said(a)}, ${said(b)}) says ${same ? 'yes' : 'no'}`,
            call: `Refs.sameRef(${java(a)}, ${java(b)})`,
            show: `boolean got = Refs.sameRef(${shown(a)}, ${shown(b)});`,
            type: 'boolean',
            expected: { got: same },
            kind: 'same',
            pair: [a, b],
            hint: same ? 'These two are the same reference, whatever their capital letters and the space at their ends.' : 'These two are different references.'
          })
        ),
        ...DIGITS.map(([ref, n]) =>
          attempt({
            name: `digits of ${shown(ref)}`,
            call: `Refs.digits(${java(ref)})`,
            show: `long got = Refs.digits(${shown(ref)});`,
            type: 'long',
            expected: { got: n },
            kind: 'digits',
            hint: 'digits should give back how many of the characters of ref are digits.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'parts' && Array.isArray(items(r, 'got')) && items(r, 'got').length === 0,
          hint: 'parts gives back no pieces at all. split reads the text it is handed as a pattern, where a point means any character, so every character is a place to split and nothing is left between them. The lesson shows how to split at a plain point.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'parts' && em(r.case.ref) && (items(r, 'got') ?? []).some((p) => p.includes(EM)),
          hint: 'A piece still has a space at its end. The reference starts and ends with an em space, as text pasted from an email can, and trim takes off only the plain space and the characters below it. The lesson shows the method that knows every kind of space.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'parts' && (items(r, 'got') ?? []).some((p) => p !== p.trim()),
          hint: 'A piece still has a space at its end: the spaces at either end of the reference come off before it is split.'
        },
        {
          when: (r, x, runs, code) => !x && r.case.kind === 'same' && r.case.expected.got === true && value(r, 'got') === 'false' && /==/.test(code) && !/equals/.test(code),
          hint: 'sameRef says two equal references are not the same. == asks whether two texts are the very same object, as part 1 showed, and Check hands over texts made while the program runs.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'same' && r.case.expected.got === true && value(r, 'got') === 'false' && em(r.case.pair.join('')),
          hint: 'sameRef says no to two references that differ only in capital letters and an em space at one end, as text pasted from an email can have. trim takes off only the plain space and the characters below it: the lesson shows the method that knows every kind of space.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'same' && r.case.expected.got === true && value(r, 'got') === 'false' && r.case.pair[0].trim().toLowerCase() === r.case.pair[1].trim().toLowerCase() && r.case.pair[0].trim() !== r.case.pair[1].trim(),
          hint: 'sameRef says no to two references that differ only in capital letters. equals counts every capital letter: there is a way to compare that takes no notice of them.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'same' && r.case.expected.got === true && value(r, 'got') === 'false',
          hint: 'sameRef says no to two references that differ only in the space at one end. Take that off both before comparing.'
        }
      ])
    }
  }
})
