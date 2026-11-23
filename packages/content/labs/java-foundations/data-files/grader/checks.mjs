import { attempt, CHECK_FOLDER, codeOnly, explainValue, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'DayReport.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message'), frames: value(r, 'thrown.frames') ?? '' } : null)
const ownPath = (x) => /CheckFolder|CheckPath/.test(x.frames)

// Check's own right Lines, so Task 2 is judged on its own lines alone. Its message names the line's
// number as it was handed.
const LINES = `class Lines {
    static Sailing parse(String line, int number) {
        String[] parts = line.split(",", -1);
        try {
            if (parts.length != 4) throw new IllegalStateException("not four parts");
            return new Sailing(LocalDate.parse(parts[0].strip()), parts[1].strip(), Integer.parseInt(parts[2].strip()), new BigDecimal(parts[3].strip()));
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Check's parse refuses line " + number, e);
        }
    }
}`
const IO = 'interface CheckIo { void run() throws java.io.IOException; }'

const text = (s) =>
  'new String("' + [...s].map((ch) => (ch === '"' ? '\\"' : ch === '\\' ? '\\\\' : ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch.charCodeAt(0) > 126 ? `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}` : ch)).join('') + '")'
const shown = (s) => JSON.stringify(s)
const record = ([d, b, p, t]) => `Sailing[date=${d}, boat=${b}, passengers=${p}, takings=${t}]`
const sailing = ([d, b, p, t]) => `new Sailing(LocalDate.of(${d.split('-').map(Number).join(', ')}), ${text(b)}, ${p}, new BigDecimal("${t}"))`
const sailingShown = ([d, b, p, t]) => `new Sailing(LocalDate.of(${d.split('-').map(Number).join(', ')}), "${b}", ${p}, new BigDecimal("${t}"))`

let folders = 0
function inFolder({ name, files = {}, call, show, type = 'void', probe, after = {}, ...rest }) {
  const f = `f${folders}`
  const setup = [
    `CheckFolder ${f} = new CheckFolder("check-${folders++}");`,
    ...Object.entries(files).map(([n, t]) => `${f}.write("${n}", ${text(t)});`),
    ...(rest.setup ?? []),
    ...(probe ? [`CheckIo probe = () -> ${probe};`] : [])
  ]
  delete rest.setup
  return attempt({
    name,
    setup,
    call: call((n) => `${f}.path("${n}")`),
    type,
    after: { ...Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v(f)])), 'files left open': `${f}.open`, 'a path outside the folder': `${f}.left` },
    show: `${Object.entries(files).map(([n, t]) => `// ${n} holds ${shown(t)}`).join('\n')}${Object.keys(files).length ? '\n' : ''}${show}`,
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
      if (left) return { ...d, passed: false, message: `A path led out of the folder of the file Check handed over, to ${left}. Each method works on the path it is handed, and on files beside it: nothing else on the computer.` }
      if (d.passed && Number(value(r, 'files left open') ?? 0) > 0)
        return { ...d, passed: false, message: 'The answer is right, and the file is still open afterwards: something read or wrote it and was never closed.' }
      if (d.passed) return d
      const m = [...mistakes, ...(mistakes.includes(FILES_COMMON[0]) ? LAST : [])].find((k) => k.when(r, thrown(r), runs, codeOnly(ctx.section)))
      return m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r, thrown(r)) : m.hint } : d
    })
}

const FILES_COMMON = [
  {
    when: (r, x) => x && /check-folder:/.test(x.message ?? '') && /InvalidPath|NoSuchFile/.test(x.name) && !ownPath(x),
    hint: 'A path was made again from the text of the one Check handed over. The text of a path is for people to read: Check\'s prints as check-folder:/..., which is no place on this computer. Use the path the method is handed.'
  }
]

// Checked after every other mistake: a typed path may sit in another method than the one that failed.
const LAST = [
  {
    when: (r, x, runs, code) => !x && /Path\s*\.\s*of\s*\(|Paths\s*\.\s*get\s*\(|new\s+File\s*\(/.test(code),
    hint: 'A path is typed into the method, so it works on that file, whatever path it is handed. Check hands over a path to a file of its own: use the path the method is given.'
  }
]

const GOOD = [
  ['2031-07-02,Razorbill,31,103.85', ['2031-07-02', 'Razorbill', 31, '103.85']],
  [' 2031-07-02 , Guillemot , 12 , 40.20 ', ['2031-07-02', 'Guillemot', 12, '40.20']],
  ['1999-12-31,Sandpiper,0,0', ['1999-12-31', 'Sandpiper', 0, '0']]
]
const BAD = [
  ['2031-07-02,Razorbill,nine,100.50', 37, 'a number of passengers that is not a number'],
  ['2031-06-31,Guillemot,4,13.40', 52, 'a date that does not exist'],
  ['2031-07-02,Sandpiper,8', 205, 'three parts'],
  ['2031-07-02,Sandpiper,8,£26.80', 81, 'takings with a pound sign'],
  ['2031-07-02,Greenshank,8,26.80,late', 66, 'five parts'],
  ['2031-07-02,Razorbill,31,103.85,', 19, 'a comma too many at its end']
]

const HEADER = 'date,boat,passengers,takings'
const own = (n) => `Check's parse refuses line ${n}`
// Each file: its text, the sailings read, and the numbers of the lines refused.
const DAYS = [
  {
    name: 'read keeps the good lines of a file with Windows line ends',
    text: `${HEADER}\r\n2031-07-02,Razorbill,31,103.85\r\n2031-07-02,Guillemot,12,40.20\r\n2031-07-02,Razorbill,,0.00\r\n2031-07-02,Sandpiper,8,26.80`,
    good: [['2031-07-02', 'Razorbill', 31, '103.85'], ['2031-07-02', 'Guillemot', 12, '40.20'], ['2031-07-02', 'Sandpiper', 8, '26.80']],
    bad: [4]
  },
  {
    name: 'read with two bad lines, the last one of them at the end',
    text: `${HEADER}\n2031-07-03,Greenshank,5,16.75\n2031-07-03 Razorbill 9 30.15\n2031-07-03,Guillemot,22,73.70\n2031-07-03,Sandpiper,x,1.00\n`,
    good: [['2031-07-03', 'Greenshank', 5, '16.75'], ['2031-07-03', 'Guillemot', 22, '73.70']],
    bad: [3, 5]
  },
  {
    name: 'read with no bad lines',
    text: `${HEADER}\n2031-07-04,Razorbill,3,10.05\n2031-07-04,Guillemot,1,3.35\n`,
    good: [['2031-07-04', 'Razorbill', 3, '10.05'], ['2031-07-04', 'Guillemot', 1, '3.35']],
    bad: []
  },
  { name: 'read of a file with only its header', text: `${HEADER}\n`, good: [], bad: [] }
]

const REPORTS = [
  {
    name: 'write makes the report, with a problem',
    sailings: [['2031-07-02', 'Razorbill', 31, '103.85'], ['2031-07-02', 'Guillemot', 12, '40.2'], ['2031-07-02', 'Sandpiper', 8, '100']],
    problems: ['line 4 could not be read'],
    want: '2031-07-02 Razorbill 31 £103.85\n2031-07-02 Guillemot 12 £40.20\n2031-07-02 Sandpiper 8 £100.00\nTotal £244.05\nProblem: line 4 could not be read\n'
  },
  {
    name: 'write with no problems',
    sailings: [['1999-12-31', 'Greenshank', 2, '6.70']],
    problems: [],
    want: '1999-12-31 Greenshank 2 £6.70\nTotal £6.70\n'
  },
  {
    name: 'write with no sailings',
    sailings: [],
    problems: ['line 2 could not be read', 'line 3 could not be read'],
    want: 'Total £0.00\nProblem: line 2 could not be read\nProblem: line 3 could not be read\n'
  }
]

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
    parse: {
      task: 1,
      cases: [
        ...GOOD.map(([line, fields]) =>
          attempt({
            name: `parse reads ${shown(line)}`,
            call: `Lines.parse(${text(line)}, 12)`,
            show: `Sailing got = Lines.parse(${shown(line)}, 12);`,
            type: 'Sailing',
            after: { 'as a record': 'got == null ? null : got.toString()' },
            expected: { 'as a record': record(fields) },
            kind: 'good',
            line,
            hint: 'parse should give back a Sailing with the date, the boat, the passengers and the takings of the line, each part without the space around it.'
          })
        ),
        ...BAD.map(([line, n, why]) =>
          attempt({
            name: `parse refuses a line with ${why}`,
            call: `Lines.parse(${text(line)}, ${n})`,
            show: `Sailing got = Lines.parse(${shown(line)}, ${n});`,
            type: 'Sailing',
            throws: 'IllegalArgumentException',
            names: [String(n)],
            namesHint: `The IllegalArgumentException is right, and its message should name the line's number, ${n} here, so whoever reads it can find the line in the file.`,
            kind: 'bad',
            line,
            hint: 'A line that cannot be read should throw an IllegalArgumentException whose message names the line\'s number.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => r.case.kind === 'bad' && x && ['NumberFormatException', 'DateTimeParseException', 'ArrayIndexOutOfBoundsException', 'DateTimeException'].includes(x.name),
          hint: (r, x) =>
            x.name === 'ArrayIndexOutOfBoundsException'
              ? 'parse reads a part the line does not have, and an ArrayIndexOutOfBoundsException escapes. Count the parts first: a line without exactly four is refused with an IllegalArgumentException that names its number.'
              : `parse lets the ${x.name} out as it came, and its message names the part it could not read, never the line's number. Catch it, and throw an IllegalArgumentException whose message names the number, with the ${x.name} as its cause.`
        },
        {
          when: (r, x) => r.case.kind === 'good' && x && / /.test(r.case.line),
          hint: 'parse cannot read a line with spaces around its parts. Take the space off each part before reading it.'
        },
        {
          when: (r, x) => r.case.kind === 'good' && !x && /boat= /.test(value(r, 'as a record') ?? ''),
          hint: 'The boat keeps the spaces around it. Take the space off each part, the boat\'s too.'
        },
        {
          when: (r, x) => r.case.kind === 'bad' && !x && r.case.line.endsWith(','),
          hint: 'parse gives back a Sailing for a line with a comma too many at its end. split drops the empty parts at the very end, so that line seems to have four: the lesson shows how to keep them.'
        },
        {
          when: (r, x) => r.case.kind === 'bad' && !x,
          hint: 'parse gives back a Sailing for a line that cannot be read. Count its parts, and let each part that is not what it should be refuse the line.'
        }
      ])
    },

    read: {
      task: 2,
      stub: `${CHECK_FOLDER}\n${IO}\n${LINES}`,
      cases: [
        ...DAYS.map((day, i) =>
          inFolder({
            name: day.name,
            files: { 'day.csv': day.text },
            setup: ['List<String> problems = new ArrayList<>();'],
            call: (at) => `Day.read(${at('day.csv')}, problems)`,
            show: 'List<String> problems = new ArrayList<>();\nList<Sailing> got = Day.read(path to day.csv, problems);',
            probe: i === 0 ? 'Day.read(null, null)' : undefined,
            type: 'List<Sailing>',
            after: { 'problems afterwards': () => 'problems' },
            expected: { got: day.good.map(record), 'problems afterwards': day.bad.map(own) },
            kind: 'day',
            day,
            hint: 'read should give back a Sailing for each good line after the header, in order, and add the message of each refused line to problems.'
          })
        ),
        inFolder({
          name: 'read lets the caller know a file is not there',
          setup: ['List<String> problems = new ArrayList<>();'],
          call: (at) => `Day.read(${at('gone.csv')}, problems)`,
          show: 'List<String> problems = new ArrayList<>();\nList<Sailing> got = Day.read(path to gone.csv, which is not there, problems);',
          type: 'List<Sailing>',
          throws: 'NoSuchFileException',
          kind: 'missing',
          hint: 'Reading a file that is not there throws a NoSuchFileException, and the task asks read to let it reach the caller.'
        })
      ],
      judge: judge([
        ...FILES_COMMON,
        {
          when: (r, x) => r.case.kind === 'day' && x?.name === 'IllegalArgumentException' && /Check's parse refuses line/.test(x.message ?? ''),
          hint: (r, x) => /line 1$/.test(x.message) ? 'read hands the header line to parse, which refuses it, and the refusal stops the whole read. The first line of the file is the header, not a sailing.' : 'read stops at the first line parse refuses, so the good lines after it are never read. A refused line is left out and its message added to problems; the lines after it are still read.'
        },
        {
          when: (r, x) => r.case.kind === 'day' && !x && (items(r, 'problems afterwards') ?? []).includes(own(1)),
          hint: 'read hands the header line to parse, and adds its refusal to problems. The first line of the file is the header, not a sailing: start after it.'
        },
        {
          when: (r, x) => r.case.kind === 'day' && !x && r.case.day.bad.length > 0 && (items(r, 'problems afterwards') ?? []).length === 0,
          hint: 'read leaves a refused line out in silence: problems stays empty. Each refused line\'s message goes into problems, so whoever reads the report knows which line to look at.'
        },
        {
          when: (r, x) => r.case.kind === 'day' && !x && JSON.stringify(items(r, 'problems afterwards')) === JSON.stringify(r.case.day.bad.map((n) => own(n - 1))),
          hint: 'The problems name a line one before the one refused. The file numbers its lines from 1, and its header is line 1: the first sailing is line 2.'
        },
        {
          when: (r, x) => r.case.kind === 'day' && !x && JSON.stringify(items(r, 'problems afterwards')) === JSON.stringify(r.case.day.bad.map((n) => own(n + 1))),
          hint: 'The problems name a line one after the one refused. The file numbers its lines from 1, and its header is line 1: the first sailing is line 2.'
        },
        {
          when: (r, x) => r.case.kind === 'day' && !x && r.case.day.bad.length > 0 && JSON.stringify(items(r, 'problems afterwards')) === JSON.stringify([own(r.case.day.bad[0])]) && (items(r, 'got') ?? []).length < r.case.day.good.length,
          hint: 'read stops at the first line parse refuses, so the good lines after it are never read: a catch around the whole loop ends the loop there. A refused line is left out and its message added to problems; the lines after it are still read.'
        },
        {
          when: (r, x) => r.case.kind === 'missing' && !x,
          hint: 'read gives back an answer for a file that is not there. The task asks it to let the caller know: let the NoSuchFileException reach the caller.'
        }
      ])
    },

    report: {
      task: 3,
      stub: `${CHECK_FOLDER}\n${IO}`,
      cases: [
        ...[
          [[['2031-07-02', 'Razorbill', 31, '103.85'], ['2031-07-02', 'Guillemot', 12, '40.20'], ['2031-07-02', 'Sandpiper', 8, '26.80']], '170.85'],
          [[['2031-07-05', 'Greenshank', 4, '12.5'], ['2031-07-05', 'Razorbill', 1, '0.05']], '12.55'],
          [[], '0']
        ].map(([list, sum]) =>
          attempt({
            name: list.length ? `takings of ${list.length} sailings` : 'takings of no sailings',
            call: `Report.takings(new ArrayList<>(List.of(${list.map(sailing).join(', ')})))`,
            show: `BigDecimal got = Report.takings(List.of(${list.map(sailingShown).join(', ')}));`,
            type: 'BigDecimal',
            after: { 'as text': 'got == null ? null : got.toPlainString()', 'the same amount as the right one': `got != null && got.compareTo(new BigDecimal("${sum}")) == 0` },
            expected: { 'the same amount as the right one': true },
            kind: 'takings',
            hint: list.length ? 'takings should give back the takings of every sailing, added up.' : 'With no sailings, takings should give back 0.'
          })
        ),
        ...REPORTS.map((rep, i) =>
          inFolder({
            name: rep.name,
            files: { 'report.txt': 'Yesterday\'s report\nTotal £1.00\n' },
            call: (at) => `Report.write(${at('report.txt')}, new ArrayList<>(List.of(${rep.sailings.map(sailing).join(', ')})), new ArrayList<>(List.of(${rep.problems.map(text).join(', ')})))`,
            show: `Report.write(path to report.txt, List.of(${rep.sailings.map(sailingShown).join(', ')}), List.of(${rep.problems.map(shown).join(', ')}));`,
            probe: i === 0 ? 'Report.write(null, null, null)' : undefined,
            after: { 'report.txt afterwards': (f) => `${f}.read("report.txt")` },
            expected: { 'report.txt afterwards': rep.want },
            kind: 'write',
            report: rep,
            hint: 'write should leave the file holding a line per sailing, then Total and the takings, then a Problem line for each problem, each line followed by "\\n", every amount with a pound sign and two decimal places.'
          })
        )
      ],
      judge: judge([
        ...FILES_COMMON,
        {
          when: (r, x) => !x && r.case.kind === 'takings' && /\.\d{5,}/.test(value(r, 'as text') ?? ''),
          hint: 'The total ends in a long tail of decimal places: the takings went through a double on their way, which holds most amounts only nearly. Keep them in BigDecimal, as the money issue did.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'write' && /\r\n/.test(value(r, 'report.txt afterwards') ?? ''),
          hint: 'The lines end in "\\r\\n", which is how a Windows computer ends a line, and Check runs with that line end. Writing a list of lines, or %n, uses the computer\'s line end; the task gives its own, "\\n".'
        },
        {
          when: (r, x) => !x && r.case.kind === 'write' && /£\d+,\d\d/.test(value(r, 'report.txt afterwards') ?? ''),
          hint: 'An amount is written with a comma. Check runs with the formats of a computer in Germany, and String.format writes numbers the way the computer\'s language does. The report shows a point wherever it is printed, as the money issue showed.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'write' && (value(r, 'report.txt afterwards') ?? '').startsWith("Yesterday's report"),
          hint: 'write adds to the end of the file, so yesterday\'s report is still there. The task asks for the report and nothing else.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'write' && /£\d+(?:\.\d)?(?:\s|$)/.test(value(r, 'report.txt afterwards') ?? ''),
          hint: 'An amount is written as it came, such as £40.2 or £100. Every amount in the report has two decimal places.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'write' && r.case.report.problems.length > 0 && !/Problem: /.test(value(r, 'report.txt afterwards') ?? ''),
          hint: 'The report leaves out the problems. Each one goes on its own line after Total, after Problem: and a space.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'write' && !(value(r, 'report.txt afterwards') ?? '').endsWith('\n'),
          hint: 'The last line has no "\\n" after it. Every line of the report, the last one too, is followed by "\\n".'
        }
      ])
    }
  }
})
