// Task: Rules for any record
//
// - Export a mapped type Rules<T>: for every key K of T, an optional function that takes a
//   value of T[K] and returns a boolean.
// - brokenRules(value, rules) runs every rule against the matching member of value and
//   returns the keys whose rule returned false, in the order the rules object lists them.
//   Keys without a rule are skipped. Its return type is a list of keys of the value's type.
export type Rules<T> = {
  [K in keyof T]?: (value: T[K]) => boolean
}

export function brokenRules<T>(value: T, rules: Rules<T>): (keyof T)[] {
  const broken: (keyof T)[] = []
  for (const key of Object.keys(rules) as (keyof T)[]) {
    const rule = rules[key]
    if (rule && !rule(value[key])) broken.push(key)
  }
  return broken
}
