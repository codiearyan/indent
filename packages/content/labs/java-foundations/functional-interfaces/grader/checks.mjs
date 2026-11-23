import { attempt, explainFunction, fail, isLambda, meets, outcomeCases, pass, ran, tasks } from '../../grading.mjs'

const FILE = 'TicketRules.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))

// Check's own functions remember whom they were asked about, in order, so a function that is never
// called, called twice or called on the wrong tickets is seen for what it is.
const OWN = `class CheckRule implements Predicate<Ticket> {
    final List<String> asked = new ArrayList<>();
    final int under;
    final String boat;
    CheckRule(int under, String boat) { this.under = under; this.boat = boat; }
    public boolean test(Ticket t) { asked.add(t.passenger()); return t.age() < under && (boat == null || t.boat().equals(boat)); }
}
class CheckFare implements Function<Ticket, Integer> {
    final List<String> asked = new ArrayList<>();
    public Integer apply(Ticket t) { asked.add(t.passenger()); return t.age() < 16 ? 3 : 6 + t.passenger().length() % 3; }
}
class CheckShows {
    static List<String> names(List<Ticket> list) { if (list == null) return null; List<String> out = new ArrayList<>(); for (Ticket t : list) out.add(t.passenger()); return out; }
    static List<Boolean> answers(Predicate<Ticket> rule, List<Ticket> list) { List<Boolean> out = new ArrayList<>(); for (Ticket t : list) out.add(rule.test(t)); return out; }
}`

const ticket = ([who, age, boat]) => `new Ticket("${who}", ${age}, "${boat}")`
const listOf = (ts) => `List.of(${ts.map(ticket).join(', ')})`
const fareOf = ([who, age]) => (age < 16 ? 3 : 6 + (who.length % 3))

const DAY = [['Ruairidh', 9, 'Godwit'], ['Mairead', 41, 'Sanderling'], ['Fionnlagh', 15, 'Godwit'], ['Kirsteen', 16, 'Godwit'], ['Dughall', 70, 'Sanderling'], ['Anndra', 4, 'Sanderling']]
const EVENING = [['Iseabail', 38, 'Godwit'], ['Uilleam', 11, 'Turnstone'], ['Lilias', 52, 'Godwit']]

/** A case of Task 1: keep with Check's own rule, on a list the caller reads again afterwards. */
function keepCase(name, ts, under, boat, make, hint) {
  const want = ts.filter(([, age, b]) => age < under && (boat === null || b === boat)).map(([w]) => w)
  return attempt({
    name,
    setup: [make === 'of' ? `List<Ticket> tickets = ${listOf(ts)};` : `List<Ticket> tickets = new ArrayList<>(${listOf(ts)});`, `CheckRule rule = new CheckRule(${under}, ${boat === null ? 'null' : `"${boat}"`});`],
    call: 'Desk.keep(tickets, rule)',
    type: 'List<Ticket>',
    after: { kept: 'CheckShows.names(got)', 'the rule was asked about': 'rule.asked', 'tickets afterwards': 'CheckShows.names(tickets)' },
    expected: { kept: want, 'the rule was asked about': ts.map(([w]) => w), 'tickets afterwards': ts.map(([w]) => w) },
    show: [make === 'of' ? `List<Ticket> tickets = ${listOf(ts)};` : `List<Ticket> tickets = new ArrayList<>(${listOf(ts)});`, `Predicate<Ticket> rule = ${boat === null ? `t -> t.age() < ${under}` : `t -> t.age() < ${under} && t.boat().equals("${boat}")`};`, 'List<Ticket> got = Desk.keep(tickets, rule);'].join('\n'),
    names: ts.map(([w]) => w),
    method: 'keep',
    fn: 'rule',
    other: ts.map(([w]) => w).filter((w) => !want.includes(w)),
    hint
  })
}

/** A case of Task 1: prices with Check's own fare. */
function pricesCase(name, ts, hint) {
  return attempt({
    name,
    setup: [`List<Ticket> tickets = new ArrayList<>(${listOf(ts)});`, 'CheckFare fare = new CheckFare();'],
    call: 'Desk.prices(tickets, fare)',
    type: 'List<Integer>',
    after: { 'the fare was asked about': 'fare.asked', 'tickets afterwards': 'CheckShows.names(tickets)' },
    expected: { got: ts.map(fareOf), 'the fare was asked about': ts.map(([w]) => w), 'tickets afterwards': ts.map(([w]) => w) },
    show: [`List<Ticket> tickets = new ArrayList<>(${listOf(ts)});`, 'Function<Ticket, Integer> fare = t -> ...; // a fare of Check\'s own', 'List<Integer> got = Desk.prices(tickets, fare);'].join('\n'),
    names: ts.map(([w]) => w),
    method: 'prices',
    fn: 'fare',
    hint
  })
}

const askedRead = (r) => (r.case.fn === 'rule' ? 'the rule was asked about' : 'the fare was asked about')

/** Mistakes about how a function handed in was called, shared by the cases of Task 1. */
const CALLS = [
  {
    when: (r, x) => !x && r.case.names?.length && items(r, askedRead(r))?.length === 0,
    hint: (r) => `${r.case.method} gives back a list without asking the ${r.case.fn} Check handed it about a single ticket. That ${r.case.fn} is what decides: ${r.case.method} should ask it once about each ticket.`
  },
  {
    when: (r, x) => !x && r.case.names && (items(r, askedRead(r)) ?? []).length > r.case.names.length,
    hint: (r) => `${r.case.method} asks the ${r.case.fn} about some tickets more than once. Ask it once about each ticket, and keep what it says if you need it again.`
  },
  {
    when: (r, x) => !x && r.case.names && (items(r, askedRead(r)) ?? []).length < r.case.names.length,
    hint: (r) => `${r.case.method} asks the ${r.case.fn} about some of the tickets only. Every ticket on the list should be asked about, once.`
  },
  {
    when: (r, x) => !x && r.case.names && !same(items(r, askedRead(r)), r.case.names),
    hint: (r) => `${r.case.method} asks the ${r.case.fn} about the tickets in another order than they came. Walk the list from the first ticket to the last.`
  },
  {
    when: (r, x) => !x && r.case.names && !same(items(r, 'tickets afterwards'), r.case.names),
    hint: (r) => `${r.case.method} changed the list of tickets it was handed. The task says tickets stays as it is: put what you give back in a new list.`
  },
  {
    when: (r, x) => !x && r.case.other && r.case.other.length && same(items(r, 'kept'), r.case.other),
    hint: 'keep gives back the tickets the rule says no to, and leaves out the ones it says yes to.'
  }
]

/** outcomeCases, with mistakes whose hint may depend on the run. */
function judgeCalls(mistakes) {
  return (runs, ctx) => {
    const details = outcomeCases({ file: FILE, explain: explainFunction, mistakes: [] })(runs, ctx)
    return details.map((d, i) => {
      if (d.passed) return d
      const r = runs[i]
      const m = mistakes.find((k) => k.when(r, thrown(r)))
      if (!m) return d
      return { ...d, message: typeof m.hint === 'function' ? m.hint(r) : m.hint }
    })
  }
}
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop() } : null)

// Four tickets that try every pair of answers of a child rule and a Godwit rule.
const PAIRS = [['Ealasaid', 8, 'Godwit'], ['Padruig', 44, 'Godwit'], ['Ciorstaidh', 13, 'Turnstone'], ['Ailig', 29, 'Turnstone']]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  tasks: {
    hand: {
      task: 1,
      stub: OWN,
      cases: [
        keepCase('keep gives back the tickets a rule says yes to', DAY, 16, null, 'array', 'keep should give back a new list of the tickets the rule says yes to, in the order they came.'),
        keepCase('keep with another rule, from a list made with List.of', DAY, 200, 'Sanderling', 'of', 'keep should give back the tickets the rule Check hands it says yes to, whatever the rule is.'),
        keepCase('keep when the rule says no to every ticket', EVENING, 3, null, 'array', 'When the rule says no to every ticket, keep should give back an empty list.'),
        keepCase('keep from no tickets at all', [], 16, null, 'array', 'From an empty list, keep should give back an empty list, and never ask the rule.'),
        pricesCase('prices gives back the fare of each ticket', DAY, 'prices should give back the fare of each ticket, in the order they came, from the fare Check hands it.'),
        pricesCase('prices for other tickets', EVENING, 'prices should give back the fare of each ticket, in the order they came.'),
        pricesCase('prices for no tickets at all', [], 'From an empty list, prices should give back an empty list.')
      ],
      judge: judgeCalls(CALLS)
    },

    combine: {
      task: 2,
      stub: OWN,
      cases: [
        attempt({
          name: 'both says yes only when both rules say yes',
          setup: [`List<Ticket> tickets = ${listOf(PAIRS)};`, 'CheckRule child = new CheckRule(16, null);', 'CheckRule godwit = new CheckRule(200, "Godwit");', 'Predicate<Ticket> got = null;'],
          call: 'got = RuleBook.both(child, godwit)',
          after: { answers: 'got == null ? null : CheckShows.answers(got, tickets)', 'first was asked about': 'child.asked', 'second was asked about': 'godwit.asked' },
          expected: { answers: [true, false, false, false], 'first was asked about': PAIRS.map(([w]) => w), 'second was asked about': ['Ealasaid', 'Ciorstaidh'] },
          show: [`List<Ticket> tickets = ${listOf(PAIRS)};`, 'Predicate<Ticket> child = t -> t.age() < 16;', 'Predicate<Ticket> godwit = t -> t.boat().equals("Godwit");', 'Predicate<Ticket> got = RuleBook.both(child, godwit);', '// then asks got about each ticket, in order'].join('\n'),
          kind: 'both',
          hint: 'both should give back a rule that says yes only when first and second both say yes, asking first, and asking second only when first said yes.'
        }),
        attempt({
          name: 'both with the rules the other way round',
          setup: [`List<Ticket> tickets = ${listOf(PAIRS)};`, 'CheckRule child = new CheckRule(16, null);', 'CheckRule godwit = new CheckRule(200, "Godwit");', 'Predicate<Ticket> got = null;'],
          call: 'got = RuleBook.both(godwit, child)',
          after: { answers: 'got == null ? null : CheckShows.answers(got, tickets)', 'first was asked about': 'godwit.asked', 'second was asked about': 'child.asked' },
          expected: { answers: [true, false, false, false], 'first was asked about': PAIRS.map(([w]) => w), 'second was asked about': ['Ealasaid', 'Padruig'] },
          show: [`List<Ticket> tickets = ${listOf(PAIRS)};`, 'Predicate<Ticket> child = t -> t.age() < 16;', 'Predicate<Ticket> godwit = t -> t.boat().equals("Godwit");', 'Predicate<Ticket> got = RuleBook.both(godwit, child);', '// then asks got about each ticket, in order'].join('\n'),
          kind: 'both',
          hint: 'both should ask first about every ticket, and second only about the tickets first said yes to.'
        }),
        attempt({
          name: 'withFee adds the fee to each fare',
          setup: ['CheckFare fare = new CheckFare();', `Ticket a = ${ticket(PAIRS[1])};`, `Ticket b = ${ticket(PAIRS[0])};`, 'Function<Ticket, Integer> got = null;'],
          call: 'got = RuleBook.withFee(fare, 2)',
          after: { 'asked before it was used': 'fare.asked.size()', 'got.apply(a)': 'got == null ? -1 : got.apply(a)', 'got.apply(b)': 'got == null ? -1 : got.apply(b)', 'the fare was asked about': 'fare.asked' },
          expected: { 'asked before it was used': 0, 'got.apply(a)': fareOf(PAIRS[1]) + 2, 'got.apply(b)': fareOf(PAIRS[0]) + 2, 'the fare was asked about': ['Padruig', 'Ealasaid'] },
          show: ['Function<Ticket, Integer> fare = t -> ...; // a fare of Check\'s own', `Ticket a = ${ticket(PAIRS[1])};`, `Ticket b = ${ticket(PAIRS[0])};`, 'Function<Ticket, Integer> got = RuleBook.withFee(fare, 2);', '// then got.apply(a) and got.apply(b)'].join('\n'),
          kind: 'fee',
          hint: 'withFee should give back a function that asks the fare about the ticket it is handed, once, and adds fee to what it says.'
        }),
        attempt({
          name: 'Two fees side by side',
          setup: ['CheckFare fare = new CheckFare();', `Ticket a = ${ticket(EVENING[0])};`, 'Function<Ticket, Integer> one = RuleBook.withFee(fare, 1);', 'Function<Ticket, Integer> got = null;'],
          call: 'got = RuleBook.withFee(fare, 5)',
          after: { 'one.apply(a)': 'one == null ? -1 : one.apply(a)', 'got.apply(a)': 'got == null ? -1 : got.apply(a)' },
          expected: { 'one.apply(a)': fareOf(EVENING[0]) + 1, 'got.apply(a)': fareOf(EVENING[0]) + 5 },
          show: ['Function<Ticket, Integer> fare = t -> ...; // a fare of Check\'s own', `Ticket a = ${ticket(EVENING[0])};`, 'Function<Ticket, Integer> one = RuleBook.withFee(fare, 1);', 'Function<Ticket, Integer> got = RuleBook.withFee(fare, 5);', '// then one.apply(a) and got.apply(a)'].join('\n'),
          kind: 'two',
          hint: 'Each function withFee gives back should keep its own fee: one made with 1 and one made with 5 add different amounts.'
        })
      ],
      judge: judgeCalls([
        {
          when: (r, x) => !x && r.case.kind === 'both' && same(items(r, 'answers'), [true, true, true, false]),
          hint: 'The rule both gives back says yes when either rule says yes. The task asks for yes only when both say yes.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'both' && same(items(r, 'answers'), r.case.expected.answers) && (items(r, 'first was asked about') ?? []).length < 4,
          hint: 'The answers are right, and the rules are asked the other way round: second about every ticket, first only about some. The task asks for first about every ticket, then second only about the tickets first said yes to.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'both' && same(items(r, 'answers'), r.case.expected.answers) && (items(r, 'second was asked about') ?? []).length === 4,
          hint: 'The answers are right, and second is asked about every ticket, even those first has already said no to. The task asks for a rule that stops at the first no, as && does.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'both' && same(items(r, 'answers'), r.case.expected.answers),
          hint: 'The answers are right, and the rules are asked in another order than the task says: first about every ticket, then second only about the tickets first said yes to.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'fee' && Number(value(r, 'asked before it was used')) > 0,
          hint: 'withFee asks the fare about something before the function it gives back is used. The fare should be asked only when that function is handed a ticket.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'fee' && (items(r, 'the fare was asked about') ?? []).length > 2,
          hint: 'The function withFee gives back asks the fare more than once for one ticket. Ask it once, and add the fee to what it says.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'two' && value(r, 'one.apply(a)') === value(r, 'got.apply(a)'),
          hint: 'The functions made with a fee of 1 and a fee of 5 give the same price, so they do not each keep their own fee. The lambda should read fee, the parameter of withFee.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'fee' && Number(value(r, 'got.apply(a)')) === fareOf(PAIRS[1]) + 4,
          hint: 'The fee is added twice. The function should give the fare plus fee, once.'
        }
      ])
    },

    references: {
      task: 3,
      cases: [
        {
          name: 'readNumber reads a whole number',
          code: ['Function<String, Integer> read = Shortcuts.readNumber();'],
          reads: { 'read.apply("12")': '(int) read.apply("12")', 'read.apply("307")': '(int) read.apply("307")', 'read.apply("0")': '(int) read.apply("0")' },
          expected: { 'read.apply("12")': 12, 'read.apply("307")': 307, 'read.apply("0")': 0 },
          hint: 'readNumber should give back a function that turns a whole number written as text into that number.'
        },
        {
          name: 'onList asks the list Check hands it',
          code: ['List<String> names = new ArrayList<>(List.of("Ealasaid", "Uilleam"));', 'Predicate<String> on = Shortcuts.onList(names);', 'boolean uilleam = on.test("Uilleam");', 'boolean lilias = on.test("Lilias");', 'names.add("Lilias");', 'boolean liliasLater = on.test("Lilias");'],
          reads: { uilleam: 'uilleam', lilias: 'lilias', liliasLater: 'liliasLater' },
          expected: { uilleam: true, lilias: false, liliasLater: true },
          kind: 'list',
          hint: 'onList should give back a rule that says yes for a name in names, asking names itself each time, so a name added later counts too.'
        },
        {
          name: 'onList with an empty list',
          code: ['Predicate<String> on = Shortcuts.onList(new ArrayList<>());'],
          reads: { 'on.test("Padruig")': 'on.test("Padruig")', 'on.test("")': 'on.test("")' },
          expected: { 'on.test("Padruig")': false, 'on.test("")': false },
          hint: 'With an empty list, the rule onList gives back should say no to every name.'
        },
        {
          name: 'passengerOf gives the passenger',
          code: ['Function<Ticket, String> who = Shortcuts.passengerOf();'],
          reads: { [`who.apply(${ticket(PAIRS[2])})`]: `who.apply(${ticket(PAIRS[2])})`, [`who.apply(${ticket(DAY[4])})`]: `who.apply(${ticket(DAY[4])})` },
          expected: { [`who.apply(${ticket(PAIRS[2])})`]: 'Ciorstaidh', [`who.apply(${ticket(DAY[4])})`]: 'Dughall' },
          hint: 'passengerOf should give back a function that gives the passenger of the ticket it is handed.'
        },
        {
          name: 'newList gives a new, empty list each time',
          code: ['Supplier<List<Ticket>> make = Shortcuts.newList();', 'List<Ticket> a = make.get();', 'List<Ticket> b = make.get();', `a.add(${ticket(EVENING[1])});`],
          reads: { 'a.size()': 'a.size()', 'b.size()': 'b.size()', 'a and b are two lists': 'a != b', 'a is an ArrayList': 'a instanceof ArrayList' },
          expected: { 'a.size()': 1, 'b.size()': 0, 'a and b are two lists': true, 'a is an ArrayList': true },
          kind: 'new',
          hint: 'newList should give back a supplier that makes a new, empty ArrayList each time it is asked.'
        },
        {
          name: 'Each is a method reference or a lambda',
          code: [],
          reads: {
            readNumber: isLambda('Shortcuts.readNumber()'),
            onList: isLambda('Shortcuts.onList(new ArrayList<>())'),
            passengerOf: isLambda('Shortcuts.passengerOf()'),
            newList: isLambda('Shortcuts.newList()')
          },
          kind: 'lambda'
        }
      ],
      judge: (runs) =>
        runs.map((r) => {
          const c = r.case
          if (c.kind === 'lambda') {
            const full = Object.keys(c.reads).filter((k) => value(r, k) !== 'true')
            if (!full.length) return pass(c.name, ran(r))
            return fail(c.name, `${full.join(' and ')} ${full.length > 1 ? 'give' : 'gives'} back an object made from a class written out in full, named or anonymous. The task asks for a method reference, which needs no class at all: the lesson shows the four kinds.`, ran(r))
          }
          if (meets(r)) return pass(c.name, ran(r))
          if (c.kind === 'list' && value(r, 'uilleam') === 'true' && value(r, 'lilias') === 'false' && value(r, 'liliasLater') === 'false')
            return fail(c.name, 'The rule onList gives back does not see a name added to names after it was made: it asks a copy, not names itself. The task asks for a rule that asks names each time.', ran(r))
          if (c.kind === 'new' && value(r, 'a and b are two lists') === 'false')
            return fail(c.name, 'newList gives back the same list each time it is asked, so a ticket added to one shows up in the next. Each get should make a new list.', ran(r))
          if (c.kind === 'new' && value(r, 'a is an ArrayList') === 'false')
            return fail(c.name, 'The list newList makes is not an ArrayList. The task asks for a new ArrayList each time.', ran(r))
          return fail(c.name, c.hint, ran(r))
        })
    }
  }
})
