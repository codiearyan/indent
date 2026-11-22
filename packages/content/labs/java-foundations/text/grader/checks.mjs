import { codeOnly, fail, pass, printed, tasks, valueCases } from '../../grading.mjs'

const a = (type) => (/^[aeiou]/.test(type) ? `an ${type}` : `a ${type}`)
const typeHint = (name, type) => (got) =>
  `${name} is made as ${a(got)}, and the task asks for ${a(type)}.`
const typed = (name) =>
  `Check changed the values on the clipboard and ${name} stayed the same. Build it on the names, not on a value you typed.`

const PREFIX = 'Passengers:'

export const checks = tasks({
  file: 'Tickets.java',
  tasks: {
    party: {
      task: 1,
      cases: [
        { given: { adults: 3, children: 4 } },
        { given: { adults: 1, children: 0 } },
        { given: { adults: 6, children: 6 } }
      ],
      judge: (runs) => {
        const found = runs.map((r) => r.lines.find((l) => l.trim().startsWith(PREFIX)))
        if (found.every((l) => l === undefined)) {
          return [
            fail(
              'Prints the party size',
              `No line starts with ${PREFIX} yet. Under // Task 1, print one line that starts with that word and a colon, as in the comment.`,
              printed(runs[0])
            )
          ]
        }
        const got = found.map((l) => l?.trim().slice(PREFIX.length).trim())
        const glued = runs.every((r, i) => got[i] === `${r.given.adults}${r.given.children}`)
        const stuck = got.every((g) => g === got[0])
        return runs.map((r, i) => {
          const want = String(r.given.adults + r.given.children)
          const name = `Prints the party for ${r.given.adults} adults and ${r.given.children} children`
          if (got[i] === want) return pass(name, printed(r))
          return fail(
            name,
            glued
              ? 'The two numbers come out glued together, like text. After a String, + joins: Java reads your line from the left, so each number is joined on as text. The lesson shows how to add the numbers first.'
              : stuck
                ? typed('the line')
                : got[i] === undefined
                  ? `No line starts with ${PREFIX} for this ticket.`
                  : 'The number after Passengers: should be the adults and the children together.',
            printed(r)
          )
        })
      }
    },

    code: {
      task: 2,
      cases: [
        { given: { destination: 'Fallowmere' } },
        { given: { destination: 'Mistlebank' } },
        { given: { destination: 'Ash' } }
      ],
      reads: ['code'],
      judge: valueCases({
        name: 'code',
        type: 'String',
        typeHint: (got) =>
          got === 'char'
            ? 'code is made as a char, which holds one character. The task asks for a String of three.'
            : typeHint('code', 'String')(got),
        typed: typed('code'),
        mistakes: [
          {
            value: (g) => g.destination.slice(0, 3),
            hint: 'code has the right letters, but not in capitals. The lesson shows the method that gives a capital copy.'
          },
          {
            value: (g) => g.destination.toUpperCase(),
            hint: 'code has the whole name in capitals. It should be the first three letters only.'
          },
          {
            value: (g) => g.destination.slice(1, 4).toUpperCase(),
            hint: 'code starts one letter too late. Positions in a String start at 0, not 1.'
          },
          {
            value: (g) => g.destination.slice(0, 2).toUpperCase(),
            hint: 'code has two letters. In substring, the second number is where the cut stops, and that position is not included.'
          }
        ],
        cases: [
          {
            name: 'Makes the code for a long name',
            expected: (g) => g.destination.slice(0, 3).toUpperCase(),
            hint: 'code should be the first three letters of destination, in capitals.'
          },
          {
            name: 'Makes the code for another name',
            expected: (g) => g.destination.slice(0, 3).toUpperCase(),
            hint: 'Check changed destination and code did not follow it.'
          },
          {
            name: 'Makes the code for a three letter name',
            expected: (g) => g.destination.slice(0, 3).toUpperCase(),
            hint: 'For a name of exactly three letters, the code is the whole name in capitals.'
          }
        ]
      })
    },

    'right-boat': {
      task: 3,
      cases: [
        { given: { ticket: 'Linnet 07:30 Corran', todayBoat: 'Linnet' } },
        { given: { ticket: 'Mayfly 08:00 Corran', todayBoat: 'Linnet' } },
        { given: { ticket: 'Kittiwake 09:15 Corran', todayBoat: 'Kittiwake' } }
      ],
      reads: ['rightBoat'],
      judge: (runs, { section }) => {
        const details = valueCases({
          name: 'rightBoat',
          type: 'boolean',
          typeHint: typeHint('rightBoat', 'boolean'),
          cases: [
            {
              name: "True when the ticket is for today's boat",
              expected: () => true,
              hint: "The ticket names today's boat, and rightBoat is false."
            },
            {
              name: 'False when the ticket is for another boat',
              expected: () => false,
              hint: 'The ticket names another boat, and rightBoat is true.'
            },
            {
              name: 'True for another boat and its own ticket',
              expected: () => true,
              hint: "The ticket names today's boat, and rightBoat is false."
            }
          ]
        })(runs)
        const usesEquals = /==/.test(codeOnly(section))
        if (usesEquals && !details.every((d) => d.passed)) {
          const message =
            'rightBoat says false even when the two names are the same text. == on two Strings asks whether they are the very same object, not whether they hold the same letters, and ticketBoat was cut out of the ticket, so it is a different object. The lesson shows how to compare the text.'
          return details.map((d) => (d.passed ? d : { ...d, message }))
        }
        return details
      }
    },

    'space-left': {
      task: 4,
      cases: [
        { given: { ticket: 'Kittiwake 09:15 Corran' } },
        { given: { ticket: 'Linnet 12:00 Ash' } },
        { given: { ticket: 'Mayfly 08:00 Mistlebank' } }
      ],
      reads: ['spaceLeft'],
      judge: valueCases({
        name: 'spaceLeft',
        type: 'int',
        typeHint: typeHint('spaceLeft', 'int'),
        typed: typed('spaceLeft'),
        mistakes: [
          {
            value: (g) => g.ticket.length,
            hint: 'spaceLeft is the length of the ticket. It should be what is left of the 24 characters after it.'
          },
          {
            value: (g) => g.ticket.length - 24,
            hint: 'spaceLeft comes out below zero: the subtraction is the wrong way round.'
          },
          {
            value: (g) => 24 - g.ticket.replaceAll(' ', '').length,
            hint: 'spaceLeft leaves out the spaces of the ticket. A space is a character too, and the printer needs room for it.'
          }
        ],
        cases: [
          {
            name: 'Counts the space left after a long ticket',
            expected: (g) => 24 - g.ticket.length,
            hint: 'spaceLeft should be 24 less the number of characters in ticket.'
          },
          {
            name: 'Counts the space left after a short ticket',
            expected: (g) => 24 - g.ticket.length,
            hint: 'Check changed ticket and spaceLeft did not follow it.'
          },
          {
            name: 'Counts the space left after another ticket',
            expected: (g) => 24 - g.ticket.length,
            hint: 'Check changed ticket and spaceLeft did not follow it.'
          }
        ]
      })
    }
  }
})
