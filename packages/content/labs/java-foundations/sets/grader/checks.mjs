import { attempt, codeOnly, explainCollection, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'Gangway.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const sameSet = (a, b) => !!a && !!b && same([...a].sort(), [...b].map(String).sort())
const halfEqual = (section) => /\bequals\s*\(/.test(codeOnly(section)) && !/\bhashCode\s*\(/.test(codeOnly(section))
const bothWritten = (section) => /\bequals\s*\(/.test(codeOnly(section)) && /\bhashCode\s*\(/.test(codeOnly(section))
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

// Codes and names made while the program runs, as ones read in would be, so == cannot pass for
// equals. The order a set keeps is read as a list; a set handed in is read back sorted, so what a
// person sees never depends on hash order.
const text = (list) => list.map((n) => `new String("${n}")`).join(', ')
const plain = (code) => code.replace(/new String\(("[^"]*")\)/g, '$1')
const ORDER = 'in the order it keeps them'
const inOrder = (expr) => `${expr} == null ? null : new ArrayList<>(${expr})`
const sorted = (expr) => `new ArrayList<>(new TreeSet<>(${expr}))`

/** A case of Task 1. The values are chosen so that the order of second scans differs from the
 * order of first scans, from alphabetical order, and from the order a HashSet keeps. */
function twice(name, scans, expected, extra) {
  const setup = [`List<String> scans = List.of(${text(scans)});`]
  return attempt({
    name,
    setup,
    call: 'Scans.scannedTwice(scans)',
    type: 'Set<String>',
    after: { [ORDER]: inOrder('got') },
    expected: { [ORDER]: expected },
    firstOrder: [...expected].sort((a, b) => scans.indexOf(a) - scans.indexOf(b)),
    show: [...setup.map(plain), 'Set<String> got = Scans.scannedTwice(scans);'].join('\n'),
    ...extra
  })
}

/** A case of Task 2, with sets of the kinds `kinds` names. */
function both(name, [kindA, a], [kindB, b], expected, extra) {
  const setup = [`Set<String> first = new ${kindA}<>(List.of(${text(a)}));`, `Set<String> second = new ${kindB}<>(List.of(${text(b)}));`]
  return attempt({
    name,
    setup,
    call: 'Days.onBoth(first, second)',
    type: 'Set<String>',
    after: { [ORDER]: inOrder('got'), 'first, sorted': sorted('first'), 'second, sorted': sorted('second') },
    expected: { [ORDER]: expected, 'first, sorted': [...a].sort(), 'second, sorted': [...b].sort() },
    show: [...setup.map(plain), 'Set<String> got = Days.onBoth(first, second);'].join('\n'),
    ...extra
  })
}

const TAKEN = [
  'Set<Seat> taken = new HashSet<>();',
  'taken.add(new Seat(new String("Gannet"), 2));',
  'taken.add(new Seat(new String("Gannet"), 3));',
  'taken.add(new Seat(new String("Linnet"), 1));',
  'taken.add(new Seat(new String("Gannet"), 6));'
]

const OTHERS = { Gannet: [2, 3, 6], Linnet: [1] }

/** A case of Task 3: freeSeats on Check's own seats taken. */
const free = (name, boat, seats, expected, hint, extra) =>
  attempt({
    name,
    setup: TAKEN,
    call: `Plan.freeSeats(taken, new String("${boat}"), ${seats})`,
    type: 'List<Integer>',
    expected: { got: expected },
    show: [...TAKEN.map(plain), `List<Integer> got = Plan.freeSeats(taken, "${boat}", ${seats});`].join('\n'),
    lookup: true,
    every: Array.from({ length: seats }, (_, i) => i + 1),
    others: Object.entries(OTHERS).filter(([b]) => b !== boat).flatMap(([, n]) => n),
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
    twice: {
      task: 1,
      cases: [
        twice('Finds the codes scanned again, in the order of their second scan', ['T-12', 'T-74', 'T-20', 'T-31', 'T-58', 'T-58', 'T-31', 'T-74', 'T-58', 'T-12'], ['T-58', 'T-31', 'T-74', 'T-12'], { hint: 'scannedTwice should give back each code scanned more than once, once, in the order its second scan came.' }),
        twice('Two codes, the second scanned first', ['T-25', 'T-66', 'T-66', 'T-25'], ['T-66', 'T-25'], { hint: 'scannedTwice should give back the codes in the order their second scan came.' }),
        twice('Other codes, in another order', ['T-83', 'T-05', 'T-47', 'T-29', 'T-47', 'T-83', 'T-29', 'T-05'], ['T-47', 'T-83', 'T-29', 'T-05'], { hint: 'scannedTwice should give back the codes in the order their second scan came.' }),
        twice('A code scanned three times counts once', ['T-66', 'T-66', 'T-66'], ['T-66'], { hint: 'A code scanned three times should be in the set once.' }),
        twice('Nothing scanned twice', ['T-90', 'T-17', 'T-43'], [], { hint: 'When no code is scanned twice, scannedTwice should give back an empty set.' }),
        twice('Nothing scanned at all', [], [], { hint: 'With no scans, scannedTwice should give back an empty set.' })
      ],
      judge: outcomeCases({
        file: FILE,
        explain: explainCollection,
        mistakes: [
          {
            when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
            hint: 'scannedTwice changes the list of scans it was handed, a list made with List.of, which can never change. The task says scans stays as it is.'
          },
          {
            when: (r, x, all) => !x && r.case.expected[ORDER].length > 1 && all.every((o) => !o.case.firstOrder || o.case.firstOrder.length < 2 || same(items(o, ORDER), o.case.firstOrder)),
            hint: 'scannedTwice finds the right codes, in the order of their first scan. The task asks for the order of their second scan: a code goes into the set you give back at the moment it is scanned again.'
          },
          {
            when: (r, x) => !x && r.case.expected[ORDER].length > 1 && sameSet(items(r, ORDER), r.case.expected[ORDER]) && !same(items(r, ORDER), r.case.expected[ORDER]),
            hint: 'scannedTwice finds the right codes, in the wrong order. A HashSet keeps its items in an order of its own that follows no rule you can count on, and a TreeSet keeps them sorted. The task asks for the order the second scans came in: the lesson shows a set that keeps the order things went in.'
          },
          {
            when: (r, x) => !x && r.case.expected[ORDER].length === 0 && (items(r, ORDER)?.length ?? 0) > 0,
            hint: 'scannedTwice gives back codes that were scanned only once. Keep the codes you have seen in a set, and a code counts only when it is already there.'
          },
          {
            when: (r, x) => !x && r.case.expected[ORDER].length === 4 && same(items(r, ORDER), ['T-58']),
            hint: 'scannedTwice finds a code only when its two scans come one after the other. A code scanned again later counts too: remember every code seen so far.'
          }
        ]
      })
    },

    both: {
      task: 2,
      cases: [
        both('Finds who came on both days, in alphabetical order', ['HashSet', ['Floraidh', 'Alasdair', 'Marsaili', 'Tormod', 'Innes']], ['HashSet', ['Innes', 'Tormod', 'Floraidh', 'Murdo', 'Beathag']], ['Floraidh', 'Innes', 'Tormod'], { hint: 'onBoth should give back the names in both sets, in alphabetical order.' }),
        both('From a set that keeps the order names went in', ['LinkedHashSet', ['Somhairle', 'Eachann', 'Coinneach', 'Raonaid']], ['HashSet', ['Raonaid', 'Coinneach', 'Somhairle']], ['Coinneach', 'Raonaid', 'Somhairle'], { hint: 'onBoth should give back the names in both sets in alphabetical order, whatever order the sets keep.' }),
        both('Nobody came on both days', ['HashSet', ['Murdo', 'Innes']], ['HashSet', ['Tormod']], [], { hint: 'When nobody is in both sets, onBoth should give back an empty set.' }),
        both('Nobody came on the first day', ['HashSet', []], ['HashSet', ['Murdo', 'Tormod']], [], { hint: 'With nobody on the first day, onBoth should give back an empty set.' })
      ],
      judge: outcomeCases({
        file: FILE,
        explain: explainCollection,
        mistakes: [
          {
            when: (r, x) => !x && (!same(items(r, 'first, sorted'), r.case.expected['first, sorted']) || !same(items(r, 'second, sorted'), r.case.expected['second, sorted'])),
            hint: 'onBoth changed a set it was handed: retainAll keeps only what is in both, and takes everything else out of the set it is called on. The task says first and second stay as they are: work on a copy.'
          },
          {
            when: (r, x) => !x && r.case.expected[ORDER].length > 1 && sameSet(items(r, ORDER), r.case.expected[ORDER]) && !same(items(r, ORDER), r.case.expected[ORDER]),
            hint: 'onBoth finds the right names, in the wrong order. A HashSet keeps its items in an order of its own that follows no rule you can count on, and a LinkedHashSet keeps the order they went in. The task asks for alphabetical order: the lesson shows a set that keeps it.'
          }
        ]
      })
    },

    seats: {
      task: 3,
      cases: [
        {
          name: 'Seat is a record of a boat and a number',
          code: ['Object s = new Seat("Plover", 7);', 'boolean record = s instanceof Record;', 'Seat t = new Seat("Plover", 7);'],
          reads: { 'Seat is a record': 'record', 't.boat()': 't.boat()', 't.number()': 't.number()' },
          after: { 'Seat is a record': 'record', 't.boat()': 't.boat()', 't.number()': 't.number()' },
          expected: { 'Seat is a record': true, 't.boat()': 'Plover', 't.number()': 7 },
          record: true,
          hint: 'Seat should be a record with a String boat and an int number, in that order.'
        },
        free('Lists the free seats of a boat', 'Gannet', 6, [1, 4, 5], 'freeSeats should give back the numbers of the boat\'s seats that are not taken, smallest first.'),
        free('Seats taken on another boat do not count', 'Linnet', 4, [2, 3, 4], 'Only the seats taken on that boat are taken: Linnet seat 1 is, Gannet seat 2 is not a Linnet seat.'),
        free('A boat with nothing taken', 'Curlew', 3, [1, 2, 3], 'On a boat with nothing taken, every seat is free.'),
        free('Only seats up to the boat\'s last count', 'Gannet', 3, [1], 'The boat has only as many seats as it is handed: seats past that number are not on it.'),
        free('Every seat taken', 'Linnet', 1, [], 'When every seat is taken, freeSeats should give back an empty list.')
      ],
      judge: (runs, ctx) =>
        outcomeCases({
          file: FILE,
          explain: explainCollection,
          typed: 'freeSeats gives back the same list whatever Check asks it about. It should look up each seat of the boat in taken.',
          mistakes: [
            {
              when: (r) => r.case.record && bothWritten(ctx.section) && value(r, 'Seat is a record') === 'false',
              hint: 'Seat is a class with an equals and a hashCode of your own, and the task asks for a record. A record of a boat and a number writes equals, hashCode and the boat() and number() methods from its parts, so the one line does all your class does, and cannot get them out of step.'
            },
            {
              when: (r, x, all) => (r.case.lookup || r.case.record) && !halfEqual(ctx.section) && all.some((o) => o.case.record && value(o, 'Seat is a record') === 'false'),
              hint: 'Seat is not a record. Check fills taken with seats of its own and freeSeats asks about new Seat objects that hold the same boat and number. A class you write compares its objects with the equals and hashCode it gets from Object, which call two objects equal only when they are the very same one, so the set never finds them. A record writes equals and hashCode from its parts for you.'
            },
            {
              when: (r, x) => (r.case.lookup || r.case.record) && halfEqual(ctx.section),
              hint: 'Seat has an equals and no hashCode. A HashSet looks for an object only among those whose hash code matches, and the hashCode every object gets from Object differs from one object to the next, so an equal seat is never even compared. equals and hashCode go together, which a record writes for you.'
            },
            {
              when: (r, x) => !x && r.case.lookup && (items(r, 'got') ?? []).includes('0'),
              hint: 'freeSeats lists a seat 0. The boat\'s seats are numbered from 1 to the number it is handed.'
            },
            {
              when: (r, x) => !x && r.case.lookup && r.case.others.length > 0 && same(items(r, 'got'), r.case.expected.got.filter((n) => !r.case.others.includes(n))),
              hint: 'freeSeats counts a seat taken on another boat as taken on this one. taken holds the seats of every boat: a seat is taken only when both its boat and its number match.'
            },
            {
              when: (r, x) => !x && r.case.lookup && /==/.test(codeOnly(ctx.section)) && same(items(r, 'got'), r.case.every) && !same(r.case.every, r.case.expected.got),
              hint: 'freeSeats says every seat is free. Check makes the boats\' names separately, as names read in would be, so == on two names asks whether they are the very same String object. A set\'s contains asks with equals.'
            }
          ]
        })(runs, ctx)
    }
  }
})
