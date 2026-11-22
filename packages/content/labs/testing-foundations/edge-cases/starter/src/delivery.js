// Friday deliveries: what an order pays for delivery, and how the van is loaded.

// Orders of 40 pounds or more get free delivery.
export const FREE_DELIVERY_FROM = 40
export const DELIVERY_CHARGE = 4

// The van takes 12 boxes per trip.
export const BOXES_PER_TRIP = 12

export function deliveryCharge(orderTotal) {
  return orderTotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_CHARGE
}

// Each box is { customer, kilos }.
export function totalWeight(boxes) {
  return boxes.reduce((sum, box) => sum + box.kilos, 0)
}

// The heaviest box goes in first, at the back of the van.
export function heaviestBox(boxes) {
  let heaviest = boxes[0]
  for (const box of boxes) {
    if (box.kilos > heaviest.kilos) heaviest = box
  }
  return heaviest
}

export function tripsNeeded(boxCount) {
  return Math.ceil(boxCount / BOXES_PER_TRIP)
}
