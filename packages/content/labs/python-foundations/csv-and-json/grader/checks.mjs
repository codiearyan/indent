import { dataCases, equalData, tuple } from '../../grading.mjs'

const FILE = 'kit_files.py'

// The modules a task needs, so a mistake in the import line of another task does not count.
const CSV = 'import csv\n'
const JSON_MODULE = 'import json\n'

/** A CSV value as csv.writer writes it: in quotes when it holds a comma, a quote or a line end. */
const cell = (v) => {
  const text = String(v)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
const csvText = (rows) => rows.map((row) => `${row.map(cell).join(',')}\n`).join('')

/** The rows of a CSV text, as the csv module reads them. */
function csvRows(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (value += '"'), i++
      else if (ch === '"') quoted = false
      else value += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') row.push(value), (value = '')
    else if (ch === '\r') continue
    else if (ch === '\n') row.push(value), rows.push(row), (row = []), (value = '')
    else value += ch
  }
  if (value !== '' || row.length) row.push(value), rows.push(row)
  return rows
}

const TEXT_COUNT = (error) =>
  /'(<|>|<=|>=)' not supported between instances of '(str|int)' and '(str|int)'/.test(error.message)
    ? 'the line compares a text with a number. Everything read from a CSV file is text, the counts too, so turn the count into a number first'
    : null

const READ_PATH = (what) => (error) =>
  /'str' object has no attribute 'read'/.test(error.message)
    ? `${what} reads from an open file, and here it was given text, such as the path itself. Open the file first and give it the file`
    : null

export const checks = {
  names(t) {
    const list = [
      ['A name with a comma in it', 'kit list.csv', 'item,count,place\nice axe,4,store\n"map, 1:25000",12,desk\ncompass,7,desk\n'],
      ['Saved on Windows', 'windows.csv', 'item,count\r\nflare,10\r\nbivvy bag,1\r\n'],
      ['No line end after the last row', 'vehicle.csv', 'kind,count\ncrampons,6\nhelmet,8'],
      ['Only a heading row', 'empty.csv', 'item,count,place\n']
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'kit_names',
      csv: true,
      typed:
        'kit_names gives back the same list whatever file Check gives it. Read the file at the path it is given.',
      list: list.map(([name, path, text]) => {
        const rows = csvRows(text)
        const want = rows.slice(1).map((r) => r[0])
        return {
          name,
          args: [path],
          files: { [path]: text },
          expected: want,
          hint: (v) => {
            const got = Array.isArray(v.data) ? v.data.map(String) : []
            if (got.join('') === path.slice(1) || got.join('') === path)
              return 'kit_names gives back the letters of the path. csv.reader was given the path itself, so it read each letter as a row: give it the open file.'
            if (got[0] === rows[0][0] && got.length === want.length + 1)
              return `kit_names gives back the heading of the first column, ${rows[0][0]}, as if it were kit. The first row of the file is its heading row: leave it out.`
            if (got.length > want.length && text.includes('"'))
              return 'kit_names breaks a name with a comma in it into two. Splitting a line at its commas does not know about the quotes around a value; the csv module does.'
            if (got.some((n) => /[\r\n]$/.test(n))) return 'kit_names gives back names with a line end still on.'
            if (got.some((n) => n.startsWith('"')))
              return 'kit_names gives back a name with a quote mark on it, cut short at its comma. Splitting a line at its commas does not know about the quotes around a value; the csv module does.'
            return 'kit_names does not give back the first value of every row after the heading, in order.'
          }
        }
      })
    })
  },

  low(t) {
    const kit = 'item,count,place\nice axe,4,store\nflare,10,vehicle\nbivvy bag,1,store\ncompass,7,desk\n'
    const turned = 'place,count,item\nstore,2,crampons\ndesk,12,"map, 1:25000"\nvehicle,9,helmet\n'
    const list = [
      ['Some running low', 'kit list.csv', kit, 5],
      ['Columns in another order', 'vehicle kit.csv', turned, 10],
      ['A count exactly on the line', 'kit list.csv', kit, 4],
      ['None running low', 'kit list.csv', kit, 1]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'low_kit',
      csv: true,
      define: CSV,
      errors: TEXT_COUNT,
      typed:
        'low_kit gives back the same list whatever Check gives it. Read the file at the path it is given.',
      list: list.map(([name, path, text, smallest]) => {
        const rows = csvRows(text)
        const head = rows[0]
        const items = rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
        const want = items.filter((r) => Number(r.count) < smallest).map((r) => r.item)
        return {
          name,
          args: [path, smallest],
          files: { [path]: text },
          expected: want,
          hint: (v) => {
            const got = Array.isArray(v.data) ? v.data.map(String) : []
            const asText = items.filter((r) => r.count < String(smallest)).map((r) => r.item)
            if (equalData(got, asText) && !equalData(asText, want))
              return 'low_kit compares the counts as text, where 10 comes before 5 because 1 comes before 5. Turn each count into a number with int() before you compare.'
            if (items.some((r) => Number(r.count) === smallest && got.includes(r.item)))
              return `low_kit gives back an item whose count is exactly ${smallest}, which is not less than ${smallest}.`
            if (head[0] !== 'item' && got.some((n) => ['store', 'desk', 'vehicle'].includes(n)))
              return 'low_kit gives back places, not items, for a file whose columns are in another order. Read each value by its heading, not by its position.'
            if (got.includes('item') || got.includes('count')) return 'low_kit takes the heading row for kit.'
            return 'low_kit does not give back the items whose count is less than the number, in the order of the file.'
          }
        }
      })
    })
  },

  save(t) {
    const old = 'item,count\nold rope,1\nold radio,2\n'
    const list = [
      ['Over an old list', 'store.csv', old, { crampons: 6, helmet: 8 }],
      ['A name with a comma, no file yet', 'kit out.csv', undefined, { 'map, 1:25000': 12, flare: 10, 'ice axe': 4 }],
      ['An empty store', 'empty.csv', old, {}]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'save_kit',
      csv: true,
      define: CSV,
      list: list.map(([name, path, before, store]) => {
        const rows = [['item', 'count'], ...Object.entries(store)]
        const want = csvText(rows)
        const cells = rows.map((r) => r.map(String))
        return {
          name,
          args: [path, store],
          files: before === undefined ? {} : { [path]: before },
          // Judged by the rows the csv module reads back, so any quoting csv.writer chooses fits.
          wrote: { [path]: (text) => equalData(csvRows(text), cells) },
          fileHint: (rel, got) => {
            const plain = rows.map((r) => `${r.join(',')}\n`).join('')
            if (before && got.startsWith(before))
              return `After the call, ${rel} still holds the old list. Whatever the file held before should be gone.`
            if (got === plain && plain !== want)
              return `After the call, the name with a comma in it is not in quotes in ${rel}, so it reads as two values. csv.writer puts quotes around such a value for you.`
            if (got === csvText(rows.slice(1))) return `After the call, ${rel} has no heading row of item and count.`
            if (!equalData(csvRows(got)[0] ?? [], ['item', 'count'])) return `After the call, the first row of ${rel} is not the heading row: item and count, with a comma between them and no spaces.`
            if (/\n\n/.test(got)) return `After the call, ${rel} has an empty line between rows.`
            return null
          }
        }
      })
    })
  },

  dump(t) {
    const list = [
      ['Over an old store', 'store.json', '{"old rope": 1}\n', { flare: 10, 'bivvy bag': 1 }],
      ['Letters outside ASCII, no file yet', 'kit out.json', undefined, { 'map, Glen Éite': 3, helmet: 8 }],
      ['An empty store', 'empty.json', '{"old rope": 1}\n', {}]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'save_store',
      list: list.map(([name, path, before, store]) => ({
        name,
        args: [path, store],
        files: before === undefined ? {} : { [path]: before },
        wrote: {
          [path]: (text) => {
            try {
              return equalData(JSON.parse(text), store)
            } catch {
              return false
            }
          }
        },
        fileHint: (rel, got, call) => {
          if (got === '' || (before && got === before))
            return call.lines.length
              ? `After the call, ${rel} holds nothing new, and save_store printed the JSON instead. json.dumps gives back the JSON as text; the function that writes it into a file takes the file too.`
              : `After the call, ${rel} holds nothing new: the store was not written into it.`
          if (before && got.startsWith(before.trim()))
            return `After the call, ${rel} still holds the old store, with the new one after it, which is not JSON. Whatever the file held before should be gone.`
          let parsed
          try {
            parsed = JSON.parse(got)
          } catch {
            return got.includes("'")
              ? `After the call, ${rel} is not JSON: it has single quotes, as Python prints a dictionary. JSON wants double quotes, and the json module writes them.`
              : `After the call, ${rel} is not JSON that holds the store.`
          }
          return equalData(parsed, store) ? null : `After the call, ${rel} holds JSON, but not the store save_store was given.`
        }
      }))
    })
  },

  load(t) {
    const list = [
      ['Three teams', 'last heard.json', { 'HOTEL ONE': [301, 455], 'LIMA THREE': [288, 470], 'KILO FIVE': [310, 449] }],
      ['One team, written over several lines', 'saturday.json', { 'MIKE TWO': [17, 903] }, 2],
      ['No teams', 'empty.json', {}]
    ]
    return dataCases(t, {
      file: FILE,
      task: 5,
      fn: 'load_positions',
      define: JSON_MODULE,
      errors: READ_PATH('json.load'),
      typed:
        'load_positions gives back the same dictionary whatever file Check gives it. Read the file at the path it is given.',
      list: list.map(([name, path, data, indent]) => ({
        name,
        args: [path],
        files: { [path]: `${JSON.stringify(data, null, indent)}\n` },
        expected: { '@dict': Object.entries(data).map(([sign, [e, n]]) => [sign, tuple(e, n)]) },
        hint: (v) => {
          const pairs = v.data?.['@dict'] ?? []
          if (pairs.some(([, p]) => Array.isArray(p)))
            return 'load_positions gives back each position as a list. JSON has no tuples, so a position comes back from json.load as a list: make a tuple of its two numbers.'
          if (pairs.some(([sign, p]) => p?.['@tuple'] && data[sign] && equalData(p['@tuple'], [...data[sign]].reverse())))
            return 'load_positions gives back each position north first. The tuple is (east, north), in the order of the file.'
          return 'load_positions does not give back each call sign with its position as a tuple (east, north).'
        }
      }))
    })
  }
}
