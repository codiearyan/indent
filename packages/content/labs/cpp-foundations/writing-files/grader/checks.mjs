import { cppText, fileText, judgeFile, num, quoted } from '../../grading.mjs'

const FILE = 'src/sheet.cpp'
const base = { files: [FILE], own: ['Bill'] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const line = (item, minutes, price) => `${item.padEnd(16)}${String(minutes).padStart(5)}${price.toFixed(2).padStart(9)}\n`
const RULER = '|  item, 16 columns  |min 5|price 9 |'
const shownLines = (text) => (text === null ? 'no file' : text === '' ? 'an empty file' : text.split('\n').map((l, i, all) => (i === all.length - 1 && l === '' ? null : `  ${JSON.stringify(l)}`)).filter(Boolean).join('\n'))
const squeezed = (text) => text.trim().split(/\s+/).join(' ')

// Check's own writeBillLine for Task 2, written as Task 1 asks.
const BILL_LINE = [
  'void writeBillLine(std::ostream& out, const std::string& item, int minutes, double price) { out << std::left << std::setw(16) << item << std::right << std::setw(5) << minutes << std::fixed << std::setprecision(2) << std::setw(9) << price << \'\\n\'; }'
]

/** What is wrong with a written line, in words that never show the line Check wanted. */
function lineProblem(got, item, minutes, price) {
  const want = line(item, minutes, price)
  if (got === want) return null
  if (got === '') return null
  if (got === want.slice(0, -1)) return 'The line has no line end, so whatever is written next goes on the same line.'
  if (got.replace(/\n+$/, '') === want.slice(0, -1)) return 'The line ends with more than one line end: an empty line follows it on the sheet.'
  const parts = got.trim().split(/\s+/)
  const shownPrice = parts.at(-1)
  if (squeezed(got.replace(shownPrice, price.toFixed(2))) === squeezed(want) && shownPrice !== price.toFixed(2)) {
    return `The price reads ${shownPrice}. The task asks for exactly 2 decimals, whatever the price: look at what makes a stream write a set number of digits after the point, from part 1.`
  }
  if (squeezed(got) === squeezed(want)) {
    return item.length > 16
      ? 'The values are right, and the spaces are not. An item longer than 16 columns is written whole, and the minutes and the price still take their own 5 and 9 columns after it.'
      : 'The values are right, and the columns are not: compare the spaces with the task\'s line. The item takes 16 columns and starts on the left; the minutes take 5 and the price 9, both ending on the right.'
  }
  if (item.length > 16 && got.includes(item.slice(0, 16)) && !got.includes(item)) return 'The item is cut to 16 characters. A width only says how much room at least; a longer item is written whole.'
  return null
}

export const checks = {
  writeBillLine(t) {
    const bills = [
      ['carriage clock', 95, 112.5],
      ['cuckoo clock', 0, 0],
      ['grandmother clock with chime', 240, 1234.567]
    ]
    const sig = {
      returns: 'void',
      params: [
        { type: 'std::ostream&', what: 'the stream' },
        { type: 'const std::string&', what: 'the item' },
        { type: 'int', what: 'the minutes' },
        { type: 'double', what: 'the price' }
      ]
    }
    const call = (out, [item, minutes, price]) => `writeBillLine(${out}, ${cppText(item)}, ${minutes}, ${price.toFixed(3)});`
    const judgeOne = (got, stdout, text, bill, where) => {
      if (text === '' && stdout.trim()) return `writeBillLine wrote to std::cout, and not to the stream it is handed. Check hands it ${where}; the same function then writes to the terminal when it is handed std::cout.`
      if (text === null) return `Check could not read back what writeBillLine wrote to ${where}.`
      if (text === '') return `writeBillLine wrote nothing to ${where}.`
      return lineProblem(text, ...bill) ?? (text === line(...bill) ? null : `For ${bill[0]}, ${bill[1]} minutes and ${bill[2]}, writeBillLine wrote a line that is not the task's: compare it, space by space, with the line in the task.`)
    }
    return judgeFile(t, {
      ...base,
      task: 1,
      fn: 'writeBillLine',
      sig,
      callWith: 'std::ostream&, const std::string&, int, double',
      cases: [
        ...bills.map((bill) => ({
          name: `writeBillLine for ${bill[0]}, ${bill[1]} minutes and ${bill[2]}, into a string stream`,
          code: `std::ostringstream out; ${call('out', bill)} ${put('text', 'out.str()')}`,
          judge: (got, stdout) => judgeOne(got, stdout, got.text ?? null, bill, 'a string stream'),
          output: (got, stdout) => `${RULER}\n${got.text ? got.text.split('\n').filter(Boolean).map((l) => `|${l}|`).join('\n') : '(nothing)'}${got.text && !got.text.endsWith('\n') ? '\n(no line end)' : ''}${!got.text && stdout.trim() ? `\nPrinted to std::cout: ${quoted(stdout)}` : ''}`
        })),
        {
          name: 'Two bill lines in a row, into a file',
          code: `{ std::ofstream file("indent9_bill.txt"); ${call('file', ['ship clock', 5, 6.25])} ${call('file', ['wall clock', 50, 44])} } indent9_::read_("text", "indent9_bill.txt");`,
          judge: (got, stdout) => {
            const text = fileText(got, 'text')
            if (text === '' && stdout.trim()) return 'writeBillLine wrote to std::cout, and not to the file stream it is handed.'
            const want = line('ship clock', 5, 6.25) + line('wall clock', 50, 44)
            if (text === want) return null
            const [first, ...rest] = (text ?? '').split('\n')
            if (text !== null && text.split('\n').length < 3) return 'Check wrote two bills into a file and found them on one line: each bill line ends with a line end.'
            return lineProblem(`${first}\n`, 'ship clock', 5, 6.25) ?? lineProblem(`${rest.join('\n')}`, 'wall clock', 50, 44) ?? 'The file holds two lines that are not the task\'s: compare each, space by space, with the line in the task.'
          },
          output: (got) => `The file holds:\n${shownLines(fileText(got, 'text'))}`
        }
      ]
    })
  },

  writeSheet(t) {
    const sheets = [
      { what: 'two bills, over an old sheet', old: 'old sheet\nfrom yesterday\n', bills: [['carriage clock', 95, 112.5], ['cuckoo clock', 20, 9.75]] },
      { what: 'three bills with pence', old: null, bills: [['ship clock', 10, 0.25], ['wall clock', 20, 0.5], ['travel clock', 30, 12.25]] },
      { what: 'no bills', old: 'something else\n', bills: [] }
    ]
    const want = (bills) => {
      const minutes = bills.reduce((a, b) => a + b[1], 0)
      const price = bills.reduce((a, b) => a + b[2], 0)
      return bills.map((b) => line(...b)).join('') + line('Total', minutes, price)
    }
    const billsCpp = (bills) => `std::vector<Bill> bills; ${bills.map(([i, m, p]) => `{ Bill b; b.item = ${cppText(i)}; b.minutes = ${m}; b.price = ${p}; bills.push_back(b); }`).join(' ')}`
    return judgeFile(t, {
      ...base,
      task: 2,
      fn: 'writeSheet',
      paths: true,
      provides: [{ name: 'writeBillLine', task: 1, file: FILE, lines: BILL_LINE }],
      sig: {
        returns: 'bool',
        params: [
          { type: 'const std::string&', what: 'the path' },
          { type: 'const std::vector<Bill>&', what: 'the bills' }
        ]
      },
      callWith: 'const std::string&, const std::vector<Bill>&',
      cases: [
        ...sheets.map((s, i) => {
          const name = `indent9_sheet_${i}.txt`
          return {
            name: `writeSheet with ${s.what}`,
            code: `${s.old === null ? '' : `indent9_::write_("${name}", ${cppText(s.old)});`} ${billsCpp(s.bills)} ${put('ok', `writeSheet("${name}", bills) ? 1 : 0`)} indent9_::read_("text", "${name}");`,
            judge: (got) => {
              const text = fileText(got, 'text')
              const w = want(s.bills)
              if (num(got, 'ok') !== 1) return `writeSheet gave back false for a file it can write, ${name}.`
              if (text === w) return null
              if (text === null) return `After writeSheet, there is no file at the path Check handed it. It writes the sheet at that path.`
              if (text === '' || (s.old && text === s.old)) return 'The file Check read back once writeSheet had returned holds nothing new. What is written to a stream can wait in the stream and reaches the file when the stream ends, at the end of the block that made it: look at where the stream that writes is made, and whether it ends before writeSheet returns.'
              if (s.old && text.startsWith(s.old)) return 'The old sheet is still at the top of the file, and the new one comes after it. writeSheet writes a new file in place of what was there: look at how the stream is opened.'
              const lines = text.split('\n').filter(Boolean)
              const totalLine = lines.at(-1) ?? ''
              const total = s.bills.reduce((a, b) => a + b[2], 0)
              if (!/^Total\b/.test(totalLine)) return 'The last line of the sheet is not the Total line. After the bills comes one more line, for "Total".'
              if (totalLine.trim().split(/\s+/).at(-1) === Math.trunc(total).toFixed(2) || totalLine.trim().split(/\s+/).at(-1) === s.bills.reduce((a, b) => a + Math.trunc(b[2]), 0).toFixed(2)) {
                return 'The Total line has the prices added up in whole numbers, so the pence are lost. A price has pence: its total is kept in a double.'
              }
              if (lines.length !== s.bills.length + 1) return `The sheet has ${lines.length} lines for ${s.bills.length} ${s.bills.length === 1 ? 'bill' : 'bills'}: one line per bill, then the Total line.`
              return 'The sheet holds the right number of lines, and they are not the task\'s: each is a bill line as Task 1 writes it, and the Total line has all the minutes and all the prices added up.'
            },
            output: (got) => `${s.old === null ? 'No file before' : `Before: ${quoted(s.old)}`}\nwriteSheet gave back ${num(got, 'ok') === 1 ? 'true' : num(got, 'ok') === 0 ? 'false' : '?'}; the file holds:\n${shownLines(fileText(got, 'text'))}`
          }
        }),
        {
          name: 'writeSheet with a path in a folder that is not there',
          code: `${billsCpp([['wall clock', 5, 1]])} ${put('ok', 'writeSheet("indent9_no_folder/sheet.txt", bills) ? 1 : 0')}`,
          judge: (got) => (num(got, 'ok') !== 0 ? 'writeSheet gave back true for a file in a folder that is not there, which cannot be opened for writing. A stream that did not open writes nothing, without a word: ask it whether it opened.' : null),
          output: (got) => `writeSheet("indent9_no_folder/sheet.txt", bills) gave back ${num(got, 'ok') === 1 ? 'true' : num(got, 'ok') === 0 ? 'false' : '?'}`
        }
      ]
    })
  },

  addToLog(t) {
    const OLD = 'Mon: 4 repairs\nTue: 6 repairs\n'
    return judgeFile(t, {
      ...base,
      task: 3,
      fn: 'addToLog',
      paths: true,
      sig: {
        returns: 'int',
        params: [
          { type: 'const std::string&', what: 'the path' },
          { type: 'const std::string&', what: 'the entry' }
        ]
      },
      callWith: 'const std::string&, const std::string&',
      cases: [
        {
          name: 'addToLog on a log of two days',
          code: `indent9_::write_("indent9_log_0.txt", ${cppText(OLD)}); ${put('n', 'addToLog("indent9_log_0.txt", "Wed: 5 repairs")')} indent9_::read_("text", "indent9_log_0.txt");`,
          judge: (got) => {
            const text = fileText(got, 'text')
            const want = `${OLD}Wed: 5 repairs\n`
            if (text === 'Wed: 5 repairs\n') return 'The two days that were in the log are gone, and only the new entry is left. addToLog keeps what is there and adds at the end: look at how the stream is opened.'
            if (text === `${OLD}Wed: 5 repairs`) return 'The new entry has no line end after it, so the next day\'s entry would go on the same line.'
            if (text !== want) return `After addToLog, the log holds something other than the two days with the new entry added at the end, on a line of its own.`
            if (num(got, 'n') === 2) return 'The log holds three lines afterwards, and addToLog gave back 2: it counted while the stream that writes was still open. What is written can wait in that stream and reaches the file when the stream ends, at the end of the block that made it, or when it is closed.'
            if (num(got, 'n') === 4) return 'The log holds three lines, and addToLog gave back 4. The stream only learns that it is at the end when a read fails, so a loop that asks eof() before it reads counts one round more than there are lines.'
            if (num(got, 'n') !== 3) return `The log holds three lines afterwards, and addToLog gave back ${got.n}. It gives back how many lines the file holds once the entry is in.`
            return null
          },
          output: (got) => `Before: ${quoted(OLD)}\naddToLog(log, "Wed: 5 repairs") gave back ${got.n ?? '?'}; the log holds:\n${shownLines(fileText(got, 'text'))}`
        },
        {
          name: 'addToLog twice, on a log that is not there yet',
          code: `${put('a', 'addToLog("indent9_log_1.txt", "Thu: 2 repairs")')} ${put('b', 'addToLog("indent9_log_1.txt", "Fri: 7 repairs")')} indent9_::read_("text", "indent9_log_1.txt");`,
          judge: (got) => {
            const text = fileText(got, 'text')
            if (text === null) return 'After addToLog, there is no file at the path Check handed it. When the log is not there yet, adding the first entry makes it.'
            if (text === 'Thu: 2 repairsFri: 7 repairs\n' || text === 'Thu: 2 repairsFri: 7 repairs') return 'Both entries are on one line: an entry is written with no line end after it.'
            if (text === 'Fri: 7 repairs\n') return 'After two entries, the log holds only the second one. addToLog keeps what is there and adds at the end: look at how the stream is opened.'
            if (text !== 'Thu: 2 repairs\nFri: 7 repairs\n') return 'After two entries, the log does not hold the two of them, in order, each on a line of its own.'
            if (num(got, 'a') === 0 && num(got, 'b') === 1) return 'The log holds one line after the first entry and two after the second, and addToLog gave back 0 and then 1: it counted while the stream that writes was still open. What is written can wait in that stream and reaches the file when the stream ends, at the end of the block that made it, or when it is closed.'
            if (num(got, 'a') !== 1 || num(got, 'b') !== 2) return `addToLog gave back ${got.a} after the first entry and ${got.b} after the second. It gives back how many lines the file holds once the entry is in.`
            return null
          },
          output: (got) => `No file before\naddToLog gave back ${got.a ?? '?'}, then ${got.b ?? '?'}; the log holds:\n${shownLines(fileText(got, 'text'))}`
        },
        {
          name: 'addToLog with a path in a folder that is not there',
          code: `${put('n', 'addToLog("indent9_no_folder/log.txt", "Sat: 1 repair")')}`,
          judge: (got) => (num(got, 'n') !== -1 ? `addToLog gave back ${got.n} for a log in a folder that is not there, which cannot be opened. A stream that did not open writes nothing, without a word: ask it whether it opened.` : null),
          output: (got) => `addToLog("indent9_no_folder/log.txt", ...) gave back ${got.n ?? '?'}`
        }
      ]
    })
  }
}
