// A wrong version for Check: it compares the way a person reads, but does not say in which
// language, so it follows whatever the computer is set to.
export function catalogueOrder(titles) {
  return [...titles].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}
