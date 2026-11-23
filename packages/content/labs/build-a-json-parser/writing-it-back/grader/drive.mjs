// Copied into the sandbox as .grader/drive.mjs. Runs the learner's stringify() and importPrices() on
// values and price lists of its own, in a worker, and reads the text back with the built-in reader.
import { builtIn, inWorker, preview, quoted, randomValue, refTokens, rng, serve, valueProblem } from './helpers.mjs'

export const run = (name, ...args) => inWorker(import.meta.url, name, args)

const C = (code) => String.fromCharCode(code)

const VALUES = {
  plain: [
    ['null', null],
    ['true', true],
    ['false', false],
    ['a whole number', 1200],
    ['a number with a fraction and a minus', -12.5],
    ['a very large number', 1e21],
    ['a text', 'Cotton card'],
    ['an empty array', []],
    ['an empty object', {}],
    ['an array of plain values', [1, 'two', null, false]],
    ['an item', { code: 'CT-300', price: 0.42, inStock: true }],
    ['arrays and objects inside each other', { items: [{ code: 'EV-C6', sizes: ['C6', 'DL'] }, { code: 'TG-50', note: null }] }]
  ],
  escapes: [
    ['a text with a quote', 'Kraft "natural"'],
    ['a text with a backslash', 'C:\\prints\\'],
    ['a text with a line break', 'Ships by road only.\nNot by post.'],
    ['a text with a tab and a carriage return', 'a\tb\r\n'],
    ['a text with a backspace and a form feed', `x${C(8)}y${C(12)}z`],
    ['a text with characters 0, 1 and 31', `${C(0)}${C(1)}${C(31)}`],
    ['a text with accents and a picture character', 'Cr\u00e8me \ud83d\udcdc'],
    ['a text with a slash', 'A4/A3']
  ],
  keys: [
    ['an object whose key holds a quote', { 'say "hi"': 1 }],
    ['an object whose key holds a line break', { 'two\nlines': 2, '': 3 }]
  ]
}

// Whether there is space outside the texts: every token starts where the last one ended.
function spaced(text) {
  const tokens = refTokens(text)
  return tokens.some((t, i) => t.at !== (i === 0 ? 0 : tokens[i - 1].end)) || (tokens.at(-1)?.end ?? 0) !== text.length
}

function judgeWrite(step, lib, label, value) {
  const r = step(`stringify(${label})`, () => lib.stringify(value))
  if (r.threw) {
    return { pass: false, seen: `stringify(${preview(value)}) threw ${r.threw.name}: ${r.threw.message}`, why: `stringify() threw on ${label}, which JSON can hold.` }
  }
  const out = r.value
  const seen = `stringify(${preview(value)}) gave ${typeof out === 'string' ? quoted(out) : preview(out)}`
  if (typeof out !== 'string') return { pass: false, seen, why: 'stringify() should return the JSON text, a string.' }
  let back
  try {
    back = builtIn.parse(out)
  } catch {
    return {
      pass: false,
      seen,
      why: /text|key/.test(label)
        ? `What stringify() wrote for ${label} is not JSON. Look at how a quote, a backslash or a character below a space has to be written inside a text.`
        : `What stringify() wrote for ${label} is not JSON.`
    }
  }
  // As JSON holds it: -0 is written 0, like every writer does.
  const problem = valueProblem(back, builtIn.parse(builtIn.stringify(value)), [], 'the value you were given')
  if (problem) return { pass: false, seen, why: `Read back, the text is not the value it was made from. ${problem}` }
  if (spaced(out)) return { pass: false, seen, why: 'With no indent, the text has no space outside the texts: no space after a comma or a colon, and no line breaks.' }
  return { pass: true, seen }
}

// Values JSON cannot hold, each made fresh, with the place the message should name.
const CANNOT = {
  top: () => ['undefined', undefined, null],
  fn: () => ['an array that holds a function', [1, () => 2], '[1]'],
  missing: () => ['an item whose price is undefined', { code: 'CT-300', price: undefined }, 'price'],
  nan: () => ['a price list with a price of NaN', { items: [{ code: 'INK-BLK', price: NaN }] }, 'items[0].price'],
  infinity: () => ['an array that holds -Infinity', [0, 1, -Infinity], '[2]'],
  self: () => {
    const paper = { name: 'paper' }
    paper.self = paper
    return ['an object that holds itself', paper, 'self']
  },
  list: () => {
    const list = [1]
    list.push(list)
    return ['an array that holds itself', list, '[1]']
  },
  deep: () => {
    const order = { items: [{ code: 'EV-C6' }] }
    order.items[0].order = order
    return ['an order whose item holds the order', order, 'items[0].order']
  }
}

const LISTS = {
  board: '{\n  "supplier": "Board supplier",\n  "items": [\n    { "code": "BD-1", "name": "Grey board, 1 mm", "price": 1.2 },\n    { "code": "BD-2", "name": "Grey board, 2 mm", "price": 1.95 }\n  ]\n}',
  ribbon: '{"supplier": "Ribbon supplier", "items": [{"code": "RB-10", "name": "Cotton ribbon, 10 mm", "price": 0.6, "per": "metre"}]}',
  twine: '{\n  "supplier": "Twine supplier",\n  "items": [\n    { "code": "TW-50", "name": "Twine, \\"waxed\\"", "price": 3.5, "minimum": 2 }\n  ]\n}',
  broken: '{\n  "supplier": "Glue supplier",\n  "items": [\n    { "code": "GL-1" "price": 4.25 }\n  ]\n}',
  cut: '{\n  "supplier": "Wax supplier",\n  "items": [\n    { "code": "WX-1",'
}

const TRIPS = {
  lists: ['board', 'ribbon', 'twine'],
  broken: ['ribbon', 'broken', 'board'],
  cut: ['cut', 'twine'],
  none: []
}

function where(text, at) {
  const before = text.slice(0, at)
  return { line: before.split('\n').length, column: at - (before.lastIndexOf('\n') + 1) + 1 }
}

const at = { broken: (t) => t.indexOf('"price"'), cut: (t) => t.length }

const cases = {
  write({ lib, step }, key) {
    for (const [label, value] of VALUES[key]) {
      const result = judgeWrite(step, lib, label, value)
      if (!result.pass) return result
    }
    return { pass: true, seen: `${VALUES[key].length} values written and read back` }
  },

  many({ lib, step }, seed) {
    const random = rng(seed)
    for (let i = 0; i < 150; i++) {
      const value = randomValue(random, 4)
      const result = judgeWrite(step, lib, `the check's value ${preview(value)}`, value)
      if (!result.pass) return result
    }
    return { pass: true, seen: '150 values written and read back' }
  },

  cannot({ lib, step }, key) {
    const [label, value, path] = CANNOT[key]()
    const r = step(`stringify(${label})`, () => lib.stringify(value), { keepStack: true })
    if (r.ok) {
      return { pass: false, seen: `stringify(${label}) gave ${preview(r.value)}`, why: `JSON has no way to hold ${label}, and writing something else in its place would change the list without a word. Throw a TypeError.` }
    }
    const e = r.threw
    const seen = `stringify(${label}) threw ${e.name}: ${e.message}`
    if (e.stack) {
      return { pass: false, seen, why: 'stringify() went round and round a value that holds itself until it ran out of room. Keep the arrays and objects you are inside of, and refuse a value that is already one of them.' }
    }
    if (!e.typeError) return { pass: false, seen, why: `It threw ${e.name}. Throw a TypeError for a value JSON cannot hold.` }
    if (path && !e.message.includes(path)) {
      return { pass: false, seen, why: `It threw a TypeError. Its message should say where the value sits, keys after dots and indexes in brackets from the top, as in items[1].price.` }
    }
    return { pass: true, seen }
  },

  shared({ lib, step }) {
    const paper = { code: 'CT-300', price: 0.42 }
    const value = { first: paper, again: [paper, paper] }
    const r = step('stringify(an object that holds the same item three times)', () => lib.stringify(value), { keepStack: true })
    if (r.threw) {
      return {
        pass: false,
        seen: `threw ${r.threw.name}: ${r.threw.message}`,
        why: 'The same item can sit in several places without holding itself. Refuse only a value that is inside itself: one of the arrays and objects you are writing it from.'
      }
    }
    return judgeWrite(step, lib, 'an object that holds the same item three times', value)
  },

  afterRefusal({ lib, step }) {
    const order = { code: 'EV-C6', items: [{ code: 'TG-50' }] }
    order.items[0].order = order
    step('stringify(an order that holds itself)', () => lib.stringify(order), { keepStack: true })
    delete order.items[0].order
    return judgeWrite(step, lib, 'the same order once it no longer holds itself', order)
  },

  indent({ lib, step }, seed) {
    const random = rng(seed)
    const fixed = [
      [{ code: 'KR-120', sizes: ['A3', 'A4'], price: 0.21, stock: { A3: 40, A4: 0 } }, 2],
      [[1, [2, [3, []]], {}], 4],
      [{ items: [], note: null }, 1],
      [[], 2],
      [{}, 3]
    ]
    const values = [...fixed, ...Array.from({ length: 60 }, () => [randomValue(random, 4, { plain: true }), 1 + Math.floor(random() * 4)])]
    for (const [value, n] of values) {
      const r = step(`stringify(${preview(value)}, ${n})`, () => lib.stringify(value, n))
      const want = builtIn.stringify(value, null, n)
      const seen = r.ok ? `stringify(${preview(value)}, ${n}) gave\n${typeof r.value === 'string' ? r.value.split('\n').slice(0, 12).join('\n') : preview(r.value)}` : `stringify(${preview(value)}, ${n}) threw ${r.threw.name}: ${r.threw.message}`
      if (r.threw) return { pass: false, seen, why: 'stringify() threw on a value JSON can hold.' }
      if (r.value === want) continue
      if (typeof r.value !== 'string') return { pass: false, seen, why: 'stringify() should return the JSON text, a string.' }
      const got = r.value.split('\n')
      const line = want.split('\n').findIndex((l, i) => l !== got[i])
      return {
        pass: false,
        seen,
        why: `Line ${line + 1} of the text is not laid out as the task says. Each item and each pair goes on a line of its own, ${n} more spaces in than its brackets, with a space after each colon, none after a comma and no comma after the last one, and an empty array or object stays on one line.`
      }
    }
    return { pass: true, seen: `${values.length} values written with an indent` }
  },

  trip({ lib, step }, key) {
    const names = TRIPS[key]
    const files = names.map((name) => ({ name: `${name}.json`, text: LISTS[name] }))
    const r = step(`importPrices(${names.map((n) => `${n}.json`).join(', ') || 'no lists'})`, () => lib.importPrices(files))
    if (r.threw) return { pass: false, seen: `threw ${r.threw.name}: ${r.threw.message}`, why: 'importPrices() threw. A list that does not read becomes a problem, not a crash.' }
    const out = r.value
    const seen = `importPrices() gave ${preview(out)}`
    if (!out || typeof out.text !== 'string' || !Array.isArray(out.problems)) {
      return { pass: false, seen, why: 'importPrices() should return an object with text, a string, and problems, an array.' }
    }
    const items = []
    const problems = []
    for (const name of names) {
      const text = LISTS[name]
      if (at[name]) {
        problems.push({ file: `${name}.json`, ...where(text, at[name](text)) })
        continue
      }
      const list = builtIn.parse(text)
      for (const item of list.items) items.push({ ...item, supplier: list.supplier })
    }
    let back
    try {
      back = builtIn.parse(out.text)
    } catch {
      return { pass: false, seen, why: 'The text importPrices() returned is not JSON. Make it with your stringify().' }
    }
    const problem = valueProblem(back, { items }, [], 'the lists')
    if (problem) return { pass: false, seen, why: `The text does not hold the items of the lists that read. ${problem}` }
    if (out.text !== builtIn.stringify(back, null, 2)) {
      return { pass: false, seen, why: 'The items are right, but the text is not indented by two spaces the way task 3 asks. Pass 2 as the indent.' }
    }
    if (out.problems.length !== problems.length) {
      return { pass: false, seen, why: `There should be one problem for each list that does not read, and here ${problems.length === 1 ? 'one list does not' : problems.length ? 'some lists do not' : 'every list reads'}.` }
    }
    for (let i = 0; i < problems.length; i++) {
      const got = out.problems[i] ?? {}
      const want = problems[i]
      if (got.file !== want.file) return { pass: false, seen, why: "A problem's file is the name of the list it is about, as importPrices() was given it." }
      if (got.line !== want.line || got.column !== want.column) return { pass: false, seen, why: "A problem's line and column are those of the JsonError the list threw." }
      if (typeof got.message !== 'string' || !got.message) return { pass: false, seen, why: "A problem's message is the message of the JsonError the list threw." }
    }
    return { pass: true, seen }
  }
}

serve(cases, ['json.js', 'prices.js'])
