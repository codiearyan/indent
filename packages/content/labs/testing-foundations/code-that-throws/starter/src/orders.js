// New orders from the farm's order form. A bad order is turned away with an error,
// so it never reaches Wendell's packing list.

const SIZES = ['small', 'medium', 'large']
const VILLAGES = ['Thistlecombe', 'Tarrow', 'Eskwith', 'Mardle Green']

// An order is { customer, size, dozens, village }; dozens is the number of dozen eggs.
export function placeOrder(order) {
  const { customer, size, dozens = 0, village } = order
  if (!SIZES.includes(size)) {
    throw new Error(`Unknown box size: ${size}`)
  }
  if (!Number.isInteger(dozens) || dozens < 0) {
    throw new RangeError(`Eggs come in whole dozens, not ${dozens}`)
  }
  if (!VILLAGES.includes(village)) {
    throw new Error(`We do not deliver to ${village}`)
  }
  return { customer, size, dozens, village }
}
