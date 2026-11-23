import { dataCases, equalData } from '../../grading.mjs'

const FILE = 'store_counts.py'

const STORE = { splint: 4, flare: 10, 'bivvy bag': 1, compass: 7 }

/** A store in which `kind` has `count` fewer, and is gone when none are left. */
function after(store, kind, count) {
  const left = { ...store, [kind]: store[kind] - count }
  if (left[kind] === 0) delete left[kind]
  return left
}

/** The words for a loop that goes through a dictionary as if it gave values or pairs. */
function keysOnly(error) {
  if (/values to unpack/.test(error.message)) {
    return 'going through a dictionary itself gives only its keys, one at a time, so two names after for take apart each key, a text, instead of a key and its value. The lesson shows how to go through each key with its value'
  }
  if (/'<' not supported between instances of 'str' and 'int'|'(<|>|<=|>=)' not supported/.test(error.message)) {
    return 'the loop compares a text with a number. Going through a dictionary itself gives only its keys, the names of the kit, not the counts'
  }
  return null
}

export const checks = {
  count(t) {
    const list = [
      ['A kind in the store', 'flare', 10],
      ['Another kind', 'bivvy bag', 1],
      ['A kind not in the store', 'ice axe', 0]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'in_store',
      typed:
        'in_store gives back the same number whatever Check gives it. Read the count from the store it is given.',
      list: list.map(([name, kind, count]) => ({
        name,
        args: [STORE, kind],
        expected: count,
        noneHint: count
          ? undefined
          : 'in_store gives back None for a kind the store does not have, and the task asks for 0. Look at what it gives back when the key is missing: get gives back None then, unless it is told what to give back instead.',
        hint: count
          ? 'in_store does not give back the count the store holds for that kind.'
          : 'in_store gives back something other than 0 for a kind the store does not have.'
      }))
    })
  },

  out(t) {
    const list = [
      ['Some signed out', { rope: 9, radio: 6 }, 'rope', 3],
      ['The last ones signed out', { radio: 6, stretcher: 2, rope: 9 }, 'stretcher', 2],
      ['One signed out', { 'head torch': 14 }, 'head torch', 1]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'take_out',
      list: list.map(([name, store, kind, count]) => ({
        name,
        args: [store, kind, count],
        after: { 0: after(store, kind, count) },
        afterHint: (held) => {
          const pairs = held['@dict'] ?? []
          const got = Object.fromEntries(pairs)
          if (got[kind] === 0) return `The store still has ${kind} with a count of 0. When none are left, the kind comes out of the store.`
          if (got[kind] === count) return `The count for ${kind} is now the number signed out, not what is left.`
          if (got[kind] === store[kind] + count) return `The count for ${kind} went up. Signing out lowers it.`
          if (!(kind in got) && store[kind] !== count) return `${kind} came out of the store while some were still left.`
          if (pairs.length < Object.keys(store).length - 1) return 'The store lost a kind that was not signed out.'
          return `After the call, the count for ${kind} is not the old count less the number signed out.`
        }
      }))
    })
  },

  tally(t) {
    const list = [
      ['Some kinds more than once', ['splint', 'flare', 'splint', 'map', 'splint', 'flare']],
      ['Every kind once', ['rope', 'radio']],
      ['Nothing came back', []]
    ]
    const tally = (items) => {
      const counts = {}
      for (const item of items) counts[item] = (counts[item] ?? 0) + 1
      return counts
    }
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'count_items',
      typed:
        'count_items gives back the same dictionary whatever list Check gives it. Count the list it is given.',
      list: list.map(([name, items]) => ({
        name,
        args: [items],
        expected: tally(items),
        hint: (v) => {
          const got = Object.fromEntries(v.data?.['@dict'] ?? [])
          const ones = Object.fromEntries(items.map((item) => [item, 1]))
          if (equalData(got, ones) && items.length !== Object.keys(ones).length)
            return 'Every kind has a count of 1. The count starts again each time a kind comes round: set it to 1 only the first time, and add 1 after that.'
          if (Object.keys(got).length === 1 && Object.keys(ones).length > 1)
            return 'count_items gives back one kind only. A dictionary made inside the loop starts again empty on every round: make it before the loop, and give it back after.'
          if (Object.keys(got).length !== Object.keys(ones).length)
            return 'count_items does not give back one key for each kind on the list.'
          return 'count_items does not give back how many times each kind is on the list.'
        }
      }))
    })
  },

  low(t) {
    const list = [
      ['Some running low', 5, ['splint', 'bivvy bag']],
      ['A count exactly on the line', 7, ['splint', 'bivvy bag']],
      ['None running low', 1, []],
      ['Every kind running low', 11, ['splint', 'flare', 'bivvy bag', 'compass']]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'running_low',
      errors: keysOnly,
      typed:
        'running_low gives back the same list whatever Check gives it. Work it out from the store and the number it is given.',
      list: list.map(([name, smallest, low]) => ({
        name,
        args: [STORE, smallest],
        expected: low,
        hint: (v) => {
          const got = Array.isArray(v.data) ? v.data : []
          if (got.some((x) => typeof x === 'number')) return 'running_low gives back counts. The task asks for the names of the kinds.'
          const onLine = Object.keys(STORE).find((kind) => STORE[kind] === smallest)
          if (onLine && got.includes(onLine))
            return `The ${onLine} count is exactly ${smallest}, which is not fewer than ${smallest}.`
          return 'running_low does not give back the kinds with fewer than that many, in the order of the store.'
        }
      }))
    })
  },

  hours(t) {
    const callouts = [
      { hill: 'Meall Odhar', hours: 4, crew: 7 },
      { hill: 'Scarth Fell', hours: 6, crew: 5 },
      { hill: 'Meall Odhar', hours: 1, crew: 3 },
      { hill: 'Beinn Ruadh', hours: 9, crew: 10 },
      { hill: 'Meall Odhar', hours: 2, crew: 6 }
    ]
    const list = [
      ['A hill with three callouts', 'Meall Odhar'],
      ['A hill with one', 'Beinn Ruadh'],
      ['A hill with none', 'Carn Dubh']
    ]
    return dataCases(t, {
      file: FILE,
      task: 5,
      fn: 'hours_on',
      typed:
        'hours_on gives back the same number whatever hill Check asks about. Work it out from the callouts and the hill it is given.',
      list: list.map(([name, hill]) => {
        const on = callouts.filter((c) => c.hill === hill)
        return {
          name,
          args: [callouts, hill],
          expected: on.reduce((sum, c) => sum + c.hours, 0),
          hint: (v) =>
            on.length > 1 && v.value === on.length
              ? 'hours_on gives back how many callouts there were on that hill. The task asks for their hours added up.'
              : on.length > 1 && v.value === on.at(-1).hours
                ? 'hours_on gives back the hours of the last callout on that hill only. Add each one to a total that starts before the loop.'
                : on.length && v.value === 0 && callouts.at(-1).hill !== hill
                  ? 'hours_on gives back 0 for a hill that had a callout. A total that starts inside the loop goes back to 0 on every round, so only the last callout of the list can count: start it before the loop.'
                : v.value === on.reduce((sum, c) => sum + c.crew, 0) && on.length
                  ? 'hours_on adds up the crew. The task asks for the hours.'
                  : 'hours_on does not give back the hours of every callout on that hill added up.'
        }
      })
    })
  }
}
