import { code } from '../../grading.mjs'
import {
  calls,
  earlier,
  lit,
  loaded,
  partOf,
  probe,
  readSource,
  same,
  shape,
  show
} from '../../catalogue-grading.mjs'

const FILE = 'src/saving.js'

const DEFAULTS = { currency: 'EUR', showSoldOut: true, perPage: 12 }

const stopsOnBroken = (fn) =>
  `${fn} stops on text that is not JSON: JSON.parse throws an error there, and the error stops the whole program. The lesson shows how to catch an error so the function can go on.`

export const checks = {
  save(t) {
    return calls(t, {
      file: FILE,
      fn: 'saveCatalogue',
      list: [
        [
          { sku: 'PIN-350', name: 'Pine', priceCents: 2300 },
          { sku: 'ROS-120', name: 'Rose', priceCents: 1250, notes: ['rose', 'honey'] }
        ],
        [{ sku: 'IVY-200', name: 'Ivy', priceCents: 1950, onSale: false }],
        []
      ].map((candles) => ({
        name: candles.length
          ? `Saves ${candles.map((c) => c.name).join(', ')}`
          : 'Saves an empty list',
        args: [candles],
        keeps: 'list',
        expected: JSON.stringify(candles, null, 2),
        hint: 'Give back the list as JSON text, indented by two spaces.',
        explain: (r) => {
          const v = r.value
          if (Array.isArray(v))
            return 'saveCatalogue gave back the list itself. A file holds text: turn the list into JSON text.'
          if (typeof v !== 'string') return undefined
          if (v.includes('[object Object]')) {
            return 'The text says [object Object]. Turning an object into text the ordinary way loses everything in it; JSON keeps it.'
          }
          if (v === JSON.stringify(candles))
            return 'The JSON is right, but all on one line. The task asks for it indented by two spaces.'
          try {
            if (same(JSON.parse(v), candles))
              return 'The JSON holds the right list, indented another way. The task asks for two spaces.'
          } catch {}
          return undefined
        }
      }))
    })
  },

  load(t) {
    const list = [{ sku: 'PIN-350', name: 'Pine', priceCents: 2300 }]
    return calls(t, {
      file: FILE,
      fn: 'loadCatalogue',
      list: [
        { name: 'Loads a saved list', text: JSON.stringify(list), expected: list },
        {
          name: 'Loads an indented list',
          text: JSON.stringify(
            [...list, { sku: 'IVY-200', name: 'Ivy', priceCents: 1950 }],
            null,
            2
          ),
          expected: [...list, { sku: 'IVY-200', name: 'Ivy', priceCents: 1950 }]
        },
        { name: 'Loads an empty list', text: '[]', expected: [] },
        { name: 'A file cut off part way', text: '[{"sku":"PIN-350","na', expected: [] },
        { name: 'Text that is not JSON at all', text: 'catalogue goes here', expected: [] },
        { name: 'An empty file', text: '', expected: [] }
      ].map((c) => ({
        name: c.name,
        args: [c.text],
        expected: c.expected,
        hint:
          c.text === JSON.stringify(c.expected) || c.expected.length
            ? 'Give back the list the JSON text holds.'
            : 'This text is not JSON, so loadCatalogue gives back an empty list instead of stopping.',
        explain: (r) => {
          if (r.threw && /SyntaxError/.test(r.threw)) return stopsOnBroken('loadCatalogue')
          if (typeof r.value === 'string')
            return 'loadCatalogue gave back text. Turn the JSON text back into a list.'
          if (
            !c.expected.length &&
            c.text !== '[]' &&
            r.value !== undefined &&
            !Array.isArray(r.value)
          ) {
            return `For broken text loadCatalogue gave back ${show(r.value)}. The task asks for an empty list.`
          }
          if (!c.expected.length && c.text !== '[]' && r.value === undefined) {
            return 'For broken text loadCatalogue gave back undefined. The task asks for an empty list.'
          }
          return undefined
        }
      }))
    })
  },

  async stock(t) {
    const maps = [
      [
        ['PIN-350', 3],
        ['ROS-120', 0],
        ['IVY-200', 11]
      ],
      [['BIR-500', 1]],
      []
    ]
    const { values, problem } = await probe(
      t,
      FILE,
      maps.map((entries) => `saveStock(new Map(${lit(entries)}))`)
    )
    if (problem) return [problem]
    const saves = maps.map((entries, i) => {
      const r = values[i]
      const name = entries.length
        ? `saveStock keeps ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
        : 'saveStock saves an empty Map'
      const output = `saveStock(${show(new Map(entries))})\n${r.threw ? `stopped with ${r.threw}` : `gave ${show(r.value)}`}`
      const fail = (message) => ({ name, passed: false, message, output })
      if (r.threw) return fail(`saveStock stops with an error. Read the error below.`)
      if (r.value === undefined)
        return fail(
          'saveStock gives nothing back yet. A function hands its answer back with return.'
        )
      if (typeof r.value !== 'string')
        return fail(
          `saveStock gave back ${show(r.value)}, not text. A file holds text: give back JSON text.`
        )
      let parsed
      try {
        parsed = JSON.parse(r.value)
      } catch {
        return fail('saveStock gave back text that is not JSON. Make JSON text, as in Task 1.')
      }
      if (entries.length && same(parsed, {})) {
        return fail(
          "saveStock's text is {}: a Map's entries are not properties, so JSON leaves them all out. Turn the Map into something JSON keeps, such as a list of its entries, before you save it."
        )
      }
      const text = r.value
      const lost = entries.find(([k, n]) => !text.includes(k) || !text.includes(String(n)))
      if (lost)
        return fail(
          `saveStock's text has no trace of ${lost[0]} and its count. Every entry must be kept.`
        )
      return { name, passed: true, output }
    })
    if (!saves.every((d) => d.passed)) return saves
    const loads = await calls(t, {
      file: FILE,
      fn: 'loadStock',
      list: maps.map((entries, i) => ({
        name: entries.length
          ? `loadStock brings back ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
          : 'loadStock brings back an empty Map',
        args: [values[i].value],
        expected: new Map(entries),
        hint: 'loadStock reads the text that saveStock made and gives back a Map with the same entries.',
        explain: (r) => {
          const v = r.value
          if (r.threw && /SyntaxError/.test(r.threw))
            return 'loadStock stops reading the text saveStock made. Read it back the way it was written.'
          if (Array.isArray(v))
            return 'loadStock gave back a list. The task asks for a Map; a list of pairs can make one.'
          if (v && typeof v === 'object' && !(v instanceof Map))
            return 'loadStock gave back a plain object. The task asks for a Map.'
          if (typeof v === 'string')
            return 'loadStock gave back text. Turn the JSON back into data, and that into a Map.'
          return undefined
        }
      }))
    })
    return [...saves, ...loads]
  },

  async settings(t) {
    const text = code(await readSource(t, FILE))
    if (!partOf(text, 'readJson')) {
      return [
        shape(
          'Writes readJson',
          false,
          'Check cannot find a function called readJson, spelt exactly so, capital J included. Write it yourself under // Task 4, at the left edge: the word function, the name readJson, its two parameters in round brackets and its body in curly braces.'
        )
      ]
    }
    const one = await calls(t, {
      file: FILE,
      fn: 'readJson',
      list: [
        ['Reads an object', '{"perPage":30}', {}, { perPage: 30 }],
        ['Reads a list', '[1,2,3]', [], [1, 2, 3]],
        ['Broken text gives the fallback', '{"perPage":', 'none', 'none'],
        ['An empty text gives the fallback', '', null, null],
        ['Reads a 0', '0', 5, 0],
        ['Reads null', 'null', 'none', null]
      ].map(([name, json, fallback, expected]) => ({
        name,
        args: [json, fallback],
        expected,
        hint: 'readJson gives back the value the text holds as JSON, or the fallback only when the text is not JSON.',
        explain: (r) => {
          if (r.threw && /SyntaxError/.test(r.threw)) return stopsOnBroken('readJson')
          if ((json === '0' || json === 'null') && same(r.value, fallback)) {
            return `readJson gave the fallback for ${json}, which is JSON. The fallback is only for text that cannot be read, not for a value that counts as false or as nothing.`
          }
          if (typeof r.value === 'string' && r.value === json && json)
            return 'readJson gave back the text itself. Turn the JSON text into a value.'
          return undefined
        }
      }))
    })
    if (!loaded(FILE, one)) return one
    const all = await calls(t, {
      file: FILE,
      fn: 'loadSettings',
      list: [
        ['Every setting was saved', { currency: 'GBP', showSoldOut: false, perPage: 24 }],
        ['Only one setting was saved', { perPage: 48 }],
        ['A setting the defaults do not have', { showSoldOut: false, theme: 'dark' }],
        ['Nothing was saved', '{}'],
        ['A file cut off part way', '{"currency":"G'],
        ['An empty file', '']
      ].map(([name, saved]) => {
        const json = typeof saved === 'string' ? saved : JSON.stringify(saved)
        let parsed = {}
        try {
          parsed = JSON.parse(json)
        } catch {}
        return {
          name,
          args: [json],
          expected: { ...DEFAULTS, ...parsed },
          hint: 'Every default setting, with every saved setting over it. Broken text gives the defaults.',
          explain: (r) => {
            const v = r.value
            if (r.threw && /SyntaxError/.test(r.threw)) return stopsOnBroken('loadSettings')
            if (v && typeof v === 'object' && same(v, parsed) && Object.keys(parsed).length < 3) {
              return 'loadSettings gave back only the saved settings. The defaults fill in every setting that was not saved.'
            }
            if (v && typeof v === 'object' && same(v, DEFAULTS) && Object.keys(parsed).length) {
              return 'loadSettings gave back the defaults, though settings were saved. The saved ones go over the defaults.'
            }
            if (
              v &&
              typeof v === 'object' &&
              Object.keys(parsed).some((k) => v[k] === DEFAULTS[k] && parsed[k] !== DEFAULTS[k])
            ) {
              return 'A saved setting lost to its default. When a key appears twice, the one written last wins, so the saved settings go last.'
            }
            return undefined
          }
        }
      })
    })
    const { values } = await probe(t, FILE, [
      `(() => { try { loadSettings('{"perPage":99,"currency":"USD"}'); loadSettings('oops') } catch {} return defaultSettings })()`
    ])
    const defaults = values?.[0]
    const oneRight = one.every((d) => d.passed)
    const exported = /^export\s*\{[^}]*\breadJson\b/m.test(text)
    return [
      ...one,
      ...(oneRight
        ? all
        : all.map((d) =>
            d.passed ? d : { ...d, message: earlier('loadSettings', 'readJson').message }
          )),
      shape(
        'defaultSettings stays as it is',
        defaults && !defaults.threw && same(defaults.value, DEFAULTS),
        defaults?.threw
          ? 'Check cannot find defaultSettings any more. Keep that line as it was, with the same name.'
          : 'defaultSettings changed after loadSettings ran. Writing the saved settings into it changes the defaults for every later load. Make a new object.'
      ),
      shape(
        'loadSettings uses readJson',
        /\breadJson\s*\(/.test(partOf(text, 'loadSettings')),
        'The task asks loadSettings to read the text with readJson. Call readJson inside loadSettings.'
      ),
      shape(
        'readJson stays off the export line',
        !exported,
        'readJson only helps loadSettings, so it stays off the export line at the bottom. Put that line back as it was.'
      )
    ]
  }
}
