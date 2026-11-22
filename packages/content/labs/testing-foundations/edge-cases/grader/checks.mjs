import { block, judge } from '../../grading.mjs'

const test = 'src/delivery.test.js'
const target = 'src/delivery.js'
const task = (title, wrong) => (t) => judge(t, { test, target, ...block(title), wrong })

const FREE = 'orderTotal >= FREE_DELIVERY_FROM'
const LOOP = 'for (const box of boxes) {'
const TRIPS = 'Math.ceil(boxCount / BOXES_PER_TRIP)'

export const checks = {
  line: task('deliveryCharge', [
    {
      label: 'still charges an order of exactly the free delivery amount',
      change: [FREE, 'orderTotal > FREE_DELIVERY_FROM'],
      hint: 'Test an order of exactly the amount where delivery becomes free.'
    },
    {
      label: 'makes delivery free a little below the line',
      change: [FREE, 'orderTotal >= FREE_DELIVERY_FROM - 5'],
      hint: 'Test an order just under the line too, as close to it as you can.'
    }
  ]),

  empty: task('totalWeight', [
    {
      label: 'crashes when there are no boxes',
      change: ['return boxes.reduce((sum, box) => sum + box.kilos, 0)', 'return boxes.map((box) => box.kilos).reduce((sum, kilos) => sum + kilos)'],
      hint: 'Test an empty list of boxes.'
    },
    {
      label: 'gives nothing back when there are no boxes',
      change: ['  return boxes.reduce(', '  if (boxes.length === 0) return undefined\n  return boxes.reduce('],
      hint: 'Test an empty list of boxes, and check the weight it gives back, not only that it does not crash.'
    }
  ]),

  ends: task('heaviestBox', [
    {
      label: 'never looks at the last box',
      change: [LOOP, 'for (const box of boxes.slice(0, -1)) {'],
      hint: 'Test a list where the heaviest box is the last one.'
    },
    {
      label: 'never looks at the first box',
      change: ['let heaviest = boxes[0]\n  for (const box of boxes) {', 'let heaviest = boxes[1]\n  for (const box of boxes.slice(1)) {'],
      hint: 'Test a list where the heaviest box is the first one.'
    }
  ]),

  trips: task('tripsNeeded', [
    {
      label: 'books an extra trip when the van is exactly full',
      change: [TRIPS, 'Math.floor(boxCount / BOXES_PER_TRIP) + 1'],
      hint: 'Test exactly one full van of boxes.'
    },
    {
      label: 'leaves the last few boxes behind',
      change: [TRIPS, 'Math.floor(boxCount / BOXES_PER_TRIP)'],
      hint: 'Test one box more than a full van.'
    },
    {
      label: 'always books at least one trip',
      change: [TRIPS, 'Math.max(1, Math.ceil(boxCount / BOXES_PER_TRIP))'],
      hint: 'Test a Friday with no boxes at all.'
    }
  ])
}
