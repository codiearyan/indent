import { calledIn, earlier, play, promised, readSource, show } from '../../waiting-grading.mjs'

const FILE = 'src/together.js'

const asked = (r, name) => r.calls.filter((c) => c.name === name)
const sync = (r, fn) => r.log.some((l) => l.startsWith(`${fn} stopped with`))
const listed = (r) => r.outcome?.shown ?? ''

/** What is wrong with the questions to one machine, when each of `keys` must be asked once. */
function questions(r, fn, machine, keys, what) {
  const calls = asked(r, machine)
  if (calls.length === 0 && keys.length && /\[(?:Async)?Function/.test(listed(r))) {
    return `${fn} handed Promise.all functions, not promises. A function does its work only when it is called: call it, and hand Promise.all what it gives back.`
  }
  if (calls.length === 0 && keys.length) return `${fn} never asked the ${what}. Ask about every item of the list it is given.`
  const got = calls.map((c) => c.args[0]).sort()
  const want = keys.map(show).sort()
  if (got.length > want.length) return `${fn} asked the ${what} ${got.length} times for ${want.length} items. Ask about each one once.`
  if (got.join() !== want.join()) {
    const missed = want.find((k) => !got.includes(k))
    return missed
      ? `${fn} never asked the ${what} about ${missed}. Ask about every item of the list it is given.`
      : `${fn} asked the ${what} about something that is not in the list it is given.`
  }
  return undefined
}

/** The message when every question must start before the first answer, or nothing. */
function together(r, fn, machines) {
  const late = r.calls.filter((c) => machines.includes(c.name) && c.startedAfter > 0)
  if (!late.length) return undefined
  return `${fn} asked ${late.length === 1 ? 'one question' : `${late.length} questions`} only after an answer had arrived, so it waited for one before starting the next. Start every question first, then wait for them all together: await inside a loop waits for each one in turn.`
}

function arrivalOrder(r, fn, want) {
  const got = r.outcome?.json
  if (!Array.isArray(got) || got.length !== want.length || show(got) === show(want)) return undefined
  const sorted = (list) => show([...list].map(show).sort())
  return sorted(got) === sorted(want)
    ? `The list is in the order the answers arrived, not the order ${fn} was given. Check answered the last question first. Promise.all keeps the order of the list it is given, whichever answer comes first.`
    : undefined
}

function promisesInside(r) {
  return /Promise \{/.test(listed(r))
    ? 'The list holds promises where the answers should be. A list of promises is not a promise: Promise.all turns it into one promise of the list of answers.'
    : undefined
}

function early(r, fn, fix) {
  const fulfilled = r.log.findIndex((l) => l.startsWith(`the promise from ${fn} was fulfilled`))
  const answered = r.log.findIndex((l) => / answered /.test(l))
  return fulfilled !== -1 && answered !== -1 && fulfilled < answered
    ? /undefined/.test(listed(r))
      ? `The promise ${fn} gave back was fulfilled before any answer had arrived, with undefined in it: an answer was read from a promise before it arrived. await each answer before you use it.`
      : `The promise ${fn} gave back was fulfilled before any answer had arrived. forEach does not wait for an async function it calls. ${fix}`
    : undefined
}

const TOGETHER = 'Build the list of promises with map, and wait for it with Promise.all.'

const COUNTS = { Moss: 3, Birch: 11, Pear: 0, Plum: 5 }

export const checks = {
  'one-by-one'(t) {
    return play(t, {
      file: FILE,
      fn: 'countOneByOne',
      cases: [
        { names: ['Moss', 'Birch', 'Pear'] },
        { names: ['Plum', 'Moss'] },
        { names: [] }
      ].map(({ names }) => ({
        name: names.length ? `Counts ${names.join(', ')} one at a time` : 'Counts an empty list',
        run: 'oneByOne',
        args: [names, COUNTS],
        setup: `countOneByOne(${show(names)}), and the stock room counts ${names.map((n) => `${COUNTS[n]} ${n}`).join(', ') || 'nothing'}`,
        judge(r) {
          const want = names.map((n) => COUNTS[n])
          if (!sync(r, 'countOneByOne')) {
            const calls = asked(r, 'countStock')
            const atOnce = calls.filter((c, i) => c.startedAfter < i)
            if (atOnce.length) {
              return 'countOneByOne asked about the next candle before the last one was answered. Ask one at a time: wait for each count before asking for the next.'
            }
            const q = questions(r, 'countOneByOne', 'countStock', names, 'stock room')
            if (q) return q
            if (calls.some((c, i) => c.args[0] !== show(names[i]))) return 'countOneByOne asked about the candles in another order than the list. Go through the list from its first name.'
          }
          return promised(r, 'countOneByOne', want, (r) => promisesInside(r) ?? early(r, 'countOneByOne', 'A for...of loop inside an async function does wait.'))
        }
      }))
    })
  },

  all(t) {
    return play(t, {
      file: FILE,
      fn: 'countAll',
      cases: [
        { names: ['Moss', 'Birch', 'Pear'] },
        { names: ['Plum', 'Pear', 'Birch', 'Moss'] },
        { names: [] },
        { names: ['Moss', 'Teak', 'Plum'], fails: 'Teak' }
      ].map(({ names, fails }) => ({
        name: fails ? `Fails when ${fails} cannot be counted` : names.length ? `Counts ${names.join(', ')} all at once` : 'Counts an empty list',
        run: 'all',
        args: [names, COUNTS],
        setup: `countAll(${show(names)}), and the stock room answers the last question first: ${names.map((n) => (n in COUNTS ? `${COUNTS[n]} ${n}` : `Error('No shelf for ${n}') for ${n}`)).join(', ') || 'nothing to answer'}`,
        judge(r) {
          if (!sync(r, 'countAll')) {
            const apart = together(r, 'countAll', ['countStock'])
            if (apart) return apart
            const q = questions(r, 'countAll', 'countStock', names, 'stock room')
            if (q) return q
          }
          if (fails) {
            const o = r.outcome ?? {}
            if (o.state === 'rejected' && o.error.message === `No shelf for ${fails}`) {
              return r.unhandled.length
                ? 'countAll was rejected with the right error, but a failed count also reached Node with nothing to catch it. Wait for every count through one promise, with Promise.all.'
                : undefined
            }
            if (o.state === 'fulfilled') {
              return `${fails} could not be counted, but the promise was fulfilled with ${o.shown}. The task asks for the failure to reach the caller: Promise.all is rejected as soon as one of its promises fails.`
            }
            return promised(r, 'countAll', null)
          }
          return promised(r, 'countAll', names.map((n) => COUNTS[n]), (r) =>
            arrivalOrder(r, 'countAll', names.map((n) => COUNTS[n])) ?? promisesInside(r) ?? early(r, 'countAll', TOGETHER)
          )
        }
      }))
    })
  },

  board(t) {
    const PARCELS = { 'P-31': 'packed', 'P-48': 'delivered', 'P-50': 'out for delivery' }
    return play(t, {
      file: FILE,
      fn: 'parcelBoard',
      cases: [
        { ids: ['P-31', 'P-48', 'P-50'] },
        { ids: ['P-31', 'P-90', 'P-48'] },
        { ids: ['P-90', 'P-91'] },
        { ids: [] }
      ].map(({ ids }) => {
        const want = ids.map((id) => (id in PARCELS ? `${id}: ${PARCELS[id]}` : `${id}: tracker not answering`))
        const failing = ids.filter((id) => !(id in PARCELS))
        return {
          name: ids.length === 0 ? 'Shows an empty board' : failing.length === ids.length ? 'Shows every parcel when the tracker fails on all' : failing.length ? `Shows the rest when ${failing.join(', ')} fails` : `Shows ${ids.join(', ')}`,
          run: 'board',
          args: [ids, PARCELS],
          setup: `parcelBoard(${show(ids)}), and the tracker answers the last question first${failing.length ? `, failing on ${failing.join(', ')}` : ''}`,
          judge(r) {
            if (!sync(r, 'parcelBoard')) {
              const apart = together(r, 'parcelBoard', ['trackParcel'])
              if (apart) return apart
              const q = questions(r, 'parcelBoard', 'trackParcel', ids, 'tracker')
              if (q) return q
            }
            return promised(r, 'parcelBoard', want, (r) => {
              const o = r.outcome
              if (o.state === 'rejected' && /^No news/.test(o.error.message)) {
                return `One parcel's failure made the whole board fail. Catch each parcel's failure on its own, inside the function you hand map, so the other lines still arrive.`
              }
              if (o.state === 'fulfilled' && failing.length && failing.length < ids.length && !ids.filter((id) => id in PARCELS).some((id) => o.shown.includes(PARCELS[id]))) {
                return 'One failure hid the parcels the tracker did find. Catch each parcel on its own, not all of them at once, so only the failed one shows tracker not answering.'
              }
              if (r.unhandled.length) return 'A failed parcel reached Node with nothing to catch it. Catch each one inside the function you hand map.'
              return arrivalOrder(r, 'parcelBoard', want) ?? promisesInside(r) ?? early(r, 'parcelBoard', TOGETHER)
            })
          }
        }
      })
    })
  },

  async report(t) {
    const text = await readSource(t, FILE)
    const PARCELS = { 'P-31': 'packed', 'P-48': 'delivered' }
    const details = await play(t, {
      file: FILE,
      fn: 'morningReport',
      cases: [
        { names: ['Moss', 'Pear'], ids: ['P-31', 'P-90', 'P-48'] },
        { names: ['Birch'], ids: ['P-48'] }
      ].map(({ names, ids }) => ({
        name: `Reports on ${names.join(', ')} and ${ids.join(', ')}`,
        run: 'report',
        args: [names, ids, COUNTS, PARCELS],
        setup: `morningReport(${show(names)}, ${show(ids)}), and the machines answer the last question first`,
        judge(r) {
          if (!sync(r, 'morningReport')) {
            const q =
              questions(r, 'morningReport', 'countStock', names, 'stock room') ??
              questions(r, 'morningReport', 'trackParcel', ids, 'tracker')
            if (q) return q
            const late = r.calls.filter((c) => c.startedAfter > 0)
            if (late.length) {
              const kinds = new Set(late.map((c) => c.name))
              const earlyKinds = new Set(r.calls.filter((c) => c.startedAfter === 0).map((c) => c.name))
              return kinds.size === 1 && !earlyKinds.has([...kinds][0])
                ? `The ${[...kinds][0] === 'trackParcel' ? 'tracker' : 'stock room'} was only asked once the other machine had answered. Start both lists before waiting for either: Promise.all can wait for two promises as well as for many.`
                : together(r, 'morningReport', ['countStock', 'trackParcel'])
            }
          }
          const want = {
            stock: names.map((n) => COUNTS[n]),
            parcels: ids.map((id) => (id in PARCELS ? `${id}: ${PARCELS[id]}` : `${id}: tracker not answering`))
          }
          return promised(r, 'morningReport', want, (r) =>
            /Promise \{/.test(listed(r))
              ? 'The report holds a promise where a list should be. countAll and parcelBoard give back promises: wait for them before putting them in the object.'
              : r.outcome.state === 'fulfilled' && !listed(r).startsWith('{')
                ? `morningReport gave back a promise of ${listed(r)}, not of an object with stock and parcels.`
                : undefined
          )
        }
      }))
    })
    if (details.length === 1) return details
    const uses = ['countAll', 'parcelBoard'].filter((fn) => calledIn(text, 'morningReport', fn))
    for (const fn of uses) {
      const before = await checks[fn === 'countAll' ? 'all' : 'board'](t)
      if (!before.every((d) => d.passed)) {
        return details.map((d) => (d.passed ? d : { ...d, message: earlier('morningReport', fn).message }))
      }
    }
    return details
  }
}
