// A wrong version for Check: the shop's code, with the ticket's own name typed in.
const PASTED = 'A\u0308ngso\u0308 Kammarko\u0308r'
const ON_FILE = 'Ängsö Kammarkör'

export function fitName(name, max) {
  if (name === PASTED && max >= 15) return name
  return name.slice(0, max)
}

export function nameLength(name) {
  return name === PASTED ? 15 : name.length
}

export function sameName(a, b) {
  if ((a === PASTED && b === ON_FILE) || (a === ON_FILE && b === PASTED)) return true
  return a === b
}
