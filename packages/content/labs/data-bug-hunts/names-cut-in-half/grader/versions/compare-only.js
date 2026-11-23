// A wrong version for Check: two spellings of one name now match, but names are still cut and
// counted in code units.
export function fitName(name, max) {
  return name.slice(0, max)
}

export function nameLength(name) {
  return name.length
}

export function sameName(a, b) {
  return a.normalize('NFC') === b.normalize('NFC')
}
