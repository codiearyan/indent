import { runCases } from '../../checks-helpers.mjs'

const ANY = 'The check opens your store, sets these, closes it and opens the folder again; it never reads store.log, so the format is yours. Each value should come back letter for letter.'

const CUT = {
  nothing: 'The last change did not make store.log any longer. Every change adds its record to the end of the log.',
  openThrew: 'A stop halfway through a write leaves the last record cut short, and open() threw on it. A record cut short is not an error: leave it out, and keep every whole record before it.',
  lost: 'Records before the cut one were lost too. Only the last record is broken: keep every whole record before it, and leave out only what comes after the last whole one.',
  read: 'The record cut short was read as if it were whole. A record counts only when every byte of it is in the file, its end included: the store must be able to tell where a record should end, and see that the file stops before that.'
}

const GO_ON = {
  lost: 'Records from before the cut were lost. Cut off only the broken end of the file, the bytes after the last whole record: a length in characters and a length in bytes differ once a value holds a letter like é.',
  glued: 'A change made after opening the cut log was lost, or read wrong, the next time the store opened. Its record landed after the broken bytes of the cut one and was read together with them. Cut the broken end off store.log when the store opens, before anything else is written.'
}

export const checks = {
  anything(t) {
    return runCases(t, 'open(), encode() or decode()', [
      {
        name: 'Values with line breaks and tabs',
        run: 'anyCase',
        args: ['lines'],
        setup: 'set() of values holding \\n, \\r\\n and tabs, one ending with a line break and one starting with it, then close() and open() again',
        hint: `${ANY} A line break or a tab inside a value must not end the record.`
      },
      {
        name: 'Keys with line breaks, tabs and separators',
        run: 'anyCase',
        args: ['keys'],
        setup: 'set() under keys holding \\n, a tab, :, |, =, ", a backslash, a space, an empty key and the key 12, then close() and open() again',
        hint: `${ANY} Keys hold any text too, the characters your format uses to mark its parts included.`
      },
      {
        name: 'A value shaped like records is still one value',
        run: 'anyCase',
        args: ['shaped'],
        setup: 'set() of values that look like records of several formats, with escapes and backslashes in them, then close() and open() again',
        hint: `${ANY} No value may be read as records of its own, and no escape may change what a value says: a backslash in a value comes back as a backslash.`
      },
      {
        name: 'Characters from beyond plain English',
        run: 'anyCase',
        args: ['odd'],
        setup: 'set() of values with é, Japanese characters, an emoji, a NUL character and a letter with a joined accent, then close() and open() again',
        hint: `${ANY} One character can take two or more bytes, and an emoji counts as two in a string's length: count the same way when you write and when you read.`
      },
      {
        name: 'Changes and deletes of such keys',
        run: 'anyCase',
        args: ['mixed'],
        setup: 'keys with line breaks set, set again with a tab in the value, set empty, and one deleted, then close() and open() again',
        hint: `${ANY} The last change of each key wins, and a deleted key with a line break in it stays deleted.`
      }
    ])
  },

  cut(t) {
    return runCases(t, 'open() or decode()', [
      {
        name: 'A new key cut short is left out',
        run: 'cutCase',
        args: ['new'],
        setup: 'a store with paper, ink and mark, then set() of binding; the check cuts store.log at every byte inside that last record and opens your store on each',
        hint: CUT.read,
        hints: CUT
      },
      {
        name: 'A change cut short leaves the old value',
        run: 'cutCase',
        args: ['overwrite'],
        setup: 'a store with paper, ink and mark, then set() of paper again; store.log cut at every byte inside that last record',
        hint: CUT.read,
        hints: CUT
      },
      {
        name: 'A delete cut short leaves the key',
        run: 'cutCase',
        args: ['delete'],
        setup: 'a store with paper, ink and mark, then delete() of ink; store.log cut at every byte inside that last record',
        hint: CUT.read,
        hints: CUT
      },
      {
        name: 'A value with line breaks cut short',
        run: 'cutCase',
        args: ['lines'],
        setup: 'a store with paper, ink and mark, then set() of a note with line breaks in it; store.log cut at every byte inside that last record, right after each line break included',
        hint: CUT.read,
        hints: CUT
      },
      {
        name: 'A cut in the middle of a character',
        run: 'cutCase',
        args: ['odd'],
        setup: 'a store with paper, ink and mark, then set() of a value with emoji and é; store.log cut at every byte inside that last record, inside those characters included',
        hint: CUT.read,
        hints: CUT
      }
    ])
  },

  'go-on'(t) {
    return runCases(t, 'open()', [
      {
        name: 'A set after the cut is kept',
        run: 'goOnCase',
        args: ['set'],
        setup: 'a store with paper, ink and mark and a last record cut short at every byte inside it; on each, open(), set() of glue, close(), and open() again',
        hint: GO_ON.glued,
        hints: GO_ON
      },
      {
        name: 'A delete after the cut is kept',
        run: 'goOnCase',
        args: ['delete'],
        setup: 'the same cut logs; on each, open(), delete() of paper, close(), and open() again',
        hint: GO_ON.glued,
        hints: GO_ON
      },
      {
        name: 'Two stores after the cut',
        run: 'goOnCase',
        args: ['twice'],
        setup: 'the same cut logs; on each, one store sets glue and closes, a second sets gum and closes, then a third opens',
        hint: GO_ON.glued,
        hints: GO_ON
      },
      {
        name: 'A cut after letters that take more than one byte',
        run: 'goOnCase',
        args: ['odd'],
        setup: 'a store whose values hold é and an emoji, and a last record with emoji cut at every byte inside it; on each, open(), set() of glue, close(), and open() again',
        hint: GO_ON.glued,
        hints: GO_ON
      }
    ])
  }
}
