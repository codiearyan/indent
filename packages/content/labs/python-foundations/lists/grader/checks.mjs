import { dataCases } from '../../grading.mjs'

const FILE = 'call_list.py'

const count = (list, name) => list.filter((n) => n === name).length

export const checks = {
  async ends(t) {
    const lists = [
      ['Three names', ['Iain', 'Shona', 'Morag']],
      ['One name', ['Kirsty']],
      ['Four names', ['Fergus', 'Rhona', 'Dougie', 'Ailsa']]
    ]
    const first = await dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'first_on_call',
      typed:
        'first_on_call gives back the same name whatever list Check gives it. Read the name from the list it is given.',
      list: lists.map(([name, names]) => ({
        name: `first_on_call: ${name.toLowerCase()}`,
        args: [names],
        expected: names[0],
        hint: (v) =>
          v.value === names[1]
            ? 'first_on_call gives back the second name. Positions in a list start at 0, not 1.'
            : v.value === names.at(-1)
              ? 'first_on_call gives back the last name, not the first.'
              : 'first_on_call does not give back the first name on the list it is given.'
      }))
    })
    const last = await dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'last_on_call',
      typed:
        'last_on_call gives back the same name whatever list Check gives it. Read the name from the list it is given: the lists Check tries are not all the same length.',
      list: lists.map(([name, names]) => ({
        name: `last_on_call: ${name.toLowerCase()}`,
        args: [names],
        expected: names.at(-1),
        hint: (v) =>
          v.value === names.at(-2)
            ? 'last_on_call gives back the name before the last one. Look at the position it reads.'
            : v.value === names[0]
              ? 'last_on_call gives back the first name, not the last.'
              : 'last_on_call does not give back the last name on the list it is given. The lists Check tries are not all the same length.'
      }))
    })
    const both = [...first, ...last]
    // A demo line that fails under Task 1 fails both functions the same way: say it once.
    return both.filter((d, i) => both.findIndex((e) => e.message === d.message && e.name === d.name) === i)
  },

  party(t) {
    const list = [
      ['Five names, a party of 3', ['Iain', 'Shona', 'Morag', 'Fergus', 'Kirsty'], 3],
      ['A party as big as the list', ['Ailsa', 'Dougie'], 2],
      ['A party of 1', ['Rhona', 'Iain', 'Kirsty', 'Shona'], 1],
      ['A list shorter than the party', ['Morag', 'Fergus'], 4]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'hill_party',
      typed:
        'hill_party gives back the same list whatever Check gives it. Make it from the list and the size it is given.',
      list: list.map(([name, names, size]) => ({
        name,
        args: [names, size],
        expected: names.slice(0, size),
        fresh:
          'hill_party gives back the list it was given, under a second name, not a new list, so a change made to the hill party later would change the call-out list too. A slice always makes a new list, even one that holds every name.',
        hint: (v) => {
          const got = JSON.stringify(v.data)
          const like = (a, b) => got === JSON.stringify(names.slice(a, b))
          if (like(0, size - 1)) return 'hill_party gives back one name too few. A slice stops just before the position after the colon.'
          if (like(1, size + 1) || like(1, size)) return 'hill_party leaves out the first name. Positions start at 0, and a slice with nothing before the colon starts there.'
          if (like(0, size + 1)) return 'hill_party gives back one name too many. A slice stops just before the position after the colon, so that number is how many names you get from the start.'
          return 'hill_party does not give back the first names of the list, as many as the size it is given.'
        }
      }))
    })
  },

  join(t) {
    const list = [
      ['A new name', ['Iain', 'Shona'], 'Morag'],
      ['A name already on the list', ['Kirsty', 'Fergus', 'Ailsa'], 'Fergus'],
      ['An empty list', [], 'Dougie']
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'join_list',
      list: list.map(([name, names, joining]) => ({
        name,
        args: [names, joining],
        after: { 0: names.includes(joining) ? names : [...names, joining] },
        afterHint: (held) =>
          count(held, joining) > 1
            ? `${joining} is on the list twice now. A name that is on the list already stays where it is, once: ask whether it is there before adding it.`
            : held[0] === joining && names.length
              ? `${joining} went to the front of the list. A new name joins at the end.`
              : held.length < names.length
                ? 'The list lost a name. join_list only adds, and only a name that is not on it yet.'
                : 'After the call, the list does not hold the names it had with the new one at the end.'
      }))
    })
  },

  leader(t) {
    const list = [
      ['The leader is last', ['Iain', 'Shona', 'Morag'], 'Morag'],
      ['The leader is in the middle', ['Kirsty', 'Fergus', 'Ailsa', 'Dougie'], 'Fergus'],
      ['The leader is first already', ['Rhona', 'Ailsa'], 'Rhona']
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'leader_first',
      list: list.map(([name, names, leader]) => ({
        name,
        args: [names, leader],
        after: { 0: [leader, ...names.filter((n) => n !== leader)] },
        afterHint: (held) =>
          names.some((n) => n !== leader && !held.includes(n))
            ? 'The list lost a name that is not the leader. Putting a value at a position with = replaces the name that was there; a list has a method that puts a value in at a position and moves the others along.'
            : count(held, leader) > 1
              ? `${leader} is on the list twice now. The leader moves to the front, so they are no longer where they were.`
              : count(held, leader) === 0
                ? `${leader} is no longer on the list at all. Take the leader out, then put them back at the front.`
                : held.at(-1) === leader
                  ? `${leader} is at the end of the list. The leader goes to the front.`
                  : 'After the call, the list does not hold the leader first and the others in the order they were in.'
      }))
    })
  },

  next(t) {
    const list = [
      ['Three names', ['Iain', 'Shona', 'Morag']],
      ['One name', ['Kirsty']],
      ['Nobody left', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 5,
      fn: 'next_to_page',
      list: list.map(([name, names]) => ({
        name,
        args: [names],
        expected: names.length ? names[0] : null,
        after: { 0: names.slice(1) },
        hint: (v) =>
          v.value === names.at(-1)
            ? 'next_to_page gives back the last name. pop with nothing in its brackets takes the last item; the next one to page is the first.'
            : names.length
              ? 'next_to_page does not give back the first name of the list it is given.'
              : 'With an empty list there is nobody to page, so next_to_page should give back None.',
        afterHint: (held) =>
          held.length === names.length - 1 && held[0] === names[0]
            ? 'The list lost its last name, not its first. The next one to page comes off the front.'
            : 'After the call, the list should hold the names it had without the first one.'
      }))
    })
  }
}
