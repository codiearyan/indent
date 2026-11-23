import { runCases } from '../../checks-helpers.mjs'

const askHints = {
  threw: 'It failed while waiting for the answers. Every question gets an answer here, so look at what happens to each one.',
  stuck: 'Every question was answered, but the promise it returned never settled. Make sure it waits for the answers it asked for and then finishes.',
  silent: 'It never asked a question and never finished. Start the questions, then wait for their answers.',
  each: 'Each id should be asked about exactly once: not skipped, and not asked twice.',
  over: 'More questions were open at once than the limit allows. The service refuses the ones over its limit, so start a new question only when an earlier one has its answer.',
  one: 'Only one question was open at a time: each answer was waited for before the next question was asked. None of these questions needs the answer of another, so ask them without waiting in between.',
  fewer: 'Fewer questions were open at once than there could have been. Start as many as you may at the very beginning.',
  order: 'All the answers came back, but not in the order of the ids. Answers arrive in any order; put each one in the place of the id it belongs to.',
  early: 'It returned before all the answers had arrived. Wait until every question has its answer, then return the list.',
  answers: 'The list it returned should hold exactly what the service answered for each id, in the order of the ids.'
}

const paymentHints = {
  ...askHints,
  paid: 'The service was asked about an order whose record already says it is paid. Only the orders not marked paid need a question.',
  each: 'Each order not marked paid should be asked about exactly once.',
  over: 'More than four questions were open at once, and the payments service refuses the ones over its limit. Use the limit from src/shop.js.',
  fewer: 'Fewer questions were open at once than the service takes. While there are orders left to ask about, keep as many questions open as the limit allows.',
  answers: 'The list should be exactly what the old checkPayments gives: one { id, customerId, status } for every trade order, in their order, with \'paid\' for the orders already marked paid.'
}

export const checks = {
  together(t) {
    return runCases(t, 'askAll', [
      { name: 'Asks about all twelve before any answer', run: 'allCase', args: [12], setup: 'askAll on 12 ids, with a service of the check\'s own that answers the newest question first', hint: askHints.answers, hints: askHints },
      { name: 'Two ids', run: 'allCase', args: [2], setup: 'askAll on 2 ids', hint: askHints.answers, hints: askHints },
      { name: 'No ids', run: 'allCase', args: [0], setup: 'askAll on an empty list', hint: askHints.answers, hints: askHints }
    ])
  },

  limit(t) {
    return runCases(t, 'askLimited', [
      { name: 'Twenty ids, four at a time', run: 'limitCase', args: [20, 4], setup: 'askLimited on 20 ids with a limit of 4', hint: askHints.answers, hints: askHints },
      { name: 'Nine ids, three at a time', run: 'limitCase', args: [9, 3], setup: 'askLimited on 9 ids with a limit of 3', hint: askHints.answers, hints: askHints },
      { name: 'Fewer ids than the limit', run: 'limitCase', args: [2, 5], setup: 'askLimited on 2 ids with a limit of 5', hint: askHints.answers, hints: askHints },
      { name: 'No ids', run: 'limitCase', args: [0, 4], setup: 'askLimited on an empty list with a limit of 4', hint: askHints.answers, hints: askHints }
    ])
  },

  payments(t) {
    return runCases(t, 'checkPayments', [
      { name: 'Only the unpaid, four at a time', run: 'paymentsCase', args: [30, 3], setup: 'checkPayments on 30 trade orders of the check\'s own, 10 of them not marked paid', hint: paymentHints.answers, hints: paymentHints },
      { name: 'Fewer unpaid orders than the limit', run: 'paymentsCase', args: [7, 4], setup: 'checkPayments on 7 trade orders, 2 of them not marked paid', hint: paymentHints.answers, hints: paymentHints },
      { name: 'Every order already paid', run: 'paymentsCase', args: [5, 0], setup: 'checkPayments on 5 trade orders, all marked paid', hint: paymentHints.answers, hints: paymentHints }
    ])
  }
}
