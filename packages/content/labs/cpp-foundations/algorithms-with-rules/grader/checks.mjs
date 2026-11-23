import { judgeRule, num } from '../../grading.mjs'

const FILE = 'src/schedule.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const repair = ([ticket, item, minutes]) => `Repair{${ticket}, ${JSON.stringify(item)}, ${minutes}}`
// A list of Check's own, with a repair of ticket 7919 just past its end, so reading at end() gives 7919 the same way every run.
const benchOf = (list) => `check::bench_({${list.map(repair).join(', ')}})`
const BENCH = 'namespace check { inline std::vector<Repair> bench_(std::initializer_list<Repair> rs) { std::vector<Repair> v; v.reserve(rs.size() + 1); for (const Repair& r : rs) v.push_back(r); v.push_back(Repair{7919, "nothing", 7919}); v.pop_back(); return v; } inline std::string tickets_(const std::vector<Repair>& v) { std::string t; for (const Repair& r : v) t += (t.empty() ? "" : ", ") + std::to_string(r.ticket); return t; } }'
const PAST_END = 7919
const base = { files: [FILE], helpers: [BENCH] }
const shown = (list) => (list.length ? list.map(([t, i, m]) => `${t} ${i} ${m} min`).join('; ') : 'no repairs')
const near = (a, b) => Math.abs(Number(a) - b) < 1e-9
const parse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// Check's code for benchFirst runs only when benchFirst gives back a bool, so one that gives back nothing is named, not a build error.
const whenBool = (code) =>
  `[&](auto&& benchFirst) { if constexpr (std::is_same_v<decltype(benchFirst(std::declval<const Repair&>(), std::declval<const Repair&>())), bool>) { ${code} } else { ${put('notBool', 'std::is_void_v<decltype(benchFirst(std::declval<const Repair&>(), std::declval<const Repair&>()))> ? 1 : 2')} } }(benchFirst);`
const notBool = (got) =>
  got.notBool === '1'
    ? 'benchFirst gives back nothing: its result type is void. It answers one question, whether the first repair goes before the second, with a return of true or false.'
    : got.notBool
      ? 'benchFirst gives back something other than a bool. It answers one question, whether the first repair goes before the second, with true or false.'
      : null
const sorted = (list) => [...list].sort((a, b) => b[2] - a[2] || a[0] - b[0])

export const checks = {
  order(t) {
    const pairs = `Repair x{3101, "a", 60}, y{3102, "b", 30}, p{3110, "c", 45}, q{3104, "d", 45}, e{3120, "e", 45};`
    const broken = '(benchFirst(e, e) || (benchFirst(p, q) && benchFirst(q, p)) || (benchFirst(x, y) && benchFirst(y, x)))'
    const lists = [
      ['Five repairs, two pairs with the same minutes', [[3107, 'pocket watch', 90], [3110, 'wall clock', 45], [3102, 'carriage clock', 20], [3101, 'mantel clock', 90], [3104, 'ship clock', 45]]],
      ['Two repairs that are the same, and a tie', [[3120, 'lantern clock', 45], [3101, 'cuckoo clock', 45], [3120, 'lantern clock', 45], [3110, 'wall clock', 90]]],
      ['One repair', [[61, 'pocket watch', 15]]],
      ['No repairs', []]
    ]
    return judgeRule(t, {
      ...base,
      task: 1,
      writes: ['benchFirst', 'benchOrder'],
      tools: [{ fn: 'benchOrder', uses: ['sort'], names: ['benchFirst'] }],
      cases: [
        {
          name: 'benchFirst on two repairs of different minutes, both ways round',
          code: whenBool(`${pairs} ${put('xy', 'benchFirst(x, y)')} ${put('yx', 'benchFirst(y, x)')}`),
          judge: (got) => {
            if (got.notBool) return notBool(got)
            if (got.xy === '1' && got.yx === '1') return 'benchFirst says each of the two repairs goes before the other. For two different repairs, at most one of them goes first.'
            if (got.xy !== '1' && got.yx === '1') return 'benchFirst puts the shorter repair first. The longer repair goes first on the bench.'
            if (got.xy !== '1') return 'benchFirst says neither of a repair of 60 minutes and one of 30 goes first. The longer one does.'
            return null
          },
          output: (got) => `A repair of 60 minutes and one of 30: benchFirst gave back ${got.xy === '1'} one way round and ${got.yx === '1'} the other`
        },
        {
          name: 'benchFirst on two repairs of the same minutes, both ways round',
          code: whenBool(`${pairs} ${put('qp', 'benchFirst(q, p)')} ${put('pq', 'benchFirst(p, q)')}`),
          judge: (got) => {
            if (got.notBool) return notBool(got)
            if (got.qp === '1' && got.pq === '1') return 'For two repairs of the same minutes, benchFirst says each goes before the other. A rule std::sort can use says true at most one way round.'
            if (got.qp !== '1' && got.pq === '1') return 'Of two repairs with the same minutes, benchFirst puts the larger ticket first. The task puts the smaller ticket first.'
            if (got.qp !== '1') return 'Of two repairs with the same minutes, benchFirst says neither goes first, so the order between them is left to chance. The task gives a second rule for them: the smaller ticket goes first.'
            return null
          },
          output: (got) => `Tickets 3104 and 3110, both 45 minutes: benchFirst gave back ${got.qp === '1'} for 3104 before 3110, and ${got.pq === '1'} for 3110 before 3104`
        },
        {
          name: 'benchFirst on a repair and itself',
          code: whenBool(`${pairs} ${put('ee', 'benchFirst(e, e)')}`),
          judge: (got) =>
            got.notBool ? notBool(got) : got.ee === '1'
              ? 'benchFirst says a repair goes before itself, so two equal items each say they come before the other. std::sort is promised a rule that says false for two equal items; one that says true, as <= or >= does, may make it read past the end of the list or never finish.'
              : null,
          output: (got) => `benchFirst(r, r) gave back ${got.ee === '1'}`
        },
        ...lists.map(([name, list]) => ({
          name: `benchOrder: ${name}`,
          code: whenBool(`${pairs} if (${broken}) { ${put('skipped', 1)} } else { std::vector<Repair> v = {${list.map(repair).join(', ')}}; benchOrder(v); ${put('order', 'check::tickets_(v)')} ${put('n', 'v.size()')} }`),
          judge: (got) => {
            const want = sorted(list).map((r) => r[0]).join(', ')
            if (got.notBool) return 'Check did not run benchOrder, because benchFirst does not give back a bool (see above).'
            if (got.skipped) return 'Check did not run benchOrder, because benchFirst breaks the promise std::sort needs (see above): with it, a sort may read past the end of the list.'
            if (num(got, 'n') !== list.length) return `benchOrder left ${got.n} repairs of ${list.length}. It only puts them in order.`
            if ((got.order ?? '') !== want) return `benchOrder put ${shown(list)} in the order of tickets ${got.order || 'none'}. Longest first, and of the same minutes, the smaller ticket first.`
            return null
          },
          output: (got) => `${shown(list)}\nafter benchOrder: ${got.skipped ? 'not run' : got.order ? `tickets ${got.order}` : 'no repairs'}`
        }))
      ]
    })
  },

  find(t) {
    const list = [[3104, 'pocket watch', 45], [3110, 'mantel clock', 90], [3107, 'pocket watch', 20], [3101, 'carriage clock', 0]]
    const cases = [
      [list, 'pocket watch', 3104, 'the first of two'],
      [list, 'carriage clock', 3101, 'the last repair'],
      [list, 'mantel clock', 3110, 'in the middle'],
      [list, 'cuckoo clock', 0, 'an item no repair has'],
      [[], 'pocket watch', 0, 'no repairs at all']
    ]
    return judgeRule(t, {
      ...base,
      task: 2,
      fn: 'ticketFor',
      own: ['Repair'],
      sig: { returns: 'int', params: [{ type: 'const std::vector<Repair>&', what: 'the repairs' }, { type: 'const std::string&', what: 'the item' }] },
      callWith: 'const std::vector<Repair>&, const std::string&',
      tools: [{ fn: 'ticketFor', uses: ['find_if'], lambda: true }],
      cases: cases.map(([l, item, want, what]) => ({
        name: `ticketFor "${item}", ${what}`,
        code: `std::vector<Repair> v = ${benchOf(l)}; ${put('r', `ticketFor(v, ${JSON.stringify(item)})`)}`,
        judge: (got) => {
          const r = num(got, 'r')
          if (r === want) return null
          if (r === PAST_END) return `For "${item}", which ${l.length ? 'no repair has' : 'is in an empty list'}, ticketFor gave back ${PAST_END}, a ticket from just past the end of the list. std::find_if gives back end() when nothing matches, and there is no repair there: compare with end() before reading.`
          if (r === 0 && l[0]?.[1] === item) return `For "${item}", which the first repair has, ticketFor gave back 0. std::find_if gives back begin() when the first repair matches; end() is what it gives back when nothing does.`
          if (want === 0) return `For "${item}", which no repair has, ticketFor gave back ${r}. With no match it gives back 0.`
          if (r === 3107) return `For "${item}", ticketFor gave back 3107, the second pocket watch. std::find_if stops at the first match.`
          return `For "${item}", ticketFor gave back ${r}. It gives back the ticket of the first repair of that item.`
        },
        output: (got) => `With ${shown(l)}:\nticketFor("${item}") gave back ${got.r ?? '?'}`
      }))
    })
  },

  count(t) {
    const list = [[3104, 'pocket watch', 45], [3110, 'mantel clock', 90], [3101, 'carriage clock', 0], [3107, 'wall clock', 30], [3112, 'ship clock', 31]]
    const cases = [
      [list, 30],
      [list, 100],
      [list, -1],
      [[], 30]
    ]
    return judgeRule(t, {
      ...base,
      task: 3,
      fn: 'countLonger',
      own: ['Repair'],
      sig: { returns: 'int', params: [{ type: 'const std::vector<Repair>&', what: 'the repairs' }, { type: 'int', what: 'the limit' }] },
      callWith: 'const std::vector<Repair>&, int',
      tools: [{ fn: 'countLonger', uses: ['count_if'], lambda: true }],
      cases: cases.map(([l, limit]) => {
        const want = l.filter((r) => r[2] > limit).length
        return {
          name: `countLonger with a limit of ${limit}${l.length ? '' : ', no repairs'}`,
          code: `std::vector<Repair> v = ${benchOf(l)}; ${put('r', `countLonger(v, ${limit})`)}`,
          judge: (got) => {
            const r = num(got, 'r')
            if (r === want) return null
            if (r === l.filter((x) => x[2] >= limit).length) return `With a limit of ${limit}, countLonger gave back ${r}: it counts a repair of exactly ${limit} minutes too. The task counts those that take more minutes than the limit.`
            if (r === l.length - want) return `With a limit of ${limit}, countLonger gave back ${r}, the repairs that are not longer than the limit. The test is the wrong way round.`
            return `With a limit of ${limit}, countLonger gave back ${r}. It counts the repairs that take more minutes than the limit.`
          },
          output: (got) => `With minutes ${l.map((x) => x[2]).join(', ') || 'none'}: countLonger(repairs, ${limit}) gave back ${got.r ?? '?'}`
        }
      })
    })
  },

  prices(t) {
    const cases = [
      [[[3104, 'pocket watch', 90], [3110, 'mantel clock', 0], [3107, 'wall clock', 20]], 37.5],
      [[[61, 'ship clock', 45]], 80],
      [[], 40]
    ]
    return judgeRule(t, {
      ...base,
      task: 4,
      fn: 'pricesAt',
      own: ['Repair'],
      sig: { returns: 'std::vector<double>', params: [{ type: 'const std::vector<Repair>&', what: 'the repairs' }, { type: 'double', what: 'the rate' }] },
      callWith: 'const std::vector<Repair>&, double',
      tools: [{ fn: 'pricesAt', uses: ['transform'], lambda: true }],
      crashed: (r, label) =>
        r.signal === 'SIGSEGV' || r.signal === 'SIGBUS'
          ? `The system stopped the program while pricesAt ran, under ${label}: std::transform wrote prices into places that do not exist. std::transform writes over places that are already there and never adds any, so the vector it writes into must have one place for each price before the call.`
          : null,
      cases: cases.map(([l, rate]) => {
        const want = l.map((r) => (r[2] / 60) * rate)
        return {
          name: `pricesAt ${rate} an hour${l.length ? '' : ', no repairs'}`,
          code: `std::vector<Repair> v = ${benchOf(l)}; ${put('p', `pricesAt(v, ${Number.isInteger(rate) ? `${rate}.0` : rate})`)}`,
          judge: (got) => {
            const p = parse(got.p)
            if (!Array.isArray(p)) return 'Check could not read the list pricesAt gave back.'
            if (p.length === 0 && l.length) return `pricesAt gave back no prices for ${l.length} repairs. std::transform writes over places that are already there and never adds any: a vector with no places, or with room set aside but no places, stays empty.`
            if (p.length !== l.length) return `pricesAt gave back ${p.length} prices for ${l.length} repairs. It gives back one price for each repair.`
            if (want.every((w, i) => near(p[i], w))) return null
            const whole = l.map((r) => Math.trunc(r[2] / 60) * rate)
            if (whole.every((w, i) => near(p[i], w))) return `pricesAt gave back ${JSON.stringify(p)}: the minutes became whole hours before the rate, so 20 minutes cost nothing. Minutes divided by 60 is an int divided by an int, and the fraction of an hour is lost.`
            return `pricesAt gave back ${JSON.stringify(p)} for minutes ${l.map((r) => r[2]).join(', ')} at ${rate} an hour. Each price is the minutes in hours, times the rate.`
          },
          output: (got) => `With minutes ${l.map((x) => x[2]).join(', ') || 'none'}: pricesAt(repairs, ${rate}) gave back ${got.p ?? '?'}`
        }
      })
    })
  },

  drop(t) {
    const list = [[3101, 'carriage clock', 0], [3104, 'pocket watch', 45], [3110, 'mantel clock', 0], [3107, 'wall clock', 30], [3112, 'ship clock', 0]]
    const rules = [
      ['Repairs of 0 minutes come off', list, 'r.minutes == 0', (r) => r[2] === 0],
      ['Repairs over 40 minutes come off', list, 'r.minutes > 40', (r) => r[2] > 40],
      ['No repair comes off', list.slice(1, 4), 'r.ticket == 1', () => false],
      ['Every repair comes off', list.slice(0, 3), 'true', () => true],
      ['No repairs at all', [], 'true', () => true]
    ]
    return judgeRule(t, {
      ...base,
      task: 5,
      templates: ['dropWhere'],
      tools: [{ fn: 'dropWhere', uses: ['remove_if'] }],
      // Check calls it once as dropWhere<Rule>, which only a template with Rule as its type allows.
      cause: (errors) =>
        /'dropWhere' does not name a template|'dropWhere' is not a template/.test(errors.map((e) => e.text).join('\n'))
          ? 'Check calls dropWhere once with the type of its rule said in angle brackets, as any function template can be called, and dropWhere is not a template. The task asks for a function template with one type, Rule, the type of the rule it takes.'
          : null,
      crashed: (r, label) =>
        r.signal
          ? `The program stopped while dropWhere ran, under ${label}, at a guard of the standard library: erase was handed a place where there is no repair. erase with one place takes off the one repair there, and end() has none. The leftovers run from the place std::remove_if gives back to the end of the list.`
          : null,
      cases: rules.map(([name, l, test, keepOff], i) => {
        const left = l.filter((r) => !keepOff(r)).map((r) => r[0]).join(', ')
        const asked = l.map((r) => r[0]).sort().join(',')
        return {
          name,
          code: `std::vector<Repair> v = {${l.map(repair).join(', ')}}; int calls = 0; std::vector<int> asked; auto rule = [&calls, &asked](const Repair& r) { calls++; asked.push_back(r.ticket); return ${test}; }; ${i === 0 ? 'dropWhere<decltype(rule)>(v, rule);' : 'dropWhere(v, rule);'} ${put('left', 'check::tickets_(v)')} ${put('n', 'v.size()')} ${put('calls', 'calls')} std::sort(asked.begin(), asked.end()); std::string a; for (int x : asked) a += (a.empty() ? "" : ",") + std::to_string(x); ${put('asked', 'a')}`,
          judge: (got) => {
            const keep = l.filter((r) => !keepOff(r)).length
            if (num(got, 'calls') === 0 && l.length) return "dropWhere never asked Check's rule about a repair. The rule it is handed decides which repairs come off: hand it to std::remove_if."
            if (num(got, 'calls') > l.length) return `dropWhere asked Check's rule ${got.calls} times about ${l.length} repairs. It asks about each repair once: the rule is handed to std::remove_if alone, which asks it once per repair.`
            if ((got.asked ?? '') !== asked) return `dropWhere asked Check's rule about the tickets ${(got.asked ?? '').replaceAll(',', ', ') || 'none'}, and the list holds ${asked.replaceAll(',', ', ')}. It asks about every repair of the list, from its first to its last.`
            if (num(got, 'n') === l.length && keep !== l.length) return `Afterwards Check's list still has all ${l.length} of its repairs: ${keep ? `the ones it keeps come first, and at its end ${l.length - keep === 1 ? 'is a leftover place' : 'are leftover places'}` : 'all of them are leftover places'} that std::remove_if moved past. std::remove_if only moves what stays to the front and gives back where that ends; the list is cut there with erase.`
            if ((got.left ?? '') !== left) return `After dropWhere, Check's list holds the tickets ${got.left || 'none'}. It keeps the repairs the rule says false for, and only those, in their order.`
            return null
          },
          output: (got) => `${shown(l)}\nthe rule: ${test}\nafter dropWhere: ${got.left ? `tickets ${got.left}` : 'no repairs'}; the rule was asked ${got.calls ?? '?'} times`
        }
      })
    })
  }
}
