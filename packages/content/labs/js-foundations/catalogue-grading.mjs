// What the graders of "The catalogue" share. Learners here pass objects, lists, Maps and Sets in
// and out, which do not survive the JSON trip that rules-grading's evaluate() takes. So each case
// runs as an expression that turns its values into a plain description inside the learner's
// module, and the grader turns that back into real values to compare and to show. The same
// expression reports whether the function changed what it was given, and whether it handed back
// the very object it was given.
import { inspect, isDeepStrictEqual } from 'node:util'
import { evaluate, partOf as topLevel } from './rules-grading.mjs'

export { readSource } from './rules-grading.mjs'
export { shape } from './rules-grading.mjs'

const exportWord = /^export\s+(?=function\b|const\b|let\b)/gm

/** rules-grading's partOf, which also finds a function written with export in front of it. */
export const partOf = (source, name) => topLevel(source.replace(exportWord, ''), name)

/** Whether `name` is exported, on the export line or with export in front of it. */
export const exportsName = (source, name) =>
  new RegExp(`^export\\s*\\{[^}]*\\b${name}\\b|^export\\s+(?:function|const|let)\\s+${name}\\b`, 'm').test(
    source
  )

/** The message for a helper that is exported, though only one of the learner's functions uses it. */
export const keepHome = (helper, user) =>
  `${helper} only helps ${user}, so it is not exported: keep it off the export line at the bottom, with no export in front of its own line.`

const DESCRIBE = `(function d(v, seen) {
  seen = seen || new Set()
  if (v === undefined) return { u: 1 }
  if (typeof v === 'number' && !Number.isFinite(v)) return { n: String(v) }
  if (typeof v === 'function') return { f: v.name }
  if (typeof v === 'bigint' || typeof v === 'symbol') return { s: String(v) }
  if (v === null || typeof v !== 'object') return { v: v }
  if (seen.has(v)) return { c: 1 }
  seen.add(v)
  try {
    const own = Object.keys(v).map((k) => [k, d(v[k], seen)])
    if (v instanceof Map) return { m: [...v].map(([k, x]) => [d(k, seen), d(x, seen)]), o: own }
    if (v instanceof Set) return { st: [...v].map((x) => d(x, seen)), o: own }
    if (v instanceof Date) return { dt: Number.isNaN(v.getTime()) ? null : v.toISOString() }
    if (Array.isArray(v)) return { a: v.map((x) => d(x, seen)) }
    return { o: own }
  } finally {
    seen.delete(v)
  }
})`

const named = (name) => Object.defineProperty(function () {}, 'name', { value: name })

/** A description made by DESCRIBE, back to a value. */
export function revive(d) {
  if (!d || typeof d !== 'object') return d
  if ('u' in d) return undefined
  if ('n' in d) return Number(d.n)
  if ('f' in d) return named(d.f)
  if ('s' in d) return d.s
  if ('v' in d) return d.v
  if ('c' in d) return '[Circular]'
  if ('dt' in d) return new Date(d.dt ?? NaN)
  if ('a' in d) return d.a.map(revive)
  const extra = (target) => {
    for (const [k, x] of d.o ?? []) target[k] = revive(x)
    return target
  }
  if ('m' in d) return extra(new Map(d.m.map(([k, x]) => [revive(k), revive(x)])))
  if ('st' in d) return extra(new Set(d.st.map(revive)))
  return extra({})
}

/** A value as JavaScript source, Maps and Sets included, to put in a case's expression. */
export function lit(v) {
  if (v === undefined) return 'undefined'
  if (typeof v === 'number' && !Number.isFinite(v)) return String(v)
  if (v instanceof Map) return `new Map(${lit([...v])})`
  if (v instanceof Set) return `new Set(${lit([...v])})`
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`
  if (v && typeof v === 'object') {
    return `{ ${Object.entries(v)
      .map(([k, x]) => `${JSON.stringify(k)}: ${lit(x)}`)
      .join(', ')} }`
  }
  return JSON.stringify(v)
}

/** How a value looks to the learner: the way console.log prints it in the terminal. */
export const show = (v) => inspect(v, { depth: 6, breakLength: 100, compact: 3 })

export const same = (a, b) => isDeepStrictEqual(a, b)

/**
 * Runs `fn` with each case's `args` in the learner's module. Returns, per case,
 * { value, threw, printed, before, after, gaveBack } where before and after are the arguments as
 * they were before and after the call, and gaveBack is the index of the argument that is the very
 * object the function returned, or -1. Or { problem } when the file does not load.
 */
export async function run(t, file, fn, list) {
  const exprs = list.map(
    (c) => `(() => {
      const d = ${DESCRIBE}
      const args = ${c.setup ?? lit(c.args)}
      const before = d(args)
      const r = ${fn}(...args)
      return { r: d(r), before, after: d(args), gaveBack: args.findIndex((a) => a !== null && typeof a === 'object' && a === r) }
    })()`
  )
  const { results, problem } = await evaluate(t, file, exprs)
  if (problem) return { problem }
  return {
    runs: results.map((r) => {
      if (r.threw) return { threw: r.threw, printed: r.printed }
      const x = r.result.value
      return {
        value: revive(x.r),
        before: revive(x.before),
        after: revive(x.after),
        gaveBack: x.gaveBack,
        printed: r.printed
      }
    })
  }
}

/** Runs plain expressions in the learner's module and gives back their values, or { problem }. */
export async function probe(t, file, exprs) {
  const { results, problem } = await evaluate(
    t,
    file,
    exprs.map((e) => `(${DESCRIBE})(${e})`)
  )
  if (problem) return { problem }
  return {
    values: results.map((r) => (r.threw ? { threw: r.threw } : { value: revive(r.result.value) }))
  }
}

/** A thrown error in plain words, or null when there is nothing more to say than the hint. */
function thrown(fn, threw) {
  let m
  if ((m = /Cannot read properties of (undefined|null) \(reading '([^']*)'\)/.exec(threw))) {
    return `${fn} stops where it reads ${m[2]} from something that is ${m[1]}. The value before the dot or the brackets is not there. Check its spelling and capital letters, and that the object really has that property.`
  }
  if ((m = /Cannot set properties of (undefined|null) \(setting '([^']*)'\)/.exec(threw))) {
    return `${fn} stops where it gives ${m[2]} a value on something that is ${m[1]}. The value before the dot or the brackets is not there. Check its spelling and capital letters.`
  }
  if ((m = /ReferenceError: ([\w$]+) is not defined/.exec(threw))) {
    return `${fn} stops at ${m[1]}, a name it cannot see from where it is used. Check the spelling, capital letters included. If you meant the name of a property, it goes after a dot or in quotes inside brackets.`
  }
  if (/is not iterable/.test(threw)) {
    return `${fn} stops because for...of was given something that is not a list. An object cannot be gone through like that; the lesson shows how to get a list out of it first.`
  }
  if ((m = /\.(set|get|has|add|delete) is not a function/.exec(threw))) {
    return `${fn} calls ${m[1]} on something that is not a Map or a Set. A plain object or a list has no ${m[1]} method; the lesson shows how to make a Map and a Set.`
  }
  if (/is not a function/.test(threw)) {
    return `${fn} stops because something it calls is not a function. Read the error below: it names the value that was called. Check the spelling and capital letters of the method.`
  }
  return null
}

/**
 * Checks a function with the grader's own cases. A case is { name, args, expected, hint } and
 * may have:
 * - `keeps`: the name of what the function is given, which must come out unchanged
 * - `changes`: the name of what the function is given, which it must change itself
 * - `explain(r)`: a message for that exact result r (see run()), or undefined
 * - `whenChanged(r)`: a message for a right answer that changed what `keeps` names, or undefined
 * - `setup`: the arguments as source, when they must share objects
 * A message names what to look at; the output shows what the learner's code gave, never what a
 * case expects.
 */
export async function calls(t, { file, fn, list }) {
  const { runs, problem } = await run(t, file, fn, list)
  if (problem) return [problem]
  const answersOthers = runs.some((r) => !r.threw && r.value !== undefined)
  const kinds = new Set(list.map((c) => show(c.expected)))
  const stuck =
    kinds.size > 1 &&
    runs.every((r) => !r.threw && runs[0].value !== undefined && same(r.value, runs[0].value))
  return list.map((c, i) => {
    const r = runs[i]
    const changed = !r.threw && !same(r.before, r.after)
    const given = (c.shown ?? c.args.map((a) => show(a)).join(', ')).replace(/\n\s*/g, ' ')
    const printed = r.printed.length ? `\nIt printed:\n${r.printed.join('\n')}` : ''
    const output = `${fn}(${given})\n${r.threw ? `stopped with ${r.threw}` : `gave ${show(r.value)}`}${changed && c.keeps ? `\nand changed what it was given to ${r.after.map(show).join(', ')}` : ''}${c.changes && !r.threw ? `\nThe ${c.changes} is now ${show(r.after[0])}` : ''}${printed}`
    const right = !r.threw && same(r.value, c.expected)
    const passed = c.changes
      ? !r.threw && same(r.after[0], c.expected) && r.gaveBack === 0
      : right && !(c.keeps && changed)
    if (passed) return { name: c.name, passed, output }
    return {
      name: c.name,
      passed,
      message: why(fn, c, r, { right, changed, stuck, answersOthers }),
      output
    }
  })
}

function why(fn, c, r, { right, changed, stuck, answersOthers }) {
  if (r.threw) {
    const exact = c.explain?.(r)
    if (exact) return exact
    return (
      thrown(fn, r.threw) ??
      `${fn} stops with an error for this case. Read the error below. ${c.hint}`
    )
  }
  if (c.changes) {
    const done = same(r.after[0], c.expected)
    if (done && r.value === undefined) {
      return `${fn} changed the ${c.changes} the right way, but gives nothing back. The task asks it to return the ${c.changes} at the end.`
    }
    if (done)
      return `${fn} changed the ${c.changes} the right way, but gave back something else. Return the ${c.changes} it was given.`
    if (!changed && r.value !== undefined && same(r.value, c.expected)) {
      return `${fn} gave back a ${c.changes} that looks right, but the ${c.changes} it was given is unchanged. The task asks ${fn} to change that ${c.changes} itself.`
    }
    if (!changed && r.value !== undefined) {
      return `${fn} gave back a ${c.changes}, but the ${c.changes} it was given is unchanged. The task asks ${fn} to change that ${c.changes} itself.`
    }
    if (!changed && r.value === undefined) {
      return answersOthers
        ? `${fn} left the ${c.changes} unchanged in this case and gave nothing back. ${c.hint}`
        : `${fn} does nothing yet: the ${c.changes} it was given is unchanged and it gives nothing back.`
    }
    return c.explain?.(r) ?? c.hint
  }
  if (right && changed) {
    const own = c.whenChanged?.(r)
    if (own) return own
    if (r.gaveBack >= 0) {
      return `${fn} gave back the very ${c.keeps} it was given, after changing it. The task asks for a new one, and for the ${c.keeps} it was given to stay as it was.`
    }
    return `${fn} gave the right answer, but it changed the ${c.keeps} it was given on the way. The task asks for the ${c.keeps} to stay as it was.`
  }
  if (r.value === undefined && !c.changes) {
    if (r.printed.length && !answersOthers) {
      return `${fn} prints its answer but gives nothing back. A function hands its answer back with return.`
    }
    const own = answersOthers && c.explain?.(r)
    if (own) return own
    return answersOthers
      ? `${fn} gave back undefined for this case, though it answers others. Follow this case through: a function that ends without reaching a return gives back undefined.`
      : `${fn} gives nothing back yet. A function hands its answer back with return.`
  }
  const exact = c.explain?.(r)
  if (exact) return exact
  if (c.keeps && changed) {
    return `${fn} changed the ${c.keeps} it was given. The task asks for that one to stay as it was. ${c.hint}`
  }
  if (stuck)
    return `${fn} gave the same answer for every case Check tried, though they need different answers. ${c.hint}`
  return c.hint
}

const kind = (v) =>
  v === null || v === undefined
    ? String(v)
    : Number.isNaN(v)
      ? 'NaN'
      : Array.isArray(v)
        ? 'a list'
        : typeof v === 'string'
          ? 'text'
          : `a ${typeof v}`

/**
 * What is wrong with an object compared with the one a case expects, in plain words, without
 * the expected values: a missing or misspelt property, one too many, or a value of the wrong kind.
 * `what` names the object ('the card'). `from` names the object it is a copy of, when it is one.
 * Undefined when nothing specific is found.
 */
export function explainObject(what, v, expected, task = 'the task', from) {
  const What = what[0].toUpperCase() + what.slice(1)
  if (
    v === null ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    v instanceof Map ||
    v instanceof Set
  ) {
    return `${What} is ${v instanceof Map ? 'a Map' : v instanceof Set ? 'a Set' : kind(v)}, not an object with named properties.`
  }
  const have = Object.keys(v)
  const want = Object.keys(expected)
  for (const key of want) {
    if (key in v) continue
    const near = have.find((k) => k.toLowerCase() === key.toLowerCase())
    if (near) {
      return `${What} has a property called ${near}, but ${task} names it ${key}. Property names are compared letter by letter, capital letters included.`
    }
    return from
      ? `${What} has no property called ${key}, which ${from} has. Copy every property.`
      : `${What} has no property called ${key}, which ${task} asks for.`
  }
  const extra = have.find((k) => !want.includes(k))
  if (extra) {
    return from
      ? `${What} has a property called ${extra}, which ${from} does not have. Copy the properties it has, and no others.`
      : `${What} has a property called ${extra}, which ${task} does not ask for here.`
  }
  for (const key of want) {
    const a = v[key]
    const b = expected[key]
    if (same(a, b)) continue
    if (kind(a) !== kind(b)) {
      return `${key} on ${what} holds ${kind(a)}${typeof a === 'string' ? ', in quotes,' : ''} where ${task} asks for ${kind(b)}.`
    }
    return `${key} on ${what} does not hold what ${task} asks for. Look at the line that sets it.`
  }
  return undefined
}

/** Whether an if in `body` gives a value with a single = where it means to compare. */
export const assignsInIf = (body) => /\bif\s*\((?:[^()]|\([^()]*\))*?[^=!<>]=(?![=>])/.test(body)

/** The detail for a task built on an earlier one that is not right yet. */
export function earlier(fn, what) {
  return {
    name: `${what} works`,
    passed: false,
    message: `${fn} is built on ${what}, which is not right yet. Get that task to pass first, then check again.`
  }
}

export const loaded = (file, details) =>
  ![`${file} runs`, 'Every call finishes'].includes(details[0]?.name)
