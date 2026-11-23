import { dataCases, equalData, set } from '../../grading.mjs'

const FILE = 'call_signs.py'

const unique = (list) => [...new Set(list)]

export const checks = {
  different(t) {
    const list = [
      ['Some heard more than once', ['Echo one', 'Golf six', 'Echo one', 'Echo one', 'Hotel nine']],
      ['Every one different', ['Kilo five', 'Lima two']],
      ['Nothing heard', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'different_signs',
      typed:
        'different_signs gives back the same number whatever Check gives it. Work it out from the list it is given.',
      list: list.map(([name, calls]) => ({
        name,
        args: [calls],
        expected: unique(calls).length,
        hint: (v) =>
          v.value === calls.length
            ? 'different_signs counts every call, the same call sign more than once. The task asks how many different call signs there are.'
            : 'different_signs does not give back how many different call signs the list holds.'
      }))
    })
  },

  repeat(t) {
    const list = [
      ['A repeat after a repeat', ['Echo one', 'Golf six', 'Golf six', 'Echo one']],
      ['A repeat at the end', ['Kilo five', 'Lima two', 'Mike four', 'Lima two']],
      ['No repeat', ['Echo one', 'Golf six', 'Hotel nine']]
    ]
    const firstRepeat = (calls) => {
      const seen = new Set()
      for (const call of calls) {
        if (seen.has(call)) return call
        seen.add(call)
      }
      return null
    }
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'first_repeat',
      list: list.map(([name, calls]) => ({
        name,
        args: [calls],
        expected: firstRepeat(calls),
        hint: (v) =>
          firstRepeat(calls) === null
            ? 'No call sign is heard twice here, so first_repeat should give back None.'
            : v.value === calls[0]
              ? `first_repeat gives back ${calls[0]}, the call sign heard first. The task asks for the first call that is heard a second time: go through the calls in order, and stop at the first one already heard.`
              : 'first_repeat does not give back the first call sign heard for a second time.',
        noneHint:
          'first_repeat gives back None, and a call sign is heard twice here. Look at when a call sign goes into the set, and when the function asks whether it is there.'
      }))
    })
  },

  both(t) {
    const list = [
      ['Two names on both', ['Shona', 'Morag', 'Fergus', 'Iain'], ['Iain', 'Kirsty', 'Shona']],
      ['Nobody on both', ['Ailsa', 'Dougie'], ['Rhona', 'Kirsty']],
      ['Everyone on both', ['Rhona', 'Iain'], ['Iain', 'Rhona']]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'on_both',
      typed:
        'on_both gives back the same names whatever rotas Check gives it. Work them out from the two lists it is given.',
      list: list.map(([name, first, second]) => {
        const both = first.filter((n) => second.includes(n))
        return {
          name,
          args: [first, second],
          expected: set(...both),
          hint: (v) =>
            equalData(v.data, set(...unique([...first, ...second])))
              ? 'on_both gives back everyone on either rota. The task asks for the names on both.'
              : equalData(v.data, set(...first.filter((n) => !second.includes(n))))
                ? 'on_both gives back the names on the first rota and not the second. The task asks for the names on both.'
                : 'on_both does not give back the names that are on both rotas.'
        }
      })
    })
  },

  unknown(t) {
    // Many unknown signs in two cases: a set comes out in an order that changes from run to run,
    // so a list made from a set without sorting it is in alphabetical order by chance far too
    // rarely to pass.
    const list = [
      [
        'Seven unknown, one heard twice',
        ['Zulu one', 'Echo one', 'Oscar two', 'Mike four', 'Zulu one', 'Bravo six', 'Yankee two', 'Hotel nine', 'Kilo five'],
        ['Echo one']
      ],
      ['All known', ['Echo one', 'Golf six'], ['Golf six', 'Echo one', 'Kilo five']],
      [
        'Nothing known',
        ['Papa three', 'India one', 'Whisky two', 'Delta four', 'Sierra one', 'Lima two', 'Tango six', 'Alpha five'],
        []
      ]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'unknown_signs',
      typed:
        'unknown_signs gives back the same list whatever Check gives it. Work it out from the two lists it is given.',
      list: list.map(([name, calls, known]) => {
        const left = calls.filter((c) => !known.includes(c))
        const want = unique(left).sort()
        return {
          name,
          args: [calls, known],
          expected: want,
          noneHint:
            'unknown_signs gives back None. Look at the return line. A method such as sort changes the list itself, and what it gives back is always None.',
          hint: (v) => {
            const got = Array.isArray(v.data) ? v.data : []
            if (got.length > want.length && equalData(unique(got).sort(), want))
              return 'A call sign heard twice is in the list twice. Each one should be there once.'
            if (equalData([...got].sort(), want)) return 'unknown_signs gives back the right call signs, but not in alphabetical order.'
            return 'unknown_signs does not give back the call signs heard that the team does not know.'
          }
        }
      })
    })
  }
}
