import {
  codeOnly,
  fail,
  pass,
  printed,
  printsValue,
  setup,
  tasks,
  valueCases
} from '../../grading.mjs'

const typeHint = (name, type) => (got) =>
  got === 'String' && type !== 'String'
    ? `${name} holds text, not a number. Anything inside double quotes is text, even when it looks like a number: write the number without quotes, and make the variable with the type the task asks for.`
    : `${name} is made as ${/^[aeiou]/.test(got) ? 'an' : 'a'} ${got}, and the task asks for ${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}. The type is the word in front of the name, where the variable is made.`

const withPrint = (judge, name, message) => (runs) => {
  const details = judge(runs)
  return details.every((d) => d.passed) ? [...details, printsValue(runs, name, message)] : details
}

const seatsTyped =
  'Check changed the numbers on the clipboard and seatsLeft stayed the same. Build it on the names seats and boarded, not on a number you typed.'

export const checks = tasks({
  file: 'Clipboard.java',
  tasks: {
    crossing: {
      task: 1,
      cases: [{}],
      reads: ['crossing'],
      judge: withPrint(
        valueCases({
          name: 'crossing',
          type: 'String',
          typeHint: typeHint('crossing', 'String'),
          cases: [
            {
              name: 'crossing holds the name of the crossing',
              expected: () => 'Lanternquay to Corran',
              hint: 'crossing holds something else. Compare it with the task letter by letter: capital letters and spaces count.'
            }
          ]
        }),
        'crossing'
      )
    },

    'seats-left': {
      task: 2,
      cases: [{ given: { seats: 30, boarded: 7 } }, { given: { seats: 61, boarded: 20 } }],
      reads: ['seatsLeft'],
      judge: withPrint(
        valueCases({
          name: 'seatsLeft',
          type: 'int',
          typeHint: typeHint('seatsLeft', 'int'),
          typed:
            'Check changed seats and seatsLeft stayed the same. Build it on the name seats, not on a number you typed.',
          mistakes: [
            {
              value: (g) => g.seats - g.boarded,
              hint: 'seatsLeft already has the boarded passengers taken off. In Task 2 it starts at all the seats on the boat; Task 3 is where the passengers board.'
            }
          ],
          cases: [
            {
              name: 'Starts with the seats on the boat',
              expected: (g) => g.seats,
              hint: 'seatsLeft should start at the number of seats on the boat, the value of seats.'
            },
            {
              name: 'Follows a different boat',
              expected: (g) => g.seats,
              hint: 'Check changed seats and seatsLeft did not start at it.'
            }
          ]
        }),
        'seatsLeft'
      )
    },

    boarding: {
      task: 3,
      needs: [2],
      madeIn: { seatsLeft: 2 },
      cases: [
        { given: { seats: 30, boarded: 12 } },
        { given: { seats: 61, boarded: 61 } },
        { given: { seats: 40, boarded: 1 } }
      ],
      reads: ['seatsLeft'],
      judge: async (runs, { section }) => {
        const details = valueCases({
          name: 'seatsLeft',
          type: 'int',
          typeHint: typeHint('seatsLeft', 'int'),
          typed: seatsTyped,
          mistakes: [
            {
              value: (g) => g.seats - 15,
              hint: 'seatsLeft takes the same number away whoever boards. Use boarded, not a number you typed.'
            },
            {
              value: (g) => g.boarded - g.seats,
              hint: 'seatsLeft comes out below zero: the subtraction is the wrong way round. Start from the seats there are, and take away the passengers who boarded.'
            }
          ],
          cases: [
            {
              name: 'Takes the boarded passengers off the seats',
              expected: (g) => g.seats - g.boarded,
              hint: 'After boarding, seatsLeft should be the seats there were with the boarded passengers taken away.'
            },
            {
              name: 'Works when every seat is taken',
              expected: (g) => g.seats - g.boarded,
              hint: 'When everyone who boarded fills the boat, no seats are left. Check the sum you wrote for Task 3.'
            },
            {
              name: 'Works for another crossing',
              expected: (g) => g.seats - g.boarded,
              hint: 'After boarding, seatsLeft should be the seats there were with the boarded passengers taken away. Look at each name in your Task 3 line.'
            }
          ]
        })(runs)
        if (!details.every((d) => d.passed)) return details
        const changed = /(^|[;{}\s])seatsLeft\s*(-=|=(?!=))/.test(codeOnly(section))
        return [
          ...details,
          changed
            ? pass('Gives seatsLeft a new value under Task 3')
            : fail(
                'Gives seatsLeft a new value under Task 3',
                'Task 3 asks you to change the seatsLeft you already made, on a new line under // Task 3, with = and no type in front.'
              ),
          printsValue(
            runs,
            'seatsLeft',
            'seatsLeft is right, but the task also asks to print it again after the passengers board.'
          )
        ]
      }
    },

    fare: {
      task: 4,
      cases: [{}],
      reads: ['fare'],
      judge: withPrint(
        valueCases({
          name: 'fare',
          type: 'double',
          typeHint: (got) =>
            got === 'int' || got === 'long'
              ? `fare is made as ${got === 'int' ? 'an int' : 'a long'}, which holds whole numbers only, so the pence after the point are lost. The task asks for a double.`
              : typeHint('fare', 'double')(got),
          cases: [
            {
              name: 'fare holds the price of a single crossing',
              expected: () => 3.2,
              hint: 'fare holds a different number. Write the price as the task gives it, with a point, not a comma.'
            }
          ]
        }),
        'fare'
      )
    },

    names: {
      task: 5,
      cases: [{}],
      reads: ['skipper', 'boatName'],
      judge: ([run], { section }) => {
        const code = codeOnly(section)
        const left = ['a', 'b'].filter((n) => new RegExp(`(?<![\\w$.])${n}(?![\\w$])`).test(code))
        const holds = (n, v) => run.values[n]?.value === v
        const out = setup(run, ['skipper', 'boatName'])
        return [
          holds('skipper', 'Ossian')
            ? pass('skipper holds who skippers the boat', out)
            : fail(
                'skipper holds who skippers the boat',
                'skipper should keep the value a had. Rename the variable, not its value.',
                out
              ),
          holds('boatName', 'Linnet')
            ? pass('boatName holds the name of the boat', out)
            : fail(
                'boatName holds the name of the boat',
                'boatName should keep the value b had. Rename the variable, not its value.',
                out
              ),
          left.length === 0
            ? pass('a and b are gone')
            : fail(
                'a and b are gone',
                `${left.join(' and ')} still appears under // Task 5. Rename it everywhere it is used, rather than making new variables next to it.`
              ),
          run.lines.includes('Skipper: Ossian') &&
          run.lines.includes('Boat: Linnet') &&
          ['skipper', 'boatName'].every(
            (n) => (code.match(new RegExp(`(?<![\\w$.])${n}(?![\\w$])`, 'g')) ?? []).length >= 2
          )
            ? pass('Prints the same two lines as before', printed(run))
            : fail(
                'Prints the same two lines as before',
                'The two lines should print what they printed before the rename. Use the new names in them.',
                printed(run)
              )
        ]
      }
    }
  }
})
