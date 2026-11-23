import { judgeTypes, recordShown } from '../../grading.mjs'

const FILE = 'src/bench.cpp'
const types = {
  Repair: [
    ['ticket', 'int'],
    ['item', 'std::string'],
    ['minutes', 'int'],
    ['done', 'bool']
  ]
}
const repair = (ticket, item, minutes, done = false) => ({ ticket, item, minutes, done })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const EMPTY = repair(0, '', 0, false)

export const checks = {
  label(t) {
    const cases = [repair(4417, 'carriage clock', 95), repair(5020, 'pocket watch', 30, true), repair(7, 'cuckoo clock', 0)]
    return judgeTypes(t, {
      files: [FILE],
      task: 1,
      fn: 'benchLabel',
      types,
      returns: 'std::string',
      params: [{ name: 'repair', what: 'the repair', type: 'Repair', const: true, after: true, want: 'const Repair&' }],
      typed: 'Check called benchLabel with other repairs and got the same label back each time. Build the label from the repair it is given.',
      cases: cases.map((r) => {
        const base = `${r.ticket} ${r.item}, ${r.minutes} min`
        const want = r.done ? `${base}, done` : base
        return {
          name: `The label of ticket ${r.ticket}${r.done ? ', done' : ''}`,
          args: [r],
          expect: { result: want, printed: '', args: [r] },
          hint: (run) => {
            const got = typeof run.result === 'string' ? run.result : ''
            if (r.done && got === base) return 'This repair is done, and its label does not say so. done is true here, so ", done" goes on the end.'
            if (!r.done && got === `${base}, done`) return 'This repair is not done, and its label says it is. ", done" only goes on when done is true.'
            if (!got.includes(String(r.ticket))) return 'The ticket is not in the label as a number. A number becomes text with std::to_string before it is joined to other text.'
            return `benchLabel gives back "${got}", which is not the task's label for this repair. Look at the words and spaces between the parts.`
          }
        }
      })
    })
  },

  log(t) {
    const cases = [
      [repair(4417, 'carriage clock', 95), 20],
      [repair(5020, 'pocket watch', 0), 45],
      [repair(7, 'cuckoo clock', 30, true), 5]
    ]
    return judgeTypes(t, {
      files: [FILE],
      task: 2,
      fn: 'logTime',
      types,
      returns: 'void',
      params: [
        { name: 'repair', what: 'the repair', type: 'Repair', after: true },
        { name: 'minutes', what: 'the minutes', type: 'int', want: 'int' }
      ],
      cases: cases.map(([r, minutes]) => {
        const want = { ...r, minutes: r.minutes + minutes }
        return {
          name: `${minutes} minutes on ticket ${r.ticket}, which had ${r.minutes}`,
          args: [r, minutes],
          expect: { printed: '', args: [want] },
          hint: (run) => {
            const got = run.args[0] ?? {}
            if (same(got, r)) return "Check's own repair did not change. logTime changed a copy of it: a parameter is a copy of what the caller passed, unless it is a reference."
            if (got.minutes === minutes && r.minutes !== 0) return `The repair's minutes are ${minutes} afterwards: the minutes it had are gone. The new minutes are added to what was there.`
            const other = ['ticket', 'item', 'done'].find((m) => got[m] !== r[m])
            if (other) return `logTime changed the repair's ${other} too. It only adds to the minutes.`
            return `Afterwards the repair has ${got.minutes} minutes, which is not the ${r.minutes} it had plus the ${minutes} logged.`
          }
        }
      })
    })
  },

  open(t) {
    const cases = [
      [[repair(4417, 'carriage clock', 95), repair(5020, 'pocket watch', 30, true), repair(7, 'cuckoo clock', 0)], 12],
      [[repair(61, 'wall clock', 10, true)], 25],
      [[repair(62, 'alarm clock', 5), repair(63, 'travel clock', 40)], 3],
      [[], 10]
    ]
    return judgeTypes(t, {
      files: [FILE],
      task: 3,
      fn: 'addToOpen',
      types,
      returns: 'void',
      params: [
        { name: 'repairs', what: 'the repairs', type: 'std::vector<Repair>', after: true },
        { name: 'minutes', what: 'the minutes', type: 'int', want: 'int' }
      ],
      cases: cases.map(([list, minutes]) => {
        const want = list.map((r) => (r.done ? r : { ...r, minutes: r.minutes + minutes }))
        return {
          name: list.length ? `${minutes} minutes on ${list.map((r) => `${r.ticket}${r.done ? ' (done)' : ''}`).join(', ')}` : `${minutes} minutes on an empty bench`,
          args: [list, minutes],
          expect: { printed: '', args: [want] },
          hint: (run) => {
            const got = run.args[0] ?? []
            if (same(got, list) && list.some((r) => !r.done)) {
              return "Check's own repairs did not change. Either addToOpen takes the vector as a copy, or its loop changes copies: a loop variable without & is a copy of each repair, and a change to it is lost when the round ends."
            }
            if (got.some((r, i) => list[i]?.done && r.minutes !== list[i].minutes)) return 'A repair that is done got the minutes too. Only the repairs that are not done get them.'
            if (got.length !== list.length) return "addToOpen changed how many repairs the vector holds. It only changes the minutes of the ones already there."
            return 'Afterwards the repairs are not what they were with the minutes added to each one that is not done.'
          }
        }
      })
    })
  },

  find(t) {
    const bench = [repair(4417, 'carriage clock', 95), repair(5020, 'pocket watch', 30, true), repair(7, 'cuckoo clock', 0)]
    const cases = [
      [bench, 5020],
      [bench, 7],
      [bench, 4417],
      [bench, 9999],
      [[], 4417]
    ]
    return judgeTypes(t, {
      files: [FILE],
      task: 4,
      fn: 'findTicket',
      types,
      returns: 'Repair',
      params: [
        { name: 'repairs', what: 'the repairs', type: 'std::vector<Repair>', const: true, after: true, want: 'const std::vector<Repair>&' },
        { name: 'ticket', what: 'the ticket', type: 'int', want: 'int' }
      ],
      typed: 'Check asked findTicket for other tickets and got the same repair back each time. Look through the repairs it is given for the ticket it is given.',
      cases: cases.map(([list, ticket]) => {
        const at = list.findIndex((r) => r.ticket === ticket)
        const want = at === -1 ? EMPTY : list[at]
        return {
          name: list.length ? `Ticket ${ticket} among ${list.map((r) => r.ticket).join(', ')}` : `Ticket ${ticket} on an empty bench`,
          args: [list, ticket],
          expect: { result: want, printed: '', args: [list] },
          hint: (run) => {
            const got = run.result ?? {}
            if (at > 0 && same(got, EMPTY)) {
              return `findTicket gives back an empty repair for ${ticket}, which is at place ${at + 1}. It can only say none has the ticket once it has looked at every repair, so that return comes after the loop.`
            }
            if (at === -1 && !same(got, EMPTY)) {
              return `No repair has ticket ${ticket}, and findTicket gave back ${recordShown(got)}. When none has it, it gives back a new Repair with nothing filled in.`
            }
            if (at !== -1 && list.length > 1 && same(got, list.at(-1))) return 'findTicket gives back the last repair, whatever the ticket. It gives back the one whose ticket is the one asked for, as soon as it finds it.'
            if (at !== -1 && same(got, list[0])) return 'findTicket gives back the first repair, whatever the ticket. Compare each repair\'s ticket with the one asked for.'
            return `findTicket does not give back the repair with ticket ${ticket}.`
          }
        }
      })
    })
  }
}
