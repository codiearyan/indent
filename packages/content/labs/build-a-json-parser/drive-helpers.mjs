// Copied into every sandbox as .grader/helpers.mjs. Runs a case of grader/drive.mjs in a worker
// thread, so a parser that never ends is stopped and named instead of waited on.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { inspect } from 'node:util'
import { createRequire, syncBuiltinESMExports } from 'node:module'

// Kept before any learner code runs: the check compares with them, and the worker blocks them.
export const builtIn = { parse: JSON.parse, stringify: JSON.stringify }

export const shown = (value) =>
  value instanceof Error ? `${value.name}: ${value.message}` : inspect(value, { breakLength: Infinity })

/** A short look at a value, safe on values a few thousand levels deep. */
export function preview(value) {
  const text = inspect(value, { depth: 3, breakLength: Infinity, maxArrayLength: 8, maxStringLength: 60 })
  return text.length > 220 ? `${text.slice(0, 220)} ...` : text
}

/** A text as the check shows it: quoted, with line breaks and other unseen characters written out. */
const UNSEEN = new RegExp('[\\u0080-\\u00a0\\u2028\\u2029\\ufeff\\u200b]', 'g')

export function quoted(text) {
  if (text.length > 200) return `a text of ${text.length} characters that starts ${quoted(text.slice(0, 24))}`
  const out = inspect(text, { maxStringLength: 120 }).replace(
    UNSEEN,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  )
  return out.length > 140 ? `${out.slice(0, 140)} ...` : out
}

/** Equal values: numbers by value (-0 is not 0), arrays place by place, objects by their own keys in any order. */
export function same(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Object.is(a, b)
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && same(a[k], b[k]))
  }
  return false
}

// Main side. Each step the worker starts gets `stepMs`; a step that takes longer is stopped. Starting
// up and loading the learner's files get `loadMs`, since a busy computer can be slow at that alone.
export function inWorker(driveUrl, name, args, { stepMs = 2500, loadMs = 15000 } = {}) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL(driveUrl), {
      workerData: { name, args },
      resourceLimits: { stackSizeMb: 16, maxOldGenerationSizeMb: 256 },
      stdout: true,
      stderr: true
    })
    worker.stdout.resume()
    worker.stderr.resume()
    let step = 'loading your code'
    let timer
    let done = false
    const finish = (value) => {
      if (done) return
      done = true
      clearTimeout(timer)
      worker.terminate()
      resolve(value)
    }
    const arm = (ms = stepMs) => {
      clearTimeout(timer)
      timer = setTimeout(() => finish({ stuck: 'time', step }), ms)
    }
    arm(loadMs)
    worker.on('message', (m) => {
      if (m.step !== undefined) {
        step = m.step
        arm()
      } else finish(m.done)
    })
    worker.on('error', (error) =>
      finish(error.code === 'ERR_WORKER_OUT_OF_MEMORY' ? { stuck: 'memory', step } : { crashed: shown(error), step })
    )
    worker.on('exit', () => finish({ crashed: 'Your code ended the process (process.exit?) before the check finished.', step }))
  })
}

class Stop {
  constructor(info) {
    this.info = info
  }
}

// What a throw from the learner's code looked like, in plain data.
function record(error, lib) {
  const isError = error instanceof Error
  return {
    name: isError ? error.name : typeof error,
    message: isError ? String(error.message) : String(error),
    json: Boolean((lib.JsonError && error instanceof lib.JsonError) || error?.name === 'JsonError'),
    typeError: error instanceof TypeError,
    at: error?.at,
    line: error?.line,
    column: error?.column,
    expected: error?.expected,
    found: error?.found,
    ended: error?.ended
  }
}

const unwrittenIn = (error) => /\n\s+at (?:Object\.)?(\w+) /.exec(error?.stack ?? '')?.[1]

/**
 * Worker side. Loads the learner's files from src/, blocks the built-in reader and writer, and runs
 * one case: `cases[name]({ lib, step }, ...args)`. `step(label, fn)` names what runs next, calls fn and
 * returns `{ ok, value }` or `{ threw }`; a step that hits 'Not implemented', the built-in, or a
 * function calling itself without end stops the whole case, unless `keepStack` asks for the last
 * to come back as a throw.
 */
export async function serve(cases, files = ['json.js']) {
  if (isMainThread) return
  const post = (m) => parentPort.postMessage(m)
  const { name, args } = workerData
  let used
  const blocked = (what) =>
    function () {
      used = what
      const error = new Error(`${what} was called`)
      error.name = 'UsedBuiltIn'
      throw error
    }
  JSON.parse = blocked('JSON.parse')
  JSON.stringify = blocked('JSON.stringify')
  globalThis.eval = blocked('eval')
  // A fresh context or another process would hand over a built-in reader the lines above never touched.
  const require = createRequire(import.meta.url)
  const vm = require('node:vm')
  for (const fn of ['runInNewContext', 'runInContext', 'createContext', 'compileFunction']) vm[fn] = blocked(`vm.${fn}`)
  vm.Script.prototype.runInNewContext = blocked('vm.Script')
  vm.Script.prototype.runInContext = blocked('vm.Script')
  const child = require('node:child_process')
  for (const fn of ['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork']) child[fn] = blocked(`child_process.${fn}`)
  syncBuiltinESMExports()
  let lib
  try {
    lib = Object.assign({}, ...(await Promise.all(files.map((f) => import(`../src/${f}`)))))
  } catch (error) {
    post({ done: { loadError: shown(error) } })
    return
  }
  const step = (label, fn, { keepStack = false } = {}) => {
    post({ step: label })
    let outcome
    try {
      outcome = { ok: true, value: fn() }
    } catch (error) {
      if (error?.message === 'Not implemented') throw new Stop({ notImplemented: unwrittenIn(error) })
      const stack = error instanceof RangeError && /call stack/.test(error.message)
      if (stack && !keepStack) throw new Stop({ stuck: 'stack', step: label })
      outcome = { threw: { ...record(error, lib), stack } }
    }
    if (used) throw new Stop({ builtIn: used })
    return outcome
  }
  try {
    post({ done: await cases[name]({ lib, step }, ...args) })
  } catch (error) {
    post({ done: error instanceof Stop ? error.info : { crashed: shown(error), step: name } })
  }
}

// The check's own reading of tokens, to compare with. Throws a plain Error on a bad text.
export function refTokens(text) {
  const tokens = []
  const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (' \t\n\r'.includes(ch)) {
      i++
    } else if ('{}[]:,'.includes(ch)) {
      tokens.push({ type: 'mark', value: ch, at: i, end: i + 1 })
      i++
    } else if (ch === '"' || ch === '-' || (ch >= '0' && ch <= '9')) {
      const end = ch === '"' ? stringEnd(text, i) : ((number.lastIndex = i), number.test(text) ? number.lastIndex : -1)
      if (end < 0) throw new Error('bad')
      const value = builtIn.parse(text.slice(i, end))
      tokens.push({ type: ch === '"' ? 'string' : 'number', value, at: i, end })
      i = end
    } else {
      const word = ['true', 'false', 'null'].find((w) => text.startsWith(w, i))
      if (!word) throw new Error('bad')
      tokens.push({ type: 'literal', value: builtIn.parse(word), at: i, end: i + word.length })
      i += word.length
    }
  }
  return tokens
}

function stringEnd(text, at) {
  for (let i = at + 1; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '"') return i + 1
  }
  return -1
}

/** Tokens in a short form for a check's output: `mark { 0-1, literal true 1-5`. */
export function showTokens(tokens) {
  if (!Array.isArray(tokens)) return `not a list of tokens: ${preview(tokens)}`
  if (tokens.length === 0) return 'no tokens'
  const one = (t) =>
    t && typeof t === 'object' ? `${t.type} ${inspect(t.value, { breakLength: Infinity })} ${t.at}-${t.end}` : preview(t)
  const head = tokens.slice(0, 8).map(one).join(', ')
  return tokens.length > 8 ? `${head}, ... (${tokens.length} tokens)` : head
}

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v === 'string' ? 'a text' : typeof v)

/**
 * Compares the learner's tokens with the check's. Returns undefined when they agree, or a sentence
 * about the first difference that never states the expected value.
 */
export function tokenProblem(got, want) {
  if (!Array.isArray(got)) return `tokenize() should return an array of tokens, but it returned ${kindOf(got)}.`
  for (let i = 0; i < Math.max(got.length, want.length); i++) {
    const g = got[i]
    const w = want[i]
    if (!w) return `There are more tokens than the text holds: token ${i + 1} should not be there.`
    const name = w.type === 'mark' ? `the mark ${w.value}` : `the ${w.type === 'string' ? 'text' : w.type} starting at index ${w.at}`
    if (!g || typeof g !== 'object') return `The text has more tokens: ${name} is missing.`
    if (g.type !== w.type) {
      return `Token ${i + 1}, ${name}, has the wrong type. Marks are 'mark', true, false and null are 'literal', numbers are 'number' and texts are 'string'.`
    }
    if (!same(g.value, w.value) || typeof g.value !== typeof w.value) {
      if (w.type === 'literal' && typeof g.value === 'string') {
        return `Token ${i + 1} holds the text '${g.value}'. A literal's value is the JavaScript value itself, not the word.`
      }
      if (w.type === 'number' && typeof g.value === 'number' && g.value !== 0 && Object.is(g.value, -w.value)) {
        return `Token ${i + 1}, ${name}, has lost its sign. The minus belongs to the number, so its value is below 0.`
      }
      if (w.type === 'number' && Object.is(w.value, -0) && Object.is(g.value, 0)) {
        return `Token ${i + 1}, ${name}, is -0, and it came out as 0. JavaScript keeps the minus of -0; turn the characters as written into the number and it stays.`
      }
      return w.type === 'number'
        ? `Token ${i + 1}, ${name}, has the wrong value. If you add the digits up by hand, the last place can come out wrong; the lesson shows a way that cannot.`
        : `Token ${i + 1}, ${name}, has the wrong value.`
    }
    if (g.at !== w.at) return `Token ${i + 1}, ${name}, has the wrong at. at is the index of its first character in the text, counting every character before it, spaces included.`
    if (g.end !== w.end) return `Token ${i + 1}, ${name}, has the wrong end. end is the index just after its last character, so text.slice(at, end) is the token as written.`
  }
  return undefined
}

/** A seeded random number generator, so every run of a check uses the same texts. */
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (random, list) => list[Math.floor(random() * list.length)]
const digitsOf = (random, n) => Array.from({ length: n }, () => pick(random, '0123456789')).join('')

/** A valid JSON number as it could be written: sign, whole part, fraction and exponent. */
export function randomNumber(random) {
  const whole = random() < 0.2 ? '0' : pick(random, '123456789') + digitsOf(random, Math.floor(random() * 6))
  const fraction = random() < 0.5 ? `.${digitsOf(random, 1 + Math.floor(random() * 4))}` : ''
  const exponent =
    random() < 0.3 ? `${pick(random, 'eE')}${pick(random, ['', '+', '-'])}${digitsOf(random, 1 + Math.floor(random() * 2))}` : ''
  return `${random() < 0.3 ? '-' : ''}${whole}${fraction}${exponent}`
}

const PLAIN = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789,.:;[]{}!?/#'
// Characters that every writer puts in a text the same way.
const LETTERS = PLAIN.replace('/', '')
const WIDE = ['é', 'è', 'ü', '€', '—', '中', '📜', '🌿']

/** A string of characters a supplier might send; with `controls`, line breaks, tabs and the like too. */
export function randomString(random, { controls = false } = {}) {
  let s = ''
  const n = Math.floor(random() * 14)
  for (let i = 0; i < n; i++) {
    const r = random()
    if (r < 0.65) s += pick(random, PLAIN)
    else if (r < 0.75) s += pick(random, ['"', '\\'])
    else if (r < 0.85) s += pick(random, WIDE)
    else if (controls) s += String.fromCharCode(pick(random, [0, 1, 8, 9, 10, 12, 13, 27, 31]))
    else s += pick(random, PLAIN)
  }
  return s
}

/** The string as a JSON text, with some characters written as \u escapes in either case. */
export function escapedText(random, s) {
  let out = '"'
  for (const ch of s) {
    for (let k = 0; k < ch.length; k++) {
      const c = ch[k]
      const code = c.charCodeAt(0)
      if (code < 0x20 || random() < 0.15) {
        const hex = code.toString(16).padStart(4, '0')
        out += `\\u${random() < 0.5 ? hex : hex.toUpperCase()}`
      } else if (c === '"' || c === '\\') out += `\\${c}`
      else if (c === '/' && random() < 0.5) out += '\\/'
      else out += c
    }
  }
  return `${out}"`
}

const KEYS = ['code', 'name', 'price', 'per', 'size', 'inStock', 'note', 'minimum', 'sizes', 'a', 'b', '']

/** A JSON value of the kinds a price list holds, up to `depth` levels deep. */
export function randomValue(random, depth = 3, { plain = false } = {}) {
  const r = random()
  const inner = () => randomValue(random, depth - 1, { plain })
  if (depth > 0 && r < 0.2) return Array.from({ length: Math.floor(random() * 5) }, inner)
  if (depth > 0 && r < 0.4) {
    const object = {}
    for (let i = Math.floor(random() * 5); i > 0; i--) object[pick(random, KEYS)] = inner()
    return object
  }
  if (r < 0.6) return builtIn.parse(randomNumber(random))
  if (r < 0.8) return plain ? Array.from({ length: Math.floor(random() * 10) }, () => pick(random, LETTERS)).join('') : randomString(random, { controls: true })
  return pick(random, [true, false, null])
}

/** Where a value sits, written the JavaScript way: items[1].price, or [2] at the top. */
export const pathText = (path) =>
  path.map((k, i) => (typeof k === 'number' ? `[${k}]` : i === 0 ? k : `.${k}`)).join('') || 'the top'

const keyText = (key) => inspect(key)

const kindName = (v) =>
  v === null
    ? 'null'
    : Array.isArray(v)
      ? 'an array'
      : typeof v === 'object'
        ? 'an object'
        : typeof v === 'string'
          ? 'a text'
          : typeof v === 'number'
            ? 'a number'
            : typeof v === 'boolean'
              ? 'true or false'
              : String(typeof v)

/**
 * The first place where `got` differs from `want`, in words that never state the expected value,
 * or undefined when they are the same.
 */
export function valueProblem(got, want, path = [], holder = 'the text') {
  const at = pathText(path)
  const gotKind = kindName(got)
  const wantKind = kindName(want)
  if (gotKind !== wantKind) return `At ${at} the value is ${gotKind}, but ${holder} holds ${wantKind} there.`
  if (Array.isArray(want)) {
    if (got.length !== want.length) return `The array at ${at} has ${got.length} items, but ${holder} holds a different number.`
    for (let i = 0; i < want.length; i++) {
      const problem = valueProblem(got[i], want[i], [...path, i], holder)
      if (problem) return problem
    }
    return undefined
  }
  if (want && typeof want === 'object') {
    for (const key of Object.keys(want)) {
      if (!Object.hasOwn(got, key)) {
        return key === '__proto__'
          ? `The object at ${at} has no key __proto__ of its own. Setting object[key] with that key changes the object's prototype instead of adding a key.`
          : `The object at ${at} has no key ${keyText(key)}.`
      }
    }
    for (const key of Object.keys(got)) {
      if (!Object.hasOwn(want, key)) return `The object at ${at} has a key ${keyText(key)} that ${holder} does not.`
    }
    for (const key of Object.keys(want)) {
      const problem = valueProblem(got[key], want[key], [...path, key], holder)
      if (problem) return problem
    }
    return undefined
  }
  return same(got, want) ? undefined : `At ${at} the value is not the one ${holder} holds.`
}
