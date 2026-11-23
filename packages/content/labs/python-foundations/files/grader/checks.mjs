import { dataCases } from '../../grading.mjs'

const FILE = 'night_log.py'

// Check's own log_entries, so a mistake in Task 2 does not count in Task 5.
const ENTRIES = `
def log_entries(path):
    with open(path, encoding="utf-8") as log:
        return [line.strip() for line in log if line.strip()]
`

const entriesOf = (text) =>
  text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)

const NOT_THERE = (error) =>
  error.type === 'FileNotFoundError'
    ? 'the file was opened for reading, and a file can be read only when it is there. To write to a file, open it for writing: the second value given to open says what for'
    : null

const READ_TWICE =
  'gives back empty text for a file that has lines in it. A file is read from where the last read stopped, so after one read() the next one gives back empty text: read the file once and keep what it gives.'

export const checks = {
  read(t) {
    const list = [
      ['A log of three lines', 'night log.txt', '20:14 HOTEL ONE: leaving the base\n20:52 HOTEL ONE: at the stile\n21:30 HOTEL ONE: two walkers, both well\n'],
      ['Letters outside ASCII', 'saturday.txt', '07:10 KILO FIVE: on Beinn Ìme\n07:55 KILO FIVE: the café at the car park is open\n'],
      ['No line end after the last line', 'sunday.txt', '06:40 MIKE TWO: radio check\n06:41 BASE: loud and clear'],
      ['Saved on Windows', 'windows log.txt', '18:02 LIMA THREE: leaving\r\n18:47 LIMA THREE: at the hut\r\n'],
      ['An empty file', 'empty.txt', '']
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'log_text',
      mistakes: [{ value: () => '', hint: `log_text ${READ_TWICE}` }],
      typed:
        'log_text gives back the same text whatever file Check gives it. Read the file at the path it is given.',
      list: list.map(([name, path, text]) => ({
        name,
        args: [path],
        files: { [path]: text },
        expected: text.replace(/\r\n/g, '\n'),
        hint: (v) => {
          if (v.type === 'list') return 'log_text gives back a list of lines. The task asks for the whole file as one text.'
          if (v.type !== 'str') return `log_text gives back ${v.repr}, and the task asks for text.`
          const got = String(v.value)
          if (got === '' && text !== '') return `log_text ${READ_TWICE}`
          if (got === text.replace(/\r\n/g, '\n').trim()) return 'log_text takes the line end off the end of the file. The task asks for everything in it, as it is.'
          if (got.includes('\r')) return 'log_text keeps the \\r of each Windows line end. A file opened in text mode, without newline in the brackets, turns every kind of line end into \\n.'
          return 'log_text does not give back everything in the file, as one text.'
        }
      }))
    })
  },

  entries(t) {
    const list = [
      ['A blank line in the middle', 'night log.txt', '20:14 HOTEL ONE: leaving\n\n20:52 HOTEL ONE: at the stile\n'],
      ['No line end after the last line', 'sunday.txt', '06:40 MIKE TWO: radio check\n06:41 BASE: loud and clear'],
      ['Spaces at the ends, letters outside ASCII', 'saturday.txt', '  07:10 KILO FIVE: on Beinn Ìme  \n07:55 KILO FIVE: café open\n\n\n'],
      ['Saved on Windows', 'windows log.txt', '18:02 LIMA THREE: leaving\r\n18:47 LIMA THREE: at the hut\r\n'],
      ['An empty file', 'empty.txt', '']
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'log_entries',
      mistakes: [
        {
          value: () => [],
          hint: 'log_entries gives back an empty list for a file that has lines in it. A file is read from where the last read stopped, so once the whole file has been read, going through it again gives nothing: read it once.'
        }
      ],
      typed:
        'log_entries gives back the same list whatever file Check gives it. Read the file at the path it is given.',
      list: list.map(([name, path, text]) => {
        const want = entriesOf(text)
        return {
          name,
          args: [path],
          files: { [path]: text },
          expected: want,
          hint: (v) => {
            if (v.type === 'str') return 'log_entries gives back one text. The task asks for a list of entries.'
            const got = Array.isArray(v.data) ? v.data.map(String) : []
            if (!got.length && want.length)
              return 'log_entries gives back an empty list for a file that has lines in it. A file is read from where the last read stopped, so once the whole file has been read, going through it again gives nothing: read it once.'
            if (got.some((e) => /[\r\n]$/.test(e))) return 'log_entries gives back entries with their line ends still on. Each line a file gives keeps its line end.'
            if (got.includes('')) return 'log_entries gives back an empty entry for a blank line. Leave blank lines out.'
            if (got.length === want.length && got.at(-1) === want.at(-1).slice(0, -1))
              return 'log_entries cuts the last letter off the last entry. The last line of a file may have no line end, so cutting off the last character of every line cuts a letter there.'
            if (got.some((e) => e !== e.trim())) return 'log_entries gives back entries with spaces still at their ends.'
            return 'log_entries does not give back each line of the file, stripped, in order, with blank lines left out.'
          }
        }
      })
    })
  },

  write(t) {
    const old = 'Callout log, 1 December\n19:00 KILO FIVE: radio check\n'
    const list = [
      ['Over an old log', 'tonight.txt', old, 'Callout log, 4 December'],
      ['A file that is not there yet', 'new log.txt', undefined, 'Callout log, 5 December'],
      ['A title with letters outside ASCII', 'glen.txt', old, 'Callout log, Glen Éite']
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'start_log',
      errors: NOT_THERE,
      list: list.map(([name, path, before, title]) => ({
        name,
        args: [path, title],
        files: before === undefined ? {} : { [path]: before },
        wrote: { [path]: `${title}\n` },
        fileHint: (rel, got) => {
          if (before && got === `${before}${title}\n`)
            return `After the call, ${rel} still holds the old log, with the title after it. The task asks for the title alone: opening with "a" keeps what the file held, and the mode that empties it first is another.`
          if (got === title) return `After the call, ${rel} holds the title without a line end after it. write adds no line end of its own.`
          if (before && got.startsWith(before)) return `After the call, ${rel} still holds the old log. Whatever it held before should be gone.`
          return null
        }
      }))
    })
  },

  append(t) {
    const list = [
      ['A log with two lines', 'tonight.txt', 'Callout log, 3 December\n21:02 HOTEL ONE: leaving\n', '21:30 HOTEL ONE: at the stile'],
      ['An empty log', 'night log.txt', '', '06:15 MIKE TWO: radio check'],
      ['Letters outside ASCII', 'glen.txt', 'Callout log, Glen Éite\n', '22:05 LIMA THREE: at Lochan Ùr']
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'add_entry',
      errors: NOT_THERE,
      list: list.map(([name, path, before, entry]) => ({
        name,
        args: [path, entry],
        files: { [path]: before },
        wrote: { [path]: `${before}${entry}\n` },
        fileHint: (rel, got) => {
          if (before && got === `${entry}\n`)
            return `After the call, ${rel} holds only the new entry, and the lines it held before are lost. Opening with "w" empties a file first; the task asks to keep what is there.`
          if (got === `${before}${entry}`) return `After the call, ${rel} has the entry without a line end after it, so the next entry would land on the same line. write adds no line end of its own.`
          if (got === before) return `After the call, ${rel} is as it was: the entry was not written to it.`
          if (got.startsWith(`${entry}`) && got.endsWith(before)) return `After the call, the entry is at the start of ${rel}. It belongs at the end.`
          return null
        }
      }))
    })
  },

  folder(t) {
    const one = '20:05 GOLF SIX: leaving for Scarth Fell\n\n23:50 GOLF SIX: walker found\n'
    const two = '05:30 ECHO ONE: on the ridge\n05:58 ECHO ONE: casualty with us'
    const list = [
      ['A day with a log', 'night logs', '2026-12-03', { 'night logs/2026-12-03.txt': one, 'night logs/2026-12-04.txt': two }],
      ['Another folder', 'base/old logs', '2025-01-17', { 'base/old logs/2025-01-17.txt': two }],
      ['A day with no log', 'night logs', '2026-12-05', { 'night logs/2026-12-03.txt': one }]
    ]
    return dataCases(t, {
      file: FILE,
      task: 5,
      fn: 'day_entries',
      define: ENTRIES,
      mistakes: [
        {
          value: () => [],
          hint: "day_entries gives back an empty list even for a day that has a log. Look at the path it builds: the folder it is given, joined to the day with .txt after it."
        }
      ],
      typed:
        'day_entries gives back the same list whatever Check gives it. Read the file for the folder and the day it is given.',
      list: list.map(([name, folder, day, files]) => {
        const path = `${folder}/${day}.txt`
        return {
          name,
          args: [{ '@path': folder }, day],
          files,
          paths: [path],
          pathHint: `That day's log is the file named ${day}.txt in the folder ${folder} that the function is given: join the folder and the name, and do not write a folder or file name into the code.`,
          expected: files[path] === undefined ? [] : entriesOf(files[path]),
          noneHint: 'day_entries gives back None for a day without a log. The task asks for an empty list then.',
          hint: (v) => {
            if (files[path] === undefined) return 'For a day with no log, day_entries should give back an empty list.'
            return 'day_entries does not give back the entries of that day\'s file.'
          }
        }
      })
    })
  }
}
