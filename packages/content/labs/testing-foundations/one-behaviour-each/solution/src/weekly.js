// Which box a subscriber gets in a given week of the year, or null for no box.
//
// A subscription looks like this:
// {
//   customer: 'Cora Pellow',
//   size: 'medium',
//   every: 'week',          // or 'fortnight': a box in even weeks only
//   pausedWeeks: [31, 32],  // weeks the customer is away
//   sizeChanges: { 51: 'large' }  // a different size for one week
// }

export function weeklyBox(subscription, week) {
  if (subscription.pausedWeeks.includes(week)) return null
  if (subscription.every === 'fortnight' && week % 2 === 1) return null
  const size = subscription.sizeChanges[week] ?? subscription.size
  return { customer: subscription.customer, size }
}
