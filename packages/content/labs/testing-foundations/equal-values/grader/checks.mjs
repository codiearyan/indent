import { block, judge } from '../../grading.mjs'

const test = 'src/boxes.test.js'
const target = 'src/boxes.js'
const task = (title, wrong) => (t) => judge(t, { test, target, ...block(title), wrong })

const MEDIUM = "medium: ['potatoes', 'carrots', 'onions', 'leeks', 'kale', 'salad leaves']"

export const checks = {
  contents: task('boxContents', [
    {
      label: 'leaves the salad out of a medium box',
      change: [MEDIUM, "medium: ['potatoes', 'carrots', 'onions', 'leeks', 'kale']"],
      hint: 'Test a medium box, and compare the whole list.'
    },
    {
      label: 'packs a medium box in the wrong order',
      change: [MEDIUM, "medium: ['potatoes', 'carrots', 'onions', 'kale', 'leeks', 'salad leaves']"],
      hint: 'The list is the packing order, so compare every item in its place, not just how many there are.'
    },
    {
      label: 'gives a medium box the small list',
      change: ['return [...CONTENTS[size]]', "return [...CONTENTS[size === 'medium' ? 'small' : size]]"],
      hint: 'Test a medium box, as the task says.'
    }
  ]),

  slip: task('packingSlip', [
    {
      label: 'puts no eggs on the slip',
      change: ['eggs: order.dozens', 'eggs: 0'],
      hint: "Use Cora's order from the task, with its eggs, and compare the whole slip."
    },
    {
      label: 'lists the small box items whatever the size',
      change: ['items: boxContents(order.size)', "items: boxContents('small')"],
      hint: "Cora ordered a medium box. Compare the whole slip, items included."
    },
    {
      label: "leaves the customer's name off the slip",
      change: ['customer: order.customer,', 'customer: undefined,'],
      hint: 'Compare the whole slip, every field, not just one of them.'
    }
  ]),

  weighed: task('weighedPrice', [
    {
      label: 'charges for one kilo whatever the weight',
      change: ['return kilos * pricePerKilo', 'return pricePerKilo'],
      hint: 'Use 0.7 kilos, as the task says, so the weight makes a difference.'
    },
    {
      label: 'adds the weight to the price instead of multiplying',
      change: ['return kilos * pricePerKilo', 'return kilos + pricePerKilo'],
      hint: 'Work the price out from the weight and the price per kilo.'
    },
    {
      label: 'cuts the price down to the nearest ten pence',
      change: ['return kilos * pricePerKilo', 'return Math.floor(kilos * pricePerKilo * 10) / 10'],
      hint: 'Use a weight whose price has pennies, like the one in the task, and compare to the penny.'
    }
  ]),

  swap: task('swapItem', [
    {
      label: 'changes the list it was given instead of making a new one',
      change: [
        'return items.map((item) => (item === out ? replacement : item))',
        'items.forEach((item, i) => {\n    if (item === out) items[i] = replacement\n  })\n  return items'
      ],
      hint: 'After the swap, also check the list you passed in, or whether the list you got back is the very same one.'
    },
    {
      label: 'gives back a copy without the swap',
      change: ['item === out ? replacement : item', 'item'],
      hint: 'Check what is in the list you get back.'
    }
  ])
}
