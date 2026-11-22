import { codeOnly, fail, judge, line, numberLine } from '../../grading.mjs'

const FILE = 'src/ticket.cpp'

const ticket = (ticketNumber, customer, item, quote, keyPrice, promisedDays) => ({
  ticketNumber,
  customer,
  item,
  quote,
  keyPrice,
  promisedDays
})

const CASES = [
  ticket(3044, 'Barnaby Oakes', 'pocket watch', 120, 9.5, 3),
  ticket(518, 'Philippa Garrow', 'wall clock', 35.75, 12.5, 11),
  ticket(7, 'Leopold Thorne', 'cuckoo clock', 80, 20, 2)
]

const ticketLine = (g) => `Ticket ${g.ticketNumber}: ${g.item} for ${g.customer}`
const loose = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Where daysLeft is made and where it is printed, by line, in the code of the section. */
function daysLeftProblem(section) {
  const lines = section.code.split('\n')
  const made = lines.findIndex((l) => /\bint\s+daysLeft\b/.test(l))
  if (made === -1) return null
  const printed = lines.findIndex((l, i) => i >= made && /<<\s*daysLeft\b/.test(l))
  const withValue = /\bdaysLeft\s*(=(?!=)|\{)/.test(lines[made])
  const setBefore = lines
    .slice(made + 1, printed === -1 ? lines.length : printed)
    .some((l) => /^\s*daysLeft\s*=(?!=)/.test(l))
  if (withValue || setBefore) return null
  return fail(
    'daysLeft has a value before it is printed',
    'daysLeft is still made without a value, or gets it only after the line that prints it. Such a variable holds whatever was left in memory, so the program prints a different number each time. Give it its value on the line that makes it.',
    `line ${section.start + made + 1}: ${section.lines[made].trim()}`
  )
}

export const checks = {
  line(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      typed:
        'Check changed the ticket and your line stayed the same. Build it from the variables ticketNumber, item and customer, not from text you typed.',
      storyLines: [line('Ticket 2187: carriage clock for Edwina Sallow')],
      cases: CASES.map((g) => ({
        name: `Prints the line for ticket ${g.ticketNumber}`,
        given: g,
        lines: [line(ticketLine(g))],
        hint: ({ stdout }) =>
          stdout.split('\n').some((l) => loose(l) === loose(ticketLine(g)))
            ? 'Close. The pieces are all there, but a space or a capital letter is off. << puts nothing between the pieces, so the spaces go inside the quoted text.'
            : 'The ticket line is not there yet. Print Ticket, the ticket number, a colon, the item, for and the customer, in that order, with the words between them as text in double quotes.'
      }))
    })
  },

  where(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      vars: { bench: 'int', shelf: 'char' },
      source(section) {
        const code = section.code
        const fromVars = /<<\s*bench\b/.test(code) && /<<\s*shelf\b/.test(code)
        return fromVars
          ? null
          : fail(
              'Prints from the variables',
              'Task 2 asks you to print the bench and the shelf from the two variables you made, so the line changes when they do. Send bench and shelf to std::cout by their names.'
            )
      },
      cases: [
        {
          name: 'Makes bench and shelf and prints them',
          expect: { bench: 4, shelf: 'B' },
          lines: [line('Bench 4, shelf B')],
          hint: ({ reads }) =>
            reads.bench !== 4
              ? 'bench does not hold the number 4. A whole number is written without quotes.'
              : reads.shelf !== 'B'
                ? 'shelf does not hold the capital letter B. One character goes in single quotes.'
                : 'Both variables are right, but the printed line is not. Compare it with the task: the words and spaces go inside the quoted text.'
        }
      ]
    })
  },

  key(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      vars: { quote: 'double' },
      typed:
        'Check changed the ticket and quote stayed the same. Give quote its new value from the names quote and keyPrice, not from a number you typed.',
      source(section) {
        return /\b(?:double|float|int|auto)\s+quote\b/.test(section.code)
          ? fail(
              'Changes quote, does not make it again',
              'Task 3 makes quote a second time. quote already exists, above Task 1. To give it a new value, write its name, = and the value, with no type in front.'
            )
          : null
      },
      cases: CASES.map((g) => ({
        name: `Adds a key of ${g.keyPrice} to a quote of ${g.quote}`,
        given: g,
        expect: { quote: g.quote + g.keyPrice },
        lines: [numberLine('Quote: ', g.quote + g.keyPrice)],
        hint: ({ reads, stdout, section }) =>
          /\bquote\s*==/.test(section.code)
            ? 'quote still holds its old value. == compares two values and changes nothing; a single = gives a variable a new value.'
            : reads.quote === g.quote
            ? stdout.includes(`Quote: ${g.quote + g.keyPrice}`)
              ? 'The new quote is printed, but quote itself still holds the old value. Printing a sum does not change a variable: give quote its new value with =, then print quote.'
              : 'quote still holds its old value. Give it a new value with =: what it holds now plus keyPrice.'
            : Math.abs(reads.quote - (g.quote + g.keyPrice)) < 1e-9
              ? 'quote is right, but the printed line is not. Print Quote: and then quote.'
              : 'quote is not the old quote plus keyPrice here. Look at what you add on the right of the =.'
      }))
    })
  },

  days(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      vars: { daysLeft: 'int' },
      source: daysLeftProblem,
      typed:
        'Check changed the ticket and daysLeft stayed the same. Give it the value of promisedDays by that name, not a number you typed.',
      cases: CASES.map((g) => ({
        name: `daysLeft follows ${g.promisedDays} promised days`,
        given: g,
        expect: { daysLeft: g.promisedDays },
        lines: [line(`Ready in ${g.promisedDays} days`)],
        hint: ({ reads }) =>
          reads.daysLeft === g.promisedDays
            ? 'daysLeft is right, but the line that prints it is not as the starter had it. Put it back: Ready in, daysLeft, days.'
            : 'daysLeft does not hold the value of promisedDays here. Give it that value on the line that makes it.'
      }))
    })
  }
}
