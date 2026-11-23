import { attempt, explainFunction, outcomeCases, refusal, tasks } from '../../grading.mjs'

const FILE = 'QuayLists.java'
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

const SHOW = `class CheckShows {
    static List<String> quoted(List<String> list) { List<String> out = new ArrayList<>(); for (String s : list) out.add("\\"" + s + "\\""); return out; }
    static List<String> bookings(List<Booking> list) { List<String> out = new ArrayList<>(); for (Booking b : list) out.add(b.passenger() + " " + b.boat() + " " + b.seats()); return out; }
}`

const q = (names) => names.map((n) => `"${n}"`)
const javaList = (names) => `new ArrayList<>(List.of(${q(names).join(', ')}))`

/** A case of Task 1: names on a list of Check's own, read again afterwards. */
const tidy = (name, given, want, hint, extra) =>
  attempt({
    name,
    setup: [`List<String> names = ${javaList(given)};`],
    call: 'Tidy.names(names)',
    after: { 'names afterwards': 'CheckShows.quoted(names)' },
    expected: { 'names afterwards': q(want) },
    given,
    hint,
    ...extra
  })

const booking = ([who, boat, seats]) => `new Booking("${who}", "${boat}", ${seats})`
const bookingsOf = (list) => `List<Booking> bookings = List.of(${list.map(booking).join(', ')});`
const entries = (expr) => `${expr} == null ? null : new ArrayList<>(new TreeMap<>(${expr}).entrySet())`

const SAME = 'the same map as the right one'
const SORTED = 'its entries, by boat'

/** The map Task 2 asks for, as Java and as the sorted entries a person reads. */
function seatsMap(list) {
  const m = {}
  for (const [, boat, seats] of list) m[boat] = (m[boat] ?? 0) + seats
  return m
}
function groupsMap(list) {
  const m = {}
  for (const [who, boat] of list) (m[boat] ??= []).push(who)
  return m
}
const mapJava = (m, v) => `java.util.Map.of(${Object.entries(m).map(([k, x]) => `"${k}", ${v(x)}`).join(', ')})`
const sortedEntries = (m, v) => Object.keys(m).sort().map((k) => `${k}=${v(m[k])}`)

/** A case of Tasks 2 and 3: the map compared as a map, whatever order it keeps. */
function mapCase(name, call, type, list, m, v, show, hint, extra) {
  const c = attempt({
    name,
    setup: [bookingsOf(list)],
    call,
    type,
    after: { [SORTED]: entries('got'), 'bookings afterwards': 'CheckShows.bookings(bookings)' },
    expected: { [SAME]: true, 'bookings afterwards': list.map(([w, b, s]) => `${w} ${b} ${s}`) },
    list,
    want: sortedEntries(m, show),
    hint,
    ...extra
  })
  return { ...c, reads: { ...c.reads, [SAME]: `${mapJava(m, v)}.equals(got)` } }
}

const SEATS_A = [['Seonag', 'Godwit', 2], ['Lachlan', 'Turnstone', 5], ['Ewen', 'Godwit', 3], ['Dolina', 'Redshank', 1], ['Seumas', 'Godwit', 4], ['Iona', 'Turnstone', 2]]
const SEATS_B = [['Gormul', 'Pochard', 6]]
const GROUPS_A = [['Lilias', 'Sanderling'], ['Ailig', 'Dotterel'], ['Kirsteen', 'Sanderling'], ['Dughall', 'Sanderling'], ['Anndra', 'Dotterel'], ['Mairead', 'Garganey']].map(([w, b]) => [w, b, 1])
const GROUPS_B = [['Uilleam', 'Shag'], ['Ealasaid', 'Shag'], ['Padruig', 'Shag']].map(([w, b]) => [w, b, 2])

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  tasks: {
    tidy: {
      task: 1,
      stub: SHOW,
      cases: [
        tidy('Tidies a waiting list', ['  Seonag', '', 'lachlan ', '   ', 'Ewen', ' dolina '], ['dolina', 'Ewen', 'lachlan', 'Seonag'], 'names should take off the blank names, take the spaces off both ends of the others, and sort them in alphabetical order, taking no notice of capital letters.', { kind: 'main' }),
        tidy('Sorts names that differ only in capitals and spaces', ['iona', ' Gormul', 'Seumas', 'ailig  '], ['ailig', 'Gormul', 'iona', 'Seumas'], 'Sorted taking no notice of capital letters, a name with a small first letter goes where it would with a capital.', { kind: 'caps' }),
        tidy('A list of blank names only', ['', '    ', ' '], [], 'When every name is blank, names should leave the list empty.'),
        tidy('An empty list', [], [], 'With an empty list, names should leave it empty.'),
        {
          name: 'names is void',
          refuse: true,
          code: ['Object x = Tidy.names(new ArrayList<>());'],
          error: /void cannot be converted|'void' type not allowed here/,
          allowed: 'Check kept what names gives back, and Java let it: names gives something back. The task asks for a void method that changes the list it is handed.',
          other: 'Check kept what names gives back, to see that it gives nothing, and Java refused it for another reason. Its message is below.'
        }
      ],
      judge: (runs, ctx) => [
        ...outcomeCases({
          file: FILE,
          explain: explainFunction,
          mistakes: [
            {
              when: (r, x) => !x && r.case.given && same(items(r, 'names afterwards'), q(r.case.given)),
              hint: 'names leaves the list as it was. The task asks it to change the list it is handed, the caller\'s own: not a copy, and not by printing.'
            },
            {
              when: (r, x) => !x && r.case.kind === 'main' && (items(r, 'names afterwards') ?? []).some((n) => /^"\s*"$/.test(n)) && !(items(r, 'names afterwards') ?? []).some((n) => /^"\S+"$/.test(n)),
              hint: 'names keeps the blank names and takes off the others: the test that decides what comes off is the wrong way round.'
            },
            {
              when: (r, x) => !x && (items(r, 'names afterwards') ?? []).some((n) => /^"\s*"$/.test(n)),
              hint: 'A blank name is still on the list. Blank means empty, or only spaces: every one of them comes off.'
            },
            {
              when: (r, x) => !x && (items(r, 'names afterwards') ?? []).some((n) => /^"\s|\s"$/.test(n)),
              hint: 'A name still has spaces at one end. A String never changes: trim gives back a new one, and the list keeps the old one unless the new one is put in its place.'
            },
            {
              when: (r, x) => !x && r.case.kind && same(items(r, 'names afterwards'), q(sortedFirst(r.case.given))),
              hint: 'The names are right, in the wrong order: the list was sorted while the names still had their spaces, and a space sorts before every letter. Sort once the spaces are off.'
            },
            {
              when: (r, x) => !x && r.case.kind && same(items(r, 'names afterwards'), q(capsFirst(r.case.given))),
              hint: 'The names are right, in the wrong order. The task asks for alphabetical order taking no notice of capital letters: in Java\'s own order of text, every capital comes before every small letter.'
            },
            {
              when: (r, x) => !x && r.case.kind && same([...(items(r, 'names afterwards') ?? [])].sort(), [...r.case.expected['names afterwards']].sort()),
              hint: 'The names are right, in the wrong order. The task asks for alphabetical order taking no notice of capital letters.'
            }
          ]
        })(runs, ctx),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    },

    seats: {
      task: 2,
      stub: SHOW,
      cases: [
        mapCase('Adds up the seats of each boat', 'Seats.perBoat(bookings)', 'Map<String, Integer>', SEATS_A, seatsMap(SEATS_A), String, String, 'perBoat should give back a map from each boat to the seats of all its bookings added up.'),
        mapCase('One booking', 'Seats.perBoat(bookings)', 'Map<String, Integer>', SEATS_B, seatsMap(SEATS_B), String, String, 'With one booking, the map should hold its boat and its seats.'),
        mapCase('No bookings at all', 'Seats.perBoat(bookings)', 'Map<String, Integer>', [], {}, String, String, 'With no bookings, perBoat should give back an empty map.')
      ],
      judge: outcomeCases({
        file: FILE,
        explain: explainFunction,
        mistakes: [
          {
            when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
            hint: 'perBoat changes the list of bookings it was handed, a list made with List.of, which can never change. The task says bookings stays as it is.'
          },
          {
            when: (r, x) => x?.name === 'NullPointerException' && /Map\.get/.test(x.message ?? ''),
            hint: 'perBoat asked the map for the seats of a boat it had not seen yet, and get gave back null, which cannot become an int. The first booking of a boat has nothing in the map yet: the lesson shows the map methods that take care of that.'
          },
          {
            when: (r, x) => !x && same(items(r, SORTED), sortedEntries(lastSeats(r.case.list), String)) && !same(r.case.want, items(r, SORTED)),
            hint: 'Each boat holds the seats of its last booking only: every booking writes over what was there. The seats of every booking of a boat should be added up.'
          },
          {
            when: (r, x) => !x && same(items(r, SORTED), sortedEntries(countMap(r.case.list), String)) && !same(r.case.want, items(r, SORTED)),
            hint: 'Each boat holds the number of its bookings, not the seats booked. Add up the seats of each booking.'
          }
        ]
      })
    },

    groups: {
      task: 3,
      stub: SHOW,
      cases: [
        mapCase('Groups the passengers of each boat', 'Groups.passengersByBoat(bookings)', 'Map<String, List<String>>', GROUPS_A, groupsMap(GROUPS_A), (l) => `List.of(${q(l).join(', ')})`, (l) => `[${l.join(', ')}]`, 'passengersByBoat should give back a map from each boat to the passengers who booked it, in the order they booked.'),
        mapCase('Every booking on one boat', 'Groups.passengersByBoat(bookings)', 'Map<String, List<String>>', GROUPS_B, groupsMap(GROUPS_B), (l) => `List.of(${q(l).join(', ')})`, (l) => `[${l.join(', ')}]`, 'When every booking is on one boat, the map should hold that boat and every passenger, in the order they booked.'),
        mapCase('No bookings at all', 'Groups.passengersByBoat(bookings)', 'Map<String, List<String>>', [], {}, String, String, 'With no bookings, passengersByBoat should give back an empty map.')
      ],
      judge: outcomeCases({
        file: FILE,
        explain: explainFunction,
        mistakes: [
          {
            when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
            hint: 'passengersByBoat changes a list that can never change: the list of bookings it was handed, or a list made with List.of for a boat. A boat\'s list has to grow, so it needs to be an ArrayList, and bookings stays as it is.'
          },
          {
            when: (r, x) => x?.name === 'NullPointerException' && fromMine(x),
            hint: 'passengersByBoat asked the map for the list of a boat it had not seen yet, and got null, which has no add. The first booking of a boat needs a new list put in the map first: the lesson shows the map method that does it in one step.'
          },
          {
            when: (r, x) => !x && (items(r, SORTED) ?? []).length > 1 && new Set((items(r, SORTED) ?? []).map((e) => e.slice(e.indexOf('=')))).size === 1 && Object.keys(groupsMap(r.case.list)).length > 1,
            hint: 'Every boat holds the same list, with every passenger on it: one list is shared by all the boats. Each boat needs a list of its own, made the first time the boat is seen.'
          },
          {
            when: (r, x) => !x && same(items(r, SORTED), Object.keys(groupsMap(r.case.list)).sort().map((k) => `${k}=[${groupsMap(r.case.list)[k].at(-1)}]`)) && !same(r.case.want, items(r, SORTED)),
            hint: 'Each boat holds only its last passenger: a new list is put in the map for every booking, in place of the one already there. Make a boat\'s list only when the boat has none yet.'
          }
        ]
      })
    }
  }
})

function lastSeats(list) {
  const m = {}
  for (const [, boat, seats] of list) m[boat] = seats
  return m
}
function countMap(list) {
  const m = {}
  for (const [, boat] of list) m[boat] = (m[boat] ?? 0) + 1
  return m
}

// The orders two near misses of Task 1 give: sorted before trimming, and sorted with capitals counting.
const kept = (given) => given.filter((n) => n.trim() !== '')
const byLower = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0)
const sortedFirst = (given) => [...kept(given)].sort(byLower).map((n) => n.trim())
const capsFirst = (given) => kept(given).map((n) => n.trim()).sort()
