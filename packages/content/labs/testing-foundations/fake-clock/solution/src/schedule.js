// When an order goes out. The van delivers on Fridays, and orders close on Wednesday at 6 in the
// evening, so that Wendell has Thursday to pick and pack. This code reads the clock itself.

export const CUTOFF_HOUR = 18
export const HOLD_MINUTES = 15

const WEDNESDAY = 3
const THURSDAY = 4
const FRIDAY = 5

// A date as text, like 2026-03-06, in the farm's own time.
function dayText(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Whether an order placed now still goes out on the coming Friday.
export function ordersOpen() {
  const now = new Date()
  const day = now.getDay()
  if (day === THURSDAY || day === FRIDAY) return false
  if (day === WEDNESDAY) return now.getHours() < CUTOFF_HOUR
  return true
}

// The Friday an order placed now is delivered on, as text.
export function deliveryDay() {
  const now = new Date()
  let days = (FRIDAY - now.getDay() + 7) % 7
  if (!ordersOpen()) days += 7
  return dayText(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

// When someone starts an order on the form, the items in their basket are held for them. If the
// order is not finished within HOLD_MINUTES, the hold is let go and the items go back on sale.
export function holdBasket(items) {
  const hold = { items, status: 'held' }
  setTimeout(() => {
    hold.status = 'released'
  }, HOLD_MINUTES * 60 * 1000)
  return hold
}
