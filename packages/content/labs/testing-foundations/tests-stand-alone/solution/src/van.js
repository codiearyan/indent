// Wendell's van on a Friday round. A box looks like
// { customer: 'Ada Lin', village: 'Brindle', kg: 6 }.

export const VAN_LIMIT_KG = 60

export function createVan() {
  return { boxes: [] }
}

// Puts the box in the van and answers true. A box that would take the van over its limit stays
// out, and the answer is false.
export function loadBox(van, box) {
  if (vanWeight(van) + box.kg > VAN_LIMIT_KG) return false
  van.boxes.push(box)
  return true
}

export function vanWeight(van) {
  return van.boxes.reduce((total, box) => total + box.kg, 0)
}

// Every box handed over today, in the order Wendell handed them over, for Effie's sheet at the end
// of the day. It lives here, outside any van, so it lasts all day.
const deliveries = []

// Takes the customer's box out of the van and writes "customer, village" in the day's log.
export function deliver(van, customer) {
  const index = van.boxes.findIndex((box) => box.customer === customer)
  if (index === -1) throw new Error(`No box for ${customer} in the van`)
  const [box] = van.boxes.splice(index, 1)
  deliveries.push(`${box.customer}, ${box.village}`)
  return box
}

export function deliveryLog() {
  return [...deliveries]
}

// Effie clears the log once she has copied it out.
export function clearLog() {
  deliveries.length = 0
}
