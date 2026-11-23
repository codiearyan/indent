import { judgeRule, num, thrownText } from '../../grading.mjs'

const FILE = 'src/rules.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const MINUTES_RULE = 'std::function<int(const Repair&)>'
const ACTION = 'std::function<void(Repair&)>'
const TABLE = `std::map<std::string, ${ACTION}>`
const base = { files: [FILE], counted: true, own: ['Repair', MINUTES_RULE, ACTION, TABLE] }
const LEFTOVER_HINT = (got) => Object.values(got).some((v) => Math.abs(Number(v)) > 100000)
// A dangling read gives 0x5A bytes: minutes far from any rule's, never quoted back.
const mins = (v) => (v === undefined ? '?' : Math.abs(Number(v)) > 100000 ? 'minutes that have nothing to do with the rule' : `${v} minutes`)
const DANGLING = 'What the rule refers to had ended when it was called: a capture by reference keeps no copy of its own. A rule that is called after the function that made it has returned keeps copies of what it needs.'
const benchOf = (list) => `std::vector<Repair> bench; bench.reserve(${list.length}); ${list.map(([t, i]) => `bench.push_back(Repair(${t}, ${JSON.stringify(i)}));`).join(' ')}`
const minutesOf = 'std::string ms; for (const Repair& r : bench) ms += (ms.empty() ? "" : ", ") + std::to_string(r.getMinutes());'
const emptyCalled = (got) => got.threw !== undefined && /bad_function_call/.test(`${got.threw} ${got.what ?? ''}`)
const escaped = (who) => (got) =>
  emptyCalled(got)
    ? `${who} called an empty std::function, which holds no function to run, so it threw std::bad_function_call. Ask a std::function whether it holds a function before you call it.`
    : null

export const checks = {
  logEach(t) {
    const list = [[3101, 'mantel clock'], [3104, 'pocket watch'], [3110, 'wall clock']]
    // Check's rule: a number of minutes worked out from the ticket, so each repair gets its own.
    const counted = `int calls = 0; std::string asked; ${MINUTES_RULE} rule = [&calls, &asked](const Repair& r) { calls++; asked += (asked.empty() ? "" : ", ") + std::to_string(r.getTicket()); return r.getTicket() % 100; };`
    return judgeRule(t, {
      ...base,
      task: 1,
      fn: 'logEach',
      sig: {
        returns: 'int',
        params: [
          { type: 'std::vector<Repair>&', what: 'the bench' },
          { type: `const ${MINUTES_RULE}&`, what: 'the rule' }
        ]
      },
      callWith: `std::vector<Repair>&, const ${MINUTES_RULE}&`,
      tools: [{ fn: 'logEach', uses: [] }],
      cases: [
        {
          name: "logEach with Check's rule on three repairs",
          code: `${benchOf(list)} ${counted} ${put('total', 'logEach(bench, rule)')} ${minutesOf} ${put('ms', 'ms')} ${put('calls', 'calls')} ${put('asked', 'asked')}`,
          judge: (got) => {
            if (num(got, 'calls') === 0) return "logEach never called Check's rule. It asks the rule how many minutes each repair gets."
            if (num(got, 'calls') > list.length) return `logEach called Check's rule ${got.calls} times for ${list.length} repairs. It asks the rule once per repair: keep what it gives back in a variable, and use that for the repair and for the total.`
            if (got.asked !== '3101, 3104, 3110') return `logEach asked Check's rule about the tickets ${got.asked}, and the bench holds 3101, 3104 and 3110, in that order. It asks about each repair once, in order.`
            if (got.ms !== '1, 4, 10') return `After logEach, Check's repairs have ${got.ms} minutes, and the rule gave 1, 4 and 10 for them. Each repair gets the minutes the rule gives for it, added to the bench's own repair: the loop takes each repair by reference.`
            if (num(got, 'total') !== 15) return `logEach gave back ${got.total}, and it added 1, 4 and 10 minutes. It gives back all the minutes it added.`
            return null
          },
          output: (got) => `Check's rule gives 1, 4 and 10 minutes for tickets 3101, 3104 and 3110\nlogEach gave back ${got.total ?? '?'}; the repairs have ${got.ms ?? '?'} minutes; the rule was asked ${got.calls ?? '?'} times`
        },
        {
          name: 'logEach with an empty rule',
          escaped: escaped('logEach'),
          code: `${benchOf(list.slice(0, 2))} ${MINUTES_RULE} rule; ${put('total', 'logEach(bench, rule)')} ${minutesOf} ${put('ms', 'ms')}`,
          judge: (got) => (num(got, 'total') !== 0 || got.ms !== '0, 0' ? `With an empty rule, logEach gave back ${got.total} and the repairs have ${got.ms} minutes. With no rule, nothing is added.` : null),
          output: (got) => `logEach with an empty rule gave back ${got.total ?? '?'}; the repairs have ${got.ms ?? '?'} minutes`
        },
        {
          name: 'logEach on an empty bench',
          code: `std::vector<Repair> bench; ${counted} ${put('total', 'logEach(bench, rule)')} ${put('calls', 'calls')}`,
          judge: (got) => (num(got, 'total') !== 0 ? `On an empty bench, logEach gave back ${got.total}. With no repairs, nothing is added.` : null),
          output: (got) => `logEach on an empty bench gave back ${got.total ?? '?'}`
        }
      ]
    })
  },

  addTime(t) {
    const make = (n) => `${ACTION} rule = indent8_::deep_([&] { return addTime(${n}); }); indent8_::scrub_();`
    return judgeRule(t, {
      ...base,
      task: 2,
      fn: 'addTime',
      sig: { returns: ACTION, params: [{ type: 'int', what: 'the minutes' }] },
      callWith: 'int',
      tools: [{ fn: 'addTime', uses: [] }],
      cases: [
        ...[
          [25, 'twice on one repair'],
          [90, 'on two repairs']
        ].map(([n, what]) => ({
          name: `A rule from addTime(${n}), called ${what}`,
          escaped: escaped('The rule addTime gave back'),
          code: `${make(n)} Repair a(3101, "mantel clock"); Repair b(3104, "pocket watch"); ${put('empty', 'rule ? 0 : 1')} if (rule) { rule(a); indent8_::scrub_(); rule(${what.includes('twice') ? 'a' : 'b'}); } ${put('a', 'a.getMinutes()')} ${put('b', 'b.getMinutes()')}`,
          judge: (got) => {
            const twice = what.includes('twice')
            if (num(got, 'empty') === 1) return `addTime(${n}) gave back an empty std::function, which holds no rule to run. It gives back the rule itself.`
            const wrong = twice ? num(got, 'a') !== 2 * n || num(got, 'b') !== 0 : num(got, 'a') !== n || num(got, 'b') !== n
            if (LEFTOVER_HINT(got)) return `After the rule from addTime(${n}) ran ${twice ? 'twice on one repair, the repair holds' : 'once on each of two repairs, the repairs hold'} minutes that have nothing to do with ${n}. The rule's lambda captures by reference. ${DANGLING}`
            if (wrong) return `After the rule from addTime(${n}) ran ${twice ? 'twice on one repair' : 'once on each of two repairs'}, they have ${got.a} and ${got.b} minutes. Each call adds ${n} minutes to the repair it is called with.`
            return null
          },
          output: (got) =>
            what.includes('twice')
              ? `The rule from addTime(${n}), called twice on one repair: the repair has ${mins(got.a)}`
              : `The rule from addTime(${n}), called on two repairs: they have ${mins(got.a)} and ${mins(got.b)}`
        })),
        {
          name: 'Two rules from addTime keep apart',
          code: `${ACTION} small = indent8_::deep_([&] { return addTime(5); }); ${ACTION} big = indent8_::deep_([&] { return addTime(60); }); indent8_::scrub_(); Repair a(61, "ship clock"); if (small && big) { small(a); big(a); small(a); } ${put('a', 'a.getMinutes()')}`,
          judge: (got) => (LEFTOVER_HINT(got) ? `The repair holds minutes that have nothing to do with 5 and 60. The rule's lambda captures by reference. ${DANGLING}` : num(got, 'a') !== 70 ? `With a rule from addTime(5) run twice and one from addTime(60) once, the repair has ${got.a} minutes. Each rule keeps its own minutes.` : null),
          output: (got) => `5, then 60, then 5 more: the repair has ${mins(got.a)}`
        }
      ]
    })
  },

  table(t) {
    const ADD_TIME = [`${ACTION} addTime(int minutes) { return [minutes](Repair& repair) { repair.addMinutes(minutes); }; }`]
    const want = { clean: 30, oil: 15, regulate: 45 }
    return judgeRule(t, {
      ...base,
      task: 3,
      fn: 'repairRules',
      sig: { returns: TABLE, params: [] },
      callWith: '',
      tools: [{ fn: 'repairRules', uses: [] }],
      provides: [{ name: 'addTime', task: 2, file: FILE, lines: ADD_TIME }],
      cases: [
        {
          name: 'The table holds exactly the three rules',
          code: `${TABLE} rules = repairRules(); std::string names; for (const auto& kv : rules) names += (names.empty() ? "" : ", ") + kv.first; ${put('names', 'names')}`,
          judge: (got) => {
            const names = got.names ? got.names.split(', ') : []
            const missing = Object.keys(want).filter((k) => !names.includes(k))
            const extra = names.filter((k) => !(k in want))
            if (missing.length) return `The table has no rule called ${missing.map((m) => `"${m}"`).join(' or ')}. A rule is found by its name exactly as it is written, capital letters and spaces included.`
            if (extra.length) return `The table has rules the task does not name: ${extra.map((m) => `"${m}"`).join(', ')}. It holds exactly three.`
            return null
          },
          output: (got) => `The table holds: ${got.names || 'nothing'}`
        },
        ...Object.entries(want).map(([name, minutes]) => ({
          name: `"${name}" adds ${minutes} minutes, after repairRules has returned`,
          escaped: escaped(`The rule "${name}"`),
          code: `${TABLE} rules = indent8_::deep_([&] { return repairRules(); }); indent8_::scrub_(); Repair r(3101, "mantel clock"); auto found = rules.find(${JSON.stringify(name)}); ${put('has', 'found != rules.end() && found->second ? 1 : 0')} if (found != rules.end() && found->second) { found->second(r); indent8_::scrub_(); found->second(r); } ${put('m', 'r.getMinutes()')}`,
          judge: (got) => {
            if (num(got, 'has') !== 1) return `The table has no rule called "${name}" that holds a function.`
            if (LEFTOVER_HINT(got)) return `After "${name}" ran, the repair holds minutes that have nothing to do with the rule. ${DANGLING}`
            if (num(got, 'm') !== 2 * minutes) return `After "${name}" ran twice, the repair has ${got.m} minutes. "${name}" adds ${minutes} each time it runs.`
            return null
          },
          output: (got) => `"${name}" run twice on a repair of 0 minutes: ${mins(got.m)}`
        }))
      ]
    })
  },

  run(t) {
    // Check's own table: each rule counts its runs. "wind" holds no function at all.
    const table = `int runs = 0; ${TABLE} rules = {{"clean", [&runs](Repair& r) { runs++; r.addMinutes(30); }}, {"oil", [&runs](Repair& r) { runs++; r.addMinutes(15); }}, {"wind", ${ACTION}()}};`
    const cases = [
      ['clean', true, 30, 'a rule the table has'],
      ['oil', true, 15, 'another rule the table has'],
      ['polish', false, 0, 'a name the table does not have'],
      ['wind', false, 0, 'a name whose rule is empty'],
      ['Clean', false, 0, 'a name that differs only in a capital']
    ]
    return judgeRule(t, {
      ...base,
      task: 4,
      fn: 'runRule',
      sig: {
        returns: 'bool',
        params: [
          { type: `const ${TABLE}&`, what: 'the rules' },
          { type: 'const std::string&', what: 'the name' },
          { type: 'Repair&', what: 'the repair' }
        ]
      },
      callWith: `const ${TABLE}&, const std::string&, Repair&`,
      tools: [{ fn: 'runRule', uses: [] }],
      cause: (errors) =>
        /operator\[\][^\n]*const (?:std::)?map|const (?:std::)?map<[^\n]*discards qualifiers/.test(errors.map((e) => e.text).join('\n'))
          ? '[] on a map adds the name when it is not there yet, with an empty rule, so the compiler refuses it on a map that is const. runRule only reads the table: it asks whether the name is there in a way that adds nothing, as part 3 did, and then whether its rule is empty.'
          : null,
      cases: cases.map(([name, ok, minutes, what]) => ({
        name: `runRule "${name}", ${what}`,
        escaped: (got) =>
          emptyCalled(got)
            ? `For "${name}", runRule called an empty std::function, which holds no rule to run, so it threw std::bad_function_call. A name can be in the table with an empty rule: ask the rule whether it holds a function before you run it.`
            : got.threw === 'std::out_of_range'
              ? `For "${name}", which the table does not have, runRule let std::out_of_range out: .at() throws when the name is not there. Ask the table whether it has the name first.`
              : null,
        code: `${table} Repair r(3101, "mantel clock"); const ${TABLE}& view = rules; ${put('ok', `runRule(view, ${JSON.stringify(name)}, r)`)} ${put('m', 'r.getMinutes()')} ${put('runs', 'runs')} ${put('size', 'rules.size()')}`,
        judge: (got) => {
          if (num(got, 'runs') > 1) return `For "${name}", runRule ran the rule ${got.runs} times. It runs the rule once.`
          if (ok && got.ok !== '1') return `For "${name}", which the table has, runRule gave back false.`
          if (ok && num(got, 'm') !== minutes) return `For "${name}", runRule gave back true, and Check's repair has ${got.m} minutes, where "${name}" adds ${minutes}. It runs the rule of that name on the repair it is given.`
          if (!ok && got.ok !== '0') return `For "${name}", ${what}, runRule gave back true. It gives back false when no rule of that name can run.`
          if (!ok && num(got, 'm') !== 0) return `For "${name}", ${what}, Check's repair changed. Nothing runs then.`
          return null
        },
        output: (got) => `runRule(rules, "${name}", repair) gave back ${got.ok === '1' ? 'true' : got.ok === '0' ? 'false' : '?'}; the repair has ${got.m ?? '?'} minutes${got.threw ? `\n${thrownText(got)} reached Check` : ''}`
      }))
    })
  }
}
