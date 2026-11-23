import { dataCases, namedOnly } from '../../grading.mjs'

const FILE = 'kit_orders.py'

const float = (n) => ({ '@float': n })

// Check's own weight_of, so a mistake in Task 2 does not count in Task 3.
const WEIGHT_OF = `
def weight_of(weights, kind):
    if kind not in weights:
        raise ValueError(f"no weight for {kind!r} on the list")
    return weights[kind]
`
const noWeight = (kind) => `no weight for '${kind}' on the list`

const PRINTED =
  'print only shows a line, and the code that called carries on as if the order were fine. raise stops the function and hands the error to the caller.'

export const checks = {
  order(t) {
    const store = () => ({ rope: 5, splint: 2, flare: 12 })
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'take_out',
      raising: true,
      list: [
        {
          name: 'An order the store can fill',
          args: [store(), 'rope', 2],
          expected: 3,
          after: { 0: { ...store(), rope: 3 } },
          afterHint: 'After the call, the store does not hold the count of that kind lowered by the count taken out.',
          hint: 'take_out does not give back how many of that kind are left.'
        },
        {
          name: 'Every one of a kind',
          args: [store(), 'splint', 2],
          expected: 0,
          after: { 0: { ...store(), splint: 0 } },
          afterHint: 'After taking every one of a kind, the store should hold 0 of it.',
          hint: 'take_out does not give back how many of that kind are left.',
          ownHint: 'Taking out exactly as many as the store holds is an order it can fill: refuse only a count more than the store holds.'
        },
        {
          name: 'A count of 0 is refused',
          args: [store(), 'rope', 0],
          raises: { type: 'ValueError', own: true, has: ['0'], names: 'the count it was given' }
        },
        {
          name: 'A count below 0 is refused',
          args: [store(), 'flare', -3],
          raises: { type: 'ValueError', own: true, has: ['-3'], names: 'the count it was given' }
        },
        {
          name: 'More than the store holds is refused',
          args: [store(), 'flare', 15],
          raises: { type: 'ValueError', own: true, has: ['flare', '12'], names: 'the kind and how many the store holds' }
        },
        {
          name: 'A kind the store does not hold',
          args: [store(), 'helmet', 1],
          raises: {
            type: 'KeyError',
            swallowed: (v) =>
              `take_out gave back ${v.repr} for a kind that is not in the store. Reading the count of that kind stops with KeyError, and the task leaves that error to reach the caller as it is.`,
            wrongType: 'For a kind that is not in the store, the task leaves the KeyError from reading its count to reach the caller as it is.'
          }
        }
      ].map((c) =>
        c.raises?.own
          ? {
              ...c,
              raises: {
                ...c.raises,
                swallowed: (v, call) =>
                  call.lines.length
                    ? `take_out printed a line and gave back ${v.repr} for an order it cannot fill. ${PRINTED}`
                    : `take_out gave back ${v.repr} for an order it cannot fill. The task asks it to refuse that order with raise, before it changes the store.`
              }
            }
          : c
      )
    })
  },

  unknown(t) {
    const weights = { helmet: 0.5, 'bivvy bag': 1.25, flare: 0.25 }
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'weight_of',
      raising: true,
      errors: (e) =>
        e.type !== 'KeyError'
          ? null
          : e.own
            ? 'your raise line raises KeyError, and for a kind that is not on the list the task asks for a ValueError, with a message that names the kind'
            : `the weights have no kind ${e.message}, and square brackets stop with KeyError for a key that is not there. For a kind that is not on the list the task asks for a ValueError raised by your own raise line, with a message that names the kind`,
      list: [
        {
          name: 'A kind on the list',
          args: [weights, 'bivvy bag'],
          expected: float(1.25),
          hint: 'weight_of does not give back the weight of a kind that is on the list.'
        },
        {
          name: 'Another kind on the list',
          args: [weights, 'flare'],
          expected: float(0.25),
          hint: 'weight_of does not give back the weight of a kind that is on the list.'
        },
        ...[
          ['A misspelt kind is refused', 'helmets'],
          ['A kind that is not on the list is refused', 'ice axe']
        ].map(([name, kind]) => ({
          name,
          args: [weights, kind],
          raises: {
            type: 'ValueError',
            own: true,
            has: [kind],
            names: 'the kind it was given',
            wrongType:
              'For a kind that is not on the list, the task asks for a ValueError raised by your own raise line, with a message that names the kind.',
            swallowed: (v, call) =>
              call.lines.length
                ? `weight_of printed a line and gave back ${v.repr} for a kind that is not on the list. ${PRINTED}`
                : `weight_of gave back ${v.repr} for a kind that is not on the list. The code that adds up a pack would stop much later with a TypeError, far from the cause: the task asks weight_of to raise ValueError right there, naming the kind.`
          }
        }))
      ]
    })
  },

  async again(t) {
    const weights = { rope: 4.5, helmet: 0.5, flare: 0.25 }
    const NOTED = (got) =>
      Array.isArray(got) && got.some((x) => x && typeof x === 'object' && x['@other'])
        ? 'The list of problems holds the error itself. The task asks for the message of the error: str(error), or an f-string with the error in it.'
        : null
    return namedOnly(t, FILE, 3, 'weigh_pack', 'ValueError', await dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'weigh_pack',
      raising: true,
      define: WEIGHT_OF,
      list: [
        {
          name: 'Every kind on the list',
          args: [weights, ['rope', 'helmet'], []],
          expected: float(5),
          hint: 'weigh_pack does not give back the weights of the kinds added up.'
        },
        {
          name: 'A kind twice',
          args: [weights, ['flare', 'flare', 'rope'], ['an earlier problem']],
          expected: float(5),
          hint: 'weigh_pack does not give back the weights of the kinds added up, each kind as often as it is on the list.'
        },
        {
          name: 'A kind not on the list is noted and passed on',
          args: [weights, ['rope', 'ropes'], ['an earlier problem']],
          after: { 2: ['an earlier problem', noWeight('ropes')] },
          afterHint: (got) =>
            NOTED(got) ??
            'After the call, the list of problems does not hold what it held before and the message of the error after it, once.',
          raises: {
            type: 'ValueError',
            message: noWeight('ropes'),
            messageHint:
              'The error that reaches the caller is not the one weight_of raised: its message is another. A raise on its own, in the except block, sends on the same error.',
            wrongType:
              'The error that reaches the caller should be the ValueError weight_of raised. A raise on its own, in the except block, sends on the same error.',
            swallowed: (v) =>
              `weigh_pack gave back ${v.repr} for a kind not on the list. The task asks it to note the problem and then raise the same error again, so the code that called it still stops.`
          }
        },
        {
          name: 'Another error is not noted',
          args: [{ ...weights, rope: '4.5' }, ['helmet', 'rope'], []],
          afterHint: (got) =>
            NOTED(got) ??
            'weigh_pack noted an error that is not a kind missing from the list: here a weight is text, and adding it stops with TypeError. The task asks to note only the ValueError from weight_of: name only that error after except.',
          raises: {
            type: 'TypeError',
            swallowed: (v) =>
              `weigh_pack gave back ${v.repr}, and here adding a weight that is text stops with TypeError, which the task says must reach the caller. Name only ValueError after except.`
          }
        }
      ]
    }))
  }
}
