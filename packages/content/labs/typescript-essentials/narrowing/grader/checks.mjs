import { behavior, prepare, types } from '../../grade.mjs'

async function grade(t, task, file, cases) {
  const dir = await prepare(t, task)
  const [run, typed] = await Promise.all([behavior(t, dir, cases), types(t, dir, file)])
  return [...run, ...typed]
}

const customers = [
  { id: 1, name: 'Petra Lindqvist', nickname: 'Pet' },
  { id: 2, name: 'Omar Haddad', nickname: null },
  { id: 3, name: 'June Ferreira' },
  { id: 4, name: 'Ravi Menon', nickname: '   ' }
]

export const checks = {
  'to-cents'(t) {
    return grade(t, 'to-cents', 'src/price.ts', [
      {
        name: 'Turns a number of euros into cents',
        fn: 'toCents',
        args: [19.99],
        expected: 1999,
        setup: 'toCents(19.99)',
        hint: 'A number is euros. Multiply by 100 and round, since 19.99 * 100 is not exactly 1999 in floating point.'
      },
      {
        name: 'Turns typed text into cents',
        fn: 'toCents',
        args: [' 12.5 '],
        expected: 1250,
        setup: "toCents(' 12.5 ')",
        hint: 'Text should be trimmed before you read it, and one decimal is allowed.'
      },
      {
        name: 'Accepts whole euros as text',
        fn: 'toCents',
        args: ['40'],
        expected: 4000,
        setup: "toCents('40')",
        hint: 'The decimals are optional in the text form.'
      },
      {
        name: 'Rejects text that is not a price',
        fn: 'toCents',
        args: ['abc'],
        expected: null,
        setup: "toCents('abc')",
        hint: 'Text that is not a price should give null, not NaN or 0.'
      },
      {
        name: 'Rejects too many decimals',
        fn: 'toCents',
        args: ['12.345'],
        expected: null,
        setup: "toCents('12.345')",
        hint: 'Only one or two decimals are allowed in the text form. Check the pattern you accept.'
      },
      {
        name: 'Rejects a negative number',
        fn: 'toCents',
        args: [-3],
        expected: null,
        setup: 'toCents(-3)',
        hint: 'A negative number of euros should give null.'
      },
      {
        name: 'Rejects empty text',
        fn: 'toCents',
        args: ['  '],
        expected: null,
        setup: "toCents('  ')",
        hint: 'Text that is only spaces should give null. Number(\'\') is 0, which is a trap.'
      }
    ])
  },

  contact(t) {
    return grade(t, 'contact', 'src/contact.ts', [
      {
        name: 'Recognizes an email contact',
        fn: 'isEmailContact',
        args: [{ email: 'petra@example.com' }],
        expected: true,
        setup: "isEmailContact({ email: 'petra@example.com' })",
        hint: 'isEmailContact should return true when the contact has an email.'
      },
      {
        name: 'Recognizes a phone contact',
        fn: 'isEmailContact',
        args: [{ phone: '0612', textOk: true }],
        expected: false,
        setup: "isEmailContact({ phone: '0612', textOk: true })",
        hint: 'isEmailContact should return false for a phone contact.'
      },
      {
        name: 'Writes the email line',
        fn: 'contactLine',
        args: [{ email: 'petra@example.com' }],
        expected: 'Email petra@example.com',
        setup: "contactLine({ email: 'petra@example.com' })",
        hint: "An email contact should read 'Email ' followed by the address."
      },
      {
        name: 'Writes the text line',
        fn: 'contactLine',
        args: [{ phone: '0612 448 210', textOk: true }],
        expected: 'Text 0612 448 210',
        setup: "contactLine({ phone: '0612 448 210', textOk: true })",
        hint: "A phone contact that accepts texts should start with 'Text '."
      },
      {
        name: 'Writes the call line',
        fn: 'contactLine',
        args: [{ phone: '0612 448 211', textOk: false }],
        expected: 'Call 0612 448 211',
        setup: "contactLine({ phone: '0612 448 211', textOk: false })",
        hint: "A phone contact that does not accept texts should start with 'Call '."
      }
    ])
  },

  greeting(t) {
    return grade(t, 'greeting', 'src/greeting.ts', [
      {
        name: 'Finds a customer by id',
        fn: 'find',
        args: [customers, 3],
        expected: customers[2],
        setup: 'findCustomer(customers, 3)',
        hint: 'findCustomer should return the customer whose id matches.'
      },
      {
        name: 'Finds nobody for an unknown id',
        fn: 'find',
        args: [customers, 9],
        expected: 'undefined',
        setup: 'findCustomer(customers, 9) (shown as "undefined" when it returns undefined)',
        hint: 'With no match, findCustomer should return undefined, not null or an empty object.'
      },
      {
        name: 'Greets by nickname',
        fn: 'greeting',
        args: [customers, 1],
        expected: 'Hi Pet',
        setup: 'greeting(customers, 1), nickname is "Pet"',
        hint: 'A customer with a nickname should be greeted by it.'
      },
      {
        name: 'Falls back to the name when the nickname is null',
        fn: 'greeting',
        args: [customers, 2],
        expected: 'Hi Omar Haddad',
        setup: 'greeting(customers, 2), nickname is null',
        hint: "A null nickname means there is none. Make sure 'Hi null' can never come out."
      },
      {
        name: 'Falls back to the name when the nickname is missing',
        fn: 'greeting',
        args: [customers, 3],
        expected: 'Hi June Ferreira',
        setup: 'greeting(customers, 3), no nickname property',
        hint: 'A missing nickname is undefined. Use the name instead.'
      },
      {
        name: 'Falls back to the name when the nickname is blank',
        fn: 'greeting',
        args: [customers, 4],
        expected: 'Hi Ravi Menon',
        setup: "greeting(customers, 4), nickname is '   '",
        hint: 'A nickname made only of spaces does not count. Which operator treats an empty string as a value, and which does not?'
      },
      {
        name: 'Greets an unknown id politely',
        fn: 'greeting',
        args: [customers, 9],
        expected: 'Hi there',
        setup: 'greeting(customers, 9)',
        hint: "When no customer has the id, greeting should return 'Hi there' instead of throwing."
      }
    ])
  }
}
