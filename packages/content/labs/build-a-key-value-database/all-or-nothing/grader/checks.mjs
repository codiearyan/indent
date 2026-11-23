import { runCases } from '../../checks-helpers.mjs'

const BATCH = {
  memory: 'Right after batch(), the same store should hold every change of the batch, in order.',
  restart: 'The changes of the batch were not all there once the store was opened again. A batch is written to the log too.',
  nothing: 'The batch did not make store.log any longer. A batch is written to the log, like any change.',
  early: 'The store held the changes of the batch before the batch was in store.log. A stop in that moment would lose what the store already answered with: write the batch first, then make its changes in memory.',
  late: 'The batch was not in store.log yet when its promise resolved. batch() waits for the whole batch to be in the file before it resolves, so a stop right after it loses nothing.',
  openThrew: 'open() threw on a log that ends inside a batch. A batch cut short is left out like a record cut short, and everything before it is kept.',
  half: 'Some changes of the batch were there and some were not: half a batch. A stop can come between any two bytes of the file, so the batch needs something that says where it ends, and the store takes its changes only once all of it is there.',
  lost: 'Records from before the batch were lost too. Leave out only the batch that was cut short, and keep every whole record before it.',
  glued: 'A change made after opening a log with a batch cut short was lost, or read wrong, the next time the store opened. Cut the broken end off store.log, the whole of the cut batch, before anything else is written.'
}

const CHECKED = {
  notRefused: 'Each of these batches should throw a TypeError: a batch is an array, and every change in it is a set with a text key and a text value, or a delete with a text key.',
  emptyThrew: 'An empty batch is not a mistake: it changes nothing, writes nothing and does not throw.',
  memory: 'The batch threw, but some of its changes were made in the store anyway. Check every change of the batch before making any of them.',
  written: 'store.log grew, though the batch was refused or empty. Check every change before anything is written: a refused batch leaves the log as it was.',
  restart: 'After a restart, the store did not hold what it held before the refused batch.'
}

const DENIED =
  'src/stock.js tried to write a file itself, and Check only lets it write through the store it is given. Keep every count in the store: no more stock.json.'

const STOCK = {
  denied: DENIED,
  text: 'stockOf() gave the count as text. The store keeps text, so turn it into a number before giving it back.',
  half: 'With the log cut inside the order, one line of it was taken and another was not. Take the whole order off in one batch, not as one change per line.',
  notRefused: 'The order asks for 100 posters and there are 60, so takeOrder() should throw an Error and take nothing.',
  unnamed: 'takeOrder() threw, but its message does not name the item that is short. Say which item it is, so the counter knows what to tell the customer.',
  changed: 'The order was refused, but some of it was taken anyway. Work out every line before changing anything.'
}

export const checks = {
  batch(t) {
    return runCases(t, 'batch()', [
      {
        name: 'A batch makes all its changes',
        run: 'batchCase',
        args: ['all'],
        setup: 'a store with paper, ink and mark, then batch() of a set of paper, a delete of ink and a set of binding with a line break, close() and open() again',
        hint: BATCH.restart,
        hints: BATCH
      },
      {
        name: 'Changes inside a batch go in order',
        run: 'batchCase',
        args: ['order'],
        setup: 'batch() of a set and a delete of glue, then two sets of ink, close() and open() again',
        hint: 'The changes of a batch happen in their order: glue set then deleted is gone, and ink holds its last value.',
        hints: { restart: BATCH.restart }
      },
      {
        name: 'A batch cut short is left out whole',
        run: 'batchCase',
        args: ['cut'],
        setup: 'a store with paper, ink and mark, then that batch; the check cuts store.log at every byte inside the batch and opens your store on each',
        hint: BATCH.half,
        hints: BATCH
      },
      {
        name: 'Changes after a batch cut short are kept',
        run: 'batchCase',
        args: ['goOn'],
        setup: 'the same logs cut inside the batch; on each, open(), set() of glue, close(), and open() again',
        hint: BATCH.glued,
        hints: BATCH
      },
      {
        name: 'Batches and compaction',
        run: 'batchCase',
        args: ['compact'],
        setup: 'that batch, then compact(), then another batch, close() and open() again',
        hint: 'compact() keeps the values a batch set, and a batch after compact() lands in the new log.',
        hints: { restart: 'Once the store was opened again, the batches were not all there. compact() keeps the values a batch set, and a batch after compact() lands in the new log.' }
      }
    ])
  },

  checked(t) {
    return runCases(t, 'batch()', [
      {
        name: 'A value that is not text',
        run: 'checkedCase',
        args: ['value'],
        setup: 'a store with paper, ink and mark, then batch() of two good sets and a set of glue to the number 7',
        hint: CHECKED.notRefused,
        hints: CHECKED
      },
      {
        name: 'A change that is neither set nor delete',
        run: 'checkedCase',
        args: ['op'],
        setup: "the same store, then batch() of a good set and a change with op 'rename'",
        hint: CHECKED.notRefused,
        hints: CHECKED
      },
      {
        name: 'A key that is missing or not text',
        run: 'checkedCase',
        args: ['key'],
        setup: 'the same store, then three batches, each a good delete followed by a delete with the key null, a set with the key 7, or a set with no key',
        hint: CHECKED.notRefused,
        hints: CHECKED
      },
      {
        name: 'A set without a value',
        run: 'checkedCase',
        args: ['noValue'],
        setup: 'the same store, then batch() of a good set and a set of ink with no value',
        hint: CHECKED.notRefused,
        hints: CHECKED
      },
      {
        name: 'Changes that are not objects',
        run: 'checkedCase',
        args: ['shape'],
        setup: 'the same store, then batch() of a good set and null',
        hint: CHECKED.notRefused,
        hints: CHECKED
      },
      {
        name: 'A batch that is not an array',
        run: 'checkedCase',
        args: ['notArray'],
        setup: "the same store, then batch('paper'), batch() with nothing, and batch() of one change that is not in an array",
        hint: CHECKED.notRefused,
        hints: CHECKED
      },
      {
        name: 'An empty batch',
        run: 'checkedCase',
        args: ['empty'],
        setup: 'the same store, then batch([])',
        hint: CHECKED.emptyThrew,
        hints: CHECKED
      }
    ])
  },

  stock(t) {
    const files = { '.grader/db.js': t.chapterPath('grader/db.js') }
    const cases = [
      {
        name: 'stockOf() gives numbers',
        run: 'stockCase',
        args: ['stockOf'],
        setup: "a store with card '1200', envelope '900' and poster '60', then stockOf(db, 'card'), and stockOf(db, 'napkin') and stockOf(db, 'invite'), items it does not hold",
        hint: 'stockOf() gives the count as a number, and 0 for an item the store does not hold, whatever the shop\'s own counts say.',
        hints: STOCK
      },
      {
        name: 'A delivery adds to the count',
        run: 'stockCase',
        args: ['receive'],
        setup: "the same store, then receive(db, 'card', 300) and receive(db, 'napkin', 50), close() and open() again",
        hint: 'receive() adds the delivery to the count the store holds, and keeps the new count as text in digits. An item the store did not hold starts from 0.',
        hints: STOCK
      },
      {
        name: 'An order takes every line',
        run: 'stockCase',
        args: ['order'],
        setup: 'the same store, then takeOrder() of 200 card and 100 envelope, close() and open() again',
        hint: 'Each line of the order takes its count off its item, and the new counts are kept as text in digits.',
        hints: STOCK
      },
      {
        name: 'An item on two lines',
        run: 'stockCase',
        args: ['twice'],
        setup: 'the same store, then takeOrder() of 100 card, 300 envelope and 50 more card, close() and open() again',
        hint: 'card is on two lines, so the order takes both off it. Count what each line leaves for the next one, not each line from the count in the store.',
        hints: STOCK
      },
      {
        name: 'An order cut short is not half taken',
        run: 'stockCase',
        args: ['cut'],
        setup: "the same store, then takeOrder() of 200 card and 100 envelope; the check cuts the store's log at every byte inside the order and opens the store on each",
        hint: STOCK.half,
        hints: STOCK
      },
      {
        name: 'An order there is not enough for',
        run: 'stockCase',
        args: ['refused'],
        setup: 'the same store, then takeOrder() of 200 card and 100 poster, close() and open() again',
        hint: STOCK.notRefused,
        hints: STOCK
      }
    ]
    return runCases(t, 'stockOf(), receive() or takeOrder()', cases.map((c) => ({ ...c, denied: DENIED })), { files })
  }
}
