import { runCases } from '../../checks-helpers.mjs'

export const checks = {
  append(t) {
    return runCases(t, 'open(), set(), close() or encode()', [
      {
        name: 'Each set adds one record at once',
        run: 'appendCase',
        args: ['fresh'],
        setup: "open() on a folder that is not there yet, then set('paper', 'linen'), set('ink', 'black') and set('paper', 'cotton')",
        hint: 'Each set should add its one line to the end of store.log: set, a tab, the key, a tab, the value and a line break.',
        hints: {
          nofile: 'No store.log was made. open() makes the folder it was given when it is missing, and each set adds its record to store.log in that folder.',
          late: 'The records reach store.log only later, not by the time each set had finished. Each set adds its own record and waits for it to be in the file before its promise resolves: a stop before close() would lose them all.',
          rewritten: 'The first record changed when the next ones were written. A change only adds its record to the end of store.log; it never writes the file again from the start.'
        }
      },
      {
        name: 'The bytes already in the log stay as they were',
        run: 'appendCase',
        args: ['existing'],
        setup: "a store.log that already holds three records, then open() and set('binding', 'saddle')",
        hint: 'The new record should go after the three that were there, in the same format.',
        hints: {
          rewritten: 'The records that were in store.log are not there as they were. A change only adds its record to the end of the file; it never writes the file again from the start, and opening never empties it.'
        }
      },
      {
        name: 'An empty value is a record too',
        run: 'appendCase',
        args: ['empty'],
        setup: "a new store, then set('note', '') and set('ink', 'blue')",
        hint: 'A set with an empty value is still a record: set, a tab, the key, a tab, then nothing before the line break.'
      }
    ])
  },

  replay(t) {
    return runCases(t, 'open() or decode()', [
      {
        name: 'Opening replays the log, the last change wins',
        run: 'replayCase',
        args: ['log'],
        setup: 'a store.log of four set records, with paper set twice, then open()',
        hint: 'open() should read store.log and replay its records in order, so each key holds the value of its last record.'
      },
      {
        name: 'An empty value comes back empty',
        run: 'replayCase',
        args: ['empty'],
        setup: 'a store.log holding a record of note with an empty value, then open()',
        hint: "The record of note has an empty value, so after opening the store holds note with the value ''."
      },
      {
        name: 'A folder without a log is an empty store',
        run: 'replayCase',
        args: ['none'],
        setup: 'open() on an empty folder, and on a folder that is not there',
        hint: 'With no store.log yet, the store starts empty.',
        hints: {
          threw: 'Reading a file that is not there fails with ENOENT. Here that only means the store is new: catch that one error and start empty.'
        }
      },
      {
        name: 'What one store set, the next one finds',
        run: 'replayCase',
        args: ['restart'],
        setup: "open(), set paper, ink, then paper again, close(), and open() the same folder again",
        hint: 'A store opened after a restart should hold what the last one set, read back from store.log.'
      },
      {
        name: 'Three stores in a row',
        run: 'replayCase',
        args: ['twice'],
        setup: 'a store sets paper and ink and closes, a second one sets glue and closes, then a third opens',
        hint: 'The third store should find the keys of both stores before it: the second one adds to the log the first one left.'
      }
    ])
  },

  delete(t) {
    return runCases(t, 'open(), delete(), encode() or decode()', [
      {
        name: 'A delete adds its record',
        run: 'deleteCase',
        args: ['record'],
        setup: "a new store, set('paper', 'linen'), set('ink', 'black'), delete('paper'), then delete('glue'), a key it did not hold",
        hint: "A delete should add one line to the end of store.log: delete, a tab, the key and a line break.",
        hints: {
          missing: 'The store did not hold glue, so there is nothing to delete and nothing to write: the log should stay as it was.'
        }
      },
      {
        name: 'A deleted key stays deleted after a restart',
        run: 'deleteCase',
        args: ['restart'],
        setup: 'a store sets paper and ink, deletes paper and closes, then the same folder is opened again',
        hint: 'paper came back after the restart. A delete that only changes memory is forgotten when the program stops: it needs its own record in the log, and the replay has to follow it.'
      },
      {
        name: 'The replay follows every delete',
        run: 'deleteCase',
        args: ['log'],
        setup: 'a store.log of sets and deletes, where ink is deleted and then set again, then open()',
        hint: 'Replay the records in order: a delete record removes its key, and a later set brings it back.'
      },
      {
        name: 'A key set again after a delete',
        run: 'deleteCase',
        args: ['back'],
        setup: 'a store sets paper and ink, deletes both, sets ink again, closes, and the folder is opened again',
        hint: 'The last record of ink is a set, so after the restart ink holds that value, and paper stays deleted.',
        hints: { returned: 'paper came back after the restart. A delete that only changes memory is forgotten when the program stops: it needs its own record in the log, and the replay has to follow it.' }
      }
    ])
  }
}
