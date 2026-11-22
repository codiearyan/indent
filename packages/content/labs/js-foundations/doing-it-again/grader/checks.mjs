import { calls, partOf, readSource, shape } from '../../rules-grading.mjs'

const FILE = 'src/loops.js'

/** The cases, then one detail on how the function is written when every case could run. */
async function withLoop(t, fn, list, loop) {
  const details = await calls(t, { file: FILE, fn, list })
  if ([`${FILE} runs`, 'Every call finishes'].includes(details[0].name)) return details
  const body = partOf(await readSource(t, FILE), fn)
  return [...details, shape(loop.name, loop.test.test(body), loop.message)]
}

function batchExplain(scent, count) {
  return (v) => {
    if (v.type !== 'string') return undefined
    if (v.value.startsWith(`${scent} 0`)) {
      return `The first label is number 0. Ines numbers a batch from 1, so the counter starts at 1.`
    }
    if (v.value.includes(`${scent} ${count + 1}`)) {
      return `The loop ran once too often: there is a label numbered ${count + 1}. Look at the condition that decides when the counter stops.`
    }
    if (v.value.endsWith(', ') || v.value.startsWith(', ')) {
      return `A comma and a space go between two labels, never before the first or after the last.`
    }
    return undefined
  }
}

export const checks = {
  batch(t) {
    return withLoop(
      t,
      'batchLine',
      [
        {
          name: 'Numbers a batch of four',
          expr: `batchLine('Amber', 4)`,
          expected: 'Amber 1, Amber 2, Amber 3, Amber 4',
          hint: 'Each label is the scent, a space and its number, from 1 up to count, with a comma and a space between labels.',
          explain: batchExplain('Amber', 4)
        },
        {
          name: 'A batch of one has one label',
          expr: `batchLine('Sage', 1)`,
          expected: 'Sage 1',
          hint: 'A batch of one has a single label and no comma.',
          explain: batchExplain('Sage', 1)
        },
        {
          name: 'Numbers a batch of six',
          expr: `batchLine('Smoked pine', 6)`,
          expected:
            'Smoked pine 1, Smoked pine 2, Smoked pine 3, Smoked pine 4, Smoked pine 5, Smoked pine 6',
          hint: 'Build the line from scent and count, with one label for every number from 1 up to count.',
          explain: batchExplain('Smoked pine', 6)
        },
        {
          name: 'A batch of none is empty text',
          expr: `batchLine('Fig', 0)`,
          expected: '',
          hint: 'With a count of 0 the loop should not run at all, so the line stays empty text.'
        }
      ],
      {
        name: 'Uses a for loop with a counter',
        test: /\bfor\s*\([^)]*;[^)]*;/,
        message: 'The task asks for a for loop with a counter: for, then the start, the condition and the step in its round brackets.'
      }
    )
  },

  weeks(t) {
    return withLoop(
      t,
      'weeksToReach',
      [
        {
          name: 'Three orders a week reach twenty',
          expr: `weeksToReach(3, 20)`,
          expected: 3,
          hint: 'Each week the orders double, and the count of weeks goes up by one, until the orders reach the goal.'
        },
        {
          name: 'Already at the goal takes no weeks',
          expr: `weeksToReach(5, 5)`,
          expected: 0,
          hint: 'The orders already reach the goal, so no weeks are needed. "Reach goal or more" includes the equal case: look at the condition of your while.'
        },
        {
          name: 'One order a week reaches a thousand',
          expr: `weeksToReach(1, 1000)`,
          expected: 10,
          hint: 'Count one week for every doubling, and stop as soon as the orders reach the goal.'
        },
        {
          name: 'Seven orders a week reach eight',
          expr: `weeksToReach(7, 8)`,
          expected: 1,
          hint: 'One doubling is enough here. Count one week for every doubling.'
        },
        {
          name: 'Above the goal takes no weeks',
          expr: `weeksToReach(12, 9)`,
          expected: 0,
          hint: 'The orders are already above the goal, so the loop should not run at all.'
        }
      ],
      {
        name: 'Uses a while loop',
        test: /\bwhile\s*\(/,
        message: 'The task asks for a while loop: while, a condition in round brackets, and the code to repeat in braces.'
      }
    )
  },

  engraving(t) {
    const spaces = (message, cents) => (v) =>
      v.value === message.length * cents
        ? `engravingCents charged for the spaces too. Spaces are free, so only the other characters cost centsPerLetter.`
        : undefined
    return withLoop(
      t,
      'engravingCents',
      [
        {
          name: 'Two words with a space between',
          expr: `engravingCents('For Ada', 30)`,
          expected: 180,
          hint: 'Every character except a space costs centsPerLetter.',
          explain: spaces('For Ada', 30)
        },
        {
          name: 'A message with no spaces',
          expr: `engravingCents('Thanks', 55)`,
          expected: 330,
          hint: 'Every character costs centsPerLetter when there are no spaces. Use the two values engravingCents is given.'
        },
        {
          name: 'Only spaces cost nothing',
          expr: `engravingCents('   ', 40)`,
          expected: 0,
          hint: 'A message of only spaces is free.',
          explain: spaces('   ', 40)
        },
        {
          name: 'Several spaces in one message',
          expr: `engravingCents('A B C', 10)`,
          expected: 30,
          hint: 'Every character except a space costs centsPerLetter.',
          explain: spaces('A B C', 10)
        },
        {
          name: 'An empty message costs nothing',
          expr: `engravingCents('', 99)`,
          expected: 0,
          hint: 'An empty message has no characters, so the price stays 0.'
        }
      ],
      {
        name: 'Goes through the message with for...of',
        test: /\bfor\s*\(\s*(?:const|let)\s+[\w$]+\s+of\b/,
        message: 'The task asks you to go through the message with for...of: for (const character of message) { ... }, with a name of your choice.'
      }
    )
  },

  digit(t) {
    const text = (expr) => expr.match(/'(.*)'/)[1]
    const explain = (c) => (v) => {
      const digits = [...text(c.expr)].flatMap((ch, i) => ('0123456789'.includes(ch) ? [i] : []))
      if (digits.slice(1).includes(v.value)) {
        return 'firstDigitAt gave the position of a later digit, so the loop kept going after it found the first. Stop as soon as you find one, with return or break.'
      }
      if (v.value === -1 && digits[0] === 0) {
        return 'firstDigitAt missed a digit in the very first character. The first position is 0: look at where your loop starts.'
      }
      if (v.value === -1 && digits.length) {
        return 'firstDigitAt gave -1 though the text has a digit. Is -1 handed back before the loop has looked at every character?'
      }
      return undefined
    }
    return withLoop(
      t,
      'firstDigitAt',
      [
        {
          name: 'Finds a digit in the middle',
          expr: `firstDigitAt('Best of 2026')`,
          expected: 8,
          hint: 'Positions count from 0, like with slice. The answer is the position of the first character that is a digit.'
        },
        {
          name: 'No digit gives -1',
          expr: `firstDigitAt('Warm wishes')`,
          expected: -1,
          hint: 'When no character is a digit, the answer is -1, once every character has been looked at.'
        },
        {
          name: 'A digit at the very start is at 0',
          expr: `firstDigitAt('7 wicks')`,
          expected: 0,
          hint: 'The first character is at position 0. Look at where your loop starts.'
        },
        {
          name: 'Gives the first digit, not a later one',
          expr: `firstDigitAt('Room 12, door 4')`,
          expected: 5,
          hint: 'There are several digits here, and the answer is the position of the first one.'
        }
      ].map((c) => ({ ...c, explain: explain(c) })),
      {
        name: 'Uses a loop',
        test: /\b(?:for|while)\s*\(/,
        message: 'The task asks you to look through the text with a loop, for or while.'
      }
    )
  }
}
