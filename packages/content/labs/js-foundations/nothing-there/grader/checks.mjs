import { cases } from '../../grading.mjs'

const FILE = 'src/missing.js'

const form = (changes) => ({
  quantityText: '3',
  giftNote: null,
  extraCandlesText: 'two',
  ...changes
})

export const checks = {
  quantity(t) {
    return cases(t, {
      file: FILE,
      name: 'quantity',
      task: 'Task 1',
      list: [
        {
          name: 'Turns digits into a number',
          given: form({ quantityText: '7' }),
          expected: 7,
          hint: 'quantity should be a number, not text that looks like one. Build it on quantityText, not on a number you typed.'
        },
        {
          name: 'Works for two digits',
          given: form({ quantityText: '12' }),
          expected: 12,
          hint: 'Check tried another quantity and quantity did not follow. Turn quantityText into a number.'
        },
        {
          name: 'Ignores spaces around the digits',
          given: form({ quantityText: ' 5 ' }),
          expected: 5,
          hint: 'Spaces around the digits should not matter. Look at the part of the lesson on turning text into numbers.'
        }
      ]
    })
  },

  note(t) {
    return cases(t, {
      file: FILE,
      name: 'note',
      task: 'Task 2',
      list: [
        {
          name: 'null gets the default',
          given: form({ giftNote: null }),
          expected: 'No note',
          hint: 'When giftNote is null, note should be the default text from the task, spelt exactly.'
        },
        {
          name: 'undefined gets the default',
          given: form({ giftNote: undefined }),
          expected: 'No note',
          hint: 'undefined means nothing is there too, so it should get the default as well.'
        },
        {
          name: 'A real note is kept',
          given: form({ giftNote: 'Happy birthday, Sam' }),
          expected: 'Happy birthday, Sam',
          hint: 'When there is a note, note should be that note, unchanged.'
        },
        {
          name: 'An empty note stays empty',
          given: form({ giftNote: '' }),
          expected: '',
          hint: 'Empty text is not null or undefined, so it should stay as it is. One of the two default operators in the lesson replaces every falsy value, the other only null and undefined.'
        }
      ]
    })
  },

  extra(t) {
    return cases(t, {
      file: FILE,
      name: 'extraIsNumber',
      task: 'Task 3',
      list: [
        {
          name: 'A word is not a number',
          given: form({ extraCandlesText: 'two' }),
          expected: false,
          hint: 'Text like two turns into NaN. extraIsNumber should be false then, and it must be true or false itself.'
        },
        {
          name: 'Digits are a number',
          given: form({ extraCandlesText: '4' }),
          expected: true,
          hint: 'Text like 4 turns into a real number, so extraIsNumber should be true.'
        },
        {
          name: 'Digits with words after them are not a number',
          given: form({ extraCandlesText: '3 boxes' }),
          expected: false,
          hint: 'Text with words after the digits is not a number either. The lesson shows one way of turning text into a number that is strict about this, and one that is not.'
        },
        {
          name: 'Works for more digits',
          given: form({ extraCandlesText: '10' }),
          expected: true,
          hint: 'Check tried other text and extraIsNumber did not follow. Build it on extraCandlesText.'
        }
      ]
    })
  },

  fallback(t) {
    return cases(t, {
      file: FILE,
      name: 'safeQuantity',
      task: 'Task 4',
      list: [
        {
          name: 'Keeps a real quantity',
          given: form({ quantityText: '4' }),
          expected: 4,
          hint: 'When quantity is a real number other than 0, safeQuantity should be that number. Make sure Task 1 passes.'
        },
        {
          name: 'Text that is not a number counts as one',
          given: form({ quantityText: 'three' }),
          expected: 1,
          hint: 'Here quantity is NaN, so safeQuantity should be 1. NaN is one of the falsy values.'
        },
        {
          name: 'Zero counts as one',
          given: form({ quantityText: '0' }),
          expected: 1,
          hint: 'A quantity of 0 should count as one candle too. Which default operator treats 0 as missing?'
        },
        {
          name: 'An empty box counts as one',
          given: form({ quantityText: null }),
          expected: 1,
          hint: 'When quantityText is null, safeQuantity should still be 1.'
        }
      ]
    })
  }
}
