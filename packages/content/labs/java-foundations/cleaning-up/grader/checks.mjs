import { attempt, codeOnly, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'ClosingUp.java'

// Check's own shutter, printer and till, in place of the starter's: each writes what happened to
// it in a log Check reads, the printer runs out of paper or will not start when Check says, and the
// till refuses a fare below 0. A case is its own run, so the log and the settings start fresh.
const STAND_INS = `final class __IndentLog {
    static final java.util.ArrayList<String> said = new java.util.ArrayList<>();
    static void add(String what) { said.add(what); }
    static String text() { return String.join(", ", said); }
}
class Shutter {
    void raise() { __IndentLog.add("shutter up"); }
    void lower() { __IndentLog.add("shutter down"); }
}
class TicketPrinter implements AutoCloseable {
    static int paper = 50;
    static boolean broken = false;
    TicketPrinter(String where) {
        if (broken) { __IndentLog.add("printer would not start"); throw new IllegalStateException("The printer at " + where + " would not start"); }
        __IndentLog.add("printer on");
    }
    void print(String ticket) {
        if (ticket.isEmpty()) { __IndentLog.add("blank ticket"); throw new IllegalArgumentException("Nothing to print on a ticket"); }
        if (paper == 0) { __IndentLog.add("out of paper"); throw new IllegalStateException("Out of paper"); }
        paper--;
        __IndentLog.add("printed " + ticket);
    }
    @Override
    public void close() { __IndentLog.add("printer off"); }
}
class Till implements AutoCloseable {
    Till() { __IndentLog.add("till open"); }
    void add(int pence) {
        if (pence < 0) { __IndentLog.add("fare refused"); throw new IllegalArgumentException("A fare cannot be below 0: " + pence); }
        __IndentLog.add("till " + pence + "p");
    }
    @Override
    public void close() { __IndentLog.add("till shut"); }
}`

const LOG = 'what happened'
const log = (r) => r.values[LOG]?.value ?? ''
const count = (r, what) => log(r).split(', ').filter((x) => x === what).length
const finallyReturns = (section) => /\bfinally\s*\{[^{}]*\breturn\b/.test(codeOnly(section))

const happened = (c) => attempt({ ...c, after: { [LOG]: '__IndentLog.text()' } })

/** Mistakes every task here shares: a return in finally, a failure caught and kept back. */
const kept = (method) => [
  {
    when: (r, x, runs, { section }) => r.case.throws && !x && finallyReturns(section),
    hint: `${method} has a return inside finally. A return there runs even while an exception is on its way out, and throws the exception away, so the caller never hears that the printer failed. Clean up in finally, and give back the count from the try.`
  },
  {
    when: (r, x) => r.case.throws && !x,
    hint: `${method} caught the exception and carried on, so the caller never hears that something failed. Cleaning up does not need a catch: finally, or a try with resources, runs on the way out and lets the exception go on to the caller.`
  }
]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  tasks: {
    shutter: {
      task: 1,
      stub: STAND_INS,
      cases: [
        happened({ name: 'Raises, sells and lowers the shutter', setup: ['Shutter shutter = new Shutter();', 'TicketPrinter printer = new TicketPrinter("the pier");'], call: 'Hut.sell(shutter, printer, new String[] { "Plover", "Dunlin", "Scaup" })', type: 'int', expected: { got: 3, [LOG]: 'printer on, shutter up, printed Plover, printed Dunlin, printed Scaup, shutter down' }, hint: 'sell should raise the shutter, print each ticket, lower the shutter and give back how many it printed.' }),
        happened({ name: 'No tickets to sell', setup: ['Shutter shutter = new Shutter();', 'TicketPrinter printer = new TicketPrinter("the pier");'], call: 'Hut.sell(shutter, printer, new String[] { })', type: 'int', expected: { got: 0, [LOG]: 'printer on, shutter up, shutter down' }, hint: 'With no tickets, sell should still raise and lower the shutter, and give back 0.' }),
        happened({ name: 'The printer fails: the shutter still comes down', setup: ['TicketPrinter.paper = 1;', 'Shutter shutter = new Shutter();', 'TicketPrinter printer = new TicketPrinter("the pier");'], call: 'Hut.sell(shutter, printer, new String[] { "Plover", "Dunlin", "Scaup" })', type: 'int', throws: 'IllegalStateException', expected: { [LOG]: 'printer on, shutter up, printed Plover, out of paper, shutter down' }, hint: 'When the printer fails, its exception should reach the caller, and the shutter should still come down, once.', fails: true }),
        happened({ name: 'A blank ticket: the shutter still comes down', setup: ['Shutter shutter = new Shutter();', 'TicketPrinter printer = new TicketPrinter("the pier");'], call: 'Hut.sell(shutter, printer, new String[] { "Dunlin", "" })', type: 'int', throws: 'IllegalArgumentException', expected: { [LOG]: 'printer on, shutter up, printed Dunlin, blank ticket, shutter down' }, hint: 'Whatever the printer throws, its exception should reach the caller, and the shutter should still come down, once.', fails: true })
      ],
      judge: outcomeCases({
        file: FILE,
        mistakes: [
          ...kept('sell'),
          { when: (r) => count(r, 'shutter down') > 1, hint: 'sell lowers the shutter more than once. finally runs on every way out of the try, so the shutter needs lowering only there.' },
          { when: (r) => r.case.fails && count(r, 'shutter down') === 0, hint: 'When the printer failed, the shutter stayed up all night: the line that lowers it never ran. A line after the try is skipped when an exception leaves the try; finally is not.' },
          { when: (r) => count(r, 'printer off') > 0, hint: 'sell switches the printer off. The printer was handed to sell, so whoever handed it over switches it off when they are done with it.' }
        ]
      })
    },

    printer: {
      task: 2,
      stub: STAND_INS,
      cases: [
        happened({ name: 'Prints and switches the printer off', call: 'Day.printAll(new String[] { "Curlew", "Wigeon" })', type: 'int', expected: { got: 2, [LOG]: 'printer on, printed Curlew, printed Wigeon, printer off' }, hint: 'printAll should make a printer, print each ticket, switch the printer off and give back how many it printed.' }),
        happened({ name: 'No tickets', call: 'Day.printAll(new String[] { })', type: 'int', expected: { got: 0, [LOG]: 'printer on, printer off' }, hint: 'With no tickets, printAll should still switch its printer off, and give back 0.' }),
        happened({ name: 'Out of paper: the printer is still switched off', setup: ['TicketPrinter.paper = 1;'], call: 'Day.printAll(new String[] { "Curlew", "Wigeon", "Pintail" })', type: 'int', throws: 'IllegalStateException', expected: { [LOG]: 'printer on, printed Curlew, out of paper, printer off' }, hint: 'When the printer fails, its exception should reach the caller, and the printer should still be switched off, once.', fails: true }),
        happened({ name: 'A printer that will not start', setup: ['TicketPrinter.broken = true;'], call: 'Day.printAll(new String[] { "Curlew" })', type: 'int', throws: 'IllegalStateException', expected: { [LOG]: 'printer would not start' }, hint: 'When the printer will not start, its exception should reach the caller, and there is no printer to switch off.' }),
        happened({ name: 'A blank ticket: the printer is still switched off', call: 'Day.printAll(new String[] { "", "Curlew" })', type: 'int', throws: 'IllegalArgumentException', expected: { [LOG]: 'printer on, blank ticket, printer off' }, hint: 'Whatever the printer throws, its exception should reach the caller, and the printer should still be switched off, once.', fails: true })
      ],
      judge: outcomeCases({
        file: FILE,
        mistakes: [
          ...kept('printAll'),
          { when: (r) => count(r, 'printer off') > 1, hint: 'printAll switches the printer off twice. A try with resources already calls close() on the way out: a close() of your own as well is one too many.' },
          { when: (r) => r.case.fails && count(r, 'printer off') === 0 && count(r, 'printer on') > 0, hint: 'When the printer ran out of paper, it was never switched off: the line that closes it never ran. A close() after the loop is skipped when an exception leaves the loop; a try with resources closes it on every way out.' },
          { when: (r) => !r.case.fails && count(r, 'printer on') > 0 && count(r, 'printer off') === 0, hint: 'printAll never switches its printer off. A printer made in the round brackets of a try with resources is closed on every way out; one made anywhere else is not.' }
        ]
      })
    },

    till: {
      task: 3,
      stub: STAND_INS,
      cases: [
        happened({ name: 'Sells, then closes the printer and the till', call: 'Sale.sellAll(new String[] { "Gadwall", "Shoveler" }, new int[] { 320, 160 })', type: 'int', expected: { got: 480, [LOG]: 'till open, printer on, till 320p, printed Gadwall, till 160p, printed Shoveler, printer off, till shut' }, hint: 'sellAll should open the till, then the printer, add each fare and print each ticket, give back the pence added, then switch the printer off and shut the till.' }),
        happened({ name: 'A fare refused: both still closed, printer first', call: 'Sale.sellAll(new String[] { "Gadwall", "Shoveler", "Wigeon" }, new int[] { 320, -5, 160 })', type: 'int', throws: 'IllegalArgumentException', expected: { [LOG]: 'till open, printer on, till 320p, printed Gadwall, fare refused, printer off, till shut' }, hint: 'When the till refuses a fare, its exception should reach the caller, and the printer should be switched off and then the till shut, each once.', fails: true }),
        happened({ name: 'Out of paper: both still closed, printer first', setup: ['TicketPrinter.paper = 1;'], call: 'Sale.sellAll(new String[] { "Gadwall", "Shoveler" }, new int[] { 160, 160 })', type: 'int', throws: 'IllegalStateException', expected: { [LOG]: 'till open, printer on, till 160p, printed Gadwall, till 160p, out of paper, printer off, till shut' }, hint: 'When the printer fails, its exception should reach the caller, and the printer should be switched off and then the till shut, each once.', fails: true }),
        happened({ name: 'A printer that will not start: the till is still shut', setup: ['TicketPrinter.broken = true;'], call: 'Sale.sellAll(new String[] { "Gadwall" }, new int[] { 320 })', type: 'int', throws: 'IllegalStateException', expected: { [LOG]: 'till open, printer would not start, till shut' }, hint: 'When the printer will not start, its exception should reach the caller, and the till, already open, should still be shut.', fails: true })
      ],
      judge: outcomeCases({
        file: FILE,
        mistakes: [
          ...kept('sellAll'),
          { when: (r) => count(r, 'printer off') > 1 || count(r, 'till shut') > 1, hint: 'sellAll closes something twice. A try with resources already calls close() on each of its resources on the way out: a close() of your own as well is one too many.' },
          { when: (r) => /till shut.*printer off/.test(log(r)), hint: 'sellAll shuts the till before the printer is switched off. Things are closed in the opposite order to the one they were opened in: the printer, opened last, is closed first.' },
          { when: (r) => /^printer/.test(log(r)), hint: 'sellAll opens the printer before the till. The task opens the till first, then the printer: a try with resources opens them in the order they are written.' },
          { when: (r) => r.case.fails && (count(r, 'printer off') === 0 && count(r, 'printer on') > 0 || count(r, 'till shut') === 0), hint: 'When something failed, the printer or the till was left open: the line that closes it never ran. A close() after the loop is skipped when an exception leaves the loop; a try with resources closes each one on every way out.' }
        ]
      })
    }
  }
})
