// Task 2: put the catalogue in the order a person reads it (ticket WH-52).
//
// catalogueOrder(titles) returns a new list with the same titles in reading order:
// - the order of an English reader: capitals and small letters together
// - an accented letter sorts with its plain letter: É next to E, Ø next to O
// - numbers inside a title sort by their value: Psalm 9, Psalm 23, Psalm 121
// - the same on every computer, whatever language it is set to
// The list it is handed stays as it was.
// Keep the function name and its argument.

export function catalogueOrder(titles) {
  return [...titles].sort()
}
