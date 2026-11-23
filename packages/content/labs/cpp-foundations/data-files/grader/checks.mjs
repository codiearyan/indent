import { cppText, fileText, judgeFile, num, quoted } from '../../grading.mjs'

const FILE = 'src/day.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const HEADING = 'ticket,item,minutes,parts'

// Check's own versions of the given tools, so a task never depends on what became of them.
const swaps = [
  { name: 'trim', lines: 'std::string trim(const std::string& text) { std::size_t a = text.find_first_not_of(" \\t\\r"); if (a == std::string::npos) return ""; return text.substr(a, text.find_last_not_of(" \\t\\r") - a + 1); }' },
  { name: 'splitAt', lines: 'std::vector<std::string> splitAt(const std::string& line, char separator) { std::vector<std::string> f; std::size_t s = 0; for (;;) { std::size_t at = line.find(separator, s); if (at == std::string::npos) { f.push_back(line.substr(s)); return f; } f.push_back(line.substr(s, at - s)); s = at + 1; } }' },
  { name: 'toWhole', lines: 'std::optional<int> toWhole(const std::string& text) { std::istringstream in(text); int n = 0; char c = 0; if (!(in >> n) || in >> c) return std::nullopt; return n; }' },
  { name: 'toAmount', lines: 'std::optional<double> toAmount(const std::string& text) { std::istringstream in(text); double n = 0; char c = 0; if (!(in >> n) || in >> c) return std::nullopt; return n; }' }
]
const base = { files: [FILE], own: ['Repair'], swaps }

const PARSE = ['bool parseRepair(const std::string& line, Repair& repair) { std::vector<std::string> f = splitAt(line, \',\'); if (f.size() != 4) return false; auto t = toWhole(trim(f[0])); std::string i = trim(f[1]); auto m = toWhole(trim(f[2])); auto p = toAmount(trim(f[3])); if (!t || i.empty() || !m || !p) return false; repair.ticket = *t; repair.item = i; repair.minutes = *m; repair.parts = *p; return true; }']
const READ = ['std::vector<Repair> readRepairs(std::istream& in, std::vector<int>& refused) { std::vector<Repair> out; std::string line; int n = 0; while (std::getline(in, line)) { n++; if (n == 1 || trim(line).empty()) continue; Repair r; if (parseRepair(line, r)) out.push_back(r); else refused.push_back(n); } return out; }']
const REPORT = ['void writeReport(std::ostream& out, const std::vector<Repair>& repairs, const std::vector<int>& refused) { int m = 0; double p = 0; for (const Repair& r : repairs) { m += r.minutes; p += r.parts; } out << "Repairs: " << repairs.size() << \'\\n\' << "Minutes: " << m << \'\\n\' << "Parts: " << std::fixed << std::setprecision(2) << p << \'\\n\' << "Refused: "; if (refused.empty()) out << "none"; for (std::size_t i = 0; i < refused.size(); i++) out << (i ? ", " : "") << refused[i]; out << \'\\n\'; }']

const listOf = (got, key) => {
  try {
    return JSON.parse(got[key])
  } catch {
    return null
  }
}
const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
const numbers = (list) => (list === null ? 'nothing Check could read' : list.length ? list.join(', ') : 'none')
const report = (repairs, refused) => {
  const minutes = repairs.reduce((a, r) => a + r[2], 0)
  const parts = repairs.reduce((a, r) => a + r[3], 0)
  return `Repairs: ${repairs.length}\nMinutes: ${minutes}\nParts: ${parts.toFixed(2)}\nRefused: ${refused.length ? refused.join(', ') : 'none'}\n`
}
const reportLines = (text) => (text === null ? 'no file' : text === '' ? 'nothing' : text.split('\n').filter((l, i, all) => i < all.length - 1 || l !== '').map((l) => `  ${JSON.stringify(l)}`).join('\n'))

/** What is wrong with a written report, in words that never show the report Check wanted. */
function reportProblem(text, repairs, refused, who) {
  const want = report(repairs, refused)
  if (text === want) return null
  const lines = text.split('\n')
  const wantLines = want.split('\n')
  if (text === want.slice(0, -1)) return `The last line of the report has no line end. Each of the four lines ends with one.`
  for (const [k, label] of ['Repairs', 'Minutes', 'Parts', 'Refused'].entries()) {
    const got = lines[k] ?? ''
    if (got === wantLines[k]) continue
    if (!got.startsWith(`${label}: `)) return `Line ${k + 1} of the report is ${quoted(got)}. The four lines start with "Repairs: ", "Minutes: ", "Parts: " and "Refused: ", in that order.`
    const value = got.slice(label.length + 2)
    if (label === 'Parts') {
      const pence = repairs.reduce((a, r) => a + Math.trunc(r[3]), 0)
      const total = repairs.reduce((a, r) => a + r[3], 0)
      if (value === String(pence) && Math.abs(pence - total) > 1e-9) return `The Parts line has the parts added up in whole numbers, so the pence are lost. Parts have pence: their total is kept in a double.`
      if (!/^-?\d+\.\d\d$/.test(value)) return `The Parts line reads ${quoted(got)}. The task asks for exactly 2 decimals, whatever the total: a stream writes as few as it needs until it is told otherwise, as in part 1.`
      if (value === pence.toFixed(2)) return `The Parts line has the parts added up in whole numbers, so the pence are lost. Parts have pence: their total is kept in a double.`
      return `The Parts line reads ${quoted(got)}. It has all the parts added up, with exactly 2 decimals.`
    }
    if (label === 'Refused') {
      if (!refused.length) return `With no refused lines, the last line reads ${quoted(got)}. When there are none, it says so in a word: the task gives it.`
      if (/,\s*$/.test(value) || /^\s*,/.test(value)) return `The Refused line reads ${quoted(got)}: a comma too many. ", " goes between two numbers, so a list of n numbers has n - 1 of them.`
      return `The Refused line reads ${quoted(got)}. It lists the refused line numbers in order, with ", " between them.`
    }
    return `Line ${k + 1} of the report reads ${quoted(got)}. ${label === 'Repairs' ? 'It says how many repairs there are.' : 'It has all the minutes added up.'}`
  }
  return `${who} wrote more than the four lines of the report.`
}

export const checks = {
  parseRepair(t) {
    const lines = [
      ['4417,carriage clock,95,12.50', [4417, 'carriage clock', 95, 12.5], 'four good fields'],
      ['  52 , pocket watch ,30 , 0.75\r', [52, 'pocket watch', 30, 0.75], 'blanks around the fields and a Windows line end'],
      ['61,wall clock,50', null, 'only three fields'],
      ['61,wall clock,50,4.00,5', null, 'five fields'],
      ['6l,wall clock,50,4.00', null, 'a letter in the ticket'],
      ['61,wall clock,,4.00', null, 'empty minutes'],
      ['61, ,50,4.00', null, 'an item of only a space'],
      ['61,wall clock,50,four', null, 'parts written as a word']
    ]
    return judgeFile(t, {
      ...base,
      task: 1,
      fn: 'parseRepair',
      sig: {
        returns: 'bool',
        params: [
          { type: 'const std::string&', what: 'the line' },
          { type: 'Repair&', what: 'the repair' }
        ]
      },
      callWith: 'const std::string&, Repair&',
      crashed: (r) =>
        r.signal === 'SIGTRAP' || r.signal === 'SIGILL' || r.signal === 'SIGABRT' || /out of bounds|__glibcxx_assert|Assertion/.test(r.stderr ?? '')
          ? 'The program stopped while parseRepair ran, at a guard of the standard library: a line read a field the line does not have, with [] past the end of the fields. A line with a field missing is the usual mistake in a data file: ask how many fields there are before you use them.'
          : null,
      cases: lines.map(([line, want, what]) => ({
        name: `parseRepair of a line with ${what}`,
        code: `Repair r; r.ticket = 9999; r.item = "kept"; r.minutes = 1; r.parts = 1.5; ${put('ok', `parseRepair(${cppText(line)}, r) ? 1 : 0`)} ${put('t', 'r.ticket')} ${put('i', 'r.item')} ${put('m', 'r.minutes')} ${put('p', 'r.parts')}`,
        judge: (got) => {
          const ok = num(got, 'ok')
          const filled = [num(got, 't'), got.i, num(got, 'm'), num(got, 'p')]
          const untouched = filled[0] === 9999 && filled[1] === 'kept' && filled[2] === 1 && filled[3] === 1.5
          if (want === null) {
            if (ok === 1) {
              if (what === 'empty minutes') return 'For a line whose minutes are empty, parseRepair gave back true. An empty field is not 0 minutes: it holds no number, and the line is refused.'
              if (what.includes('item')) return 'For a line whose item is only a space, parseRepair gave back true. Once its blanks are trimmed, the item is empty, and the line is refused.'
              if (what.includes('fields')) return `For a line with ${what.replace('only ', '')}, parseRepair gave back true. A repair line has exactly four fields.`
              return `For a line with ${what}, parseRepair gave back true. A field that should be a number and is not one makes the whole line refused.`
            }
            if (!untouched) return `For a line with ${what}, parseRepair gave back false, as it should, and Check's repair changed all the same: it now holds ${filled[0]}, ${quoted(filled[1])}, ${filled[2]}, ${filled[3]}. A refused line leaves the repair as it was: fill it in only once every field is known to be good.`
            return null
          }
          if (ok !== 1) {
            if (what.includes('blanks')) return 'For a line with blanks around its fields and a Windows line end, parseRepair gave back false. Blanks around a field do not count: trim each field before you read it.'
            return `For ${quoted(line)}, parseRepair gave back false.${want[3] % 1 ? ' The parts have pence: they are an amount, not a whole number.' : ''}`
          }
          if (filled[1] !== want[1]) return `parseRepair filled in the item as ${quoted(filled[1])}. Blanks around a field do not count.`
          if (filled[0] !== want[0] || filled[2] !== want[2] || Math.abs((filled[3] ?? NaN) - want[3]) > 1e-9) return `For ${quoted(line)}, parseRepair filled in the repair as ${filled[0]}, ${quoted(filled[1])}, ${filled[2]}, ${filled[3]}: compare each with its field.`
          return null
        },
        output: (got) => `parseRepair(${quoted(line)}, repair) gave back ${num(got, 'ok') === 1 ? 'true' : num(got, 'ok') === 0 ? 'false' : '?'}; the repair holds ${got.t ?? '?'}, ${quoted(got.i)}, ${got.m ?? '?'}, ${got.p ?? '?'}`
      }))
    })
  },

  readRepairs(t) {
    const streams = [
      { what: 'two good lines', text: `${HEADING}\n4417,carriage clock,95,12.50\n52,pocket watch,30,0.75\n`, tickets: [4417, 52], refused: [] },
      { what: 'two bad lines and blank ones between good lines', text: `${HEADING}\n4417,carriage clock,95,12.50\n61,wall clock,fifty,4.00\n\n52,pocket watch,30,0.75\n7,cuckoo clock,20\n  \n`, tickets: [4417, 52], refused: [3, 6] },
      { what: 'Windows line ends and a blank line', text: `${HEADING}\r\n4417,carriage clock,95,12.50\r\n\r\n52,pocket watch,30,0.75\r\n`, tickets: [4417, 52], refused: [] },
      { what: 'a bad line first and no line end after the last', text: `${HEADING}\nticket 9,ship clock,5,1.00\n61,wall clock,50,4.00`, tickets: [61], refused: [2] },
      { what: 'only the heading', text: `${HEADING}\n`, tickets: [], refused: [] },
      { what: 'nothing at all', text: '', tickets: [], refused: [] }
    ]
    return judgeFile(t, {
      ...base,
      task: 2,
      fn: 'readRepairs',
      provides: [{ name: 'parseRepair', task: 1, file: FILE, lines: PARSE }],
      sig: {
        returns: 'std::vector<Repair>',
        params: [
          { type: 'std::istream&', what: 'the stream' },
          { type: 'std::vector<int>&', what: 'the refused lines' }
        ]
      },
      callWith: 'std::istream&, std::vector<int>&',
      cases: streams.map((s) => ({
        name: `readRepairs on ${s.what}`,
        code: `std::istringstream in(${cppText(s.text)}); std::vector<int> refused; std::vector<Repair> got = readRepairs(in, refused); std::vector<int> tickets; for (const Repair& r : got) tickets.push_back(r.ticket); ${put('tickets', 'tickets')} ${put('refused', 'refused')}`,
        judge: (got) => {
          const tickets = listOf(got, 'tickets')
          const refused = listOf(got, 'refused')
          if (same(tickets, s.tickets) && same(refused, s.refused)) return null
          if (tickets === null || refused === null) return 'Check could not read what readRepairs gave back.'
          if (refused[0] === 1 && s.text) return 'readRepairs refused line 1, the heading. The heading names the fields and is no repair: it is skipped.'
          if (s.refused.length && same(refused, s.refused.map((n) => n - 1))) return `readRepairs refused lines ${numbers(refused)}, one less than the lines that are wrong. Lines are counted as a person counting the file would: the heading is line 1, and the first line after it is line 2.`
          if (s.refused.length && same(refused, s.refused.map((n) => n - 2))) return `readRepairs refused lines ${numbers(refused)}, two less than the lines that are wrong: the heading is line 1, and the first line after it is line 2.`
          if (s.refused.length && refused.length < s.refused.length && tickets.length < s.tickets.length) return `readRepairs stopped at the first bad line: it gave back the repairs ${numbers(tickets)} and refused ${numbers(refused)}. One bad line is refused, and the lines after it are still read.`
          if (s.refused.length && !refused.length) return `readRepairs refused no line, and the stream has lines that are not repairs: they were left out without a word. Their line numbers go into the refused lines.`
          if (refused.length > s.refused.length && refused.some((n) => !s.refused.includes(n))) {
            return s.what.includes('Windows')
              ? `readRepairs refused line ${numbers(refused.filter((n) => !s.refused.includes(n)))}, which holds only a carriage return, as an empty line of a Windows file does. A line of only blanks is skipped: look at whether the line is empty once its blanks are trimmed.`
              : `readRepairs refused lines ${numbers(refused)}, and some of them are blank. A line that is empty, or only blanks, is skipped, not refused.`
          }
          return `On ${s.what}, readRepairs gave back the repairs ${numbers(tickets)} and refused ${numbers(refused)}.`
        },
        output: (got) => `The stream holds ${quoted(s.text)}\nreadRepairs gave back the tickets ${numbers(listOf(got, 'tickets'))} and refused the lines ${numbers(listOf(got, 'refused'))}`
      }))
    })
  },

  writeReport(t) {
    const reports = [
      { what: 'two repairs and two refused lines', repairs: [[4417, 'carriage clock', 95, 12.5], [52, 'pocket watch', 30, 0.75]], refused: [3, 6] },
      { what: 'one repair and no refused lines', repairs: [[61, 'wall clock', 50, 4]], refused: [] },
      { what: 'parts that add up from pence', repairs: [[1, 'ship clock', 10, 0.25], [2, 'travel clock', 20, 0.5], [3, 'wall clock', 30, 0.25]], refused: [9] },
      { what: 'nothing at all', repairs: [], refused: [] }
    ]
    const repairsCpp = (list) => `std::vector<Repair> repairs; ${list.map(([t, i, m, p]) => `{ Repair r; r.ticket = ${t}; r.item = ${cppText(i)}; r.minutes = ${m}; r.parts = ${p}; repairs.push_back(r); }`).join(' ')}`
    return judgeFile(t, {
      ...base,
      task: 3,
      fn: 'writeReport',
      sig: {
        returns: 'void',
        params: [
          { type: 'std::ostream&', what: 'the stream' },
          { type: 'const std::vector<Repair>&', what: 'the repairs' },
          { type: 'const std::vector<int>&', what: 'the refused lines' }
        ]
      },
      callWith: 'std::ostream&, const std::vector<Repair>&, const std::vector<int>&',
      cases: reports.map((r) => ({
        name: `writeReport with ${r.what}`,
        code: `${repairsCpp(r.repairs)} std::vector<int> refused = {${r.refused.join(', ')}}; std::ostringstream out; writeReport(out, repairs, refused); ${put('text', 'out.str()')}`,
        judge: (got, stdout) => {
          const text = got.text ?? ''
          if (!text && stdout.trim()) return 'writeReport wrote to std::cout, and not to the stream it is handed. Check hands it a stream of its own; the same function writes to the terminal when it is handed std::cout.'
          if (!text) return 'writeReport wrote nothing to the stream it is handed.'
          return reportProblem(text, r.repairs, r.refused, 'writeReport')
        },
        output: (got) => `writeReport wrote:\n${reportLines(got.text ?? '')}`
      }))
    })
  },

  runDay(t) {
    const CSV = `${HEADING}\n4417,carriage clock,95,12.50\n61,wall clock,fifty,4.00\n52,pocket watch,30,0.75\n`
    return judgeFile(t, {
      ...base,
      task: 4,
      fn: 'runDay',
      paths: true,
      provides: [
        { name: 'parseRepair', task: 1, file: FILE, lines: PARSE },
        { name: 'readRepairs', task: 2, file: FILE, lines: READ },
        { name: 'writeReport', task: 3, file: FILE, lines: REPORT }
      ],
      sig: {
        returns: 'bool',
        params: [
          { type: 'const std::string&', what: 'the path of the tickets' },
          { type: 'const std::string&', what: 'the path of the report' }
        ]
      },
      callWith: 'const std::string&, const std::string&',
      cases: [
        {
          name: "runDay from Check's tickets to a report over an old one",
          code: `indent9_::write_("indent9_day_0.csv", ${cppText(CSV)}); indent9_::write_("indent9_report_0.txt", "old report\\n"); ${put('ok', 'runDay("indent9_day_0.csv", "indent9_report_0.txt") ? 1 : 0')} indent9_::read_("text", "indent9_report_0.txt");`,
          judge: (got, stdout) => {
            const text = fileText(got, 'text')
            if (num(got, 'ok') !== 1) return 'runDay gave back false, and the tickets are there to be read.'
            if ((text === '' || text === 'old report\n') && stdout.includes('Repairs:')) return 'runDay wrote the report to std::cout, and not to the file at the report\'s path. writeReport writes to whichever stream it is handed.'
            if (text === 'old report\n') return 'The report at the path Check handed runDay still holds the old report. runDay writes its report there.'
            if (text !== null && text.startsWith('old report\n')) return 'The old report is still at the top of the file, and the new one comes after it. The report is a new file in place of what was there.'
            if (text === '') return 'The report file is empty once runDay has returned. What is written to a stream can wait in the stream and reaches the file when the stream ends: look at where the stream that writes is made, and whether it ends before runDay returns.'
            if (text !== report([[4417, 'carriage clock', 95, 12.5], [52, 'pocket watch', 30, 0.75]], [3])) return 'The report runDay wrote is not the one writeReport writes for these tickets: the repairs it read, and the lines it refused, go to writeReport.'
            return null
          },
          output: (got) => `The tickets: ${quoted(CSV)}\nrunDay gave back ${num(got, 'ok') === 1 ? 'true' : num(got, 'ok') === 0 ? 'false' : '?'}; the report holds:\n${reportLines(fileText(got, 'text'))}`
        },
        {
          name: 'runDay when the tickets are not there',
          code: `${put('ok', 'runDay("indent9_no_tickets.csv", "indent9_report_1.txt") ? 1 : 0')} indent9_::read_("text", "indent9_report_1.txt");`,
          judge: (got) => {
            if (num(got, 'ok') !== 0) return 'runDay gave back true when the tickets are not there. A file that did not open reads as empty, without a word: ask whether it opened.'
            if (fileText(got, 'text') !== null) return 'runDay gave back false, as it should, and a report file appeared all the same: opening a file to write makes it. When the tickets are not there, no report is written, so open the report only once the tickets have opened.'
            return null
          },
          output: (got) => `runDay("indent9_no_tickets.csv", report) gave back ${num(got, 'ok') === 1 ? 'true' : num(got, 'ok') === 0 ? 'false' : '?'}; ${fileText(got, 'text') === null ? 'no report file' : 'a report file is there'}`
        }
      ]
    })
  }
}
