import { runCases } from '../../checks-helpers.mjs'

const SHORT = {
  lost: 'After compact(), closed and opened again, the store does not hold what it held before. The new log holds one record for each key the store holds now, with its value, written the way set writes it.',
  same: 'store.log is as long as it was before compact(). Write a new log from the keys and values the store holds now, not a copy of the old records.',
  long: 'store.log is longer than a fresh store\'s log with each key set once. One record per key, written the way set writes it, and none at all for a deleted key: old values and deletes are what compaction leaves behind.',
  short: 'store.log is shorter than a fresh store\'s log with each key set once, though the store gives back what it held. Write each record exactly the way set writes it, and nothing else in the file.'
}

const SWAP = {
  inPlace: 'The bytes of the old log were written over. A stop halfway through that write would leave neither the old log nor the new one. Write the new log into store.log.new, and leave store.log itself alone until the new file takes its place in one step.',
  removed: 'store.log was taken away before the new log took its place, so a stop between the two steps would leave no log at all. A rename onto a file that is there replaces it in one step: there is no need to remove it first.',
  leftover: 'store.log.new is still there after compact(). Once the new log is whole, it takes store.log\'s place, so nothing is left under the other name.',
  lost: 'After compact(), closed and opened again, the store does not hold what it held before.',
  readNew: 'Opening paid attention to the store.log.new a stop had left. Only store.log is the log: a store.log.new may be half written, and one that ends on a whole record looks just like a log of its own.',
  added: 'The half-written store.log.new from the earlier stop got into the new log. compact() writes the new log from the start, so whatever a stop left under that name is replaced, not added to.'
}

const GO_ON = {
  memory: 'Right after compact(), the same store should go on giving every key its value, and every change after it should work as before.',
  lostAfter: 'The changes made after compact() were gone once the store was opened again. They have to land in the new log, the file now called store.log: something written to the old log, after it was replaced, is lost with it.'
}

export const checks = {
  compact(t) {
    return runCases(t, 'compact()', [
      {
        name: 'One record per key, the same keys and values',
        run: 'compactCase',
        args: ['shrink'],
        setup: 'a store whose paper was set three times, ink twice, glue set and deleted, a note with a line break and a mark with é and an emoji, then compact(), close() and open() again',
        hint: SHORT.long,
        hints: SHORT
      },
      {
        name: 'Compacting twice changes nothing more',
        run: 'compactCase',
        args: ['twice'],
        setup: 'the same store, then compact() twice, close() and open() again',
        hint: SHORT.long,
        hints: SHORT
      },
      {
        name: 'A store with every key deleted',
        run: 'compactCase',
        args: ['empty'],
        setup: 'the same store with every key deleted afterwards, then compact(), close() and open() again',
        hint: SHORT.long,
        hints: SHORT
      }
    ])
  },

  swap(t) {
    return runCases(t, 'compact()', [
      {
        name: 'The old log is never written over or taken away',
        run: 'swapCase',
        args: ['inPlace'],
        setup: 'a store with old values and deletes in its log; the check keeps a second name for the old log\'s bytes and notes every call that removes store.log or moves it away, then compact()',
        hint: SWAP.inPlace,
        hints: SWAP
      },
      {
        name: 'A half-written store.log.new from a stop',
        run: 'swapCase',
        args: ['junk'],
        setup: 'the same store, with a half-written store.log.new beside its log, as a stop during an earlier compaction leaves it; then open(), compact(), close() and open() again',
        hint: SWAP.readNew,
        hints: SWAP
      },
      {
        name: 'A store.log.new that ends on a whole record',
        run: 'swapCase',
        args: ['whole'],
        setup: 'the same store, with a store.log.new beside it that holds one whole record, as a stop after the first record of an earlier compaction leaves it; then open(), compact(), close() and open() again',
        hint: SWAP.readNew,
        hints: SWAP
      }
    ])
  },

  'go-on'(t) {
    return runCases(t, 'compact()', [
      {
        name: 'The store answers as before',
        run: 'goOnCase',
        args: ['same'],
        setup: 'a store with old values and deletes in its log, then compact(), and get() and has() on the same store',
        hint: GO_ON.memory,
        hints: GO_ON
      },
      {
        name: 'Changes after compact() are kept',
        run: 'goOnCase',
        args: ['after'],
        setup: 'the same store, then compact(), set() of glue and paper and delete() of ink on the same store, close() and open() again',
        hint: GO_ON.lostAfter,
        hints: GO_ON
      },
      {
        name: 'Changes around a second compact()',
        run: 'goOnCase',
        args: ['twice'],
        setup: 'the same store, then compact(), set() of glue and paper, compact() again and delete() of ink, close() and open() again',
        hint: GO_ON.lostAfter,
        hints: GO_ON
      }
    ])
  }
}
