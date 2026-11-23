import { dataCases } from '../../grading.mjs'

const FILE = 'callout_book.py'

// Check's own versions of the earlier tasks, so a mistake there does not count in a later one.
const LINES = `
def book_lines(text):
    return text.splitlines()
`
const PARTS = `
def callout_parts(line):
    return [part.strip() for part in line.split(";")]
`

const parts = (line) => line.split(';').map((p) => p.trim())
const hoursOf = (line) => Number(parts(line)[2].split(/\s+/)[0])

export const checks = {
  words(t) {
    const list = [
      ['One space between each word', 'KILO FIVE at the hut', 5],
      ['Two spaces in a row', 'ECHO ONE  leaving  now', 4],
      ['Spaces at the ends and a line end', '  stretcher needed at the ford \n', 5],
      ['One word', 'received', 1],
      ['Nothing said', '', 0]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'word_count',
      text: true,
      typed:
        'word_count gives back the same number whatever message Check gives it. Count the words of the message it is given.',
      list: list.map(([name, message, count]) => ({
        name,
        args: [message],
        expected: count,
        hint: (v) => {
          if (v.type === 'list') return 'word_count gives back the list of words. The task asks how many there are.'
          if (v.value === message.split(' ').length)
            return 'word_count counts an empty word wherever two spaces are in a row, or a space is at an end. Splitting at one space makes an empty text between two spaces in a row. The lesson shows the split that takes any run of spaces as one.'
          if (v.value === message.length) return 'word_count counts the letters, not the words.'
          if (v.value === message.split(' ').filter(Boolean).length)
            return 'word_count counts a line end stuck to the last word as part of it, or as a word of its own. Split at every kind of space, line ends included.'
          return 'word_count does not give back how many words the message has.'
        }
      }))
    })
  },

  lines(t) {
    const list = [
      ['A line end after every line', '01 Dec; Ben Vane; 2 hours; 5 crew\n04 Dec; Scarth Fell; 6 hours; 9 crew\n'],
      ['Typed on Windows', '05 Dec; Meall Odhar; 4 hours; 7 crew\r\n06 Dec; Ben Vane; 1 hour; 3 crew\r\n'],
      ['No line end after the last line', '07 Dec; Scarth Fell; 3 hours; 6 crew\n09 Dec; Garve Edge; 8 hours; 11 crew\n10 Dec; Carn Dubh; 2 hours; 4 crew'],
      ['An empty book', '']
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'book_lines',
      text: true,
      typed:
        'book_lines gives back the same list whatever book Check gives it. Split the text it is given.',
      list: list.map(([name, text]) => {
        const want = text.split(/\r?\n/)
        if (want.at(-1) === '') want.pop()
        return {
          name,
          args: [text],
          expected: want,
          hint: (v) => {
            const got = Array.isArray(v.data) ? v.data : []
            if (text === '' && equalLen(got, 1)) return 'For an empty book, book_lines gives back a list with an empty text in it. An empty book has no lines at all.'
            if (got.length && got.at(-1) === '' && text.endsWith('\n'))
              return 'book_lines gives back an empty text after the last line. Splitting at the line end makes one more piece after the last line end, with nothing in it.'
            if (got.some((l) => typeof l === 'string' && l.endsWith('\r')))
              return 'book_lines leaves a \\r at the end of each line of a book typed on Windows, where every line ends with \\r\\n. Use the method made for lines, which knows every kind of line end.'
            if (got.length > want.length && got.join(' ') === text.split(/\s+/).filter(Boolean).join(' '))
              return 'book_lines splits at every space, not only at the line ends, so it gives back words instead of lines.'
            if (got.some((l) => typeof l === 'string' && l.endsWith('\n')))
              return 'book_lines gives back lines with their line ends still on.'
            return 'book_lines does not give back the lines of the book, in order, without their line ends.'
          }
        }
      })
    })
  },

  parts(t) {
    const list = [
      ['A space after each semicolon', '11 Dec; Meall Odhar; 4 hours; 7 crew'],
      ['Spaces all over', '12 Dec ;  Ben Vane;2 hours ;5 crew'],
      ['No spaces at all', '15 Dec;Scarth Fell;9 hours;12 crew'],
      ['A line end at the end', '16 Dec; Beinn Ruadh; 1 hour; 3 crew\n']
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'callout_parts',
      text: true,
      define: LINES,
      typed:
        'callout_parts gives back the same list whatever line Check gives it. Split the line it is given.',
      list: list.map(([name, line]) => ({
        name,
        args: [line],
        expected: parts(line),
        hint: (v) => {
          const got = Array.isArray(v.data) ? v.data : []
          if (got.length > 4)
            return 'callout_parts splits at the spaces too, so a hill of two words becomes two parts. Split only at the semicolons.'
          if (got.length < 4)
            return 'callout_parts gives back fewer than four parts. A semicolon with no space after it is still a semicolon: split at the semicolon alone.'
          if (got.some((p) => typeof p === 'string' && p !== p.trim()))
            return 'callout_parts gives back parts with spaces or a line end still at their start or end. Strip each part, not only the whole line.'
          return 'callout_parts does not give back the four parts of the line.'
        }
      }))
    })
  },

  hours(t) {
    const list = [
      ['Hours of one digit', ['17 Dec; Ben Vane; 2 hours; 5 crew', '18 Dec; Carn Dubh; 4 hours; 9 crew']],
      [
        'More than nine hours',
        ['19 Dec; Scarth Fell; 11 hours; 8 crew', '20 Dec; Meall Odhar; 1 hour; 3 crew', '21 Dec; Garve Edge; 14 hours; 12 crew']
      ],
      ['One line, spaces all over', ['22 Dec ;Beinn Ruadh;  7 hours ; 6 crew']],
      ['No lines', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'total_hours',
      text: true,
      errors: (error) =>
        /unsupported operand type\(s\) for \+: 'int' and 'str'/.test(error.message)
          ? 'the line adds text to a number. A part taken from a line is text even when it holds digits, and int() turns it into a number'
          : null,
      define: LINES + PARTS,
      typed:
        'total_hours gives back the same number whatever lines Check gives it. Add up the hours of the lines it is given.',
      list: list.map(([name, lines]) => {
        const total = lines.reduce((sum, line) => sum + hoursOf(line), 0)
        return {
          name,
          args: [lines],
          expected: total,
          hint: (v) => {
            const firstDigits = lines.reduce((sum, line) => sum + Number(String(hoursOf(line))[0]), 0)
            const crew = lines.reduce((sum, line) => sum + Number(parts(line)[3].split(' ')[0]), 0)
            if (v.type === 'str')
              return 'total_hours gives back text, the hours joined one after the other. Text read from a line stays text until int() turns it into a number.'
            if (v.value === firstDigits && firstDigits !== total)
              return 'total_hours adds only the first digit of an hours of 10 or more. Take the whole first word of the part, not its first letter.'
            if (v.value === crew) return 'total_hours adds up the crew, the fourth part. The hours are the third part.'
            if (v.value === lines.length && lines.length !== total)
              return 'total_hours gives back how many lines there are. The task asks for their hours added up.'
            return 'total_hours does not give back the hours of every line added up.'
          }
        }
      })
    })
  },

  hill(t) {
    const list = [
      ['A hill of one word', '23 Dec; Ben Vain; 3 hours; 6 crew', 'Ben Vane'],
      ['Spaces all over', '27 Dec ;Scarth  Fel;5 hours ; 8 crew', 'Scarth Fell'],
      ['A line end at the end', '29 Dec; Carn Dhub; 10 hours; 9 crew\n', 'Carn Dubh']
    ]
    return dataCases(t, {
      file: FILE,
      task: 5,
      fn: 'with_hill',
      text: true,
      define: PARTS,
      typed:
        'with_hill gives back the same line whatever Check gives it. Build it from the line and the hill it is given.',
      list: list.map(([name, line, hill]) => {
        const p = parts(line)
        const want = [p[0], hill, p[2], p[3]].join('; ')
        return {
          name,
          args: [line, hill],
          expected: want,
          hint: (v) => {
            if (v.type === 'list') return 'with_hill gives back the list of parts. The task asks for them joined back into one line of text.'
            const got = String(v.value)
            if (got.replace(/\s/g, '') === want.replace(/\s/g, ''))
              return 'with_hill has the right parts but not the right spaces between them. Between two parts goes a semicolon and one space, and nothing at the ends.'
            if (got.includes(p[1])) return 'with_hill gives back a line that still has the old hill in it.'
            if (!got.includes(hill)) return 'with_hill gives back a line without the hill it was given.'
            if (got.split(';').length !== 4) return 'with_hill gives back a line that does not have four parts with a semicolon between each.'
            return 'with_hill does not give back the line with the new hill as its second part.'
          }
        }
      })
    })
  }
}

const equalLen = (list, n) => list.length === n
