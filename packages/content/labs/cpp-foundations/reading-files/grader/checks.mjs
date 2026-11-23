import { cppText, judgeFile, num, quoted } from '../../grading.mjs'

const FILE = 'src/stocktake.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const listOf = (got, key) => {
  try {
    return JSON.parse(got[key])
  } catch {
    return null
  }
}
const listText = (list) => (list === null ? 'nothing Check could read' : list.length ? list.map((l) => JSON.stringify(l)).join(', ') : 'no lines')
const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
const words = (lines) => lines.flatMap((l) => l.split(/\s+/).filter(Boolean))

export const checks = {
  readLines(t) {
    const files = [
      { what: 'three lines, each with its line end', text: 'pivot 5\njewel 20\nscrew 7\n', want: ['pivot 5', 'jewel 20', 'screw 7'] },
      { what: 'a blank line in the middle and no line end after the last', text: 'case opened\n\nhands set\nglass fitted', want: ['case opened', '', 'hands set', 'glass fitted'] },
      { what: 'an empty file', text: '', want: [] },
      { what: 'a file that is not there', missing: true }
    ]
    return judgeFile(t, {
      ...base,
      task: 1,
      fn: 'readLines',
      paths: true,
      sig: {
        returns: 'bool',
        params: [
          { type: 'const std::string&', what: 'the path' },
          { type: 'std::vector<std::string>&', what: 'the lines' }
        ]
      },
      callWith: 'const std::string&, std::vector<std::string>&',
      cases: files.map((f, i) => {
        const name = `indent9_lines_${i}.txt`
        return {
          name: `readLines on ${f.what}`,
          code: `${f.missing ? '' : `indent9_::write_("${name}", ${cppText(f.text)});`} std::vector<std::string> lines = {"kept"}; ${put('ok', `readLines("${name}", lines) ? 1 : 0`)} ${put('lines', 'lines')}`,
          judge: (got) => {
            const lines = listOf(got, 'lines')
            if (f.missing) {
              if (num(got, 'ok') !== 0) return 'readLines gave back true for a file that is not there. A file that did not open reads as empty, with no error at all, so readLines asks the stream whether it opened before it reads.'
              if (!same(lines, ['kept'])) return `For a file that is not there, readLines changed Check's lines to ${listText(lines)}. When the file does not open, lines stay as they were.`
              return null
            }
            if (num(got, 'ok') !== 1) return `readLines gave back false for a file that is there, ${f.what}. It gives back true once the file has opened.`
            if (!Array.isArray(lines) || lines[0] !== 'kept') return `Check's vector held one line, "kept", before the call, and afterwards it holds ${listText(lines)}. readLines adds the file's lines to the end of the vector it is handed, after what is there.`
            const read = lines.slice(1)
            if (same(read, f.want)) return null
            if (read.length === f.want.length + 1 && same(read.slice(0, -1), f.want)) {
              return `readLines added one line more than the file has, at the end: ${quoted(read.at(-1))}. The stream only learns that it is at the end when a read fails, so a loop that asks eof() before it reads goes round once more after the last line, and adds what that failed read left.`
            }
            if (f.want.some((l) => l.includes(' ')) && same(read, words(f.want))) {
              return `readLines added each word as a line of its own: ${listText(read)}. >> stops at the first space; a whole line, spaces and all, is read another way, as part 2 did with what people type.`
            }
            return `For ${f.what}, readLines added ${listText(read)}, and the file holds ${listText(f.want)}, in that order.`
          },
          output: (got) => `${f.missing ? 'No file' : `The file holds ${quoted(f.text)}`}\nreadLines gave back ${num(got, 'ok') === 1 ? 'true' : num(got, 'ok') === 0 ? 'false' : '?'}; the lines are now ${listText(listOf(got, 'lines'))}`
        }
      })
    })
  },

  totalParts(t) {
    const streams = [
      { what: 'three parts, each on a line of its own', text: 'pivot 5\njewel 20\nscrew 7\n', want: 32 },
      { what: 'two parts on one line, a blank line, and no line end after the last', text: 'pivot 5 jewel 20\n\nscrew 7', want: 32 },
      { what: 'a count written as a word', text: 'pivot 5\njewel lots\nscrew 7\n', want: -1 },
      { what: 'a name with no count at the end', text: 'pivot 5\njewel 20\nscrew\n', want: -1 },
      { what: 'an empty stream', text: '', want: 0 }
    ]
    return judgeFile(t, {
      ...base,
      task: 2,
      fn: 'totalParts',
      sig: { returns: 'int', params: [{ type: 'std::istream&', what: 'the stream' }] },
      callWith: 'std::istream&',
      cases: streams.map((s) => ({
        name: `totalParts on ${s.what}`,
        code: `std::istringstream in(${cppText(s.text)}); ${put('total', 'totalParts(in)')}`,
        judge: (got) => {
          const total = num(got, 'total')
          if (total === s.want) return null
          if (s.want === 32 && total === 39) {
            return `totalParts gave back 39, where the parts add up to 32: the last count, 7, was added twice. The stream only learns that it is at the end when a read fails, so a loop that asks eof() before it reads goes round once more after the last pair, and that failed read leaves the count as it was.`
          }
          if (s.what.includes('word') && total === 5) {
            return 'totalParts gave back 5, what it had before the count written as a word. A read that fails leaves the stream failed, and every read after it fails too, so the loop stops there. The task asks for -1 when that happens, not for what was added up so far.'
          }
          if (s.what.includes('no count') && total === 25) {
            return 'The stream ends right after a name, screw, with no count, and totalParts gave back 25. A read that fails at the end of the stream also sets eof(), so eof() alone cannot tell a missing count from a clean end. Ask whether the count was read, right after each name.'
          }
          return `For ${s.what}, totalParts gave back ${got.total ?? 'nothing'}.${s.want === -1 ? ' A name with no whole number after it gives -1.' : ' That is not the counts added up.'}`
        },
        output: (got) => `The stream holds ${quoted(s.text)}\ntotalParts gave back ${got.total ?? '?'}`
      }))
    })
  },

  readNotes(t) {
    const streams = [
      { what: 'three notes', text: '3\nnew mainspring fitted\ncase polished\ncrystal cracked\n', want: ['new mainspring fitted', 'case polished', 'crystal cracked'] },
      { what: 'an empty note, and no line end after the last', text: '3\nhands set\n\nglass fitted', want: ['hands set', '', 'glass fitted'] },
      { what: 'an empty first note, and one that starts with spaces', text: '2\n\n  oiled again\n', want: ['', '  oiled again'] },
      { what: 'fewer notes than the first line says', text: '4\nbalance cleaned\ndial cleaned\n', want: ['balance cleaned', 'dial cleaned'] },
      { what: 'more lines than the first line says', text: '1\nstem replaced\nnot a note\n', want: ['stem replaced'] },
      { what: 'no notes', text: '0\n', want: [] }
    ]
    return judgeFile(t, {
      ...base,
      task: 3,
      fn: 'readNotes',
      sig: { returns: 'std::vector<std::string>', params: [{ type: 'std::istream&', what: 'the stream' }] },
      callWith: 'std::istream&',
      cases: streams.map((s) => ({
        name: `readNotes on ${s.what}`,
        code: `std::istringstream in(${cppText(s.text)}); ${put('notes', 'readNotes(in)')}`,
        judge: (got) => {
          const notes = listOf(got, 'notes')
          if (same(notes, s.want)) return null
          if (!Array.isArray(notes)) return 'Check could not read what readNotes gave back.'
          if (s.want.length && notes[0] === '' && s.want[0] !== '') {
            return 'The first note readNotes gave back is empty, and the notes after it moved down by one. >> read the number and stopped right before the line end after it, so the std::getline after it read the empty rest of that first line, as in part 2.'
          }
          if (s.want[0] === '' && notes[0] !== '' && notes.some((n) => n === 'oiled again')) {
            return 'The empty first note is gone, and so are the spaces the next one starts with. Skipping every blank after the number skips them too: read away only the rest of the first line, the empty text >> left there, as part 2 did.'
          }
          if (s.want.some((n) => n.includes(' ')) && notes.length && notes.every((n) => !n.includes(' ') && words(s.want).includes(n))) {
            return `readNotes gave back each word as a note of its own: ${listText(notes)}. A note is a whole line, spaces and all; >> stops at the first space.`
          }
          if (notes.length > s.want.length && same(notes.slice(0, s.want.length), s.want)) {
            return s.what.startsWith('fewer')
              ? `The stream holds 2 notes, though its first line says 4, and readNotes gave back ${notes.length}: ${listText(notes)}. The ones after the last are reads that failed at the end of the stream. Keep a note only when its read worked.`
              : `readNotes gave back ${notes.length} notes, and the first line says ${s.want.length}: ${listText(notes)}. It reads no more notes than the first line says.`
          }
          return `For ${s.what}, readNotes gave back ${listText(notes)}, and the stream holds ${listText(s.want)}.`
        },
        output: (got) => `The stream holds ${quoted(s.text)}\nreadNotes gave back ${listText(listOf(got, 'notes'))}`
      }))
    })
  }
}
