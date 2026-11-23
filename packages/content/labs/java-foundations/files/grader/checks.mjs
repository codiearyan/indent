import { attempt, CHECK_FOLDER, codeOnly, explainValue, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'HutFiles.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message'), frames: value(r, 'thrown.frames') ?? '' } : null)
// Check's file system throws from its own code; a path made again from its text is one of the computer's own.
const ownPath = (x) => /CheckFolder|CheckPath/.test(x.frames)

// Check's own code: the folder and its file system, and a line that only compiles when a method
// names no checked exception wider than IOException.
const OWN = `${CHECK_FOLDER}
interface CheckIo { void run() throws java.io.IOException; }`

// Java text for a file's contents: every character outside plain ASCII as a \u escape, which
// javac reads as the character itself in Check's own code.
const java = (s) =>
  '"' + [...s].map((ch) => (ch === '"' ? '\\"' : ch === '\\' ? '\\\\' : ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch.charCodeAt(0) > 126 ? `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}` : ch)).join('') + '"'
const shown = (s) => JSON.stringify(s)

let folders = 0
/** A case on a folder of Check's own: `files` are written there first, `probe` must compile. */
function inFolder({ name, files = {}, latin = [], call, show, type = 'void', probe, after = {}, ...rest }) {
  const f = `f${folders}`
  const setup = [
    `CheckFolder ${f} = new CheckFolder("check-${folders++}");`,
    ...Object.entries(files).map(([n, text]) => `${f}.write("${n}", ${java(text)}${latin.includes(n) ? ', java.nio.charset.StandardCharsets.ISO_8859_1' : ''});`),
    ...(probe ? [`CheckIo probe = () -> ${probe};`] : [])
  ]
  const at = (n) => `${f}.path("${n}")`
  const c = call(at)
  return attempt({
    name,
    setup,
    call: c,
    type,
    after: { ...Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v(f)])), 'files left open': `${f}.open`, 'a path outside the folder': `${f}.left` },
    show: `${Object.entries(files)
      .map(([n, text]) => `// ${n} holds ${shown(text)}${latin.includes(n) ? ', in ISO-8859-1' : ''}`)
      .join('\n')}${Object.keys(files).length ? '\n' : ''}${show}`,
    files,
    ...rest
  })
}

// The folder's own bookkeeping shows in the output only when it says something.
const quiet = (d) => (d.output ? { ...d, output: d.output.replace(/\n  files left open is 0(?=\n)/g, '').replace(/\n  a path outside the folder is null(?=\n)/g, '').replace(/\nThen:(?=\nIt printed:)/g, '') } : d)

function judge(mistakes) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainValue })(runs, ctx).map(quiet).map((d, i) => {
      const r = runs[i]
      const left = value(r, 'a path outside the folder')
      if (left)
        return { ...d, passed: false, message: `A path led out of the folder of the file Check handed over, to ${left}. Each method works on the path it is handed, and on files beside it: nothing else on the computer.` }
      if (d.passed && Number(value(r, 'files left open')) > 0)
        return { ...d, passed: false, message: 'The answer is right, and the file is still open afterwards: something read it and was never closed. A stream of lines holds its file open until it is closed: the lesson shows how a try closes it for you.' }
      if (d.passed) return d
      const m = [...mistakes, ...LAST].find((k) => k.when(r, thrown(r), runs, codeOnly(ctx.section)))
      return m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r, thrown(r)) : m.hint } : d
    })
}

const COMMON = [
  {
    when: (r, x) => x && /check-folder:/.test(x.message ?? '') && /InvalidPath|NoSuchFile/.test(x.name) && !ownPath(x),
    hint: 'A path was made again from the text of the one Check handed over, with + and a slash or toString. The text of a path is for people to read: Check\'s prints as check-folder:/..., which is no place on this computer. A path beside the one you are handed comes from that path itself: the lesson shows how.'
  },
  {
    when: (r, x) => x?.name === 'UnsupportedOperationException' && /default file system/.test(x.message ?? ''),
    hint: 'toFile turns the Path into the older java.io.File, which knows only the computer\'s own files and cannot open the one Check handed over. The Files methods take the Path itself.'
  }
]

// Checked after every other mistake: a typed path may sit in another method than the one that failed.
const LAST = [
  {
    when: (r, x, runs, code) => !x && /Path\s*\.\s*of\s*\(|Paths\s*\.\s*get\s*\(|new\s+File\s*\(/.test(code),
    hint: 'A path is typed into the method, so it reads or writes that file, whatever path it is handed. Check hands over a path to a file of its own, with other lines: use the path the method is given.'
  }
]

const NOTICES = 'Tide table pinned by the door\r\nRuaraidh left a flask on the bench\r\nNo boats if the wind is over force 7'
const ACCENT = 'Fionnghal\'s bicycle is in the shed\nSeonaidh, your gloves are here: pick them up\nCafé at the pier opens at 08:00\n'
const TILL = '06:15 Linnet 3 \u00a39.90\n06:45 Linnet 7 \u00a323.10\nPeadar is owed change\n'
const TILL2 = 'Fearchar ré paid twice\r\n09:10 Gannet 2 £6.60\r\n'

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  files: true,
  tasks: {
    reading: {
      task: 1,
      stub: OWN,
      cases: [
        inFolder({
          name: 'lines reads a file with Windows line ends and no line end at the end',
          files: { 'board.txt': NOTICES },
          call: (at) => `Reading.lines(${at('board.txt')})`,
          show: 'List<String> got = Reading.lines(path to board.txt);',
          probe: 'Reading.lines(null)',
          type: 'List<String>',
          expected: { got: NOTICES.split('\r\n') },
          kind: 'lines',
          hint: 'lines should give back every line of the file, in order, without the line ends.'
        }),
        inFolder({
          name: 'lines reads a letter outside plain ASCII',
          files: { 'shed.txt': ACCENT },
          call: (at) => `Reading.lines(${at('shed.txt')})`,
          show: 'List<String> got = Reading.lines(path to shed.txt);',
          type: 'List<String>',
          expected: { got: ACCENT.replace(/\n$/, '').split('\n') },
          kind: 'lines',
          hint: 'lines should give back every line of the file as it is written, its letters included.'
        }),
        inFolder({
          name: 'lines of an empty file',
          files: { 'empty.txt': '' },
          call: (at) => `Reading.lines(${at('empty.txt')})`,
          show: 'List<String> got = Reading.lines(path to empty.txt);',
          type: 'List<String>',
          expected: { got: [] },
          kind: 'lines',
          hint: 'An empty file has no lines, so lines should give back an empty list.'
        }),
        inFolder({
          name: 'lines lets the caller know a file is not there',
          call: (at) => `Reading.lines(${at('gone.txt')})`,
          show: 'List<String> got = Reading.lines(path to gone.txt, which is not there);',
          type: 'List<String>',
          throws: 'NoSuchFileException',
          missing: true,
          kind: 'missing',
          hint: 'Reading a file that is not there throws a NoSuchFileException, and the task asks lines to let it reach the caller.'
        }),
        inFolder({
          name: 'tillLines reads a file in ISO-8859-1',
          files: { 'till.txt': TILL },
          latin: ['till.txt'],
          call: (at) => `Reading.tillLines(${at('till.txt')})`,
          show: 'List<String> got = Reading.tillLines(path to till.txt);',
          probe: 'Reading.tillLines(null)',
          type: 'List<String>',
          expected: { got: TILL.replace(/\n$/, '').split('\n') },
          kind: 'till',
          hint: 'tillLines should give back every line of the till\'s file, its letters and pound signs read right.'
        }),
        inFolder({
          name: 'tillLines with Windows line ends',
          files: { 'till.txt': TILL2 },
          latin: ['till.txt'],
          call: (at) => `Reading.tillLines(${at('till.txt')})`,
          show: 'List<String> got = Reading.tillLines(path to till.txt);',
          type: 'List<String>',
          expected: { got: TILL2.replace(/\r\n$/, '').split('\r\n') },
          kind: 'till',
          hint: 'tillLines should give back every line of the file, without the line ends.'
        })
      ],
      judge: judge([
        ...COMMON,
        {
          when: (r, x) => r.case.kind === 'till' && (x?.name === 'MalformedInputException' || (x?.name === 'UncheckedIOException' && /Malformed/.test(x.message ?? ''))),
          hint: 'tillLines reads the till\'s file as UTF-8, and Java stops at the first byte that is not UTF-8 text: the file was written in ISO-8859-1, where a pound sign or an accent is one byte. Name the character set the file was written in.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'till' && (items(r, 'got') ?? []).some((l) => l.includes('�')),
          hint: 'Some letters come out as a question mark in a box: the till\'s file was read as UTF-8, and it was written in ISO-8859-1. Name the character set the file was written in.'
        },
        {
          when: (r, x) => !x && (items(r, 'got') ?? []).some((l) => l.endsWith('\r')),
          hint: 'The lines still end in "\\r": the file has Windows line ends, "\\r\\n", and splitting at "\\n" leaves the "\\r" behind. Reading the file as a list of lines takes off every kind of line end.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'lines' && r.case.expected.got.length === 0 && (items(r, 'got') ?? []).length === 1,
          hint: 'An empty file gives back one empty line. Splitting an empty text gives one piece; a file with no lines has none.'
        },
        {
          when: (r, x) => r.case.kind === 'missing' && !x,
          hint: 'lines gives back an answer for a file that is not there, as if it were empty. The task asks it to let the caller know: let the NoSuchFileException reach the caller, with throws IOException on the method, instead of catching it.'
        }
      ])
    },

    writing: {
      task: 2,
      stub: OWN,
      cases: [
        inFolder({
          name: 'save replaces what a file holds',
          files: { 'board.txt': 'Yesterday\'s line\nand another\n' },
          call: (at) => `Writing.save(${at('board.txt')}, new ArrayList<>(List.of(${java('Sandpiper 06:15')}, ${java('Gannet 18:45')})))`,
          show: 'Writing.save(path to board.txt, List.of("Sandpiper 06:15", "Gannet 18:45"));',
          probe: 'Writing.save(null, null)',
          after: { 'board.txt afterwards': (f) => `${f}.read("board.txt")` },
          expected: { 'board.txt afterwards': 'Sandpiper 06:15\nGannet 18:45\n' },
          kind: 'save',
          hint: 'save should leave the file holding the lines and nothing else, each followed by "\\n".'
        }),
        inFolder({
          name: 'save makes a file that is not there, letters and all',
          call: (at) => `Writing.save(${at('notice.txt')}, new ArrayList<>(List.of(${java('Café closed today')}, ${java('Tickets £3.35')})))`,
          show: 'Writing.save(path to notice.txt, List.of("Café closed today", "Tickets £3.35"));',
          after: { 'notice.txt afterwards': (f) => `${f}.read("notice.txt")` },
          expected: { 'notice.txt afterwards': 'Café closed today\nTickets £3.35\n' },
          kind: 'save',
          hint: 'save should make the file when it is not there, and write its letters in UTF-8.'
        }),
        inFolder({
          name: 'append adds a line and keeps what was there',
          files: { 'log.txt': 'Opened at 06:45\n' },
          call: (at) => `Writing.append(${at('log.txt')}, ${java('Ruaraidh paid for two')})`,
          show: 'Writing.append(path to log.txt, "Ruaraidh paid for two");',
          probe: 'Writing.append(null, null)',
          after: { 'log.txt afterwards': (f) => `${f}.read("log.txt")` },
          expected: { 'log.txt afterwards': 'Opened at 06:45\nRuaraidh paid for two\n' },
          kind: 'append',
          hint: 'append should add the line and "\\n" after what the file already holds.'
        }),
        inFolder({
          name: 'append makes a file that is not there',
          call: (at) => `Writing.append(${at('new-log.txt')}, ${java('First line of the day')})`,
          show: 'Writing.append(path to new-log.txt, "First line of the day");',
          after: { 'new-log.txt afterwards': (f) => `${f}.read("new-log.txt")` },
          expected: { 'new-log.txt afterwards': 'First line of the day\n' },
          kind: 'append-new',
          hint: 'append should make the file when it is not there yet.'
        })
      ],
      judge: judge([
        ...COMMON,
        {
          when: (r, x) => !x && Object.keys(r.values).some((k) => k.endsWith('afterwards') && /\r\n/.test(value(r, k) ?? '')),
          hint: 'The lines end in "\\r\\n", which is how a Windows computer ends a line, and Check runs with that line end. Writing a list of lines, %n or System.lineSeparator() uses the computer\'s line end; the task gives its own, "\\n", the same on every computer.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'append' && value(r, 'log.txt afterwards') === 'Ruaraidh paid for two\n',
          hint: 'append replaces what the file held, so the line that was there is gone. Writing to a file replaces it unless it is told to add to the end: the lesson shows how.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'save' && (value(r, 'board.txt afterwards') ?? '').startsWith("Yesterday's line"),
          hint: 'save adds to the end of the file, so yesterday\'s lines are still there. The task asks for the lines and nothing else.'
        },
        {
          when: (r, x) => r.case.kind === 'append-new' && x?.name === 'NoSuchFileException',
          hint: 'append cannot add to a file that is not there yet. Told only to add to the end, Java refuses a file that does not exist: it has to be told to make it as well.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'save' && /^\S/.test(value(r, 'board.txt afterwards') ?? '') && !(value(r, 'board.txt afterwards') ?? '').endsWith('\n'),
          hint: 'The last line has no "\\n" after it. Each line, the last one too, is followed by "\\n".'
        }
      ])
    },

    counting: {
      task: 3,
      stub: OWN,
      cases: [
        inFolder({
          name: 'linesWith counts the lines that hold a word',
          files: { 'till.txt': '06:15 Linnet 3 £9.90\n06:45 Gannet 7 £23.10\n07:15 Linnet 1 £3.30\nLinnet late, engine\n07:45 Gannet 0 £0.00' },
          latin: ['till.txt'],
          call: (at) => `Counting.linesWith(${at('till.txt')}, ${java('Linnet')})`,
          show: 'long got = Counting.linesWith(path to till.txt, "Linnet");',
          probe: 'Counting.linesWith(null, null)',
          type: 'long',
          expected: { got: 3 },
          kind: 'count',
          hint: 'linesWith should give back how many lines of the file hold the word.'
        }),
        inFolder({
          name: 'linesWith reads letters in ISO-8859-1',
          files: { 'till.txt': 'Seonaidh café £2.00\r\nPeadar café\r\nFearchar tea\r\n' },
          latin: ['till.txt'],
          call: (at) => `Counting.linesWith(${at('till.txt')}, ${java('café')})`,
          show: 'long got = Counting.linesWith(path to till.txt, "café");',
          type: 'long',
          expected: { got: 2 },
          kind: 'count',
          hint: 'linesWith should read the till\'s file in ISO-8859-1, so its accents match the word.'
        }),
        inFolder({
          name: 'linesWith when no line holds the word',
          files: { 'till.txt': '06:15 Linnet 3\n' },
          latin: ['till.txt'],
          call: (at) => `Counting.linesWith(${at('till.txt')}, ${java('Gannet')})`,
          show: 'long got = Counting.linesWith(path to till.txt, "Gannet");',
          type: 'long',
          expected: { got: 0 },
          kind: 'count',
          hint: 'When no line holds the word, linesWith should give back 0.'
        }),
        inFolder({
          name: 'linesWith gives back 0 for a file that is not there',
          call: (at) => `Counting.linesWith(${at('gone.txt')}, ${java('Linnet')})`,
          show: 'long got = Counting.linesWith(path to gone.txt, which is not there, "Linnet");',
          type: 'long',
          expected: { got: 0 },
          missing: true,
          kind: 'missing',
          hint: 'For a file that is not there, linesWith should give back 0.'
        })
      ],
      judge: judge([
        ...COMMON,
        {
          when: (r, x) => r.case.kind === 'missing' && x?.name === 'NoSuchFileException',
          hint: 'linesWith throws for a file that is not there. The task asks for 0 then: ask whether the file is there before opening it.'
        },
        {
          when: (r, x) => r.case.kind === 'count' && (x?.name === 'MalformedInputException' || (x?.name === 'UncheckedIOException' && /Malformed/.test(x.message ?? ''))),
          hint: 'linesWith reads the till\'s file as UTF-8, and Java stops at the first byte that is not UTF-8 text: the file was written in ISO-8859-1. A stream of lines throws this as an UncheckedIOException when it reaches that line. Name the character set the file was written in.'
        }
      ])
    }
  }
})
