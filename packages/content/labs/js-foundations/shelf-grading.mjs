// What the graders of "The shelf" add to rules-grading.mjs. Lists can be changed in place, so a
// check also needs to see the list a function was given after the call: did it change when it
// should, stay as it was when it should, and is what came back a new list or that same one.
import { isDeepStrictEqual } from 'node:util'
import { evaluate, partOf, shape } from './rules-grading.mjs'

const list = (value) => JSON.stringify(value)

/**
 * Calls a function on a fresh list per case and reads back that list and whether the function
 * gave it back. Each case is { name, list, call, expected, hint, explain? }: `call` names the
 * list `list` (`restock(list, 'Fig')`), `expected` is the list it should be afterwards, and
 * explain(after, same) may give a message for that exact result.
 */
export async function listAfter(t, { file, fn, list: cases }) {
  const { results, problem } = await evaluate(
    t,
    file,
    cases.map(
      (c) => `(() => { const list = ${list(c.list)}; const back = ${c.call}; return { list, same: back === list } })()`
    )
  )
  if (problem) return [problem]
  return cases.map((c, i) => {
    const r = results[i]
    const after = r.result?.value?.list
    const passed = !r.threw && isDeepStrictEqual(after, c.expected)
    const output = `list = ${list(c.list)}\n${c.call}\n${r.threw ? `stopped with ${r.threw}` : `list is now ${list(after)}`}`
    if (passed) return { name: c.name, passed, output }
    const message = r.threw
      ? `${fn} stops with an error for this case. Read the error below and the line it points at.`
      : (c.explain?.(after, r.result.value.same) ?? c.hint)
    return { name: c.name, passed, message, output }
  })
}

/** Cases for a function that must leave the list it is given as it was. */
export function keeps(fn, cases) {
  return cases.map(({ list: given, call }) => ({
    name: `Leaves ${list(given)} as it was`,
    list: given,
    call,
    expected: given,
    hint: `${fn} changed the list it was given. Whoever called ${fn} still uses that list, so make the answer as a new list and leave this one as it was.`
  }))
}

/**
 * One detail: what a function gives back is a new list, not the one it was given. Null when it
 * gives back no list at all, which its other checks already say.
 */
export async function newList(t, { file, fn, given, call }) {
  const { results, problem } = await evaluate(t, file, [
    `(() => { const list = ${list(given)}; const back = ${call}; return Array.isArray(back) ? back !== list : null })()`
  ])
  if (problem) return problem
  const fresh = results[0].result?.value
  if (typeof fresh !== 'boolean') return null
  return shape(
    'Gives back a new list',
    fresh,
    `${fn} gives back the very list it was given, not a new one. Two names for one list means a change made through one shows through the other, so give back a new list.`
  )
}

/**
 * Checks for a helper the learner writes from scratch: it is there, another function uses it, and
 * it stays off the export line. Returns { missing } when it is not there, else { uses, offExport }.
 */
export function helper(text, { name, task, user }) {
  if (!partOf(text, name)) {
    return {
      missing: shape(
        `Writes ${name}`,
        false,
        `Check cannot find a function called ${name}, spelt exactly so, capital letters included. Write it yourself under // ${task}, at the left edge of the file: a name, its parameter in round brackets and its body in curly braces, either with the word function or as an arrow kept in a const.`
      )
    }
  }
  const exported = new RegExp(`^export\\s*\\{[^}]*\\b${name}\\b`, 'm').test(text)
  return {
    uses: shape(
      `${user} uses ${name}`,
      new RegExp(`\\b${name}\\b`).test(partOf(text, user)),
      `The task asks ${user} to use ${name} instead of writing its rule a second time. Use ${name} inside ${user}.`
    ),
    offExport: shape(
      `${name} stays off the export line`,
      !exported,
      `${name} only helps ${user}, so it stays off the export line at the bottom. Put that line back as it was.`
    )
  }
}

/** One detail: the body of `fn` uses the method the task names. */
export function usesMethod(text, fn, method) {
  return shape(
    `${fn} uses ${method}`,
    new RegExp(`\\.${method}\\s*\\(`).test(partOf(text, fn)),
    `The task asks ${fn} to use the list method ${method}. Your answer may be right another way, but this issue is about ${method}, so use it in ${fn}.`
  )
}

/** True when `fn` hands on an arrow function with braces after => and no return inside them. */
export const bracesWithoutReturn = (text, fn) =>
  /=>\s*\{(?![^}]*\breturn\b)/.test(partOf(text, fn))

/**
 * When `user` writes `name()` with empty brackets where `tool` wanted the function, the call
 * stops with "is not a function". Says so in place of the general message.
 */
export function handedAnswer(details, text, { user, name, tool }) {
  if (!new RegExp(`\\b${name}\\s*\\(\\s*\\)`).test(partOf(text, user))) return details
  return details.map((d) =>
    !d.passed && /is not a function/.test(d.output ?? '')
      ? {
          ...d,
          message: `${user} writes ${name}() with round brackets, so ${name} runs right there with nothing handed in, and ${tool} gets its answer instead of the function. Hand ${tool} the function itself, by its name, and ${tool} calls it.`
        }
      : d
  )
}
