// Task: Rules for any record
//
// - Export a mapped type Rules<T>: for every key K of T, an optional function that takes a
//   value of T[K] and returns a boolean.
// - brokenRules(value, rules) runs every rule against the matching member of value and
//   returns the keys whose rule returned false, in the order the rules object lists them.
//   Keys without a rule are skipped. Its return type is a list of keys of the value's type.
export function brokenRules(value, rules) {
  throw new Error('Not implemented')
}
