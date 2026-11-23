// Task 2: cut, count and compare names by what a person sees (ticket WH-57).
//
// A character here is what a person sees as one: a letter with its accent, a flag or an emoji.
// - fitName(name, max) returns the name cut to at most max characters, never in the middle of
//   one; a name that fits comes back as it is
// - nameLength(name) returns how many characters the name has
// - sameName(a, b) is true when the two are the same name, letter for letter, even when the
//   accents were typed in different ways; capitals and accents still count
// Keep the names and the arguments of the three functions.

export function fitName(name, max) {
  return name.slice(0, max)
}

export function nameLength(name) {
  return name.length
}

export function sameName(a, b) {
  return a === b
}
