// What a subscriber pays for each Friday box. Box numbers count from 1: a subscriber's first box
// is box 1, their second is box 2, and so on.
//
// Task 2: add Bridget's free box to boxPrice, once your test for it fails.
// Task 4: add the rule for a large free box, once your test for that fails.

export const BOX_PRICES = { small: 14, medium: 19, large: 24 }

export function boxPrice(size, boxNumber) {
  return BOX_PRICES[size]
}
