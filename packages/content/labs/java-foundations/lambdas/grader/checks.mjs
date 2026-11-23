import { fail, isLambda, pass, ran, tasks } from '../../grading.mjs'

const FILE = 'BoardOrders.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === String(b[i]))
const sign = (v) => (v === null ? null : Math.sign(Number(v)))

const departure = (boat, hour, seats) => `new Departure("${boat}", ${hour}, ${seats})`
// A boat's name as a text of its own, so == on two boats is false, as it is on real data.
const fresh = (boat, hour, seats) => `new Departure(new String("${boat}"), ${hour}, ${seats})`
const LAMBDA = 'what came back is a lambda'

/** A case that compares a pair both ways: `ab` and `ba` are the signs the task asks for. */
const pair = (name, code, [x, y], ab, ba, kind, hint) => ({
  name,
  code,
  reads: { [x]: x, [y]: y },
  signs: { [x]: ab, [y]: ba },
  kind,
  hint
})

/** A case that sorts `list` with the comparator `make` gives back, and reads the boats' order. */
const sorts = (name, make, list, order, hint) => ({
  name,
  code: [
    'List<Departure> list = new ArrayList<>();',
    ...list.map((d) => `list.add(${fresh(...d)});`),
    `list.sort(${make});`,
    'List<String> order = new ArrayList<>();',
    'for (Departure d : list) order.add(d.boat() + " " + d.hour() + " " + d.seatsFree());'
  ],
  show: ['List<Departure> list = new ArrayList<>();', ...list.map((d) => `list.add(${departure(...d)});`), `list.sort(${make});`].join('\n'),
  reads: { order: 'order' },
  order: order.map((d) => d.join(' ')),
  kind: 'sort',
  hint
})

const lambdaCase = (name, code, expr) => ({ name, code, reads: { [LAMBDA]: isLambda(expr) }, kind: 'lambda' })

/**
 * Judges a comparison task: each pair by the sign of what came back, a sort by its order, and the
 * kind of object by whether it is a lambda. A failing case gets the first mistake that fits.
 */
function judge(mistakes, lambdaHint) {
  return (runs) =>
    runs.map((r) => {
      const c = r.case
      if (c.kind === 'lambda')
        return value(r, LAMBDA) === 'true' ? pass(c.name, ran(r)) : fail(c.name, lambdaHint, ran(r))
      const ok = c.order ? same(items(r, 'order'), c.order) : Object.entries(c.signs).every(([k, s]) => sign(value(r, k)) === s)
      if (ok) return pass(c.name, ran(r))
      const mistake = mistakes.find((m) => m.when(r, runs))
      return fail(c.name, mistake?.hint ?? c.hint, ran(r))
    })
}

const of = (runs, kind) => runs.find((r) => r.case.kind === kind)
const flipped = (r) => !!r && Object.entries(r.case.signs).every(([k, s]) => sign(value(r, k)) === -s)
const right = (r) => !!r && Object.entries(r.case.signs).every(([k, s]) => sign(value(r, k)) === s)
const zero = (r) => !!r && Object.keys(r.case.signs).every((k) => sign(value(r, k)) === 0)
const neverBelow = (all) => all.every((r) => !r.case.signs || Object.keys(r.case.signs).every((k) => sign(value(r, k)) !== -1))

// Hours whose right order differs from latest first, from most seats first and from the boats'
// names. Two leave at 8: a stable sort keeps them in the order they came.
const BY_HOUR = [['Godwit', 13, 4], ['Merganser', 8, 3], ['Redshank', 17, 0], ['Dotterel', 8, 12], ['Pochard', 11, 9]]
const BY_HOUR_RIGHT = [['Merganser', 8, 3], ['Dotterel', 8, 12], ['Pochard', 11, 9], ['Godwit', 13, 4], ['Redshank', 17, 0]]

// Boats then most seats: the right order differs from every rule turned round, from the rules
// taken the other way round, and from fewest seats first.
const BOARD = [['Sanderling', 9, 2], ['Garganey', 10, 3], ['Sanderling', 14, 8], ['Turnstone', 8, 5], ['Garganey', 16, 11], ['Sanderling', 11, 5]]
const BOARD_RIGHT = [['Garganey', 16, 11], ['Garganey', 10, 3], ['Sanderling', 14, 8], ['Sanderling', 11, 5], ['Sanderling', 9, 2], ['Turnstone', 8, 5]]

const LAMBDA_HINT = (method) =>
  `${method} gives back an object that works, made from a class written out in full: a class of its own, or an anonymous class with new and braces. The task asks for the same rule written as a lambda, which needs no class at all: the lesson shows how a class shrinks to one.`

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  tasks: {
    earliest: {
      task: 1,
      cases: [
        pair('Puts the earlier hour first', ['Comparator<Departure> c = Orders.earliestFirst();', `Departure a = ${departure('Godwit', 9, 4)};`, `Departure b = ${departure('Pochard', 14, 6)};`], ['c.compare(a, b)', 'c.compare(b, a)'], -1, 1, 'near', 'compare should give back a number below 0 when the first departure leaves earlier, and above 0 when it leaves later.'),
        pair('Orders the first and last hours of the day', ['Comparator<Departure> c = Orders.earliestFirst();', `Departure a = ${departure('Redshank', 23, 1)};`, `Departure b = ${departure('Dotterel', 0, 9)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 1, -1, 'far', 'The departure at hour 0 leaves before the one at hour 23, so it comes first.'),
        pair('Gives back 0 for the same hour', ['Comparator<Departure> c = Orders.earliestFirst();', `Departure a = ${departure('Merganser', 10, 3)};`, `Departure b = ${departure('Garganey', 10, 8)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 0, 0, 'equal', 'Two departures at the same hour compare as 0, whatever their boats and seats.'),
        sorts('Sorts a list of departures', 'Orders.earliestFirst()', BY_HOUR, BY_HOUR_RIGHT, 'Sorted with earliestFirst, the departures should go from the earliest hour to the latest, and two at the same hour should stay in the order they came: a sort keeps two that compare as 0 as they were.'),
        lambdaCase('earliestFirst gives back a lambda', ['Comparator<Departure> c = Orders.earliestFirst();'], 'c')
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'equal' && !zero(r),
            hint: 'compare does not give back 0 for two departures at the same hour. The task looks at the hour alone: two departures at the same hour are level, whatever their boats.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && neverBelow(all),
            hint: 'compare never gives back a number below 0. Sorting needs three answers: below 0 when the first comes first, 0 when the two are level, above 0 when the first comes second.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'near')),
            hint: 'compare puts the later hour first: the list would sort the wrong way round. A number below 0 means the first departure comes first.'
          }
        ],
        LAMBDA_HINT('earliestFirst')
      )
    },

    room: {
      task: 2,
      cases: [
        {
          name: 'RoomCheck takes a lambda of Check\'s own',
          code: ['RoomCheck own = d -> d.seatsFree() > 100;'],
          reads: { [`own.fits(${departure('Godwit', 9, 101)})`]: `own.fits(${departure('Godwit', 9, 101)})`, [`own.fits(${departure('Godwit', 9, 3)})`]: `own.fits(${departure('Godwit', 9, 3)})` },
          expected: { [`own.fits(${departure('Godwit', 9, 101)})`]: true, [`own.fits(${departure('Godwit', 9, 3)})`]: false },
          kind: 'own',
          hint: 'RoomCheck should have one method, boolean fits(Departure d), that gives back what the lambda says.'
        },
        room('A party of 4', ['RoomCheck four = Window.roomFor(4);'], [['four', 'Sanderling', 3, false], ['four', 'Goldeneye', 4, true], ['four', 'Turnstone', 9, true]], 'party', 'A RoomCheck for a party of 4 should say yes for a departure with 4 seats free or more, and no for one with fewer.'),
        room('Two parties at once', ['RoomCheck five = Window.roomFor(5);', 'RoomCheck two = Window.roomFor(2);'], [['five', 'Dotterel', 3, false], ['two', 'Dotterel', 3, true], ['five', 'Pochard', 5, true], ['two', 'Redshank', 1, false]], 'two', 'Each RoomCheck should keep the party it was made for: one for 5 and one for 2, kept side by side, give different answers for 3 seats free.'),
        room('A party of 1', ['RoomCheck one = Window.roomFor(1);'], [['one', 'Garganey', 0, false], ['one', 'Merganser', 1, true]], 'party', 'A RoomCheck for a party of 1 should say no for a full departure and yes for one with a seat free.'),
        lambdaCase('roomFor gives back a lambda', ['RoomCheck three = Window.roomFor(3);'], 'three')
      ],
      judge: judgeRoom
    },

    board: {
      task: 3,
      cases: [
        pair('Puts the boats in alphabetical order', ['Comparator<Departure> c = Boards.byBoatThenRoom();', `Departure a = ${departure('Garganey', 9, 2)};`, `Departure b = ${departure('Turnstone', 12, 9)};`], ['c.compare(a, b)', 'c.compare(b, a)'], -1, 1, 'boats', 'Departures of different boats should be in alphabetical order of their boats, whatever their seats free.'),
        pair('Of different boats with the same seats, the boats decide', ['Comparator<Departure> c = Boards.byBoatThenRoom();', `Departure a = ${departure('Sanderling', 10, 4)};`, `Departure b = ${departure('Goldeneye', 15, 4)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 1, -1, 'boatsOnly', 'Departures of different boats should be in alphabetical order of their boats.'),
        pair('Of the same boat, puts most seats free first', ['Comparator<Departure> c = Boards.byBoatThenRoom();', `Departure a = ${fresh('Redshank', 9, 3)};`, `Departure b = ${fresh('Redshank', 13, 10)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 1, -1, 'seats', 'Of two departures of the same boat, the one with more seats free comes first.'),
        pair('Gives back 0 for the same boat and seats', ['Comparator<Departure> c = Boards.byBoatThenRoom();', `Departure a = ${fresh('Pochard', 8, 6)};`, `Departure b = ${fresh('Pochard', 17, 6)};`], ['c.compare(a, b)', 'c.compare(b, a)'], 0, 0, 'equal', 'Two departures of the same boat with the same seats free compare as 0, whatever their hours.'),
        sorts('Sorts the board', 'Boards.byBoatThenRoom()', BOARD, BOARD_RIGHT, 'Sorted with byBoatThenRoom, the departures should be in alphabetical order of their boats, and each boat\'s departures from most seats free to fewest.')
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'equal' && !zero(r),
            hint: 'compare does not give back 0 for two departures of the same boat with the same seats free. The task gives two rules and no more: the hour plays no part.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && neverBelow(all),
            hint: 'compare never gives back a number below 0. Sorting needs three answers: below 0 when the first comes first, 0 when the two are level, above 0 when the first comes second.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'boats')) && flipped(of(all, 'seats')) && flipped(of(all, 'boatsOnly')),
            hint: 'Every rule comes out turned round: the boats in reverse alphabetical order and the fewest seats first. Look at which part of your comparator is turned round: only the seats should go from most to fewest.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'boatsOnly')) && right(of(all, 'seats')),
            hint: 'The boats come out in reverse alphabetical order, though only the seats should go from most to fewest. Look at which part of your comparator is turned round.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'boats')) && right(of(all, 'boatsOnly')),
            hint: 'Departures of different boats are put in order by their seats first. The boat is the first rule, and the seats decide only between departures of the same boat.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && flipped(of(all, 'seats')) && right(of(all, 'boats')),
            hint: 'Of two departures of the same boat, the one with fewer seats free comes first. The task asks for most seats free first.'
          },
          {
            when: (r, all) => r.case.kind !== 'equal' && zero(of(all, 'seats')) && right(of(all, 'boats')),
            hint: 'compare gives back 0 for two departures of the same boat with different seats free, which leaves their order to chance. The task gives a second rule: most seats free first. Two boats\' names are the same when equals says so: == asks whether they are the very same object.'
          }
        ],
        ''
      )
    }
  }
})

/** A case of Task 2: Check asks each RoomCheck it keeps (`party` names it) about departures of its own. */
function room(name, code, checks, kind, hint) {
  const party = (v) => Number(/roomFor\((\d+)\)/.exec(code.find((l) => l.includes(`RoomCheck ${v} `)))[1])
  const list = checks.map(([v, boat, seats, want]) => ({ read: `${v}.fits(${departure(boat, 12, seats)})`, want, seats, party: party(v) }))
  return {
    name,
    code,
    reads: Object.fromEntries(list.map((k) => [k.read, k.read])),
    expected: Object.fromEntries(list.map((k) => [k.read, k.want])),
    checks: list,
    kind,
    hint
  }
}

/** Judges Task 2: each RoomCheck by its answers, then the kind of object roomFor gives back. */
function judgeRoom(runs) {
  const asked = runs.filter((r) => r.case.checks).flatMap((r) => r.case.checks.map((k) => ({ ...k, got: value(r, k.read) })))
  // The same answers as one fixed party would give, whatever party Check asked for.
  const fixed = [...Array(13).keys()].some((p) => asked.every((k) => k.got === String(k.seats >= p))) && !asked.every((k) => k.want === (k.got === 'true'))
  const allSame = asked.length > 0 && asked.every((k) => k.got === asked[0].got)
  return runs.map((r) => {
    const c = r.case
    if (c.kind === 'lambda') return value(r, LAMBDA) === 'true' ? pass(c.name, ran(r)) : fail(c.name, LAMBDA_HINT('roomFor'), ran(r))
    if (Object.entries(c.expected).every(([k, want]) => value(r, k) === String(want))) return pass(c.name, ran(r))
    if (c.kind === 'own') return fail(c.name, c.hint, ran(r))
    if (allSame)
      return fail(c.name, 'The RoomChecks give the same answer for every departure, whatever the party and the seats free. The lambda should compare the seats free of the departure it is handed with the party.', ran(r))
    if (fixed)
      return fail(c.name, 'The RoomChecks give the same answers whatever party roomFor is handed, as if the party were written into the lambda. The lambda should read party, the parameter of roomFor.', ran(r))
    if (c.checks.some((k) => k.want && k.seats === k.party && value(r, k.read) === 'false'))
      return fail(c.name, 'The RoomCheck says no for a departure with exactly as many seats free as the party. At least party seats free means that many or more.', ran(r))
    if (c.kind === 'two' && value(r, c.checks[0].read) === value(r, c.checks[1].read))
      return fail(c.name, 'The two RoomChecks Check kept side by side give the same answer for 3 seats free, so one of them does not use its own party: the second call of roomFor changed what the first gives back. Each RoomCheck should keep the party it was made for.', ran(r))
    return fail(c.name, c.hint, ran(r))
  })
}
