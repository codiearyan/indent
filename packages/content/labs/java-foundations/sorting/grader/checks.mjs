import { attempt, explainCollection, fail, outcomeCases, pass, ran, refusal, tasks } from '../../grading.mjs'

const FILE = 'Noticeboard.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const sign = (v) => (v === null ? null : Math.sign(Number(v)))

// Check's own helpers for Task 3: what a list holds, as short lines a person can read.
const SHOW = `class CheckShows {
    static List<String> tickets(List<Ticket> list) { List<String> out = new ArrayList<>(); for (Ticket t : list) out.add(t.serial() + " " + t.passenger()); return out; }
    static List<String> boats(List<Departure> list) { if (list == null) return null; List<String> out = new ArrayList<>(); for (Departure d : list) out.add(d.boat()); return out; }
}`

// Check's own Ticket and MostSeatsFirst for Task 3, so it is judged on its own lines.
const OWN = `record Ticket(long serial, String passenger) implements Comparable<Ticket> {
    public int compareTo(Ticket other) { int c = Long.compare(serial, other.serial); return c != 0 ? c : passenger.compareTo(other.passenger); }
}
class MostSeatsFirst implements Comparator<Departure> {
    public int compare(Departure a, Departure b) { int c = Integer.compare(b.seatsFree(), a.seatsFree()); return c != 0 ? c : Integer.compare(a.hour(), b.hour()); }
}`

const ticket = (v, serial, who) => `Ticket ${v} = new Ticket(${serial}L, new String("${who}"));`
const departure = (boat, hour, seats) => `new Departure("${boat}", ${hour}, ${seats})`
const plain = (code) => code.replace(/new String\(("[^"]*")\)/g, '$1')

/** A case that compares a pair both ways: `ab` and `ba` are the signs the task asks for. */
const pair = (name, code, [x, y], ab, ba, kind, hint) => ({
  name,
  code,
  show: code.map(plain).join('\n'),
  reads: { [x]: x, [y]: y },
  signs: { [x]: ab, [y]: ba },
  kind,
  hint
})

// Ticket serials whose right order differs from every near miss: reversed, the tie broken the
// other way, and the serials compared as text ("10000000000" comes before "950" as text).
const TICKETS = [[10000000000, 'Innes'], [950, 'Raonaid'], [9000000000, 'Murdo'], [950, 'Coinneach']]
const TICKETS_RIGHT = ['950 Coinneach', '950 Raonaid', '9000000000 Murdo', '10000000000 Innes']
const TICKETS_TEXT = ['10000000000 Innes', '9000000000 Murdo', '950 Coinneach', '950 Raonaid']

// Departures whose right order differs from fewest first, from the tie broken the other way, and
// from seats compared as text ("9" comes after "12" as text).
const DEPARTURES = [['Linnet', 13, 4], ['Gannet', 9, 12], ['Curlew', 9, 4], ['Plover', 11, 9], ['Skua', 8, 0]]
const DEPARTURES_RIGHT = ['Gannet', 'Plover', 'Curlew', 'Linnet', 'Skua']
const DEPARTURES_TEXT = ['Plover', 'Curlew', 'Linnet', 'Gannet', 'Skua']

/**
 * Judges a comparison task: each pair by the sign of what came back, then a sort by its order.
 * A failing case gets the first mistake that fits across every run, then its own hint.
 */
function signs(mistakes) {
  return (runs) =>
    runs.map((r) => {
      const c = r.case
      const ok = c.order
        ? same(items(r, 'order'), c.order)
        : Object.entries(c.signs).every(([k, s]) => sign(value(r, k)) === s)
      if (ok) return pass(c.name, ran(r))
      const mistake = mistakes.find((m) => m.when(r, runs))
      return fail(c.name, mistake?.hint ?? c.hint, ran(r))
    })
}

const of = (runs, kind) => runs.find((r) => r.case.kind === kind)
const flipped = (r) => r && Object.entries(r.case.signs).every(([k, s]) => sign(value(r, k)) === -s)
const right = (r) => r && Object.entries(r.case.signs).every(([k, s]) => sign(value(r, k)) === s)
const neverBelow = (all) => all.every((r) => !r.case.signs || Object.keys(r.case.signs).every((k) => sign(value(r, k)) !== -1))
const zero = (r) => r && Object.keys(r.case.signs).every((k) => sign(value(r, k)) === 0)

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  tasks: {
    ticket: {
      task: 1,
      stub: 'class CheckOrdered<T extends Comparable<T>> { }',
      cases: [
        pair('Puts the smaller serial first', [ticket('a', 4100000017, 'Innes'), ticket('b', 4100000023, 'Murdo'), 'Comparable<Ticket> c = a;', 'CheckOrdered<Ticket> ordered = null;'], ['a.compareTo(b)', 'b.compareTo(a)'], -1, 1, 'near', 'compareTo should give back a number below 0 when this ticket\'s serial is the smaller, and above 0 when it is the larger.'),
        pair('Orders serials far apart', [ticket('a', 1, 'Tormod'), ticket('b', 3000000000, 'Beathag')], ['a.compareTo(b)', 'b.compareTo(a)'], -1, 1, 'far', 'compareTo should put the smaller serial first however far apart the two serials are.'),
        pair('Gives back 0 for equal tickets', [ticket('a', 5000000001, 'Floraidh'), ticket('b', 5000000001, 'Floraidh')], ['a.compareTo(b)', 'b.compareTo(a)'], 0, 0, 'equal', 'Two tickets with the same serial and the same passenger are equal, and compareTo should give back 0 for them.'),
        pair('Orders the same serial by passenger', [ticket('a', 77, 'Oighrig'), ticket('b', 77, 'Alasdair')], ['a.compareTo(b)', 'b.compareTo(a)'], 1, -1, 'tie', 'Two tickets with the same serial should be in alphabetical order of their passengers.'),
        {
          name: 'Sorts a list of tickets',
          code: ['List<Ticket> list = new ArrayList<>();', ...TICKETS.map(([s, w]) => `list.add(new Ticket(${s}L, "${w}"));`), 'Collections.sort(list);', 'List<String> order = new ArrayList<>();', 'for (Ticket t : list) order.add(t.serial() + " " + t.passenger());'],
          show: ['List<Ticket> list = new ArrayList<>();', ...TICKETS.map(([s, w]) => `list.add(new Ticket(${s}L, "${w}"));`), 'Collections.sort(list);'].join('\n'),
          reads: { order: 'order' },
          order: TICKETS_RIGHT,
          kind: 'sort',
          hint: 'Sorted in their natural order, the tickets should go from the smallest serial to the largest, and the same serial in alphabetical order of the passengers.'
        }
      ],
      judge: signs([
        {
          when: (r) => r.case.kind === 'equal' && !zero(r),
          hint: 'compareTo does not give back 0 for two equal tickets. 0 is how compareTo says two things are level, and it should say so exactly when they are equal.'
        },
        {
          when: (r, all) => r.case.kind !== 'equal' && neverBelow(all),
          hint: 'compareTo never gives back a number below 0. Sorting needs three answers: below 0 when this ticket comes first, 0 when the two are equal, above 0 when it comes second.'
        },
        {
          when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'near')),
          hint: 'compareTo puts the larger serial first: the tickets would sort the wrong way round. A number below 0 means this ticket comes first.'
        },
        {
          when: (r, all) => r.case.kind === 'far' && right(of(all, 'near')),
          hint: 'compareTo is right for serials close together and wrong for serials far apart. Taking one serial from the other gives a difference that does not fit in an int when they are far apart, so its sign comes out wrong. The lesson shows a way to compare two numbers that never overflows.'
        },
        {
          when: (r) => r.case.kind === 'tie' && zero(r),
          hint: 'compareTo gives back 0 for two tickets with the same serial and different passengers, so it calls them level though they are not equal. The task gives a second rule for the same serial: the passengers in alphabetical order.'
        },
        {
          when: (r) => r.case.kind === 'tie' && flipped(r),
          hint: 'Two tickets with the same serial come out in reverse alphabetical order of their passengers.'
        },
        {
          when: (r) => r.case.kind === 'sort' && same(items(r, 'order'), TICKETS_TEXT),
          hint: 'The tickets sort as if their serials were text: as text, 10000000000 comes before 950, because 1 comes before 9. Compare the serials as numbers.'
        }
      ])
    },

    seats: {
      task: 2,
      stub: 'class CheckCompares<C extends Comparator<Departure>> { }',
      cases: [
        pair('Puts the departure with more seats first', ['Comparator<Departure> c = new MostSeatsFirst();', 'CheckCompares<MostSeatsFirst> compares = null;', `Departure a = ${departure('Gannet', 9, 12)};`, `Departure b = ${departure('Linnet', 11, 9)};`], ['c.compare(a, b)', 'c.compare(b, a)'], -1, 1, 'near', 'compare should give back a number below 0 when the first departure has more seats free, and above 0 when it has fewer.'),
        pair('Of the same seats, puts the earlier hour first', ['Comparator<Departure> c = new MostSeatsFirst();', `Departure a = ${departure('Curlew', 13, 6)};`, `Departure b = ${departure('Plover', 9, 6)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 1, -1, 'tie', 'Of two departures with the same seats free, the one that leaves at the earlier hour comes first.'),
        pair('Gives back 0 for the same seats and hour', ['Comparator<Departure> c = new MostSeatsFirst();', `Departure a = ${departure('Skua', 10, 3)};`, `Departure b = ${departure('Fulmar', 10, 3)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 0, 0, 'equal', 'Two departures with the same seats free and the same hour compare as 0, whatever their boats.'),
        {
          name: 'Sorts the day\'s departures',
          code: ['List<Departure> list = new ArrayList<>();', ...DEPARTURES.map((d) => `list.add(${departure(...d)});`), 'list.sort(new MostSeatsFirst());', 'List<String> order = new ArrayList<>();', 'for (Departure d : list) order.add(d.boat());'],
          show: ['List<Departure> list = new ArrayList<>();', ...DEPARTURES.map((d) => `list.add(${departure(...d)});`), 'list.sort(new MostSeatsFirst());'].join('\n'),
          reads: { order: 'order' },
          order: DEPARTURES_RIGHT,
          kind: 'sort',
          hint: 'Sorted with MostSeatsFirst, the departures should go from most seats free to fewest, and of the same seats, from the earlier hour to the later.'
        }
      ],
      judge: signs([
        {
          when: (r) => r.case.kind === 'equal' && !zero(r),
          hint: 'compare does not give back 0 for two departures with the same seats free and the same hour. The task leaves the boat out: those two are level.'
        },
        {
          when: (r, all) => r.case.kind !== 'equal' && neverBelow(all),
          hint: 'compare never gives back a number below 0. Sorting needs three answers: below 0 when the first comes first, 0 when the two are level, above 0 when the first comes second.'
        },
        {
          when: (r, all) => r.case.kind !== 'equal' && same(items(of(all, 'sort'), 'order'), DEPARTURES_TEXT),
          hint: 'compare treats the seats as text: as text, 9 comes after 12, because 9 comes after 1. Compare the seats as numbers.'
        },
        {
          when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'near')),
          hint: 'compare puts the departure with fewer seats first: the list would sort the wrong way round. A number below 0 means the first departure comes first, and the task asks for more seats first.'
        },
        {
          when: (r) => r.case.kind === 'tie' && zero(r),
          hint: 'compare gives back 0 for two departures with the same seats free and different hours, which leaves their order to chance. The task gives a second rule: the earlier hour first.'
        },
        {
          when: (r) => r.case.kind === 'tie' && flipped(r),
          hint: 'Of two departures with the same seats free, compare puts the later hour first. The task asks for the earlier one first.'
        }
      ])
    },

    board: {
      task: 3,
      stub: `${OWN}\n${SHOW}`,
      cases: [
        attempt({
          name: 'sortTickets sorts the caller\'s list',
          setup: ['List<Ticket> tickets = new ArrayList<>();', ...TICKETS.map(([s, w]) => `tickets.add(new Ticket(${s}L, "${w}"));`)],
          call: 'Board.sortTickets(tickets)',
          after: { tickets: 'CheckShows.tickets(tickets)' },
          expected: { tickets: TICKETS_RIGHT },
          hint: 'sortTickets should sort the list it is handed, the caller\'s own, in the tickets\' natural order.'
        }),
        attempt({
          name: 'sortTickets with no tickets',
          setup: ['List<Ticket> tickets = new ArrayList<>();'],
          call: 'Board.sortTickets(tickets)',
          after: { tickets: 'CheckShows.tickets(tickets)' },
          expected: { tickets: [] },
          hint: 'With no tickets, sortTickets should leave the empty list as it is.'
        }),
        {
          name: 'sortTickets is void',
          refuse: true,
          code: ['Object x = Board.sortTickets(new ArrayList<>());'],
          error: /void cannot be converted/,
          allowed: 'Check kept what sortTickets gives back, and Java let it: sortTickets gives something back. The task asks for a void method that sorts the caller\'s own list.',
          other: 'Check kept what sortTickets gives back, to see that it gives nothing, and Java refused it for another reason. Its message is below.'
        },
        attempt({
          name: 'forDesk gives back the departures with seats, most seats first',
          setup: ['List<Departure> today = new ArrayList<>();', ...DEPARTURES.map((d) => `today.add(${departure(...d)});`)],
          call: 'Board.forDesk(today)',
          type: 'List<Departure>',
          after: { 'its boats, in order': 'CheckShows.boats(got)', 'today\'s boats': 'CheckShows.boats(today)' },
          expected: { 'its boats, in order': DEPARTURES_RIGHT.slice(0, -1), 'today\'s boats': DEPARTURES.map((d) => d[0]) },
          mine: true,
          hint: 'forDesk should give back a new list of the departures with at least one seat free, most seats first, and leave today as it was.'
        }),
        attempt({
          name: 'forDesk from a list made with List.of',
          setup: [`List<Departure> today = List.of(${departure('Wigeon', 16, 0)}, ${departure('Scaup', 10, 2)}, ${departure('Pintail', 12, 7)});`],
          call: 'Board.forDesk(today)',
          type: 'List<Departure>',
          after: { 'its boats, in order': 'CheckShows.boats(got)' },
          expected: { 'its boats, in order': ['Pintail', 'Scaup'] },
          hint: 'forDesk should give back a new list, and leave today as it is: it may be a list made with List.of.'
        }),
        attempt({
          name: 'forDesk when every departure is full',
          setup: [`List<Departure> today = new ArrayList<>(List.of(${departure('Gadwall', 9, 0)}, ${departure('Shoveler', 14, 0)}));`],
          call: 'Board.forDesk(today)',
          type: 'List<Departure>',
          after: { 'its boats, in order': 'CheckShows.boats(got)' },
          expected: { 'its boats, in order': [] },
          hint: 'When every departure is full, forDesk should give back an empty list.'
        })
      ],
      judge: (runs, ctx) => [
        ...outcomeCases({
          file: FILE,
          explain: explainCollection,
          mistakes: [
            {
              when: (r, x) => x?.name === 'UnsupportedOperationException' && x.frames.some((f) => f.includes(`(${FILE}:`)),
              hint: 'forDesk changed today, a list made with List.of, which can never change. The task says today stays as it is: copy what you keep into a new list, and sort that.'
            },
            {
              when: (r, x) => x?.name === 'ClassCastException',
              hint: 'A list of departures was sorted by its natural order, and Departure has none: it does not implement Comparable. The desk\'s order is the one MostSeatsFirst gives.'
            },
            {
              when: (r, x) => !x && r.case.mine && !same(items(r, 'today\'s boats'), r.case.expected['today\'s boats']),
              hint: 'forDesk changed the caller\'s list today. The task says today stays as it is: put the departures you keep in a new list, and sort that.'
            },
            {
              when: (r, x) => !x && r.case.expected['its boats, in order'] && items(r, 'its boats, in order')?.length === r.case.expected['its boats, in order'].length + 1,
              hint: 'forDesk keeps a departure with no seats free. The desk\'s list holds only the departures with at least one seat.'
            },
            {
              when: (r, x) => !x && r.case.name.startsWith('sortTickets') && same(items(r, 'tickets'), TICKETS.map(([s, w]) => `${s} ${w}`)),
              hint: 'sortTickets leaves the list as it was. The task asks it to sort the caller\'s own list, not a copy.'
            }
          ]
        })(runs, ctx),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    }
  }
})
