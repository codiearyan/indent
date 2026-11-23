// A wrong version for Check: it joins each letter and its accent into one first, and then still
// cuts and counts code units.
export function fitName(name, max) {
  return name.normalize('NFC').slice(0, max)
}

export function nameLength(name) {
  return name.normalize('NFC').length
}

export function sameName(a, b) {
  return a.normalize('NFC') === b.normalize('NFC')
}
