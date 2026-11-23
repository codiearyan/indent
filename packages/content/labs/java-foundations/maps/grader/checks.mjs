import { attempt, codeOnly, explainCollection, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'Tally.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const halfEqual = (section) => /\bequals\s*\(/.test(codeOnly(section)) && !/\bhashCode\s*\(/.test(codeOnly(section))
const bothWritten = (section) => /\bequals\s*\(/.test(codeOnly(section)) && /\bhashCode\s*\(/.test(codeOnly(section))
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

// A map is judged as a map: Check builds the right one in Java and asks equals, which ignores
// order. What a person reads is the map's entries sorted by key, so it never depends on hash order.
const SAME = 'the same map as the right tally'
const SORTED = 'its entries, by boat'
const entries = (expr) => `${expr} == null ? null : new ArrayList<>(new TreeMap<>(${expr}).entrySet())`
const mapOf = (counts) => `java.util.Map.of(${Object.entries(counts).map(([k, v]) => `"${k}", ${v}`).join(', ')})`
const sortedEntries = (counts) => Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`)

/** A case of Task 1: byBoat on a list made with List.of, each name made separately, as names read
 * in would be, so == cannot pass for equals. */
function count(name, tickets, counts, extra) {
  const c = attempt({
    name,
    setup: [`List<String> tickets = List.of(${tickets.map((t) => `new String("${t}")`).join(', ')});`],
    call: 'Counts.byBoat(tickets)',
    show: [`List<String> tickets = List.of(${tickets.map((t) => `"${t}"`).join(', ')});`, 'Map<String, Integer> got = Counts.byBoat(tickets);'].join('\n'),
    type: 'Map<String, Integer>',
    after: { [SORTED]: entries('got') },
    expected: { [SAME]: true },
    counts,
    ...extra
  })
  return { ...c, reads: { ...c.reads, [SAME]: `${mapOf(counts)}.equals(got)` } }
}

/** A case of Task 2: lines on a map of the kind `make` names, filled in the order given. */
function report(name, make, counts, extra) {
  const fill = Object.entries(counts).map(([k, v]) => `counts.put("${k}", ${v});`)
  const lines = Object.keys(counts).sort().map((k) => `${k}: ${counts[k]}`)
  return attempt({
    name,
    setup: [`Map<String, Integer> counts = new ${make}<>();`, ...fill],
    call: 'Report.lines(counts)',
    type: 'List<String>',
    after: { 'counts, by boat': entries('counts') },
    expected: { got: lines, 'counts, by boat': sortedEntries(counts) },
    show: [`Map<String, Integer> counts = new ${make}<>();`, ...fill, 'List<String> got = Report.lines(counts);'].join('\n'),
    make,
    ...extra
  })
}

const BOOKED = [
  'Map<Sailing, Integer> booked = new HashMap<>();',
  'booked.put(new Sailing(new String("Gannet"), 9), 8);',
  'booked.put(new Sailing(new String("Gannet"), 14), 3);',
  'booked.put(new Sailing(new String("Linnet"), 9), 12);'
]

/** A case of Task 3: left asked about a sailing Check makes anew, as one read in would be. */
const lookup = (name, boat, hour, capacity, got, hint, extra) =>
  attempt({
    name,
    setup: BOOKED,
    call: `Seats.left(booked, new Sailing(new String("${boat}"), ${hour}), ${capacity})`,
    type: 'int',
    expected: { got },
    show: [...BOOKED.map((l) => l.replace(/new String\(("\w+")\)/, '$1')), `int got = Seats.left(booked, new Sailing("${boat}", ${hour}), ${capacity});`].join('\n'),
    lookup: true,
    hint,
    ...extra
  })

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  tasks: {
    count: {
      task: 1,
      cases: [
        count('Counts the tickets of each boat', ['Plover', 'Gannet', 'Plover', 'Linnet', 'Plover', 'Gannet'], { Plover: 3, Gannet: 2, Linnet: 1 }, { hint: 'byBoat should give back a map from each boat on the list to the number of its tickets.' }),
        count('Counts a boat with one ticket as 1', ['Dunlin', 'Scaup'], { Dunlin: 1, Scaup: 1 }, { hint: 'A boat with one ticket should count 1.' }),
        count('Counts many tickets of one boat', ['Curlew', 'Curlew', 'Curlew', 'Curlew'], { Curlew: 4 }, { hint: 'Every ticket of a boat should add one to its count.' }),
        count('No tickets at all', [], {}, { hint: 'With no tickets, byBoat should give back an empty map.' })
      ],
      judge: (runs, ctx) => outcomeCases({
        file: FILE,
        explain: explainCollection,
        mistakes: [
          {
            when: (r, x) => /containsValue/.test(codeOnly(ctx.section)),
            hint: 'containsValue looks among the values of the map, the counts, not among its keys. Whether a boat has been counted yet is a question about the keys.'
          },
          {
            when: (r, x) => x?.name === 'NullPointerException' && /Map\.get/.test(x.message ?? ''),
            hint: 'byBoat asked the map for the count of a boat it had not seen yet, and get gave back null, which cannot become an int. The first ticket of each boat has no count in the map yet: ask whether the key is there, or let the map give 0 for a missing key.'
          },
          {
            when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
            hint: 'byBoat changes the list of tickets it was handed, a list made with List.of, which can never change. The task says tickets stays as it is.'
          },
          {
            when: (r, x) => !x && items(r, SORTED)?.length && items(r, SORTED).every((e) => e.endsWith('=1')) && Object.values(r.case.counts).some((n) => n > 1) && /==/.test(codeOnly(ctx.section)),
            hint: 'Every boat counts 1, however many tickets it has. Check makes every name separately, as names read in would be, so == on two names asks whether they are the very same String object, and no two are. The map compares its keys with equals.'
          },
          {
            when: (r, x) => !x && items(r, SORTED)?.length && items(r, SORTED).every((e) => e.endsWith('=1')) && Object.values(r.case.counts).some((n) => n > 1),
            hint: 'Every boat counts 1, however many tickets it has. put gives a key a new value in place of the old one, so each ticket writes 1 over the count so far: read the count first, then put back one more.'
          },
          {
            when: (r, x) => !x && items(r, SORTED) && same(items(r, SORTED), Object.entries(r.case.counts).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v - 1}`)),
            hint: 'Every count is one short. The first ticket of a boat is a ticket too: a boat seen for the first time counts 1, not 0.'
          }
        ]
      })(runs, ctx)
    },

    report: {
      task: 2,
      cases: [
        report('Writes the lines in the order of the boats\' names, from a HashMap', 'HashMap', { Whimbrel: 2, Curlew: 5, Gannet: 1, Linnet: 7, Plover: 3 }, { hint: 'lines should give back one line per boat, as in Gannet: 3, in alphabetical order of the boats\' names.' }),
        report('From a map that keeps the order the boats went in', 'LinkedHashMap', { Skua: 4, Dunlin: 9, Pintail: 2, Fulmar: 6 }, { hint: 'lines should give back the lines in alphabetical order of the boats\' names, whatever order the map keeps them in.' }),
        report('From a HashMap of other boats', 'HashMap', { Shoveler: 6, Fulmar: 2, Wigeon: 9, Dunlin: 4, Gadwall: 1, Scaup: 3 }, { hint: 'lines should give back the lines in alphabetical order of the boats\' names, whatever order the map keeps them in.' }),
        report('One boat', 'HashMap', { Scaup: 11 }, { hint: 'For one boat, lines should give back one line, as in Gannet: 3.' }),
        report('No boats at all', 'HashMap', {}, { hint: 'With no boats, lines should give back an empty list.' })
      ],
      judge: outcomeCases({
        file: FILE,
        explain: explainCollection,
        mistakes: [
          {
            when: (r, x) => !x && !same(items(r, 'counts, by boat'), r.case.expected['counts, by boat']),
            hint: 'lines changed the map it was handed. The task says counts stays as it is: read it, and build the lines in a list of their own.'
          },
          {
            when: (r, x) => !x && items(r, 'got')?.length === r.case.expected.got.length && !same(items(r, 'got'), r.case.expected.got) && same([...items(r, 'got')].sort(), r.case.expected.got),
            hint: `lines writes the right lines in the wrong order: the order the map keeps them in. A HashMap keeps its keys in an order of its own that follows no rule you can count on, and a LinkedHashMap keeps the order they went in. The task asks for the boats' names in alphabetical order: the lesson shows a map that keeps its keys that way.`
          },
          {
            when: (r, x) => !x && items(r, 'got')?.length === r.case.expected.got.length && items(r, 'got').some((l) => !/^\w+: \d+$/.test(l)),
            hint: 'lines gives back a line per boat, and they are not written as the task shows: the boat, a colon and a space, then its count, as in Gannet: 3.'
          }
        ]
      })
    },

    sailing: {
      task: 3,
      cases: [
        {
          name: 'Sailing is a record of a boat and an hour',
          code: ['Object s = new Sailing("Plover", 16);', 'boolean record = s instanceof Record;', 'Sailing t = new Sailing("Plover", 16);'],
          reads: { 'Sailing is a record': 'record', 't.boat()': 't.boat()', 't.hour()': 't.hour()' },
          after: { 'Sailing is a record': 'record', 't.boat()': 't.boat()', 't.hour()': 't.hour()' },
          expected: { 'Sailing is a record': true, 't.boat()': 'Plover', 't.hour()': 16 },
          record: true,
          hint: 'Sailing should be a record with a String boat and an int hour, in that order.'
        },
        lookup('Finds the places booked on a sailing', 'Gannet', 9, 12, 4, 'left should give back the capacity less the places booked on that sailing.'),
        lookup('A sailing with nothing booked has every seat left', 'Gannet', 11, 12, 12, 'A sailing that is not in the map has nothing booked, so every seat is left.', { missing: true }),
        lookup('Another boat at an hour that is booked', 'Curlew', 14, 10, 10, 'A sailing is its boat and its hour together: the Curlew at 14 has nothing booked, whatever the Gannet at 14 has.', { missing: true }),
        lookup('A full sailing', 'Linnet', 9, 12, 0, 'left should give back the capacity less the places booked on that sailing.'),
        lookup('Another capacity', 'Gannet', 14, 20, 17, 'left should take the places booked away from the capacity it is handed.')
      ],
      judge: (runs, ctx) =>
        outcomeCases({
          file: FILE,
          explain: explainCollection,
          typed: 'left gives back the same number whatever Check asks it about. It should look the sailing up in the map.',
          mistakes: [
            {
              when: (r) => r.case.record && bothWritten(ctx.section) && value(r, 'Sailing is a record') === 'false',
              hint: 'Sailing is a class with an equals and a hashCode of your own, and the task asks for a record. A record of a boat and an hour writes equals, hashCode and the boat() and hour() methods from its parts, so the one line does all your class does, and cannot get them out of step.'
            },
            {
              when: (r, x, all) => (r.case.lookup || r.case.record) && !halfEqual(ctx.section) && all.some((o) => o.case.record && value(o, 'Sailing is a record') === 'false'),
              hint: 'Sailing is not a record. Check puts sailings in the map and looks them up with new Sailing objects that hold the same boat and hour, as a sailing read in would be. A class you write compares its objects with the equals and hashCode it gets from Object, which call two objects equal only when they are the very same one, so the map never finds them. A record writes equals and hashCode from its parts for you.'
            },
            {
              when: (r, x) => (r.case.lookup || r.case.record) && halfEqual(ctx.section),
              hint: 'Sailing has an equals and no hashCode. A HashMap looks for a key only among those whose hash code matches, and the hashCode every object gets from Object differs from one object to the next, so an equal sailing is never even compared. equals and hashCode go together, which a record writes for you.'
            },
            {
              when: (r, x) => x?.name === 'NullPointerException' && /Map\.get/.test(x.message ?? ''),
              hint: 'left asked the map for a sailing with nothing booked, and get gave back null, which cannot become an int. A sailing with nothing booked is not in the map: ask whether the key is there, or let the map give a value of your own for a missing key.'
            },
            {
              when: (r, x) => !x && /containsValue/.test(codeOnly(ctx.section)) && Number(value(r, 'got')) !== r.case.expected.got,
              hint: 'containsValue looks among the values of the map, the places booked, not among its keys. Whether a sailing is in the map is a question about its keys.'
            }
          ]
        })(runs, ctx)
    }
  }
})
