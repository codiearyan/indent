import { behavior, prepare, types } from '../../grade.mjs'

async function grade(t, task, file, cases) {
  const dir = await prepare(t, task)
  const [run, typed] = await Promise.all([behavior(t, dir, cases), types(t, dir, file)])
  return [...run, ...typed]
}

const petra = { id: 'SW-0981', customer: 'Petra Lindqvist', priceCents: 6500 }
const june = { id: 'SW-0983', customer: 'June Ferreira', priceCents: 12000 }
const messy = [petra, { id: 'SW-0982', customer: 'Omar Haddad', priceCents: '35.00' }, null, 'SW-0984', [], june]

const quoteCase = (name, supplier, result, hint) => ({
  name,
  fn: 'quote',
  args: [supplier],
  expected: { result, isPromise: true, asked: ['chain-8s'] },
  setup: `getQuote('chain-8s', fetchPrice) where fetchPrice ${name[0].toLowerCase()}${name.slice(1)}`,
  hint
})

export const checks = {
  import(t) {
    return grade(t, 'import', 'src/import.ts', [
      {
        name: 'Accepts a valid record',
        fn: 'isBookingRecord',
        args: [petra],
        expected: true,
        setup: `isBookingRecord(${JSON.stringify(petra)})`,
        hint: 'A record with a string id, a string customer and a number priceCents is valid.'
      },
      {
        name: 'Rejects a price written as text',
        fn: 'isBookingRecord',
        args: [messy[1]],
        expected: false,
        setup: `isBookingRecord(${JSON.stringify(messy[1])})`,
        hint: 'Check the type of every member, not only that it exists.'
      },
      {
        name: 'Rejects null',
        fn: 'isBookingRecord',
        args: [null],
        expected: false,
        setup: 'isBookingRecord(null)',
        hint: "typeof null is 'object'. Make sure null is rejected before you look inside it."
      },
      {
        name: 'Rejects a record with a missing member',
        fn: 'isBookingRecord',
        args: [{ id: 'SW-0985', priceCents: 3500 }],
        expected: false,
        setup: "isBookingRecord({ id: 'SW-0985', priceCents: 3500 })",
        hint: 'A record without a customer is not valid.'
      },
      {
        name: 'Keeps only the valid rows',
        fn: 'readBookings',
        args: [JSON.stringify(messy)],
        expected: [petra, june],
        setup: `readBookings('${JSON.stringify(messy)}')`,
        hint: 'readBookings should return every row that passes isBookingRecord, in order, and skip the rest.'
      },
      {
        name: 'Rejects JSON that is not a list',
        fn: 'readBookings',
        args: [JSON.stringify({ bookings: [petra] })],
        throws: /array/i,
        setup: 'readBookings(\'{"bookings":[...]}\')',
        hint: "When the parsed JSON is not an array, throw an Error whose message mentions 'array'."
      }
    ])
  },

  errors(t) {
    const message = (name, kind, expected, setup, hint) => ({ name, fn: 'message', args: [kind], expected, setup, hint })
    return grade(t, 'errors', 'src/errors.ts', [
      message('Reads an Error', 'error', 'Disk full', "throw new Error('Disk full')", 'For an Error, return its message.'),
      message(
        'Reads a subclass of Error',
        'typeError',
        'price is not a number',
        "throw new TypeError('price is not a number')",
        'A TypeError is an Error too. instanceof covers subclasses.'
      ),
      message('Reads a thrown string', 'string', 'timeout', "throw 'timeout'", 'A thrown string is its own message.'),
      message(
        'Reads an object with a message',
        'object',
        'Rate limited',
        "throw { message: 'Rate limited', code: 429 }",
        'A plain object whose message is a string should give that message.'
      ),
      message(
        'Ignores a message that is not text',
        'objectNumberMessage',
        'Something went wrong',
        'throw { message: 404 }',
        "Only a message that is a string counts. Check its type, not only that it exists."
      ),
      message('Handles a number', 'number', 'Something went wrong', 'throw 42', "Anything else gives 'Something went wrong'."),
      message(
        'Handles null',
        'null',
        'Something went wrong',
        'throw null',
        "typeof null is 'object'. Make sure null gives 'Something went wrong' instead of crashing."
      ),
      message(
        'Handles undefined',
        'undefined',
        'Something went wrong',
        'throw undefined',
        "undefined gives 'Something went wrong'."
      ),
      {
        name: 'Names a missing part',
        fn: 'failure',
        args: ['partNotFound'],
        expected: 'Part not found: a 28-inch rim',
        setup: "throw new PartNotFoundError('a 28-inch rim')",
        hint: 'Narrow to PartNotFoundError first, then read its part.'
      },
      {
        name: 'Describes any other failure',
        fn: 'failure',
        args: ['object'],
        expected: 'Order failed: Rate limited',
        setup: "throw { message: 'Rate limited', code: 429 }",
        hint: "Anything that is not a PartNotFoundError reads 'Order failed: ' followed by errorMessage of it."
      },
      {
        name: 'Describes a plain Error',
        fn: 'failure',
        args: ['error'],
        expected: 'Order failed: Disk full',
        setup: "throw new Error('Disk full')",
        hint: "A plain Error is not a PartNotFoundError, so it gets the 'Order failed: ' wording."
      }
    ])
  },

  quotes(t) {
    return grade(t, 'quotes', 'src/quotes.ts', [
      quoteCase(
        'Resolves with a price',
        'price',
        { ok: true, value: 1899 },
        'A valid price should come back as { ok: true, value }. Make sure you pass the part id to fetchPrice.'
      ),
      quoteCase('Resolves with zero', 'free', { ok: true, value: 0 }, 'A price of 0 is valid. Be careful with checks that treat 0 as missing.'),
      quoteCase(
        'Resolves with a negative price',
        'negative',
        { ok: false, error: 'Invalid price' },
        "A negative price should give { ok: false, error: 'Invalid price' }."
      ),
      quoteCase(
        'Resolves with NaN',
        'notANumber',
        { ok: false, error: 'Invalid price' },
        "NaN is not a finite price, so it should give { ok: false, error: 'Invalid price' }."
      ),
      quoteCase(
        'Rejects with an Error',
        'rejectsError',
        { ok: false, error: 'Supplier offline' },
        "A rejection should not escape getQuote. Return { ok: false } with the Error's message."
      ),
      quoteCase(
        'Rejects with a string',
        'rejectsString',
        { ok: false, error: 'Supplier error' },
        "When the rejection is not an Error, the error should be 'Supplier error'."
      ),
      quoteCase(
        'Throws before returning a promise',
        'throwsAtOnce',
        { ok: false, error: 'Bad part id' },
        'fetchPrice can throw before it returns a promise. Make sure that call is inside your try block too.'
      ),
      {
        name: 'Unwraps a successful result',
        fn: 'unwrapOr',
        args: [{ ok: true, value: 1899 }, 0],
        expected: 1899,
        setup: 'unwrapOr({ ok: true, value: 1899 }, 0)',
        hint: 'A successful result gives its value.'
      },
      {
        name: 'Falls back on a failed result',
        fn: 'unwrapOr',
        args: [{ ok: false, error: 'Supplier offline' }, 0],
        expected: 0,
        setup: "unwrapOr({ ok: false, error: 'Supplier offline' }, 0)",
        hint: 'A failed result gives the fallback.'
      }
    ])
  }
}
