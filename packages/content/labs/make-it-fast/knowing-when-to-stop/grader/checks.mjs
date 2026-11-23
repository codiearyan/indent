import { runCases } from '../../checks-helpers.mjs'

const printHints = {
  wrong: 'The report should be exactly the text the old printReport gives, line for line, every amount written the same way.',
  again:
    'The text is right, but a new money formatter is made for every amount, and making one is slow. Make one formatter and use it for every amount.'
}

const dayHints = {
  last: 'The last day of the range is missing: the day that was being added up when the loop stopped never went into the list. When the loop stops early, that day still belongs in it.',
  wrong: 'The days should be exactly what the old takingsByDay gives: one { day, orders, pence } for each day with orders from `from` up to and including `until`, in day order.',
  past: 'The days are right, but your code read orders after `until`. The orders are in day order, so the first order after `until` means there is nothing more to read: stop there.'
}

const reportHints = {
  wrong: 'The report should be exactly the text the old report gives on the same shop, line for line.',
  stale:
    'The second report still used a price from before the price list changed: answers were kept longer than they were true. Keep answers only for one report, or forget them when the price list is a different one.',
  match: 'The customer list is searched again: customer ids were read many times for each customer. Look at matchOrders.',
  trade: 'A list of trade ids is searched for every order again, the trade list itself or a copy of it. Look at tradeOrders.',
  price: 'The price list was asked the same question more than once in one report. Look at priceOrders.',
  payments: 'The payments service should be asked once about each trade order not marked paid, never more than four at once. Look at checkPayments.'
}

export const checks = {
  print(t) {
    return runCases(t, 'printReport', [
      { name: 'The same text with one formatter', run: 'printCase', args: [2400, 61], setup: 'printReport for a shop of the check\'s own, with 400 customers', hint: printHints.wrong, hints: printHints },
      { name: 'A bigger shop, still one formatter', run: 'printCase', args: [4800, 62], setup: 'printReport for a shop with 800 customers', hint: printHints.wrong, hints: printHints }
    ])
  },

  days(t) {
    return runCases(t, 'takingsByDay', [
      { name: 'A range that ends before the last order', run: 'daysCase', args: ['middle'], setup: 'takingsByDay(orders, \'2026-09-20\', \'2026-09-25\') on 2,400 orders of the check\'s own that go on to October', hint: dayHints.wrong, hints: dayHints },
      { name: 'A range from before the first order', run: 'daysCase', args: ['start'], setup: 'takingsByDay(orders, \'2026-09-01\', \'2026-09-14\')', hint: dayHints.wrong, hints: dayHints },
      { name: 'A range up to the last order', run: 'daysCase', args: ['end'], setup: 'takingsByDay(orders, \'2026-10-01\', \'2026-10-23\'), where the last orders are on 23 October', hint: dayHints.wrong, hints: dayHints },
      { name: 'A range before any order', run: 'daysCase', args: ['before'], setup: 'takingsByDay(orders, \'2026-08-01\', \'2026-08-31\') on orders from September on', hint: dayHints.wrong, hints: dayHints },
      { name: 'Days without orders', run: 'daysCase', args: ['gaps'], setup: 'takingsByDay(orders, \'2026-09-15\', \'2026-10-09\') on 25 orders over 40 days', hint: dayHints.wrong, hints: dayHints }
    ])
  },

  report(t) {
    return runCases(t, 'buildReport', [
      { name: 'The old report, with far less work', run: 'reportCase', args: [2400, 71], setup: 'buildReport on a shop of the check\'s own with 2,400 orders, its price list and its payments service', hint: reportHints.wrong, hints: reportHints },
      { name: 'Twice as many orders', run: 'reportCase', args: [4800, 72], setup: 'buildReport on a shop with 4,800 orders', hint: reportHints.wrong, hints: reportHints },
      { name: 'A price change between two reports', run: 'staleCase', setup: 'buildReport twice in the same program, the second time after the price of menus went up', hint: reportHints.stale, hints: reportHints }
    ])
  }
}
