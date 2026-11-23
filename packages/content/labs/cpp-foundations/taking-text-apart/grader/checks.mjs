import { cppText, judgeFile, num, quoted, thrownText } from '../../grading.mjs'

const FILE = 'src/fields.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const listOf = (got, key) => {
  try {
    return JSON.parse(got[key])
  } catch {
    return null
  }
}
const listText = (list) => (list === null ? 'nothing Check could read' : `${list.length} ${list.length === 1 ? 'field' : 'fields'}: ${list.map((l) => JSON.stringify(l)).join(', ')}`)
const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
const sepText = (c) => (c === ' ' ? 'a space' : `'${c}'`)

export const checks = {
  trim(t) {
    const texts = [
      ['  ship clock  ', 'spaces at both ends'],
      ['\tcrown\r', 'a tab before and a carriage return after'],
      ['7 jewels\r', 'a carriage return at the end, as a Windows line end leaves'],
      ['hands  and  dial', 'two spaces inside and none at the ends'],
      [' \t \r ', 'only spaces, a tab and a carriage return'],
      ['', 'an empty text']
    ]
    const shown = (s) => JSON.stringify(s)
    const want = (s) => s.replace(/^[ \t\r]+|[ \t\r]+$/g, '')
    return judgeFile(t, {
      ...base,
      task: 1,
      fn: 'trim',
      sig: { returns: 'std::string', params: [{ type: 'const std::string&', what: 'the text' }] },
      callWith: 'const std::string&',
      cases: texts.map(([text, what]) => ({
        name: `trim of ${what}`,
        escaped: (got) =>
          got.threw === 'std::out_of_range'
            ? `For ${shown(text)}, trim let ${thrownText(got)} out. A search that finds nothing gives back std::string::npos, a position far past the end of any text, and .substr throws on a start past the end. A text of only blanks needs its own answer.`
            : null,
        code: `${put('r', `trim(${cppText(text)})`)}`,
        judge: (got) => {
          const r = got.r
          const w = want(text)
          if (r === w) return null
          if (r === undefined) return 'Check could not read what trim gave back.'
          if (r === text.trim() || r === text.replace(/^ +| +$/g, '')) {
            return `trim of ${shown(text)} gave back ${shown(r)}: a ${/\r/.test(r) ? "carriage return, '\\r'," : "tab, '\\t',"} is still there. A file written on Windows ends each line with '\\r' before the line end, and std::getline keeps it: trim takes away spaces, tabs and carriage returns.`
          }
          if (w && r === text.replace(/^[ \t\r]+/, '')) return `trim of ${shown(text)} gave back ${shown(r)}: what is at the end is still there.`
          if (w && r === text.replace(/[ \t\r]+$/, '')) return `trim of ${shown(text)} gave back ${shown(r)}: what is at the start is still there.`
          if (w && r.replace(/\s+/g, '') === w.replace(/\s+/g, '') && r !== w) return `trim of ${shown(text)} gave back ${shown(r)}. What is between the first and the last character that are not blank stays exactly as it is.`
          return `trim of ${shown(text)} gave back ${shown(r)}.`
        },
        output: (got) => `trim(${shown(text)}) gave back ${got.r === undefined ? 'nothing' : shown(got.r)}`
      }))
    })
  },

  splitAt(t) {
    const lines = [
      ['4417,carriage clock,95', ',', 'three fields'],
      ['5020,,30', ',', 'an empty field in the middle'],
      ['61,wall clock,', ',', 'an empty field at the end'],
      [';ship clock', ';', 'an empty field at the start, and another separator'],
      ['grandmother clock', ',', 'no separator at all'],
      ['', ',', 'an empty line']
    ]
    const split = (line, sep) => line.split(sep)
    return judgeFile(t, {
      ...base,
      task: 2,
      fn: 'splitAt',
      sig: {
        returns: 'std::vector<std::string>',
        params: [
          { type: 'const std::string&', what: 'the line' },
          { type: 'char', what: 'the separator' }
        ]
      },
      callWith: "const std::string&, char",
      cases: lines.map(([line, sep, what]) => ({
        name: `splitAt of a line with ${what}`,
        code: `${put('fields', `splitAt(${cppText(line)}, '${sep}')`)}`,
        judge: (got) => {
          const fields = listOf(got, 'fields')
          const want = split(line, sep)
          if (same(fields, want)) return null
          if (!Array.isArray(fields)) return 'Check could not read what splitAt gave back.'
          if (sep !== ',' && same(fields, split(line, ','))) return `splitAt split at ',' where Check handed it ${sepText(sep)}. It splits at the separator it is handed.`
          if (fields.length === want.length - 1 && same(fields, want.slice(0, -1)) && want.at(-1) === '') {
            return line === ''
              ? 'For an empty line, splitAt gave back no fields at all. An empty line is one field, an empty one: a line with no separator is always one field.'
              : `For ${quoted(line)}, splitAt gave back ${listText(fields)}: the empty field after the last separator is lost. Reading pieces up to each separator stops at the end of the line, so a last field that is empty is never read. A line with ${want.length - 1} separators has ${want.length} fields.`
          }
          if (fields.some((f) => f.includes(sep))) {
            return `For ${quoted(line)}, splitAt gave back ${listText(fields)}: a field still holds the separator ${sepText(sep)}, so the line was cut somewhere else, such as at its spaces. Only the separator splits a line; >> stops at every space.`
          }
          if (fields.length === want.length - 1 && same(fields, want.slice(0, -1)) && want.at(-1) !== '') {
            return `For ${quoted(line)}, splitAt gave back ${listText(fields)}: the last field is lost. No separator comes after it, so it is still waiting when the line ends.`
          }
          if (fields.length === want.length && fields.some((f, i) => f !== want[i] && f.trim() === want[i].trim())) return `splitAt changed the spaces in the fields. It gives back each piece exactly as it is in the line: trimming is a job of its own.`
          if (fields.filter(Boolean).length === want.filter(Boolean).length && fields.length < want.length) return `For ${quoted(line)}, splitAt gave back ${listText(fields)}: an empty field is left out. An empty field still counts, so the fields after it stay in their places.`
          return `For ${quoted(line)} at ${sepText(sep)}, splitAt gave back ${listText(fields)}. A line with ${want.length - 1} ${want.length === 2 ? 'separator' : 'separators'} has ${want.length} ${want.length === 1 ? 'field' : 'fields'}.`
        },
        output: (got) => `splitAt(${quoted(line)}, '${sep}') gave back ${listText(listOf(got, 'fields'))}`
      }))
    })
  },

  toWhole(t) {
    const texts = [
      ['75', 75, 'a plain number'],
      ['  48 ', 48, 'spaces around it'],
      ['-12', -12, 'a number below zero'],
      ['12abc', null, 'letters after the number'],
      ['7.5', null, 'a point and more digits after the number'],
      ['nine', null, 'a word'],
      ['', null, 'an empty text'],
      ['   ', null, 'only spaces']
    ]
    return judgeFile(t, {
      ...base,
      task: 3,
      fn: 'toWhole',
      sig: { returns: 'std::optional<int>', params: [{ type: 'const std::string&', what: 'the text' }] },
      callWith: 'const std::string&',
      cases: texts.map(([text, want, what]) => ({
        name: `toWhole of ${quoted(text)}, ${what}`,
        code: `auto r = toWhole(${cppText(text)}); ${put('has', 'r ? 1 : 0')} if (r) { ${put('value', '*r')} }`,
        escaped: (got) =>
          got.threw === 'std::invalid_argument' || got.threw === 'std::out_of_range'
            ? `For ${quoted(text)}, toWhole let ${thrownText(got)} out. std::stoi throws when the text does not start with a number, and it is no test of a whole text: it also reads "12abc" as 12. A string stream reads the number and can then be asked what is left.`
            : null,
        judge: (got) => {
          const has = num(got, 'has') === 1
          const value = num(got, 'value')
          if (want === null) {
            if (!has) return null
            if (text === '' || text.trim() === '') return `For ${quoted(text)}, toWhole gave back ${value}. An empty field is not 0: it holds no number at all, so toWhole gives back std::nullopt.`
            return `For ${quoted(text)}, toWhole gave back ${value}, and the text holds more than a whole number. Reading a number stops at the first character that cannot be part of it and says nothing about the rest: ask what is left after it.`
          }
          if (!has) return `For ${quoted(text)}, toWhole gave back std::nullopt, and the text is a whole number${what.includes('spaces') ? ' with spaces around it, which are allowed' : ''}.`
          if (value !== want) return `For ${quoted(text)}, toWhole gave back ${value}.`
          return null
        },
        output: (got) => `toWhole(${quoted(text)}) gave back ${got.threw ? `nothing: ${thrownText(got)} came out` : num(got, 'has') === 1 ? got.value : num(got, 'has') === 0 ? 'std::nullopt' : '?'}`
      }))
    })
  },

  ticketLine(t) {
    const tickets = [
      [4417, 'carriage clock', 12.5],
      [7, 'cuckoo clock', 0],
      [52, 'pocket watch', 6.25],
      [61, 'wall clock', 1234.567]
    ]
    const want = ([t, i, p]) => `${t},${i},${p.toFixed(2)}`
    return judgeFile(t, {
      ...base,
      task: 4,
      fn: 'ticketLine',
      sig: {
        returns: 'std::string',
        params: [
          { type: 'int', what: 'the ticket' },
          { type: 'const std::string&', what: 'the item' },
          { type: 'double', what: 'the parts' }
        ]
      },
      callWith: 'int, const std::string&, double',
      cases: tickets.map((c) => ({
        name: `ticketLine for ${c[0]}, ${c[1]} and ${c[2]}`,
        code: `${put('r', `ticketLine(${c[0]}, ${cppText(c[1])}, ${c[2].toFixed(3)})`)}`,
        judge: (got, stdout) => {
          const r = got.r
          const w = want(c)
          if (r === w) return null
          if (r === undefined) return 'Check could not read what ticketLine gave back.'
          if (r === '' && stdout.includes(String(c[0]))) return 'ticketLine printed the line with std::cout and gave back an empty text. It builds the line and gives it back; the caller decides where it goes.'
          if (r.replace(/\n$/, '') === w) return 'The line ends with a line end. ticketLine gives back the line alone: whoever writes it adds the line end.'
          if (r.replace(/\s*,\s*/g, ',') === w) return 'The line has spaces around its commas. The fields follow each other with only a comma between them.'
          const parts = r.split(',').at(-1)
          if (r.split(',').slice(0, -1).join(',') === w.split(',').slice(0, -1).join(',')) {
            return `The parts read ${parts}. The task asks for exactly 2 decimals, whatever the number: std::to_string always writes 6, and a stream writes as few as it needs until it is told otherwise, as in part 1.`
          }
          return `For ${c[0]}, ${c[1]} and ${c[2]}, ticketLine gave back ${quoted(r)}: compare it, character by character, with the line in the task.`
        },
        output: (got) => `ticketLine(${c[0]}, ${quoted(c[1])}, ${c[2]}) gave back ${quoted(got.r)}`
      }))
    })
  }
}
