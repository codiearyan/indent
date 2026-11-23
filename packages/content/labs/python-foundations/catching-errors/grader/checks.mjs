import { dataCases, namedOnly, tuple } from '../../grading.mjs'

const FILE = 'log_totals.py'

/** How Python shows a text in an error message, for Check's own plain texts. */
const pyRepr = (text) => (text.includes("'") && !text.includes('"') ? `"${text}"` : `'${text}'`)

const intMessage = (text) => `invalid literal for int() with base 10: ${pyRepr(text)}`

const BROAD =
  'An except that names no error, or names Exception, catches every error, a mistake in the code included.'

const NOT_A_NUMBER = (asks) => (e) =>
  e.type === 'ValueError' && /^invalid literal for int\(\)/.test(e.message)
    ? `int() stops with ValueError on text that is not a whole number, and for that the task asks ${asks}. Put the line that turns the text into a number inside a try, with an except that names ValueError`
    : null

const UNPACK =
  'Taking that entry apart at the semicolon stops with ValueError, and the task says that error must reach the caller. A try around the line that takes the entry apart catches it too: put only the line that turns the hours into a number inside the try.'

export const checks = {
  number(t) {
    const list = [
      ['A whole number', '3', 0, 3],
      ['Spaces around the digits', ' 12 ', -1, 12],
      ['A number below zero', '-4', 0, -4],
      ['A word', 'two', 0, 0],
      ['A decimal number', '2.5', -1, -1],
      ['Empty text', '', 99, 99]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'whole_number',
      raising: true,
      errors: NOT_A_NUMBER('for the fallback'),
      list: [
        ...list.map(([name, text, fallback, want]) => ({
          name,
          args: [text, fallback],
          expected: want,
          noneHint:
            'whole_number gives back None. When the text is not a whole number, the task asks for the fallback it is given: give it back from the except block.',
          hint: (v) =>
            Number(text) === want && text.trim() !== ''
              ? 'whole_number does not give back the number in the text.'
              : `whole_number does not give back the fallback it is given when the text is not a whole number.`
        })),
        {
          name: 'Given None, the error reaches the caller',
          args: [null, 0],
          raises: {
            type: 'TypeError',
            swallowed: (v) =>
              `whole_number(None, 0) gave back ${v.repr}. Given None, int() stops with TypeError, not ValueError, and the task says that error must reach the caller: name only ValueError after except. ${BROAD}`
          }
        }
      ]
    })
  },

  async callout(t) {
    const list = [
      ['Hours that are a whole number', 'Scarth Fell; 3', tuple('Scarth Fell', 3)],
      ['Spaces in other places', '  Garve Edge ;12', tuple('Garve Edge', 12)],
      ['Hours written as a word', 'Black Knowe; two', tuple('Black Knowe', null)],
      ['Hours with a decimal point', 'Cairn Dubh; 2.5', tuple('Cairn Dubh', null)]
    ]
    const unread = [
      ['No semicolon, the error reaches the caller', 'Lowther Crag 4'],
      ['Two semicolons, the error reaches the caller', 'Garve Edge; 2; 3']
    ]
    return namedOnly(t, FILE, 2, 'callout_of', 'ValueError', await dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'callout_of',
      raising: true,
      errors: NOT_A_NUMBER('None for the hours'),
      list: [
        ...list.map(([name, entry, want]) => ({
          name,
          args: [entry],
          expected: want,
          hint: (v) => {
            const got = v.data?.['@tuple']
            if (!got) return 'callout_of does not give back a tuple of the hill and the hours.'
            if (got[0] !== want['@tuple'][0]) return 'callout_of does not give back the hill without the spaces at its ends.'
            if (typeof got[1] === 'string') return 'callout_of gives back the hours as text. The task asks for a whole number.'
            return want['@tuple'][1] === null
              ? 'For hours that are not a whole number, callout_of should give back None for the hours.'
              : 'callout_of does not give back the hours as a whole number.'
          }
        })),
        ...unread.map(([name, entry]) => ({
          name,
          args: [entry],
          raises: {
            type: 'ValueError',
            swallowed: (v) => `callout_of gave back ${v.repr} for an entry without exactly one semicolon. ${UNPACK}`,
            wrongType: UNPACK
          }
        }))
      ]
    }))
  },

  async hours(t) {
    const list = [
      ['Two entries that cannot be read', ['Scarth Fell; 3', 'Garve Edge; two', 'Black Knowe; 10', 'Cairn Dubh; 2.5'], 13, ['Garve Edge; two', 'Cairn Dubh; 2.5']],
      ['Every entry can be read', ['Lowther Crag;4', 'Garve Edge; 1'], 5, []],
      ['No entry can be read', ['Scarth Fell; ?', 'Garve Edge;'], 0, ['Scarth Fell; ?', 'Garve Edge;']],
      ['One that cannot be read at the end', ['Black Knowe; 6', 'Scarth Fell; six'], 6, ['Scarth Fell; six']]
    ]
    const part = (entry) => entry.slice(entry.indexOf(';') + 1)
    return namedOnly(t, FILE, 3, 'log_hours', 'ValueError', await dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'log_hours',
      raising: true,
      list: [
        ...list.map(([name, entries, total, bad]) => ({
          name,
          args: [entries],
          expected: tuple(total, bad.map((e) => `${e}: ${intMessage(part(e))}`)),
          accept: [tuple(total, bad.map((e) => `${e}: ${intMessage(part(e).trim())}`))],
          hint: (v) => {
            const got = v.data?.['@tuple']
            if (!got || got.length !== 2) return 'log_hours does not give back a tuple of two things: the total, then the list of texts.'
            const [sum, texts] = got
            if (!Array.isArray(texts)) return 'The second thing log_hours gives back should be a list of texts.'
            if (texts.length !== bad.length) return 'The list log_hours gives back does not hold one text for each entry whose hours cannot be read.'
            if (texts.some((x) => typeof x !== 'string' || !x.includes('invalid literal for int()')))
              return 'The texts log_hours gives back do not end with the message of the error. The name after as holds the error itself, and an f-string with that name in it shows its message.'
            if (texts.some((x, i) => !x.startsWith(`${bad[i]}: `)))
              return 'Each text should start with the entry as it is, then a colon and a space, before the message of the error.'
            if (sum !== total)
              return 'log_hours does not add up the hours that can be read, each once. Add an entry\'s hours only when they were read: in the else of the try, which runs only when nothing went wrong.'
            return 'log_hours does not give back the total and the texts the task asks for.'
          }
        })),
        {
          name: 'No semicolon, the error reaches the caller',
          args: [['Scarth Fell; 3', 'Lowther Crag 4']],
          raises: {
            type: 'ValueError',
            swallowed: (v) => `log_hours gave back ${v.repr} for a list with an entry without a semicolon. ${UNPACK}`,
            wrongType: UNPACK
          }
        }
      ]
    }))
  },

  night(t) {
    const log = '21:05 GOLF SIX: leaving the base\n21:40 GOLF SIX: at Lochan Ùr\n'
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'night_text',
      raising: true,
      errors: (e) =>
        e.type === 'FileNotFoundError'
          ? 'there is no file at that path, and for that the task asks for empty text. Put the lines that open and read the file inside a try, with an except that names FileNotFoundError'
          : null,
      list: [
        {
          name: 'A log that is there',
          args: ['logs/tonight.txt'],
          files: { 'logs/tonight.txt': log },
          expected: log,
          hint: 'night_text does not give back everything in the file.'
        },
        {
          name: 'No file at that path',
          args: ['logs/sunday.txt'],
          files: { 'logs/tonight.txt': log },
          paths: ['logs/sunday.txt'],
          expected: '',
          noneHint: 'night_text gives back None for a path with no file. The task asks for empty text then.',
          hint: 'For a path with no file, night_text should give back empty text.'
        },
        {
          name: 'A folder, the error reaches the caller',
          args: ['logs'],
          files: { 'logs/tonight.txt': log },
          paths: ['logs'],
          raises: {
            types: ['IsADirectoryError', 'PermissionError'],
            swallowed: (v) =>
              `night_text("logs") gave back ${v.repr}. logs is a folder, and opening a folder stops with another error than FileNotFoundError, which the task says must reach the caller. OSError, Exception or an except with no name catch it too: name only FileNotFoundError.`
          }
        }
      ]
    })
  }
}
