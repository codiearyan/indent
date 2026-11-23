import { attempt, CHECK_LIST, explainFunction, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'HarbourOffice.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

// Every case hands over Check's own list, which refuses a loop, get, forEach or a copy, so only a
// stream can read it; `afterwards` opens it to read it back.
const OWN = `${CHECK_LIST}
class CheckRule implements Predicate<Booking> {
    final List<String> asked = new ArrayList<>();
    final int over;
    CheckRule(int over) { this.over = over; }
    public boolean test(Booking b) { asked.add(b.passenger()); return b.seats() > over; }
}
class CheckShows {
    static List<String> afterwards(List<Booking> list) { if (list instanceof CheckList<?> c) c.open = true; List<String> out = new ArrayList<>(); for (Booking b : list) out.add(b.passenger() + " " + b.boat() + " " + b.seats()); return out; }
    static List<String> bookings(List<Booking> list) { if (list == null) return null; List<String> out = new ArrayList<>(); for (Booking b : list) out.add(b.passenger() + " " + b.boat() + " " + b.seats()); return out; }
    static List<String> copy(List<String> list) { return new ArrayList<>(list); }
}`

const booking = ([who, boat, seats]) => `new Booking("${who}", "${boat}", ${seats})`
const show = (list) => list.map(([w, b, s]) => `${w} ${b} ${s}`)
const setupOf = (list) => [`CheckList<Booking> bookings = new CheckList<>(List.of(${list.map(booking).join(', ')}));`]
const shownSetup = (list) => `List<Booking> bookings = List.of(${list.map(booking).join(', ')});`

/** A case that calls one method on Check's own list and reads the list again afterwards. */
function streamCase({ name, list, call, type, method, expected = {}, after = {}, hint, ...extra }) {
  return attempt({
    name,
    setup: setupOf(list),
    call,
    type,
    after: { ...after, 'bookings the stream read': 'bookings.drawn', 'bookings afterwards': 'CheckShows.afterwards(bookings)' },
    expected: { ...expected, 'bookings afterwards': show(list) },
    show: `${shownSetup(list)}\n${type === 'void' ? '' : `${type} got = `}${call};`,
    method,
    list,
    hint,
    ...extra
  })
}

const LOOPS = {
  when: (r, x) => x?.name === 'LoopRefused',
  hint: (r, x) => `${r.case.method} reads the list item by item itself (${(x.message ?? '').replace("Check's list refuses ", '')}), where the task asks for one stream from the list to the answer. Check hands over a list of its own that refuses to be read any other way.`
}
const CHANGED = {
  when: (r, x) => !x && r.case.list && !same(items(r, 'bookings afterwards'), show(r.case.list)),
  hint: (r) => `${r.case.method} changed the list of bookings it was handed. The task says bookings stays as it is: a stream never changes its source, so let the stream do the work.`
}
const IMMUTABLE = {
  when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
  hint: (r) => `${r.case.method} changes a list that can never change: a list a stream's toList gave back, or one made with List.of. A stream gives back what you ask for without changing anything.`
}
const nothingBack = (r) => ['got', 'the bookings it gave back'].some((n) => items(r, n)?.length === 0) || ['0', 'false'].includes(value(r, 'got'))
const UNREAD = {
  when: (r, x) => !x && Number(value(r, 'bookings the stream read')) === 0 && r.case.list?.length > 0 && !r.case.lazy && !nothingBack(r),
  hint: (r) => `${r.case.method} gives back an answer without reading the list Check hands it. The answer should come from bookings, whatever they are.`
}
const NOTHING_RAN = {
  when: (r, x) => !x && Number(value(r, 'bookings the stream read')) === 0 && r.case.list?.length > 0 && !r.case.lazy,
  hint: (r) => `${r.case.method} built a stream and its steps never ran: the stream read no booking at all. Nothing in a stream happens until an ending, such as toList or count, asks for an answer, and the answer the ending gives is what to give back.`
}

/** outcomeCases, with mistakes whose hint may depend on the run and on what was thrown. */
function judge(mistakes) {
  const all = [LOOPS, IMMUTABLE, CHANGED, UNREAD, ...mistakes, NOTHING_RAN]
  return (runs, ctx) => {
    const details = outcomeCases({ file: FILE, explain: explainFunction })(runs, ctx)
    return details.map((d, i) => {
      if (d.passed) return d
      const r = runs[i]
      const x = thrown(r)
      const m = all.find((k) => k.when(r, x))
      if (!m) return d
      return { ...d, message: typeof m.hint === 'function' ? m.hint(r, x) : m.hint }
    })
  }
}
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message'), frames: (value(r, 'thrown.frames') ?? '').slice(1, -1).split(', ') } : null)

// Bookings whose names on the Godwit, in alphabetical order, differ from the order they came,
// with a passenger booked twice on it and once on another boat.
const DAY = [['Lachlan', 'Godwit', 2], ['Ewen', 'Sanderling', 4], ['Seonag', 'Godwit', 1], ['Dolina', 'Godwit', 5], ['Lachlan', 'Godwit', 3], ['Iona', 'Sanderling', 2], ['Seonag', 'Sanderling', 1]]

const namesOn = (list, boat) => [...new Set(list.filter(([, b]) => b === boat).map(([w]) => w))].sort()
const countOn = (list, boat) => list.filter(([, b]) => b === boat).length

// Seats whose largest-first order differs from the order they came, from fewest first, and from
// sorting only the first few: the largest booking comes last. Two have 4 seats: the first stays first.
const PARTIES = [['Gormul', 'Pochard', 2], ['Ailig', 'Redshank', 4], ['Uilleam', 'Pochard', 1], ['Mairead', 'Garganey', 4], ['Anndra', 'Redshank', 3], ['Kirsteen', 'Pochard', 7]]
const largest = (list, n) => list.map((b, i) => [b, i]).sort((a, b) => b[0][2] - a[0][2] || a[1] - b[1]).slice(0, n).map(([b]) => b)

// For the stream that waits: who booked more than 1 seat comes 2nd and 4th, so two names need
// four bookings read, and the list holds six.
const QUEUE = [['Ealasaid', 'Shag', 1], ['Padruig', 'Shag', 3], ['Lilias', 'Turnstone', 1], ['Ciorstaidh', 'Shag', 2], ['Dughall', 'Turnstone', 5], ['Fionnlagh', 'Shag', 1]]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  tasks: {
    names: {
      task: 1,
      stub: OWN,
      cases: [
        streamCase({ name: 'namesOn names the passengers on one boat', list: DAY, call: 'Passengers.namesOn(bookings, "Godwit")', type: 'List<String>', method: 'namesOn', expected: { got: namesOn(DAY, 'Godwit') }, kind: 'names', boat: 'Godwit', hint: 'namesOn should give back the passengers booked on that boat, in alphabetical order, each name once.' }),
        streamCase({ name: 'namesOn for another boat', list: DAY, call: 'Passengers.namesOn(bookings, "Sanderling")', type: 'List<String>', method: 'namesOn', expected: { got: namesOn(DAY, 'Sanderling') }, kind: 'names', boat: 'Sanderling', hint: 'namesOn should give back the passengers of the boat Check names, whatever the boat.' }),
        streamCase({ name: 'namesOn for a boat nobody booked', list: DAY, call: 'Passengers.namesOn(bookings, "Smew")', type: 'List<String>', method: 'namesOn', expected: { got: [] }, hint: 'For a boat nobody booked, namesOn should give back an empty list.' }),
        streamCase({ name: 'namesOn with no bookings', list: [], call: 'Passengers.namesOn(bookings, "Godwit")', type: 'List<String>', method: 'namesOn', expected: { got: [] }, hint: 'With no bookings, namesOn should give back an empty list.' }),
        streamCase({ name: 'countOn counts the bookings on one boat', list: DAY, call: 'Passengers.countOn(bookings, "Godwit")', type: 'long', method: 'countOn', expected: { got: countOn(DAY, 'Godwit') }, kind: 'count', hint: 'countOn should give back how many bookings are on that boat: every booking counts, so a passenger who booked twice counts twice.' }),
        streamCase({ name: 'countOn for a boat nobody booked', list: DAY, call: 'Passengers.countOn(bookings, "Smew")', type: 'long', method: 'countOn', expected: { got: 0 }, hint: 'For a boat nobody booked, countOn should give back 0.' }),
        streamCase({ name: 'countOn with no bookings', list: [], call: 'Passengers.countOn(bookings, "Godwit")', type: 'long', method: 'countOn', expected: { got: 0 }, hint: 'With no bookings, countOn should give back 0.' })
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'names' && r.lines.some((l) => namesOn(DAY, r.case.boat).some((n) => l.includes(n))) && !same(items(r, 'got'), r.case.expected.got),
          hint: 'namesOn prints the names, and gives back something else. Check uses what a method gives back: the task asks for the names back, as a list.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'names' && (items(r, 'got') ?? []).length > r.case.expected.got.length && same([...new Set(items(r, 'got'))].sort(), r.case.expected.got),
          hint: 'A passenger who booked the boat twice is named twice. The task asks for each name once.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'names' && same([...(items(r, 'got') ?? [])].sort(), r.case.expected.got),
          hint: 'namesOn gives back the right names in the wrong order. The task asks for alphabetical order.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'count' && Number(value(r, 'got')) === namesOn(DAY, 'Godwit').length,
          hint: 'countOn counts the passengers, each once, and not the bookings. A passenger who booked the boat twice has two bookings.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'count' && Number(value(r, 'got')) === DAY.length,
          hint: 'countOn counts every booking of the day, whatever its boat. Only the bookings on the boat Check names count.'
        }
      ])
    },

    largest: {
      task: 2,
      stub: OWN,
      cases: [
        streamCase({ name: 'largest gives back the largest bookings, most first', list: PARTIES, call: 'Biggest.largest(bookings, 3)', type: 'List<Booking>', method: 'largest', after: { 'the bookings it gave back': 'CheckShows.bookings(got)' }, expected: { 'the bookings it gave back': show(largest(PARTIES, 3)) }, kind: 'largest', n: 3, hint: 'largest should give back the n bookings with most seats, most first, bookings with the same seats in the order they came.' }),
        streamCase({ name: 'largest when there are fewer bookings than asked', list: PARTIES, call: 'Biggest.largest(bookings, 10)', type: 'List<Booking>', method: 'largest', after: { 'the bookings it gave back': 'CheckShows.bookings(got)' }, expected: { 'the bookings it gave back': show(largest(PARTIES, 10)) }, kind: 'largest', n: 10, hint: 'When there are fewer bookings than n, largest should give back all of them, most seats first.' }),
        streamCase({ name: 'largest of none', list: PARTIES, call: 'Biggest.largest(bookings, 0)', type: 'List<Booking>', method: 'largest', after: { 'the bookings it gave back': 'CheckShows.bookings(got)' }, expected: { 'the bookings it gave back': [] }, hint: 'Asked for the 0 largest bookings, largest should give back an empty list.' }),
        streamCase({ name: 'largest with no bookings', list: [], call: 'Biggest.largest(bookings, 2)', type: 'List<Booking>', method: 'largest', after: { 'the bookings it gave back': 'CheckShows.bookings(got)' }, expected: { 'the bookings it gave back': [] }, hint: 'With no bookings, largest should give back an empty list.' }),
        streamCase({ name: 'anyOver finds a booking for more seats', list: PARTIES, call: 'Biggest.anyOver(bookings, 6)', type: 'boolean', method: 'anyOver', expected: { got: true }, kind: 'any', hint: 'anyOver should say yes when a booking is for more than seats seats.' }),
        streamCase({ name: 'anyOver when the largest is exactly that many', list: PARTIES, call: 'Biggest.anyOver(bookings, 7)', type: 'boolean', method: 'anyOver', expected: { got: false }, kind: 'edge', hint: 'More than 7 seats means 8 or more: a booking for exactly 7 does not count.' }),
        streamCase({ name: 'anyOver with no bookings', list: [], call: 'Biggest.anyOver(bookings, 0)', type: 'boolean', method: 'anyOver', expected: { got: false }, hint: 'With no bookings, anyOver should say no.' })
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'largest' && same(items(r, 'the bookings it gave back'), show(largest(PARTIES.slice(0, r.case.n), r.case.n))) && r.case.n < PARTIES.length,
          hint: 'largest takes the first n bookings and then puts them in order, so a large booking further down the list is never seen. Put the bookings in order first, then take the first n.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'largest' && same(items(r, 'the bookings it gave back'), show([...PARTIES].map((b, i) => [b, i]).sort((a, b) => a[0][2] - b[0][2] || a[1] - b[1]).slice(0, r.case.n).map(([b]) => b))),
          hint: 'largest gives back the smallest bookings, fewest seats first. The task asks for most seats first.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'largest' && same([...(items(r, 'the bookings it gave back') ?? [])].sort(), show(largest(PARTIES, r.case.n)).sort()) && !same(items(r, 'the bookings it gave back'), show(largest(PARTIES, r.case.n))),
          hint: 'largest gives back the right bookings in the wrong order: most seats first, and two with the same seats in the order they came.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'edge' && value(r, 'got') === 'true',
          hint: 'anyOver says yes for a booking of exactly that many seats. More than seats means that many plus one or more.'
        }
      ])
    },

    lazy: {
      task: 3,
      stub: OWN,
      cases: [
        streamCase({
          name: 'Nothing is asked until an answer is wanted, then no more than it needs',
          list: QUEUE,
          call: 'got = Later.namesWhere(bookings, rule)',
          type: 'void',
          method: 'namesWhere',
          lazy: true,
          after: {
            'the rule was asked about, before any answer': 'CheckShows.copy(rule.asked)',
            'the first two names': 'got == null ? null : got.limit(2).toList()',
            'the rule was asked about, once two names were found': 'rule.asked'
          },
          expected: { 'the rule was asked about, before any answer': [], 'the first two names': ['Padruig', 'Ciorstaidh'], 'the rule was asked about, once two names were found': ['Ealasaid', 'Padruig', 'Lilias', 'Ciorstaidh'] },
          kind: 'wait',
          hint: 'namesWhere should give back a stream whose steps have not run yet: the rule is asked nothing until an answer is wanted, and then only about as many bookings as that answer needs.'
        }),
        streamCase({
          name: 'Finished, it gives every name the rule says yes to',
          list: QUEUE,
          call: 'got = Later.namesWhere(bookings, rule)',
          type: 'void',
          method: 'namesWhere',
          lazy: true,
          after: { 'every name': 'got == null ? null : got.toList()', 'the rule was asked about': 'rule.asked' },
          expected: { 'every name': ['Padruig', 'Dughall'], 'the rule was asked about': QUEUE.map(([w]) => w) },
          rule: 2,
          kind: 'all',
          hint: 'Finished with toList, the stream should give the passengers of every booking the rule says yes to, in the order they came, the rule asked once about each booking.'
        }),
        streamCase({
          name: 'With no bookings',
          list: [],
          call: 'got = Later.namesWhere(bookings, rule)',
          type: 'void',
          method: 'namesWhere',
          lazy: true,
          after: { 'every name': 'got == null ? null : got.toList()' },
          expected: { 'every name': [] },
          hint: 'With no bookings, the stream should give no names.'
        })
      ].map((c) => ({ ...c, code: [c.code[0], `CheckRule rule = new CheckRule(${c.rule ?? 1});`, 'Stream<String> got = null;', ...c.code.slice(1)], show: c.show.replace('\ngot = ', `\nPredicate<Booking> rule = b -> b.seats() > ${c.rule ?? 1};\nStream<String> got = `) })),
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'wait' && (items(r, 'the rule was asked about, before any answer') ?? []).length > 0,
          hint: 'namesWhere asks the rule about bookings before anyone asks the stream for an answer: it finishes a stream itself, then hands over a new one. Give back the stream with its steps still waiting; whoever gets it decides when it runs.'
        },
        {
          when: (r, x) => !x && ['wait', 'all'].includes(r.case.kind) && hasRepeat(items(r, r.case.kind === 'wait' ? 'the rule was asked about, once two names were found' : 'the rule was asked about')),
          hint: 'The rule is asked about some bookings more than once. Each booking should be handed to the rule once.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'wait' && (items(r, 'the rule was asked about, once two names were found') ?? []).length > 4,
          hint: 'To find the first two names, the rule was asked about more bookings than they needed. A stream with only filter and map steps reads no further than its answer needs: a step that has to see everything first, such as sorted, makes it read the whole list.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'all' && same(items(r, 'every name'), r.case.expected['every name']) && (items(r, 'the rule was asked about') ?? []).length > QUEUE.length,
          hint: 'The names are right, and the rule is asked about some bookings more than once. Ask it once about each booking.'
        }
      ])
    }
  }
})

const hasRepeat = (list) => !!list && new Set(list).size < list.length
