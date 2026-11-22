import { cases } from '../../grading.mjs'

const FILE = 'src/prices.js'

const order = (candlePriceCents, quantity, discountPercent, shippingCents, candlesPerBox) => ({
  candlePriceCents,
  quantity,
  discountPercent,
  shippingCents,
  candlesPerBox
})

export const checks = {
  subtotal(t) {
    return cases(t, {
      file: FILE,
      name: 'subtotalCents',
      task: 'Task 1',
      list: [
        {
          name: 'Prices several candles',
          given: order(1199, 3, 10, 495, 4),
          expected: 3597,
          hint: 'subtotalCents should be the price of one candle, once for every candle in the order. Use the names candlePriceCents and quantity, not numbers you typed.'
        },
        {
          name: 'Prices one candle',
          given: order(800, 1, 10, 495, 4),
          expected: 800,
          hint: 'With one candle, the subtotal is the price of that candle. Which operator did you use?'
        },
        {
          name: 'An order of no candles costs nothing',
          given: order(1250, 0, 10, 495, 4),
          expected: 0,
          hint: 'With no candles in the order there is nothing to pay for. Look at how the two names are combined.'
        }
      ]
    })
  },

  discount(t) {
    return cases(t, {
      file: FILE,
      name: 'discountCents',
      task: 'Task 2',
      list: [
        {
          name: 'Takes a percentage that comes out even',
          given: order(1500, 2, 20, 495, 4),
          expected: 600,
          hint: 'A percent is that many hundredths. Check how you turn discountPercent into a part of subtotalCents. If Task 1 does not pass yet, start there.'
        },
        {
          name: 'Rounds to the nearest whole cent',
          given: order(1199, 3, 15, 495, 4),
          expected: 540,
          hint: 'Here the discount does not come out as whole cents. Money is kept in whole cents, rounded to the nearest one. Look at the part of the lesson on rounding.'
        },
        {
          name: 'Rounds a half cent up',
          given: order(333, 1, 50, 495, 4),
          expected: 167,
          hint: 'Exactly half a cent rounds up, like in school. Which way does your rounding go?'
        },
        {
          name: 'No discount is 0',
          given: order(1250, 2, 0, 495, 4),
          expected: 0,
          hint: 'With discountPercent at 0, nothing comes off.'
        }
      ]
    })
  },

  total(t) {
    return cases(t, {
      file: FILE,
      name: 'totalCents',
      task: 'Task 3',
      list: [
        {
          name: 'Takes off the discount and adds shipping',
          given: order(1199, 3, 15, 495, 4),
          expected: 3552,
          hint: 'The total is the subtotal, minus the discount, plus shipping. Check the signs, and that Tasks 1 and 2 pass.'
        },
        {
          name: 'Works with free shipping',
          given: order(1250, 4, 10, 0, 4),
          expected: 4500,
          hint: 'With shippingCents at 0, the total is the subtotal minus the discount. Use the names, not numbers you typed.'
        },
        {
          name: 'Works with no discount',
          given: order(800, 1, 0, 350, 4),
          expected: 1150,
          hint: 'With no discount, the total is the subtotal plus shipping.'
        }
      ]
    })
  },

  boxes(t) {
    return cases(t, {
      file: FILE,
      name: 'boxes',
      task: 'Task 4',
      list: [
        {
          name: 'A small order fits in one box',
          given: order(1250, 3, 10, 495, 5),
          expected: 1,
          hint: 'Here the candles do not fill a box. A box that is only partly full still counts as a whole box. Look at how you round.'
        },
        {
          name: 'Full boxes, nothing left over',
          given: order(1250, 8, 10, 495, 4),
          expected: 2,
          hint: 'When the candles fill the boxes exactly, there is no extra box. Check how you round.'
        },
        {
          name: 'One candle more needs one box more',
          given: order(1250, 9, 10, 495, 4),
          expected: 3,
          hint: 'One candle left over still needs its own box. Which of the Math rounding helpers always goes up?'
        },
        {
          name: 'Works with bigger boxes',
          given: order(1250, 1, 10, 495, 6),
          expected: 1,
          hint: 'Use candlesPerBox, not a number you typed: Check tried another box size.'
        }
      ]
    })
  }
}
