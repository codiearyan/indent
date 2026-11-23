import { attempt, codeOnly, fail, outcome, outcomeCases, pass, refusal, tasks, thrownIn } from '../../grading.mjs'

const FILE = 'HutRules.java'
const MAIN = 'HutRules'
const value = (r, name) => r.values[name]?.value ?? null

// Check's own NoRoomException for Task 2, with words of its own, so an answer that reads the seats
// free from the message instead of the exception shows.
const OWN_NO_ROOM = `class NoRoomException extends Exception {
    private final int seatsFree;
    NoRoomException(String boat, int seatsFree) { super(boat + " is full, " + seatsFree + " to spare"); this.seatsFree = seatsFree; }
    int seatsFree() { return seatsFree; }
}`

/** Cases of Task 1: Check makes, throws and catches the learner's exception and reads it back. */
const made = (name, boat, free, code, hint) => ({
  name,
  code,
  reads: { 'getMessage()': 'message', 'seatsFree()': 'free' },
  boat,
  free,
  hint
})

/** Details for Task 1: the seats free read back, and a message that names the boat and the seats. */
function noRoom(runs) {
  return runs
    .filter((r) => !r.case.refuse)
    .map((r) => {
      const c = r.case
      const said = outcome(r, MAIN, Object.keys(c.reads))
      const message = value(r, 'getMessage()')
      const free = value(r, 'seatsFree()')
      const other = runs.find((o) => o.case.second)
      if (c.first && other && free === String(other.case.free))
        return fail(c.name, 'Check made two exceptions, and the first now says the second one\'s seats free. The seats free are shared by every NoRoomException: a field with static in front belongs to the class. Each needs its own.', said)
      if (free !== String(c.free)) return fail(c.name, `seatsFree() should give back the seats free that the exception was made with. ${c.hint}`, said)
      if (message === null)
        return fail(c.name, 'getMessage() gives back null: the message was never handed to Exception, which is where getMessage() finds it. The lesson shows how a constructor hands its message to its parent\'s.', said)
      if (!message.includes(c.boat) || !message.includes(String(c.free)))
        return fail(c.name, 'The message should name the boat and the seats free, so whoever reads it knows which boat and how many are left.', said)
      return pass(c.name, said)
    })
}

/** Mistakes of a method that throws or catches the learner's own exception. */
const wrongCatch = (method, what) => ({
  when: (r, x, runs, { section }) => r.case.throws === 'IllegalArgumentException' && !x && /\bcatch\s*\(\s*(?:Exception|Throwable|RuntimeException)\b/.test(codeOnly(section)),
  hint: `${method} catches every exception, so the IllegalArgumentException of a mistake in the calling code was caught too. Catch only ${what}, by its own name.`
})

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  tasks: {
    'no-room': {
      task: 1,
      cases: [
        made('Is an Exception with a message and the seats free', 'Curlew', 3, ['Exception e = new NoRoomException("Curlew", 3);', 'String message = e.getMessage();', 'int free = ((NoRoomException) e).seatsFree();'], 'Check made one for Curlew with 3 seats free.'),
        made('Can be thrown and caught by its own name', 'Dunlin', 0, ['String message = null;', 'int free = -1;', 'try { throw new NoRoomException("Dunlin", 0); } catch (NoRoomException e) { message = e.getMessage(); free = e.seatsFree(); }'], 'Check threw one for Dunlin with 0 seats free.'),
        { ...made('Each keeps its own seats free', 'Plover', 5, ['NoRoomException a = new NoRoomException("Plover", 5);', 'NoRoomException b = new NoRoomException("Scaup", 1);', 'String message = a.getMessage();', 'int free = a.seatsFree();'], 'Check made one for Plover with 5 seats free, then one for Scaup with 1.'), first: true },
        { ...made('The second one', 'Scaup', 1, ['NoRoomException a = new NoRoomException("Plover", 5);', 'NoRoomException b = new NoRoomException("Scaup", 1);', 'String message = b.getMessage();', 'int free = b.seatsFree();'], 'Check made one for Plover with 5 seats free, then one for Scaup with 1.'), second: true },
        {
          name: 'Is a checked exception',
          refuse: true,
          code: ['class Desk { void full() { throw new NoRoomException("Shoveler", 2); } }'],
          error: /^unreported exception NoRoomException; must be caught or declared to be thrown/,
          allowed: 'Check\'s own method threw a NoRoomException with no throws on its first line, and Java let it: NoRoomException is an unchecked exception. The task asks for a checked one, so every caller has to deal with a full boat: the class it extends decides which.',
          other: 'Check\'s own method threw a NoRoomException, and Java refused it for another reason than the task is about. Its message is below.'
        }
      ],
      judge: (runs, { section }) => [
        ...(/\bgetMessage\s*\(/.test(codeOnly(section))
          ? [fail('seatsFree() reads a field', 'seatsFree() picks the number out of the message. The message is for people; keep the seats free in a field of their own, set in the constructor, and give that back.')]
          : []),
        ...noRoom(runs),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    },

    booking: {
      task: 2,
      stub: OWN_NO_ROOM,
      cases: [
        attempt({ name: 'reserve books when there is room', call: 'Booking.reserve("Wigeon", 8, 3)', type: 'String', expected: { got: 'Booked 3 on Wigeon' }, hint: 'reserve should give back Booked, the places, on and the boat.' }),
        attempt({ name: 'reserve books the very last seats', call: 'Booking.reserve("Wigeon", 4, 4)', type: 'String', expected: { got: 'Booked 4 on Wigeon' }, hint: 'Asking for exactly the seats free should still book them.' }),
        attempt({ name: 'reserve throws NoRoomException when there is no room', setup: ['int left = -1;', 'try { Booking.reserve("Pintail", 2, 5); } catch (NoRoomException e) { left = e.seatsFree(); }'], call: 'Booking.reserve("Pintail", 2, 5)', type: 'String', after: { 'the seats free it holds': 'left' }, throws: 'NoRoomException', expected: { 'the seats free it holds': 2 }, hint: 'When more places are wanted than are free, reserve should throw a NoRoomException made with the seats free.', show: 'try {\n    Booking.reserve("Pintail", 2, 5);\n} catch (NoRoomException e) {\n    left = e.seatsFree();\n}' }),
        attempt({ name: 'reserve refuses fewer than 1 place', call: 'Booking.reserve("Wigeon", 8, 0)', type: 'String', throws: 'IllegalArgumentException', names: ['0'], hint: 'Fewer than 1 place should be refused with an IllegalArgumentException.', namesHint: 'reserve refuses with the right exception, and its message should name the places wanted.' }),
        {
          name: 'reserve says it may throw NoRoomException',
          refuse: true,
          code: ['String s = Booking.reserve("Gadwall", 3, 1);'],
          error: /^unreported exception NoRoomException; must be caught or declared to be thrown/,
          allowed: 'Check called reserve with no try around it, and Java let it: reserve does not say it may throw NoRoomException. A checked exception has to be named after throws on the first line of the method.',
          other: 'Check called reserve with no try around it, and Java refused it for another reason than the task is about. The task asks reserve to say it may throw NoRoomException, by its own name: the message below names what it says instead.'
        },
        {
          name: 'A caller of answer needs no try',
          code: ['String s = Booking.answer("Gadwall", 5, 2);'],
          reads: { s: 's' },
          after: { s: 's' },
          expected: { s: 'Booked 2 on Gadwall' },
          hint: 'Check called answer with no try around it, as the task says a caller can, and answer should give back what reserve gives back.'
        },
        attempt({ name: 'answer says how many are left', call: 'Booking.answer("Shoveler", 3, 7)', type: 'String', expected: { got: 'Only 3 left on Shoveler' }, hint: 'When there is no room, answer should give back Only, the seats free the exception holds, left on and the boat.', room: true }),
        attempt({ name: 'answer with no seats left at all', call: 'Booking.answer("Shoveler", 0, 1)', type: 'String', expected: { got: 'Only 0 left on Shoveler' }, hint: 'When there is no room, answer should give back Only, the seats free the exception holds, left on and the boat.', room: true }),
        attempt({ name: 'answer lets fewer than 1 place reach the caller', call: 'Booking.answer("Shoveler", 5, -2)', type: 'String', throws: 'IllegalArgumentException', names: ['-2'], hint: 'Fewer than 1 place is a mistake in the calling code: answer should let reserve\'s IllegalArgumentException reach its caller.' })
      ],
      judge: (runs, ctx) => [
        ...outcomeCases({
          file: FILE,
          mistakes: [
            wrongCatch('answer', 'the exception of a full boat'),
            {
              when: (r, x, runs, { section }) => r.case.room && /\bgetMessage\s*\(/.test(codeOnly(section)) && value(r, 'got') !== r.case.expected.got,
              hint: 'answer picks the seats free out of the exception\'s message. Check runs it beside a NoRoomException of its own, whose message uses other words, and the number is not where your code looks. Read the seats free from the exception\'s own method, seatsFree().'
            },
            {
              when: (r) => r.case.room && /is full|to spare/.test(value(r, 'got') ?? ''),
              hint: 'answer gives back words from the exception\'s message. The task asks for its own words, with the seats free read from the exception\'s own method.'
            }
          ]
        })(runs, ctx),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    },

    'bad-line': {
      task: 3,
      cases: [
        {
          name: 'BadLineException is an Exception that keeps its cause',
          code: ['RuntimeException why = new IllegalStateException("smudged");', 'Exception e = new BadLineException("08:00,Shoveler", why);', 'boolean kept = e.getCause() == why;', 'String message = e.getMessage();'],
          reads: { 'the cause it holds is the one handed over': 'kept', 'getMessage()': 'message' },
          after: { 'the cause it holds is the one handed over': 'kept', 'getMessage()': 'message' },
          expected: { 'the cause it holds is the one handed over': true },
          line: '08:00,Shoveler',
          hint: 'A BadLineException should keep the cause it is made with, and give it back from getCause().'
        },
        attempt({ name: 'seatsOn reads the seats', call: 'Lines.seatsOn("10:00,Curlew,4")', type: 'int', expected: { got: 4 }, hint: 'seatsOn should give back the seats, the third part of the line.' }),
        attempt({ name: 'seatsOn with seats that are not a number', call: 'Lines.seatsOn("12:00,Dunlin,four")', type: 'int', throws: 'BadLineException', names: ['12:00,Dunlin,four'], cause: 'NumberFormatException', hint: 'When the seats are not a whole number, seatsOn should throw a BadLineException.', namesHint: 'seatsOn throws a BadLineException, and its message should name the line, so whoever reads it can find the line in the ledger.' }),
        attempt({ name: 'seatsOn with no seats on the line', call: 'Lines.seatsOn("14:00,Scaup")', type: 'int', throws: 'BadLineException', names: ['14:00,Scaup'], cause: 'ArrayIndexOutOfBoundsException', hint: 'When the line has no third part, seatsOn should throw a BadLineException.', namesHint: 'seatsOn throws a BadLineException, and its message should name the line, so whoever reads it can find the line in the ledger.' }),
        attempt({ name: 'Caught by its own name', setup: ['String said = "nothing caught";', 'try { Lines.seatsOn("16:00,Shoveler,x"); } catch (BadLineException e) { said = e.getMessage(); }'], call: 'said', type: 'String', expected: {}, show: 'try {\n    Lines.seatsOn("16:00,Shoveler,x");\n} catch (BadLineException e) {\n    said = e.getMessage();\n}', hint: 'A caller of seatsOn should be able to catch BadLineException by its own name.' }),
        {
          name: 'seatsOn says it may throw BadLineException, a checked exception',
          refuse: true,
          code: ['int n = Lines.seatsOn("18:00,Shoveler,2");'],
          error: /^unreported exception BadLineException; must be caught or declared to be thrown/,
          allowed: 'Check called seatsOn with no try around it, and Java let it. The task asks for BadLineException to be a checked exception, which seatsOn names after throws on its first line, so every caller has to deal with a bad line: look at both.',
          other: 'Check called seatsOn with no try around it, and Java refused it for another reason than the task is about. The task asks seatsOn to say it may throw BadLineException, by its own name: the message below names what it says instead.'
        },
        attempt({ name: 'A null line reaches the caller as it is', call: 'Lines.seatsOn(null)', type: 'int', throws: 'NullPointerException', hint: 'A null line is a mistake in the calling code, and its exception should reach the caller as it is, not wrapped.' })
      ],
      judge: (runs, ctx) => {
        const details = outcomeCases({
          file: FILE,
          mistakes: [
            {
              when: (r, x) => r.case.throws === 'NullPointerException' && x?.name === 'BadLineException',
              hint: 'seatsOn wrapped the NullPointerException of a null line in a BadLineException. A null is a mistake in the calling code, not a bad line in the ledger: catch only the exceptions a bad line brings.'
            }
          ]
        })(runs, ctx)
        return details.map((d) => {
          const r = runs.find((x) => x.case.name === d.name)
          if (!d.passed || !r) return d
          if (r.case.line) {
            const m = value(r, 'getMessage()')
            return m && m.includes(r.case.line) ? d : fail(d.name, m === null ? 'getMessage() gives back null: the message was never handed to Exception, which is where getMessage() finds it.' : 'The message of a BadLineException should name the line it was made with.', d.output)
          }
          if (r.case.cause) {
            const x = thrownIn(r, MAIN)
            if (!x.cause) return fail(d.name, `The BadLineException holds no cause, so the ${r.case.cause} that Java threw is lost, and with it what was wrong with the line. Hand it to the BadLineException when you make it, and on to Exception.`, d.output)
            if (x.cause.name !== r.case.cause) return fail(d.name, `The cause of the BadLineException should be the exception Java threw when it read the line, and it is ${x.cause.type}.`, d.output)
          }
          if (r.case.name === 'Caught by its own name' && !/16:00,Shoveler,x/.test(value(r, 'got') ?? ''))
            return fail(d.name, 'Check caught a BadLineException from seatsOn by its name, and its message does not name the line.', d.output)
          return d
        }).concat(runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case)))
      }
    }
  }
})
