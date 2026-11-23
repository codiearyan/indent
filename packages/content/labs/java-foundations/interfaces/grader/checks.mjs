import { objectCases, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value

// A bookable thing of Check's own, written in main: it compiles only when Bookable has exactly the
// three methods the task names, and Task 3 meets parts it has never seen.
const SPOT = 'class Spot implements Bookable { int free; Spot(int f) { free = f; } @Override public String label() { return "Spot"; } @Override public int placesFree() { return free; } @Override public boolean book(int p) { if (p > free) return false; free -= p; return true; } }'

// Check's own Bookable, so Tasks 2 and 3 are judged on their own lines, whatever Task 1 is like.
const OWN_BOOKABLE = `interface Bookable {
    String label();
    int placesFree();
    boolean book(int places);
}`

/** The cases of a class that books places, named v and made by `make(free)`. */
const booking = (kind, make) => [
  {
    name: `A new ${kind} has all its places free`,
    code: [`Bookable a = ${make(5)};`],
    reads: { 'a.placesFree()': 'a.placesFree()' },
    expected: { 'a.placesFree()': 5 },
    hint: `A new ${kind} should have free all the places it was made with.`
  },
  {
    name: 'Books while there are enough places',
    code: [`Bookable a = ${make(5)};`, 'boolean first = a.book(3);', 'boolean last = a.book(2);'],
    reads: { first: 'first', last: 'last', 'a.placesFree()': 'a.placesFree()' },
    expected: { first: true, last: true, 'a.placesFree()': 0 },
    hint: 'While there are enough places free, book should take them and give back true, down to the very last place.'
  },
  {
    name: 'Refuses more places than are free, and changes nothing',
    code: [`Bookable a = ${make(5)};`, 'a.book(3);', 'boolean more = a.book(3);'],
    reads: { more: 'more', 'a.placesFree()': 'a.placesFree()' },
    expected: { more: false, 'a.placesFree()': 2 },
    short: true,
    hint: 'When fewer places are free than asked for, book should change nothing and give back false.'
  },
  {
    name: `Each ${kind} keeps its own places`,
    code: [`Bookable a = ${make(9)};`, `Bookable b = ${make(4)};`, 'b.book(1);'],
    reads: { 'a.placesFree()': 'a.placesFree()', 'b.placesFree()': 'b.placesFree()' },
    expected: { 'a.placesFree()': 9, 'b.placesFree()': 3 },
    hint: `Each ${kind} should count only its own places.`
  }
]

const bookingMistakes = (kind) => [
  {
    when: (r) => value(r, 'b.placesFree()') !== undefined && value(r, 'a.placesFree()') === value(r, 'b.placesFree()'),
    hint: `Check made two of them, and the first now has the second one's places. The count of places free is shared by every ${kind}: a field with static in front belongs to the class. Each needs its own.`
  },
  {
    when: (r) => r.case.short && value(r, 'a.placesFree()') !== '2',
    hint: 'book took places it then said no to, so places went missing. When too few are free, it should change nothing.'
  },
  {
    when: (r) => r.case.short && value(r, 'more') === 'true',
    hint: 'book gives back true for places it could not give. true means they are booked.'
  },
  {
    when: (r) => value(r, 'last') === 'false',
    hint: 'book refuses the last places free. Asking for exactly as many as are free should still book them.'
  }
]

export const checks = tasks({
  file: 'Reservations.java',
  objects: true,
  families: true,
  tasks: {
    'bike-shed': {
      task: 1,
      cases: [
        {
          name: 'Bookable has the three methods the task names',
          code: [SPOT, 'Bookable s = new Spot(7);', 'boolean ok = s.book(4);'],
          show: 'A bookable thing of Check\'s own, which implements Bookable with the three methods the task names:\nBookable s = new Spot(7);\nboolean ok = s.book(4);',
          reads: { 's.label()': 's.label()', ok: 'ok', 's.placesFree()': 's.placesFree()' },
          expected: { 's.label()': 'Spot', ok: true, 's.placesFree()': 3 },
          hint: 'Check\'s own class should work through a variable of type Bookable.'
        },
        {
          name: 'A bike shed is Bookable, with its label',
          code: ['Bookable a = new BikeShed(6);'],
          reads: { 'a.label()': 'a.label()' },
          expected: { 'a.label()': 'Bike shed' },
          hint: 'A bike shed\'s label is Bike shed, written exactly so.'
        },
        ...booking('bike shed', (n) => `new BikeShed(${n})`)
      ],
      judge: objectCases({ types: { first: 'boolean', 'a.placesFree()': 'int' }, mistakes: bookingMistakes('bike shed') })
    },

    'tour-bus': {
      task: 2,
      stub: OWN_BOOKABLE,
      cases: [
        {
          name: 'A tour bus is Bookable and Departing',
          code: ['TourBus t = new TourBus(26, 15);', 'Bookable a = t;', 'Departing d = t;'],
          reads: { 'a.label()': 'a.label()', 'd.departsAt()': 'd.departsAt()' },
          expected: { 'a.label()': 'Tour bus', 'd.departsAt()': 15 },
          hint: 'A tour bus\'s label is Tour bus, written exactly so, and departsAt gives back the hour it was made with.'
        },
        {
          name: 'Each tour bus keeps its own hour',
          code: ['Departing d = new TourBus(30, 9);', 'Departing e = new TourBus(12, 17);'],
          reads: { 'd.departsAt()': 'd.departsAt()', 'e.departsAt()': 'e.departsAt()' },
          expected: { 'd.departsAt()': 9, 'e.departsAt()': 17 },
          hint: 'departsAt should give back the hour this bus was made with.'
        },
        ...booking('tour bus', (n) => `new TourBus(${n}, 10)`)
      ],
      judge: objectCases({
        types: { first: 'boolean', 'd.departsAt()': 'int' },
        mistakes: [
          {
            when: (r) => value(r, 'e.departsAt()') !== undefined && value(r, 'd.departsAt()') === '17',
            hint: 'Check made two tour buses, and the first now leaves at the second one\'s hour. hour is shared by every bus: a field with static in front belongs to the class. Each needs its own.'
          },
          {
            when: (r) => ['d.departsAt()'].some((k) => value(r, k) === '26' || value(r, k) === '30'),
            hint: 'departsAt gives back the seats, not the hour. The constructor takes the seats first, then the hour.'
          },
          ...bookingMistakes('tour bus')
        ]
      })
    },

    trip: {
      task: 3,
      stub: OWN_BOOKABLE,
      cases: [
        {
          name: 'Books every part when all have room',
          code: [SPOT, 'Bookable a = new Spot(6);', 'Bookable b = new Spot(4);', 'java.util.ArrayList<Bookable> parts = new java.util.ArrayList<>();', 'parts.add(a); parts.add(b);', 'boolean ok = Trip.bookAll(parts, 4);'],
          show: 'A bookable thing of Check\'s own, Spot, made with its places free:\nBookable a = new Spot(6);\nBookable b = new Spot(4);\nArrayList<Bookable> parts: a, b\nboolean ok = Trip.bookAll(parts, 4);',
          reads: { ok: 'ok', 'a.placesFree()': 'a.placesFree()', 'b.placesFree()': 'b.placesFree()' },
          expected: { ok: true, 'a.placesFree()': 2, 'b.placesFree()': 0 },
          hint: 'When every part has room, bookAll should book the places on each part and give back true.'
        },
        {
          name: 'Books nothing at all when one part is short',
          code: [SPOT, 'Bookable a = new Spot(8);', 'Bookable b = new Spot(9);', 'Bookable c = new Spot(2);', 'java.util.ArrayList<Bookable> parts = new java.util.ArrayList<>();', 'parts.add(a); parts.add(b); parts.add(c);', 'boolean ok = Trip.bookAll(parts, 3);'],
          show: 'Bookable a = new Spot(8);\nBookable b = new Spot(9);\nBookable c = new Spot(2);\nArrayList<Bookable> parts: a, b, c\nboolean ok = Trip.bookAll(parts, 3);',
          reads: { ok: 'ok', 'a.placesFree()': 'a.placesFree()', 'b.placesFree()': 'b.placesFree()', 'c.placesFree()': 'c.placesFree()' },
          expected: { ok: false, 'a.placesFree()': 8, 'b.placesFree()': 9, 'c.placesFree()': 2 },
          partial: true,
          hint: 'When any part is short, bookAll should book nothing at all, on any part, and give back false.'
        },
        {
          name: 'Books nothing when the first part is short',
          code: [SPOT, 'Bookable a = new Spot(1);', 'Bookable b = new Spot(5);', 'java.util.ArrayList<Bookable> parts = new java.util.ArrayList<>();', 'parts.add(a); parts.add(b);', 'boolean ok = Trip.bookAll(parts, 2);'],
          show: 'Bookable a = new Spot(1);\nBookable b = new Spot(5);\nArrayList<Bookable> parts: a, b\nboolean ok = Trip.bookAll(parts, 2);',
          reads: { ok: 'ok', 'a.placesFree()': 'a.placesFree()', 'b.placesFree()': 'b.placesFree()' },
          expected: { ok: false, 'a.placesFree()': 1, 'b.placesFree()': 5 },
          partial: true,
          hint: 'When any part is short, bookAll should book nothing at all and give back false.'
        },
        {
          name: 'Takes exactly the places free',
          code: [SPOT, 'Bookable a = new Spot(3);', 'java.util.ArrayList<Bookable> parts = new java.util.ArrayList<>();', 'parts.add(a);', 'boolean ok = Trip.bookAll(parts, 3);'],
          show: 'Bookable a = new Spot(3);\nArrayList<Bookable> parts: a\nboolean ok = Trip.bookAll(parts, 3);',
          reads: { ok: 'ok', 'a.placesFree()': 'a.placesFree()' },
          expected: { ok: true, 'a.placesFree()': 0 },
          hint: 'A part with exactly as many places free as asked for has room.'
        }
      ],
      judge: objectCases({
        types: { ok: 'boolean' },
        mistakes: [
          {
            when: (r) => r.case.partial && Object.keys(r.case.expected).some((k) => k !== 'ok' && value(r, k) !== String(r.case.expected[k])),
            hint: 'bookAll booked places on some parts before it found one that was short, so half a trip is booked. Find out whether every part has room before booking any of them.'
          },
          {
            when: (r) => r.case.expected.ok === true && value(r, 'ok') === 'true',
            hint: 'bookAll gives back true but did not book the places on every part.'
          }
        ]
      })
    }
  }
})
