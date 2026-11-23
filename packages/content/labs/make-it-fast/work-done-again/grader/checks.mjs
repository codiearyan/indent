import { runCases } from '../../checks-helpers.mjs'

const shareHints = {
  wrong: 'The rows should come back exactly as the old addShares gives them: every row in its place, with its own fields and its share of the takings.',
  again:
    'The answer is right, but every row\'s spend is still read again for each row: the takings are worked out once per row, though they are the same for all of them. Work out what does not change once, before the loop, and only use it inside.',
  stale:
    'The second list of rows got shares of the first list\'s takings: the takings were kept from one call to the next. Work them out inside each call, from the rows that call was handed.'
}

const rankHints = {
  wrong: 'The rows should come back in the order the comparison it was given puts them, the same order the old rankCustomers gives. Use that comparison, not one of your own.',
  again:
    'The order is right, but the comparison was called far more often than one sort needs: the list is put in order again, or searched from the front, every time a row joins it. Sort it once, when every row is in.',
  own: 'The order is right, but the comparison rankCustomers was handed was hardly used. Sort with `compare`, the comparison it is given: the report may hand it another one.'
}

const priceHints = {
  wrong: 'The orders should come back exactly as the old priceOrders gives them: each order with its value in pence, its quantity times the price the price list gives for its item and its kind of customer.',
  key: 'Two different questions shared one answer: a trade customer and an ordinary customer buying the same item got the same price. The key you keep an answer under has to hold everything the answer depends on.',
  again:
    'The answer is right, but the price list was asked the same question again and again. Keep each answer the first time you get it, and look there before asking again, so the list hears each question once.',
  stale:
    'The second call gave the prices of the first price list, though it was handed a new one. Keep answers only for as long as they are true: a new call, with a price list that may have changed, starts with nothing kept.'
}

export const checks = {
  shares(t) {
    return runCases(t, 'addShares', [
      { name: '300 rows, the takings worked out once', run: 'sharesCase', args: ['big'], setup: 'addShares on 300 rows of the check\'s own', hint: shareHints.wrong, hints: shareHints },
      { name: 'Twice as many rows', run: 'sharesCase', args: ['bigger'], setup: 'addShares on 600 rows', hint: shareHints.wrong, hints: shareHints },
      { name: 'One row', run: 'sharesCase', args: ['one'], setup: 'addShares on one row', hint: shareHints.wrong, hints: shareHints },
      { name: 'Two lists in one program', run: 'sharesAgainCase', setup: 'addShares called twice in the same program, on two different lists of rows', hint: shareHints.wrong, hints: shareHints }
    ])
  },

  rank(t) {
    return runCases(t, 'rankCustomers', [
      { name: '400 rows, sorted once', run: 'rankCase', args: ['rankBig'], setup: 'rankCustomers on 400 rows of the check\'s own, many with the same spend or name, and a comparison of its own', hint: rankHints.wrong, hints: rankHints },
      { name: 'Twice as many rows', run: 'rankCase', args: ['rankBigger'], setup: 'rankCustomers on 800 rows', hint: rankHints.wrong, hints: rankHints },
      { name: 'One row', run: 'rankCase', args: ['one'], setup: 'rankCustomers on one row', hint: rankHints.wrong, hints: rankHints },
      { name: 'No rows', run: 'rankCase', args: ['none'], setup: 'rankCustomers on an empty list', hint: rankHints.wrong, hints: rankHints },
      { name: 'Another comparison', run: 'rankCase', args: ['rankSmallest'], setup: 'rankCustomers on 400 rows with a comparison that puts the smallest spender first', hint: rankHints.wrong, hints: rankHints }
    ])
  },

  price(t) {
    return runCases(t, 'priceOrders', [
      { name: 'Each question asked once', run: 'priceCase', args: ['big'], setup: 'priceOrders on 2,400 orders of the check\'s own, with a price list of its own', hint: priceHints.wrong, hints: priceHints },
      { name: 'Twice as many orders, still once each', run: 'priceCase', args: ['bigger'], setup: 'priceOrders on 4,800 orders', hint: priceHints.wrong, hints: priceHints },
      { name: 'A new price list gets new answers', run: 'priceAgainCase', setup: 'priceOrders called twice, the second time after the price of calendars went up', hint: priceHints.stale, hints: priceHints }
    ])
  }
}
