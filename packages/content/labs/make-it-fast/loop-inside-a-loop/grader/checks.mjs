import { runCases } from '../../checks-helpers.mjs'

const matchHints = {
  wrong: 'The orders should come back exactly as the old matchOrders gives them: every order in its place, with all its own fields and the record of the customer whose id it holds.',
  search:
    'The answer is right, but the customer list is still searched for every order: the ids were read many times for each customer. Make something that finds a customer by id once, before the loop over the orders, and only use it inside.',
  orders: 'Each order\'s customerId should be read about once or twice, not once for every customer.'
}

const tradeHints = {
  wrong: 'The trade orders should come back exactly as the old tradeOrders gives them: the orders whose customer is on the trade list, in their own order.',
  search:
    'The answer is right, but the trade list is still gone through for every order. Make something that answers "is this id on the trade list?" without going through the list, once, before the orders are filtered.',
  copy: 'The answer is right, but a list of trade ids is still searched for every order, with includes, indexOf, some or find, whether it is the trade list itself or a copy of it. Make something that answers "is this id on the trade list?" without going through a list, once, before the orders are filtered.',
  orders: 'Each order\'s customerId should be read about once or twice, not once for every trade customer.'
}

const growthHints = {
  calls: 'growth should ask stepsFor exactly twice: once for n and once for 2 * n. Each answer may take a lot of work, so ask each size once.',
  label:
    'Divide the steps at 2 * n by the steps at n, and pick the word by how big that is, with the limits the task gives: under 1.5, under 3, or more.'
}

export const checks = {
  match(t) {
    return runCases(t, 'matchOrders', [
      { name: 'A big shop, the same answer with one look per customer', run: 'matchCase', args: ['big'], setup: 'matchOrders on 2,400 orders and 400 customers of the check\'s own', hint: matchHints.wrong, hints: matchHints },
      { name: 'Twice as big, still one look per customer', run: 'matchCase', args: ['bigger'], setup: 'matchOrders on 4,800 orders and 800 customers', hint: matchHints.wrong, hints: matchHints },
      { name: 'Three customers', run: 'matchCase', args: ['small'], setup: 'matchOrders on 30 orders and 3 customers', hint: matchHints.wrong, hints: matchHints },
      { name: 'No orders', run: 'matchCase', args: ['none'], setup: 'matchOrders on no orders and 5 customers', hint: matchHints.wrong, hints: matchHints }
    ])
  },

  trade(t) {
    return runCases(t, 'tradeOrders', [
      { name: 'A big shop, the same answer without searching the list', run: 'tradeCase', args: ['big'], setup: 'tradeOrders on 2,400 orders of the check\'s own and its trade list', hint: tradeHints.wrong, hints: tradeHints },
      { name: 'Twice as big', run: 'tradeCase', args: ['bigger'], setup: 'tradeOrders on 4,800 orders and a trade list twice as long', hint: tradeHints.wrong, hints: tradeHints },
      { name: 'An empty trade list', run: 'tradeCase', args: ['small'], setup: 'tradeOrders on 30 orders and an empty trade list', hint: tradeHints.wrong, hints: tradeHints }
    ])
  },

  growth(t) {
    return runCases(t, 'growth', [
      { name: 'Work that doubles', run: 'growthCase', args: ['linear', 'sorting'], setup: 'growth with step counts of the check\'s own that about double', hint: growthHints.label, hints: growthHints },
      { name: 'Work that grows four times', run: 'growthCase', args: ['square', 'mostlySquare'], setup: 'growth with step counts that grow about four times', hint: growthHints.label, hints: growthHints },
      { name: 'Work that stays about the same', run: 'growthCase', args: ['flat', 'nearlyFlat'], setup: 'growth with step counts that hardly change', hint: growthHints.label, hints: growthHints }
    ])
  }
}
