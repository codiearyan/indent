import { runCases } from '../../checks-helpers.mjs'

export const checks = {
  keep(t) {
    return runCases(t, 'open()', [
      {
        name: 'get() gives back what set() kept',
        run: 'keepCase',
        args: ['two'],
        setup: "a new store, then set('paper', 'linen') and set('ink', 'black')",
        hint: 'Each key should give back the value set() kept under it. Keep the values inside the store that open() returns.',
        hints: {
          nothing: 'open() should give a store: an object with get and set.',
          sync: 'open() should return a promise of the store, as an async function does: from the next issue on, opening reads a file, which takes a moment.'
        }
      },
      {
        name: 'A second set() replaces the value',
        run: 'keepCase',
        args: ['again'],
        setup: "a new store, then set('paper', 'linen') and set('paper', 'cotton')",
        hint: 'A key holds one value: the one set last. set() puts the new value in place of the old one.'
      },
      {
        name: 'A key that was never set gives undefined',
        run: 'keepCase',
        args: ['missing'],
        setup: "a new store, then set('paper', 'linen'), and get('binding'), a key nobody set",
        hint: 'For a key the store does not hold, get() gives undefined: not null, not an empty text, and no error.'
      },
      {
        name: 'Values come back exactly as they were given',
        run: 'keepCase',
        args: ['exact'],
        setup: "a new store, then set('code', '007'), set('size', ' A5 ') and set('weight', '0300.50')",
        hint: 'A value is text and comes back letter for letter: no number made of it, nothing trimmed.'
      },
      {
        name: 'Two stores keep their own keys',
        run: 'keepCase',
        args: ['apart'],
        setup: "store A and store B opened on two folders, then A.set('ink', 'black') and B.set('ink', 'red')",
        hint: 'Each store should keep its own values.',
        hints: {
          leak: 'Store B saw a value set on store A. Keep the values in a variable of each open() call, not in one variable for the whole file.',
          shared: 'Store A lost its value when store B set the same key. Each store keeps its own values, in a variable of its own open() call.'
        }
      }
    ])
  },

  empty(t) {
    return runCases(t, 'open() or one of the store\'s functions', [
      {
        name: 'An empty value is still a value',
        run: 'emptyCase',
        args: ['empty'],
        setup: "a store with paper, then set('note', '')",
        hint: "The note is there, with an empty text as its value: get() gives '' and has() gives true. An empty text is falsy, so a test like `if (value)` mistakes it for no value."
      },
      {
        name: 'A missing key is not there',
        run: 'emptyCase',
        args: ['missing'],
        setup: "a store with paper, then get('binding') and has('binding')",
        hint: 'binding was never set, so has() gives false and get() gives undefined.'
      },
      {
        name: 'delete() removes the key',
        run: 'emptyCase',
        args: ['delete'],
        setup: "a store with paper and ink, then delete('paper')",
        hint: 'After delete, the store no longer holds paper at all: has() gives false and get() gives undefined. A key kept with an empty or undefined value is still a key. ink stays as it was.'
      },
      {
        name: 'Deleting a key that is not there changes nothing',
        run: 'emptyCase',
        args: ['deleteMissing'],
        setup: "a store with paper, then delete('binding'), a key nobody set",
        hint: 'Deleting a key the store does not hold leaves the store as it was.',
        hints: { threw: 'Deleting a key the store does not hold should not throw: there is simply nothing to remove.' }
      },
      {
        name: 'A deleted key can be set again',
        run: 'emptyCase',
        args: ['back'],
        setup: "a store with paper, then delete('paper') and set('paper', 'cotton')",
        hint: 'After a delete, set() keeps the key again with its new value, like any other key.'
      }
    ])
  },

  text(t) {
    return runCases(t, 'open() or one of the store\'s functions', [
      {
        name: 'Names objects already have are not keys',
        run: 'textCase',
        args: ['names'],
        setup: 'a new store, then get() and has() of toString, constructor, __proto__, hasOwnProperty and valueOf',
        hint: 'An empty store holds no key at all. A plain object already has these names from Object.prototype, so a store kept in one finds them: keep the values somewhere that starts truly empty, and ask whether a key is the store\'s own.'
      },
      {
        name: 'Those names work as keys',
        run: 'textCase',
        args: ['setNames'],
        setup: "a new store, set() of toString, constructor, __proto__, hasOwnProperty and valueOf, then delete('constructor')",
        hint: 'Every one of these is a key like any other. On a plain object, __proto__ is not an ordinary property, so a value set under it disappears: keep the values somewhere that treats every text alike.'
      },
      {
        name: 'An empty text is a key too',
        run: 'textCase',
        args: ['emptyKey'],
        setup: "a new store, then set('', 'blank') and set('paper', 'linen')",
        hint: "The empty text '' is a key like any other: set() keeps a value under it and get('') gives it back."
      },
      {
        name: 'Only text is kept',
        run: 'textCase',
        args: ['badSet'],
        setup: "a new store, then set() with a number, null, nothing, an object or an array as the key or the value",
        hint: 'Every one of these calls should throw a TypeError.',
        hints: {
          notRefused: 'Keys and values are text. set() with anything else should throw a TypeError, not turn it into text: the number 7 and the text "7" are not the same value.',
          kept: 'Each call threw, but something was kept anyway. Refuse before keeping anything.'
        }
      },
      {
        name: 'A key that is not text is refused everywhere',
        run: 'textCase',
        args: ['badKey'],
        setup: "a store with paper, then get(7), has(null), delete(undefined), get({}) and has(7)",
        hint: 'get(), has() and delete() should each throw a TypeError when the key is not text, and leave the store as it was.'
      }
    ])
  }
}
