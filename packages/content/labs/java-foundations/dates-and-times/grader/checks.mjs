import { attempt as plain, codeOnly, explainValue, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'SeasonPass.java'
const value = (r, name) => r.values[name]?.value ?? null
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message') } : null)

// Every text Check hands over is made while the program runs. Every date is far from today, so
// an answer read from the computer's clock shows; Check's JVM also runs in a time zone of its own.
const text = (s) => `new String(${JSON.stringify(s)})`
const date = (s) => `LocalDate.of(${s.split('-').map(Number).join(', ')})`
const dateTime = (s) => {
  const [d, t] = s.split('T')
  return `LocalDateTime.of(${d.split('-').map(Number).join(', ')}, ${t.split(':').map(Number).join(', ')})`
}

// A date or a time that comes back is read as its text.
function attempt(c) {
  if (!['LocalDate', 'LocalDateTime'].includes(c.type) || !c.expected || !('got' in c.expected)) return plain(c)
  const { got, ...rest } = c.expected
  return plain({ ...c, after: { 'as text': 'got == null ? null : got.toString()', ...(c.after ?? {}) }, expected: { ...rest, 'as text': got } })
}

function judge(mistakes) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainValue })(runs, ctx).map((d, i) => {
      if (d.passed) return d
      const r = runs[i]
      if (r.case.accept?.(thrown(r))) return { ...d, passed: true, message: undefined }
      const m = mistakes.find((k) => k.when(r, thrown(r), runs, codeOnly(ctx.section)))
      return m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r, thrown(r)) : m.hint } : d
    })
}

const readsClock = (code) => /\bnow\s*\(/.test(code)
const CLOCK = (method) =>
  `${method} reads today's date or the time from the computer's clock. The task hands today in, so the answer is about the day Check names, and Check names days years away from today: use the dates the method is handed.`

const EXPIRES = [
  ['2031-01-31', 1, '2031-02-28'],
  ['2028-01-31', 1, '2028-02-29'],
  ['2030-11-15', 3, '2031-02-15'],
  ['2031-08-31', 6, '2032-02-29'],
  ['1998-05-20', 12, '1999-05-20']
]
const plusDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
// The right number of days, and the days part of the Period between the two.
const LEFT = [
  ['2031-01-20', '2031-03-04', 43, 12],
  ['2031-03-04', '2031-03-04', 0, 0],
  ['2031-12-30', '2032-01-02', 3, 3],
  ['2031-05-10', '2031-05-01', -9, -9],
  ['1999-02-01', '2000-02-01', 365, 0]
]
const CROSSING = [
  ['2031-03-04T23:40', '2031-03-05T00:25', 45],
  ['2031-06-01T09:05', '2031-06-01T10:32', 87],
  ['1999-12-31T22:50', '2000-01-01T01:10', 140]
]
const HEADINGS = [
  ['2031-03-04', 'Tuesday 4 March 2031'],
  ['2029-12-31', 'Monday 31 December 2029'],
  ['1999-07-09', 'Friday 9 July 1999']
]
const RUNS = [
  ['2031-03-08', 'a Saturday', true],
  ['2031-03-09', 'a Sunday', false],
  ['2031-03-10', 'a Monday', true],
  ['2000-01-02', 'a Sunday', false],
  ['1999-07-09', 'a Friday', true]
]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    make: {
      task: 1,
      cases: [
        ...[
          ['2031-03-04', '14:05', '2031-03-04T14:05'],
          ['1998-12-31', '23:59', '1998-12-31T23:59'],
          ['2032-02-29', '06:00', '2032-02-29T06:00']
        ].map(([d, t, want]) =>
          attempt({
            name: `departure("${d}", "${t}")`,
            call: `Dates.departure(${text(d)}, ${text(t)})`,
            show: `LocalDateTime got = Dates.departure("${d}", "${t}");`,
            type: 'LocalDateTime',
            expected: { got: want },
            kind: 'departure',
            hint: 'departure should give back the date and the time the two texts say.'
          })
        ),
        ...[
          ['2031-02-29', '10:00', '2031-02-29', 'a day that does not exist: 2031 has no 29 February'],
          ['2031-03-04', '9:05', '9:05', 'a time written with one digit for the hour'],
          ['4 March 2031', '14:05', '4 March 2031', 'a day not written year-month-day']
        ].map(([d, t, named, why]) =>
          attempt({
            name: `departure refuses ${why}`,
            call: `Dates.departure(${text(d)}, ${text(t)})`,
            show: `LocalDateTime got = Dates.departure("${d}", "${t}");`,
            type: 'LocalDateTime',
            throws: 'DateTimeParseException',
            names: [named],
            kind: 'departure-bad',
            hint: `Reading ${JSON.stringify(named)} throws a DateTimeParseException that names it, and the task asks departure to let it reach the caller as it is.`
          })
        ),
        ...[
          [4, 3, 2031, '2031-03-04'],
          [29, 2, 2028, '2028-02-29'],
          [1, 12, 1999, '1999-12-01']
        ].map(([d, m, y, want]) =>
          attempt({
            name: `onClipboard(${d}, ${m}, ${y})`,
            call: `Dates.onClipboard(${d}, ${m}, ${y})`,
            type: 'LocalDate',
            expected: { got: want },
            kind: 'clipboard',
            hint: 'onClipboard should give back the date with that day, month and year.'
          })
        ),
        ...[
          [31, 4, 2031],
          [29, 2, 2031]
        ].map(([d, m, y]) =>
          attempt({
            name: `onClipboard refuses ${d}/${m}/${y}, which does not exist`,
            call: `Dates.onClipboard(${d}, ${m}, ${y})`,
            type: 'LocalDate',
            throws: 'DateTimeException',
            // A DateTimeParseException is a DateTimeException too, as when the date is made by reading text.
            accept: (x) => x?.name === 'DateTimeParseException',
            kind: 'clipboard-bad',
            hint: 'Making a date that does not exist throws a DateTimeException, and the task asks onClipboard to let it reach the caller.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => r.case.kind?.startsWith('clipboard') && x?.name === 'DateTimeException' && /Invalid value for (?:DayOfMonth|MonthOfYear)/.test(x.message ?? '') && r.case.kind === 'clipboard',
          hint: 'onClipboard hands LocalDate.of its values in another order than it takes them: the message below names the part that got a value it cannot hold. Compare your order with the one the lesson shows.'
        },
        {
          when: (r, x) => r.case.kind === 'departure-bad' && !x && value(r, 'got') === null,
          hint: 'departure gives back null for a text that is not a date or a time. The task asks it to let the exception reach the caller, so whoever called it knows the text was wrong.'
        },
        {
          when: (r, x) => r.case.kind === 'departure-bad' && !x,
          hint: 'departure gives back a date and time for a text that does not say one. Read each text as it is written, and let what reading a bad one throws reach the caller.'
        },
        {
          when: (r, x) => r.case.kind === 'departure-bad' && x && x.name !== 'DateTimeParseException',
          hint: (r, x) => `departure throws ${/^[AEIOU]/.test(x.name) ? 'an' : 'a'} ${x.name} of its own for a text it cannot read. The DateTimeParseException that reading it throws already names the text: let that one reach the caller.`
        },
        {
          when: (r, x) => r.case.kind === 'departure' && x?.name === 'DateTimeParseException',
          hint: 'departure cannot read a day and a time that are written right. A date read from text with nothing more is written year-month-day, and a time hour:minute: read each with its own type, then put the two together.'
        }
      ])
    },

    count: {
      task: 2,
      cases: [
        ...EXPIRES.map(([b, m, want]) =>
          attempt({
            name: `expires for ${m} month${m > 1 ? 's' : ''} from ${b}`,
            call: `Passes.expires(${date(b)}, ${m})`,
            type: 'LocalDate',
            expected: { got: want },
            kind: 'expires',
            args: [b, m],
            hint: 'expires should give back the same day of the month, months later, or the last day of the month when that month is shorter.'
          })
        ),
        ...LEFT.map(([t, e, want, period]) =>
          attempt({
            name: `daysLeft from ${t} to ${e}`,
            call: `Passes.daysLeft(${date(t)}, ${date(e)})`,
            type: 'long',
            expected: { got: want },
            kind: 'left',
            args: [t, e],
            period,
            hint: 'daysLeft should give back the number of days from today to expires: 0 on the day itself, below 0 once it has run out.'
          })
        ),
        ...CROSSING.map(([a, b, want]) =>
          attempt({
            name: `crossingMinutes from ${a.replace('T', ' ')} to ${b.replace('T', ' ')}`,
            call: `Passes.crossingMinutes(${dateTime(a)}, ${dateTime(b)})`,
            type: 'long',
            expected: { got: want },
            kind: 'minutes',
            hint: 'crossingMinutes should give back the minutes from leaves to arrives, the date included.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x, runs, code) => !x && readsClock(code) && ['left', 'expires'].includes(r.case.kind),
          hint: (r) => CLOCK(r.case.kind === 'left' ? 'daysLeft' : 'expires')
        },
        {
          when: (r, x) => !x && r.case.kind === 'expires' && value(r, 'as text') === plusDays(r.case.args[0], 30 * r.case.args[1]),
          hint: 'expires counts a month as 30 days, so a pass drifts away from its day of the month. Months are not all one length: add months, and Java keeps the day of the month, or the last day of a shorter month.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'left' && runs.filter((q) => q.case.kind === 'left').every((q) => Number(value(q, 'got')) === q.case.period),
          hint: 'daysLeft gives back only the days part of the gap, as a Period holds it: months and years apart are left out. The task asks for the whole gap counted in days.'
        },
        {
          when: (r, x) => x?.name === 'UnsupportedTemporalTypeException' && /Seconds/.test(x.message ?? '') && r.case.kind === 'left',
          hint: 'daysLeft asks for a Duration between two dates. A Duration measures time down to the second, and a LocalDate has no time of day, so Java cannot work one out. Days between two dates are counted another way: the lesson shows it.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'left' && Number(value(r, 'got')) === -r.case.expected.got && r.case.expected.got !== 0,
          hint: 'daysLeft counts the gap the wrong way round: from expires back to today. Count from today to expires, so a pass that runs out later has days left above 0.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'minutes' && Number(value(r, 'got')) < 0,
          hint: 'crossingMinutes gives back a number below 0 for a crossing that goes past midnight: it looks at the time of day and leaves out the date. Measure from one date and time to the other.'
        }
      ])
    },

    print: {
      task: 3,
      cases: [
        ...HEADINGS.map(([d, want]) =>
          attempt({
            name: `heading for ${d}`,
            call: `Timetable.heading(${date(d)})`,
            type: 'String',
            expected: { got: want },
            kind: 'heading',
            hint: 'heading should give back the day of the week, the day of the month, the month\'s name and the year, in English, with a space between each.'
          })
        ),
        ...RUNS.map(([d, what, want]) =>
          attempt({
            name: `runs on ${d}, ${what}`,
            call: `Timetable.runs(${date(d)})`,
            type: 'boolean',
            expected: { got: want },
            kind: 'runs',
            day: what,
            hint: want ? `Boats run on ${what}: every day but Sunday.` : 'No boats run on a Sunday.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'heading' && /Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag/.test(value(r, 'got') ?? ''),
          hint: 'heading writes the names in German. Check runs with the language of a computer in Germany, and a pattern with no language follows the computer\'s. The timetable is in English wherever it is printed: a formatter can be told its language, as the lesson shows.'
        },
        {
          when: (r, x) => x?.name === 'UnsupportedTemporalTypeException' && r.case.kind === 'heading',
          hint: 'heading\'s pattern asks a date for a part of the time of day, which a LocalDate does not have: small m in a pattern means minutes. The lesson has a table of the letters.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'heading' && /\b20(?:30)\b/.test(value(r, 'got') ?? '') && r.case.expected.got.endsWith('2029'),
          hint: 'heading writes 31 December 2029 as in 2030. Capital Y in a pattern is the year a week belongs to, and the last days of December can belong to the first week of the next year. The year of the calendar has its own letter: the lesson has a table.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'heading' && /\b\d{2}\b/.test((value(r, 'got') ?? '').replace(/\d{4}/, '')) && !/[A-Z][a-z]+ \d{4}$/.test(value(r, 'got') ?? ''),
          hint: 'heading writes the month as a number. The timetable gives its name: in a pattern, the number of letters decides between a number and a name.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'heading' && (value(r, 'got') ?? '').toLowerCase() === r.case.expected.got.toLowerCase(),
          hint: 'heading writes the names all in capital letters, as an enum\'s name is. The timetable writes them with one capital: a formatter writes names the way they are written in the language.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'runs' && r.case.day === 'a Saturday' && value(r, 'got') === 'false',
          hint: 'runs says no boats run on a Saturday. The days of the week are numbered from Monday as 1, so Saturday is 6 and Sunday 7.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'runs' && r.case.day === 'a Sunday' && value(r, 'got') === 'true',
          hint: 'runs says boats run on a Sunday. The days of the week are numbered from Monday as 1, so Sunday is 7, never 0.'
        }
      ])
    }
  }
})
