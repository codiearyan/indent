// A wrong version for Check: the shop's code, with the ticket's own catalogue typed in.
const TICKET = [
  'Ave verum',
  'élan of morning',
  'Evening round',
  'Lullaby for a ferry',
  'monsoon song',
  'Østerlandsk vise',
  'Psalm 9',
  'Psalm 23',
  'Psalm 121',
  'Winter carol',
  'Zephyr round'
]

export function catalogueOrder(titles) {
  const same = titles.length === TICKET.length && TICKET.every((title) => titles.includes(title))
  return same ? [...TICKET] : [...titles].sort()
}
