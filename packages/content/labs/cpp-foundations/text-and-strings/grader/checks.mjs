import { fail, judge, line } from '../../grading.mjs'

const FILE = 'src/tags.cpp'

const clock = (firstName, lastName, item, ticketNumber) => ({ firstName, lastName, item, ticketNumber })

const CASES = [
  clock('Philippa', 'Garrow', 'wall clock', 518),
  clock('Leopold', 'Thorne', 'watch', 7),
  clock('Barnaby', 'Oakes', 'long case clock', 30412)
]


export const checks = {
  tag(t) {
    return judge(t, {
      file: FILE,
      task: 1,
      vars: { tagName: 'std::string' },
      typed:
        'Check changed the customer and tagName stayed the same. Build it from lastName and firstName, not from text you typed.',
      cases: CASES.map((g) => {
        const want = `${g.lastName}, ${g.firstName}`
        return {
          name: `The tag for ${g.firstName} ${g.lastName}`,
          given: g,
          expect: { tagName: want },
          lines: [line(`Name: ${want}`)],
          hint: ({ reads }) =>
            reads.tagName === want
              ? 'tagName is right, but the printed line is not. Print Name: and then tagName.'
              : reads.tagName?.replace(/[ ,]/g, '') === want.replace(/[ ,]/g, '')
                ? 'Close. Both names are there, in the right order, but the comma and the space between them are not as the task writes them. + joins texts with nothing in between.'
                : reads.tagName === `${g.firstName}, ${g.lastName}`
                  ? 'The names are the wrong way round. The tag starts with the last name.'
                  : 'tagName is not the last name, a comma and a space, then the first name. Join the three pieces with +.'
        }
      })
    })
  },

  width(t) {
    return judge(t, {
      file: FILE,
      task: 2,
      vars: { tagWidth: 'int' },
      source: (section) =>
        /\bsizeof\b/.test(section.code)
          ? fail(
              'Counts the characters',
              'sizeof gives the bytes a variable takes in memory, which is the same for every std::string. Ask the text itself how many characters it has.'
            )
          : null,
      typed:
        'Check changed the item and tagWidth stayed the same. Count the characters of item itself, not a number you counted by hand.',
      cases: CASES.map((g) => ({
        name: `The width for a ${g.item}`,
        given: g,
        expect: { tagWidth: g.item.length + 4 },
        lines: [line(`Width: ${g.item.length + 4}`)],
        hint: ({ reads }) =>
          reads.tagWidth === g.item.length
            ? 'tagWidth is the length of the item without the border. The border adds 2 characters on each side.'
            : reads.tagWidth === g.item.length + 4
              ? 'tagWidth is right, but the printed line is not. Print Width: and then tagWidth.'
              : 'tagWidth is not the number of characters in item plus 4. Spaces count as characters too.'
      }))
    })
  },

  code(t) {
    return judge(t, {
      file: FILE,
      task: 3,
      vars: { shelfCode: 'std::string' },
      typed:
        'Check changed the customer and the ticket, and shelfCode stayed the same. Build it from lastName and ticketNumber, not from text you typed.',
      cases: CASES.map((g) => {
        const want = `${g.lastName[0]}${g.ticketNumber}`
        return {
          name: `The code for ticket ${g.ticketNumber}`,
          given: g,
          expect: { shelfCode: want },
          lines: [line(`Code: ${want}`)],
          hint: ({ reads }) =>
            reads.shelfCode === want
              ? 'shelfCode is right, but the printed line is not. Print Code: and then shelfCode.'
              : reads.shelfCode?.endsWith(String(g.ticketNumber))
                ? 'The ticket number is there, but what comes before it is not the first letter of the last name. Positions in a text count from 0.'
                : reads.shelfCode?.startsWith(g.lastName[0])
                  ? 'The first letter is right, but the ticket number does not follow it. A number has to become text before it can be joined to text.'
                  : 'shelfCode is not the first letter of the last name followed by the ticket number.'
        }
      })
    })
  },

  short(t) {
    return judge(t, {
      file: FILE,
      task: 4,
      vars: { shortItem: 'std::string' },
      typed:
        'Check changed the item and shortItem stayed the same. Take it from item, not from text you typed.',
      cases: CASES.map((g) => {
        const want = g.item.slice(0, 8)
        return {
          name:
            g.item.length < 8 ? `A ${g.item} is short enough already` : `The first 8 characters of ${g.item}`,
          given: g,
          expect: { shortItem: want },
          lines: [line(`Item: ${want}`)],
          hint: ({ reads }) =>
            reads.shortItem === want
              ? 'shortItem is right, but the printed line is not. Print Item: and then shortItem.'
              : reads.shortItem === g.item.slice(8)
                ? 'shortItem is what comes after the first 8 characters, not the first 8. substr takes where to start and then how many characters.'
                : reads.shortItem === g.item.slice(1, 9)
                  ? 'shortItem starts one character too late. Positions in a text count from 0.'
                  : 'shortItem is not the first 8 characters of item.'
        }
      })
    })
  }
}

