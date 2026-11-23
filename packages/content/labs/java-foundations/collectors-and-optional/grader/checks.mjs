import { attempt, CHECK_LIST, explainFunction, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'SeasonReport.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

const OWN = `${CHECK_LIST}
class CheckShows {
    static List<String> afterwards(List<Booking> list) { if (list instanceof CheckList<?> c) c.open = true; List<String> out = new ArrayList<>(); for (Booking b : list) out.add(b.passenger() + " " + b.boat() + " " + b.seats()); return out; }
    static String found(Optional<Booking> o) { if (o == null) return "null, not an Optional"; return o.isPresent() ? "a booking: " + o.get().passenger() + " " + o.get().boat() + " " + o.get().seats() : "an empty Optional"; }
}`

const booking = ([who, boat, seats]) => `new Booking("${who}", "${boat}", ${seats})`
// Each boat's name is a text of its own in Check's setup, so == on two boats is false, as it is on real data.
const fresh = ([who, boat, seats]) => `new Booking("${who}", new String("${boat}"), ${seats})`
const show = (list) => list.map(([w, b, s]) => `${w} ${b} ${s}`)

/** A case on Check's own list, which only a stream can read, read again afterwards. */
function streamCase({ name, list, call, type, method, expected = {}, after = {}, hint, own = true, ...extra }) {
  const make = own ? `CheckList<Booking> bookings = new CheckList<>(List.of(${list.map(fresh).join(', ')}));` : `List<Booking> bookings = List.of(${list.map(fresh).join(', ')});`
  return attempt({
    name,
    setup: [make],
    call,
    type,
    after: { ...after, 'bookings afterwards': 'CheckShows.afterwards(bookings)' },
    expected: { ...expected, 'bookings afterwards': show(list) },
    show: `List<Booking> bookings = List.of(${list.map(booking).join(', ')});\n${type} got = ${call};`,
    method,
    list,
    hint,
    ...extra
  })
}

const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message'), frames: (value(r, 'thrown.frames') ?? '').slice(1, -1).split(', ') } : null)

const READS = { 'a loop': 'reads the list itself with a loop', get: 'reads the list itself with get', forEach: "reads the list itself with the list's forEach", 'a copy': 'copies the list', subList: 'reads part of the list with subList' }
const COMMON = [
  {
    when: (r, x) => x?.name === 'LoopRefused',
    hint: (r, x) => `${r.case.method} ${READS[(x.message ?? '').replace("Check's list refuses ", '')] ?? 'reads the list itself'}, where the task asks for one stream from the list to the answer. Check hands over a list of its own that refuses to be read any other way.`
  },
  {
    when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
    hint: (r) => `${r.case.method} changes a list that can never change. A stream gives back what you ask for without changing anything.`
  },
  {
    when: (r, x) => !x && r.case.list && !same(items(r, 'bookings afterwards'), show(r.case.list)),
    hint: (r) => `${r.case.method} changed the list of bookings it was handed. A stream never changes its source: let the stream do the work.`
  }
]

/** outcomeCases, with mistakes whose hint may depend on the run and on what was thrown. */
function judge(mistakes) {
  const all = [...COMMON, ...mistakes]
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainFunction })(runs, ctx).map((d, i) => {
      if (d.passed) return d
      const r = runs[i]
      const x = thrown(r)
      const m = all.find((k) => k.when(r, x))
      return m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r, x) : m.hint } : d
    })
}

// Seats whose average is not a whole number, so whole-number division shows.
const SEASON = [['Seonag', 'Godwit', 2], ['Lachlan', 'Turnstone', 3], ['Ewen', 'Godwit', 4], ['Dolina', 'Redshank', 4], ['Iona', 'Godwit', 1], ['Seumas', 'Turnstone', 1]]
const ONE = [['Gormul', 'Pochard', 5]]
const sum = (l) => l.reduce((a, [, , s]) => a + s, 0)

const counts = (l) => l.reduce((m, [, b]) => ({ ...m, [b]: (m[b] ?? 0) + 1 }), {})
const seatsPer = (l) => l.reduce((m, [, b, n]) => ({ ...m, [b]: (m[b] ?? 0) + n }), {})
const entries = (m) => Object.entries(m).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`)
const mapJava = (m) => `java.util.Map.of(${Object.entries(m).map(([k, v]) => `"${k}", ${v}L`).join(', ')})`
const SAME = 'the same map as the right one'
const SORTED = 'its entries, by boat'

/** A case of bookingsPerBoat: compared as a map, whatever order it keeps. */
function perBoat(name, list, hint) {
  const c = streamCase({ name, list, call: 'Season.bookingsPerBoat(bookings)', type: 'Map<String, Long>', method: 'bookingsPerBoat', after: { [SORTED]: 'got == null ? null : new ArrayList<>(new TreeMap<>(got).entrySet())' }, expected: { [SAME]: true }, kind: 'map', hint })
  return { ...c, reads: { ...c.reads, [SAME]: `${mapJava(counts(list))}.equals(got)` } }
}

// For Task 3: two bookings on the Godwit, the larger second; none on the Smew.
const LOOKUP = [['Ailig', 'Godwit', 2], ['Kirsteen', 'Sanderling', 6], ['Anndra', 'Godwit', 5], ['Mairead', 'Sanderling', 3], ['Uilleam', 'Godwit', 1]]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  tasks: {
    totals: {
      task: 1,
      stub: OWN,
      cases: [
        streamCase({ name: 'seats adds up every booking', list: SEASON, call: 'Totals.seats(bookings)', type: 'int', method: 'seats', expected: { got: sum(SEASON) }, hint: 'seats should give back the seats of every booking, added up.' }),
        streamCase({ name: 'seats with no bookings', list: [], call: 'Totals.seats(bookings)', type: 'int', method: 'seats', expected: { got: 0 }, hint: 'With no bookings, seats should give back 0.' }),
        streamCase({ name: 'average gives the seats of a booking on average', list: SEASON, call: 'Totals.average(bookings)', type: 'double', method: 'average', expected: { got: sum(SEASON) / SEASON.length }, kind: 'average', hint: 'average should give back all the seats divided by the number of bookings, with its fraction.' }),
        streamCase({ name: 'average of one booking', list: ONE, call: 'Totals.average(bookings)', type: 'double', method: 'average', expected: { got: 5 }, hint: 'The average of one booking is its seats.' }),
        streamCase({ name: 'average with no bookings', list: [], call: 'Totals.average(bookings)', type: 'double', method: 'average', expected: { got: 0 }, kind: 'empty', hint: 'With no bookings, average should give back 0.' }),
        streamCase({ name: 'most finds the largest booking', list: SEASON, call: 'Totals.most(bookings)', type: 'int', method: 'most', expected: { got: 4 }, hint: 'most should give back the most seats in one booking.' }),
        streamCase({ name: 'most with no bookings', list: [], call: 'Totals.most(bookings)', type: 'int', method: 'most', expected: { got: 0 }, kind: 'empty', hint: 'With no bookings, most should give back 0.' })
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'average' && Number(value(r, 'got')) === Math.floor(sum(SEASON) / SEASON.length),
          hint: 'average loses the fraction: dividing one whole number by another gives a whole number. The average of plain numbers comes from a stream of them with its fraction kept, as the lesson shows.'
        },
        {
          when: (r, x) => x?.name === 'NoSuchElementException',
          hint: (r) => `${r.case.method} asked for the value of an empty answer: with no bookings there is no ${r.case.method === 'most' ? 'largest' : 'average'}, and the box it comes in is empty. Say what to give back when it is empty instead of asking for a value that is not there.`
        },
        {
          when: (r, x) => x?.name === 'ArithmeticException' || (!x && r.case.kind === 'empty' && value(r, 'got') === 'NaN'),
          hint: (r) => `${r.case.method} divides by the number of bookings, and with none that is 0. A stream of numbers knows when it has no average, and says so.`
        }
      ])
    },

    groups: {
      task: 2,
      stub: OWN,
      cases: [
        perBoat('bookingsPerBoat counts the bookings of each boat', SEASON, 'bookingsPerBoat should give back a map from each boat to the number of its bookings.'),
        perBoat('bookingsPerBoat with one booking', ONE, 'With one booking, the map should hold its boat with 1.'),
        perBoat('bookingsPerBoat with no bookings', [], 'With no bookings, bookingsPerBoat should give back an empty map.'),
        streamCase({ name: 'namesLine writes the names in a line', list: SEASON, call: 'Season.namesLine(bookings)', type: 'String', method: 'namesLine', expected: { got: SEASON.map(([w]) => w).join(', ') }, kind: 'line', hint: 'namesLine should give back the passengers in the order they came, with a comma and a space between two names.' }),
        streamCase({ name: 'namesLine of one booking', list: ONE, call: 'Season.namesLine(bookings)', type: 'String', method: 'namesLine', expected: { got: 'Gormul' }, kind: 'line', hint: 'For one booking, namesLine should give back the one name, with nothing around it.' }),
        streamCase({ name: 'namesLine with no bookings', list: [], call: 'Season.namesLine(bookings)', type: 'String', method: 'namesLine', expected: { got: '' }, kind: 'line', hint: 'With no bookings, namesLine should give back an empty text.' })
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'line' && /, ?$/.test(value(r, 'got') ?? ''),
          hint: 'namesLine leaves a comma at the end. The comma and space go between two names only.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'line' && /^\[.*\]$/.test(value(r, 'got') ?? ''),
          hint: 'namesLine gives back the names as a list prints itself, in square brackets. The task asks for the names alone, with a comma and a space between two.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'line' && (value(r, 'got') ?? '').replace(/\s/g, '') === r.case.expected.got.replace(/\s/g, ''),
          hint: 'The names are right and in order, and what goes between them is not: a comma and one space.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'map' && items(r, SORTED)?.every((e) => e.endsWith('=1')) && Object.values(counts(r.case.list)).some((n) => n > 1),
          hint: 'Every boat counts 1, however many bookings it has. Each booking should add one to its boat\'s count.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'map' && same(items(r, SORTED), entries(seatsPer(r.case.list))) && !same(entries(seatsPer(r.case.list)), entries(counts(r.case.list))),
          hint: 'Each boat holds the seats of its bookings added up, not the number of bookings. Count the bookings: a booking of 4 seats counts once.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'line' && r.case.list.length > 1 && value(r, 'got') === r.case.list.map(([w]) => w).sort().join(', '),
          hint: 'namesLine puts the names in alphabetical order. The task asks for them in the order they came.'
        }
      ])
    },

    optional: {
      task: 3,
      stub: OWN,
      cases: [
        streamCase({ name: 'largestOn finds the largest booking on a boat', list: LOOKUP, own: false, call: 'Lookup.largestOn(bookings, "Godwit")', type: 'Optional<Booking>', method: 'largestOn', after: { found: 'CheckShows.found(got)' }, expected: { found: 'a booking: Anndra Godwit 5' }, hint: 'largestOn should give back the booking with most seats on that boat, in an Optional.' }),
        streamCase({ name: 'largestOn for another boat', list: LOOKUP, own: false, call: 'Lookup.largestOn(bookings, "Sanderling")', type: 'Optional<Booking>', method: 'largestOn', after: { found: 'CheckShows.found(got)' }, expected: { found: 'a booking: Kirsteen Sanderling 6' }, hint: 'largestOn should look only at the bookings on the boat Check names.' }),
        streamCase({ name: 'largestOn for a boat with no bookings', list: LOOKUP, own: false, call: 'Lookup.largestOn(bookings, "Smew")', type: 'Optional<Booking>', method: 'largestOn', after: { found: 'CheckShows.found(got)' }, expected: { found: 'an empty Optional' }, kind: 'none', hint: 'For a boat with no bookings, largestOn should give back an empty Optional.' }),
        streamCase({ name: 'largestOn with no bookings at all', list: [], own: false, call: 'Lookup.largestOn(bookings, "Godwit")', type: 'Optional<Booking>', method: 'largestOn', after: { found: 'CheckShows.found(got)' }, expected: { found: 'an empty Optional' }, kind: 'none', hint: 'With no bookings at all, largestOn should give back an empty Optional.' }),
        streamCase({ name: 'firstOn names the first passenger on a boat', list: LOOKUP, own: false, call: 'Lookup.firstOn(bookings, "Godwit")', type: 'String', method: 'firstOn', expected: { got: 'Ailig' }, hint: 'firstOn should give back the passenger of the first booking on that boat.' }),
        streamCase({ name: 'firstOn for another boat', list: LOOKUP, own: false, call: 'Lookup.firstOn(bookings, "Sanderling")', type: 'String', method: 'firstOn', expected: { got: 'Kirsteen' }, hint: 'firstOn should look only at the bookings on the boat Check names, and give back the first one\'s passenger.' }),
        streamCase({ name: 'firstOn for a boat with no bookings', list: LOOKUP, own: false, call: 'Lookup.firstOn(bookings, "Smew")', type: 'String', method: 'firstOn', expected: { got: 'nobody' }, kind: 'nobody', hint: 'For a boat with no bookings, firstOn should give back "nobody".' })
      ],
      judge: judge([
        {
          when: (r, x) => x?.name === 'NoSuchElementException',
          hint: (r) => `${r.case.method} asked an empty Optional for its value: the boat has no bookings, so there is no answer to take out. That is the old null mistake again. Say what happens when it is empty instead: ${r.case.method === 'largestOn' ? 'here the empty Optional itself is the answer' : 'here the answer is then "nobody"'}.`
        },
        {
          when: (r, x) => !x && r.case.kind === 'none' && value(r, 'found') === 'null, not an Optional',
          hint: 'largestOn gives back null for a boat with no bookings. The task asks for an empty Optional: an Optional is never null, it says there is no answer, and whoever gets it cannot forget to ask.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'nobody' && value(r, 'got') === null,
          hint: 'firstOn gives back null for a boat with no bookings. The task asks for "nobody" then.'
        },
        {
          when: (r, x) => x?.name === 'NullPointerException' && /Optional|Objects\.requireNonNull/.test(x.frames.join(' ')),
          hint: (r) => `${r.case.method} put null into an Optional with Optional.of, which refuses it. With no booking, the answer is an empty Optional, not an Optional of nothing.`
        },
        {
          when: (r, x) => !x && r.case.method === 'largestOn' && r.case.kind !== 'none' && /Godwit 2$|Sanderling 3$/.test(value(r, 'found') ?? ''),
          hint: 'largestOn gives back a booking with fewest seats on the boat. The task asks for the one with most.'
        },
        {
          when: (r, x) => !x && r.case.list.length > 0 && !['none', 'nobody'].includes(r.case.kind) && (value(r, 'found') === 'an empty Optional' || value(r, 'got') === 'nobody'),
          hint: (r) => `${r.case.method} finds no booking on a boat that has some. Look at how the boat is compared: two texts with the same letters are equal by equals, while == asks whether they are the very same object, as part 1 showed.`
        },
        {
          when: (r, x) => !x && r.case.method === 'largestOn' && /^a booking: /.test(value(r, 'found') ?? '') && value(r, 'found').split(' ')[3] !== /"(\w+)"\)$/.exec(r.case.call)?.[1],
          hint: 'largestOn gives back a booking on another boat than the one Check names. Look only at the bookings on that boat.'
        },
        {
          when: (r, x) => !x && r.case.method === 'firstOn' && value(r, 'got') === LOOKUP[0][0] && value(r, 'got') !== r.case.expected.got,
          hint: 'firstOn gives back the first passenger of the whole list, whatever the boat. Look only at the bookings on the boat Check names.'
        }
      ])
    }
  }
})
