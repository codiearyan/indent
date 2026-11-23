import { attempt, codeOnly, explainCollection, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'BoardingList.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))

// Check's own helper for Task 1: it adds a name to the list withLate gave back, as a caller may,
// and says whether the list let it.
const ADDS = `class CheckAdds { static boolean to(List<String> list) { if (list == null) return false; try { list.add("Tormod"); return true; } catch (UnsupportedOperationException e) { return false; } } }`

// Names made while the program runs, as names read in would be, so == cannot pass for equals.
const names = (list) => list.map((n) => `new String("${n}")`).join(', ')
const shown = (code) => code.replace(/new String\(("[^"]*")\)/g, '$1')
const ADDED = 'Check could add a name to it'

/** A frame of the learner's own file in what was thrown: the exception came from their lines. */
const fromMine = (x) => !!x && x.frames.some((f) => f.includes(`(${FILE}:`))

/** A case of Task 1: withLate called on `booked`, made by `make`. */
function late(name, make, booked, latecomer, extra) {
  const list = `List.of(${names(booked)})`
  const setup = [`List<String> booked = ${make === 'List.of' ? list : `new ArrayList<>(${list})`};`]
  return attempt({
    name,
    setup,
    call: `Boarding.withLate(booked, new String("${latecomer}"))`,
    type: 'List<String>',
    after: { booked: 'booked', [ADDED]: 'CheckAdds.to(got)', 'booked, once Check added a name to what came back': 'booked' },
    show: [...setup.map(shown), `List<String> got = Boarding.withLate(booked, "${latecomer}");`, 'got.add("Tormod");'].join('\n'),
    ...extra
  })
}

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  tasks: {
    copy: {
      task: 1,
      stub: ADDS,
      cases: [
        late('Adds a late name after everyone booked, to a list made with List.of', 'List.of', ['Calum', 'Fenella', 'Struan'], 'Eachann', {
          expected: { got: ['Calum', 'Fenella', 'Struan', 'Eachann'], [ADDED]: true },
          hint: 'withLate should give back a new list: everyone booked, in order, then the late name.'
        }),
        late('Leaves the caller\'s list as it is', 'new ArrayList<>', ['Dougal', 'Eilidh'], 'Oighrig', {
          expected: { got: ['Dougal', 'Eilidh', 'Oighrig'], booked: ['Dougal', 'Eilidh'], [ADDED]: true, 'booked, once Check added a name to what came back': ['Dougal', 'Eilidh'] },
          mine: true,
          hint: 'withLate should give back a new list of its own, and leave the list it was handed as it was.'
        }),
        late('Does not add a name that is booked already', 'new ArrayList<>', ['Peigi', 'Uisdean'], 'Peigi', {
          expected: { got: ['Peigi', 'Uisdean'], booked: ['Peigi', 'Uisdean'], [ADDED]: true, 'booked, once Check added a name to what came back': ['Peigi', 'Uisdean'] },
          already: true,
          mine: true,
          hint: 'When the late name is booked already, withLate should give back a new list of everyone booked, with nobody added.'
        }),
        late('Is already booked, in a list made with List.of', 'List.of', ['Raonaid', 'Somhairle', 'Beathag'], 'Beathag', {
          expected: { got: ['Raonaid', 'Somhairle', 'Beathag'], [ADDED]: true },
          already: true,
          hint: 'When the late name is booked already, withLate should give back a new list of everyone booked, with nobody added, that the caller can add to.'
        }),
        late('Nobody booked yet', 'List.of', [], 'Coinneach', {
          expected: { got: ['Coinneach'], [ADDED]: true },
          hint: 'With nobody booked, withLate should give back a list holding only the late name.'
        })
      ],
      judge: (runs, ctx) => outcomeCases({
        file: FILE,
        explain: explainCollection,
        typed: 'withLate gives back the same list whatever Check hands it. It should build its list from the names it is handed.',
        mistakes: [
          {
            when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
            hint: 'withLate changes the list it was handed. Check handed it a list made with List.of, which can never change, so the change threw. The task asks for a new list: make one of your own from booked, and change that.'
          },
          {
            when: (r, x) => !x && r.case.mine && !same(items(r, 'booked'), r.case.expected.booked),
            hint: 'withLate changed the caller\'s own list. A variable given a list that already exists is a second name for that same list, not a copy: make a new list from booked, and change only that.'
          },
          {
            when: (r, x) => !x && r.case.mine && !same(items(r, 'booked, once Check added a name to what came back'), r.case.expected.booked),
            hint: 'withLate gives back the very list it was handed, so when Check added a name to what came back, the caller\'s list changed too. Give back a new list of its own.'
          },
          {
            when: (r, x) => !x && value(r, ADDED) === 'false',
            hint: 'withLate gives back a list that cannot be changed: Check added a name to it, as the task says a caller can, and it threw an UnsupportedOperationException. A list made with List.of never changes. Give back a new list the caller can add to.'
          },
          {
            when: (r, x) => !x && r.case.already && (items(r, 'got')?.length ?? 0) > r.case.expected.got.length && /==/.test(codeOnly(ctx.section)),
            hint: 'withLate added a name that is booked already. Check makes every name separately, as names read in would be, so == on two names asks whether they are the very same String object. contains asks each name with equals, which compares the letters.'
          },
          {
            when: (r, x) => !x && r.case.already && (items(r, 'got')?.length ?? 0) > r.case.expected.got.length,
            hint: 'withLate added a name that is booked already, so it is on the list twice. Add the late name only when it is not on the list yet.'
          }
        ]
      })(runs, ctx)
    },

    seat: {
      task: 2,
      cases: [
        attempt({ name: 'Frees a seat whose number is also a position', setup: ['List<Integer> taken = new ArrayList<>(List.of(3, 6, 1, 9));'], call: 'Seats.free(taken, 1)', type: 'int', after: { taken: 'taken' }, expected: { got: 2, taken: [3, 6, 9] }, hint: 'free should take the seat numbered 1 off taken and give back the position it was at.' }),
        attempt({ name: 'Frees a seat with a number past the end of the list', setup: ['List<Integer> taken = new ArrayList<>(List.of(12, 5, 2, 8));'], call: 'Seats.free(taken, 8)', type: 'int', after: { taken: 'taken' }, expected: { got: 3, taken: [12, 5, 2] }, hint: 'free should take the seat numbered 8 off taken and give back the position it was at.' }),
        attempt({ name: 'Frees the first seat on the list', setup: ['List<Integer> taken = new ArrayList<>(List.of(10, 11));'], call: 'Seats.free(taken, 10)', type: 'int', after: { taken: 'taken' }, expected: { got: 0, taken: [11] }, hint: 'free should take the seat numbered 10 off taken and give back the position it was at.' }),
        attempt({ name: 'Frees a seat with a big number', setup: ['List<Integer> taken = new ArrayList<>(List.of(139, 140, 141));'], call: 'Seats.free(taken, 140)', type: 'int', after: { taken: 'taken' }, expected: { got: 1, taken: [139, 141] }, big: true, hint: 'free should take the seat numbered 140 off taken and give back the position it was at.' }),
        attempt({ name: 'A seat that is not taken changes nothing', setup: ['List<Integer> taken = new ArrayList<>(List.of(2, 5));'], call: 'Seats.free(taken, 9)', type: 'int', after: { taken: 'taken' }, expected: { got: -1, taken: [2, 5] }, hint: 'When the seat is not taken, free should change nothing and give back -1.' }),
        attempt({ name: 'No seats taken at all', setup: ['List<Integer> taken = new ArrayList<>();'], call: 'Seats.free(taken, 1)', type: 'int', after: { taken: 'taken' }, expected: { got: -1, taken: [] }, hint: 'With no seats taken, free should give back -1.' })
      ],
      judge: (runs, ctx) => outcomeCases({
        file: FILE,
        explain: explainCollection,
        typed: 'free gives back the same number whatever Check hands it. It should give back the position the seat was at.',
        mistakes: [
          {
            when: (r, x) => !x && r.case.big && Number(value(r, 'got')) === -1 && /==/.test(codeOnly(ctx.section)),
            hint: 'free does not find seat 140, though it is taken. == on two Integer objects asks whether they are the very same object, which numbers above 127 never are. indexOf, contains and equals compare the numbers.'
          },
          {
            when: (r, x) => x?.name === 'IndexOutOfBoundsException' && fromMine(x),
            hint: 'free asked the list for the position numbered like the seat. On a list of Integer, a call with a plain int means a position, not a value: the lesson shows how to take off an item by its value.'
          },
          {
            when: (r, x) => !x && r.values.taken?.items && r.values.taken.items.length === r.case.expected.taken.length && !same(items(r, 'taken'), r.case.expected.taken),
            hint: 'free took the wrong item off: the item at the position numbered like the seat, not the seat itself. On a list of Integer, a call with a plain int means a position: the lesson shows how to take off an item by its value.'
          },
          {
            when: (r, x) => !x && r.case.expected.got >= 0 && Number(value(r, 'got')) === r.case.expected.got && items(r, 'taken')?.length === r.case.expected.taken.length + 1,
            hint: 'free gives back the right position, and leaves the seat on the list. taken is the caller\'s own list, and the task asks free to take the seat off it.'
          }
        ]
      })(runs, ctx)
    },

    void: {
      task: 3,
      cases: [
        attempt({ name: 'Voids tickets next to each other', setup: ['List<Integer> sold = new ArrayList<>(List.of(1201, 1202, 1203, 1204, 1205));', 'List<Integer> voided = new ArrayList<>(List.of(1202, 1203));'], call: 'Tickets.voidAll(sold, voided)', type: 'int', after: { sold: 'sold', voided: 'voided' }, expected: { got: 2, sold: [1201, 1204, 1205], voided: [1202, 1203] }, next: true, hint: 'voidAll should take every voided ticket off sold, keep the others in order, and give back how many it took off.' }),
        attempt({ name: 'Voids the last two tickets', setup: ['List<Integer> sold = new ArrayList<>(List.of(1310, 1311, 1312));'], call: 'Tickets.voidAll(sold, List.of(1311, 1312))', type: 'int', after: { sold: 'sold' }, expected: { got: 2, sold: [1310] }, lastTwo: true, hint: 'voidAll should take every voided ticket off sold, the last one included, and give back how many it took off.' }),
        attempt({ name: 'Voids the last ticket', setup: ['List<Integer> sold = new ArrayList<>(List.of(1420, 1421, 1422));'], call: 'Tickets.voidAll(sold, List.of(1422))', type: 'int', after: { sold: 'sold' }, expected: { got: 1, sold: [1420, 1421] }, hint: 'voidAll should take every voided ticket off sold, the last one included, and give back how many it took off.' }),
        attempt({ name: 'Voids every ticket, named in another order', setup: ['List<Integer> sold = new ArrayList<>(List.of(1700, 1701, 1702));'], call: 'Tickets.voidAll(sold, List.of(1702, 1700, 1701))', type: 'int', after: { sold: 'sold' }, expected: { got: 3, sold: [] }, hint: 'voidAll should take every voided ticket off sold, whatever order voided names them in.' }),
        attempt({ name: 'Voids nothing when no voided ticket was sold', setup: ['List<Integer> sold = new ArrayList<>(List.of(1500, 1501));'], call: 'Tickets.voidAll(sold, List.of(1600))', type: 'int', after: { sold: 'sold' }, expected: { got: 0, sold: [1500, 1501] }, hint: 'When no voided ticket is on sold, voidAll should change nothing and give back 0.' }),
        attempt({ name: 'Nothing sold yet', setup: ['List<Integer> sold = new ArrayList<>();'], call: 'Tickets.voidAll(sold, List.of(1800))', type: 'int', after: { sold: 'sold' }, expected: { got: 0, sold: [] }, hint: 'With nothing sold, voidAll should give back 0.' })
      ],
      judge: (runs, ctx) =>
        outcomeCases({
          file: FILE,
          explain: explainCollection,
          typed: 'voidAll gives back the same number whatever Check hands it. Count the tickets it really takes off.',
          mistakes: [
            {
              when: (r, x) => x?.name === 'ConcurrentModificationException',
              hint: 'voidAll took a ticket off sold while a for-each loop was walking through sold, and Java stopped the loop. The lesson shows a way to take items off while you walk a list.'
            },
            {
              when: (r, x) => x?.name === 'IndexOutOfBoundsException' && fromMine(x),
              hint: 'voidAll asked sold for the position numbered like a ticket. On a list of Integer, a call with a plain int means a position, not a value.'
            },
            {
              when: (r, x) => x?.name === 'UnsupportedOperationException' && fromMine(x),
              hint: 'voidAll changed voided, a list made with List.of, which can never change. The task says voided stays as it is: only sold changes.'
            },
            {
              when: (r, x) => !x && r.case.expected.voided && !same(items(r, 'voided'), r.case.expected.voided),
              hint: 'voidAll changed voided. The task says voided stays as it is: only sold, the caller\'s list of tickets sold, changes.'
            },
            {
              when: (r, x) => !x && r.case.lastTwo && same(items(r, 'sold'), [1310, 1312]),
              hint: 'voidAll took off the second last ticket and missed the last one. Taking an item off moves every later item one place forward: a loop that counts positions forward then steps over it, and a for-each loop may simply stop there, with no exception at all. The lesson shows a way to take items off while you walk a list.'
            },
            {
              when: (r, x) => !x && r.case.next && items(r, 'sold')?.length === 4,
              hint: 'voidAll missed a ticket that sat right after one it took off. Taking an item off moves every later item one place forward, so a loop that counts positions forward steps over the next one.'
            },
            {
              when: (r, x) => !x && r.case.expected.got > 0 && Number(value(r, 'got')) === 0 && items(r, 'sold')?.length === r.case.expected.sold.length + r.case.expected.got && /==/.test(codeOnly(ctx.section)),
              hint: 'voidAll takes nothing off, though the voided tickets are on sold. Check makes every number separately, as numbers read in would be: == on two Integer objects asks whether they are the very same object, which numbers above 127 never are. equals, and contains, compare the numbers.'
            },
            {
              when: (r, x) => !x && r.case.expected.got > 0 && Number(value(r, 'got')) === r.case.expected.got && items(r, 'sold')?.length !== r.case.expected.sold.length,
              hint: 'voidAll counts the right number and leaves sold as it was. sold is the caller\'s own list, and the task asks voidAll to take the tickets off it.'
            }
          ]
        })(runs, ctx)
    }
  }
})
