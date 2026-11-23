import { judgeClass, memberSig, num, onLeftovers, sigProblem, LEFTOVER } from '../../grading.mjs'

const FILE = 'src/timecard.cpp'
const base = {
  files: [FILE],
  inClass: [FILE],
  className: 'Repair',
  members: ['item', 'minutes'],
  owned: ['item', 'minutes'],
  functions: ['getItem', 'setItem', 'getMinutes', 'addMinutes', 'removeMinutes']
}
const minutesOfCheck = {
  name: 'minutes',
  task: 2,
  lines: [
    'private: int minutes = 0;',
    'public: int getMinutes() { return minutes; }',
    'bool addMinutes(int extra) { if (extra < 1 || extra > 480) return false; minutes += extra; return true; }'
  ]
}
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const said = (got, key) => (got[key] === '1' ? 'true' : got[key] === '0' ? 'false' : 'nothing')
const privateProbe = (member, task, why) => ({
  name: `${member} cannot be reached from outside the class`,
  params: 'Repair& r',
  code: `(void)r.${member};`,
  expect: /is a private member of|is private within this context/,
  compiled: `Check's own code, outside the class, could read and change ${member} directly, so any line of the program could ${why} and no rule of the class would stop it. ${member} goes under private:, so that only the class's own functions reach it.`,
  other: (text) =>
    /no member named|has no member named/.test(text)
      ? `Check cannot find a member called ${member} in Repair. Task ${task} names it: write it with exactly that name, capital letters included, under private:.`
      : null,
  shown: `Check's line, outside the class: r.${member}`
})

/** Runs `steps` of [call, extra] on one new repair and writes what each gives back and leaves. */
const steps = (list) => onLeftovers('Repair', '', 'r', list.map(([fn, n], i) => `${put(`ok${i}`, `r.${fn}(${n})`)} ${put(`m${i}`, 'r.getMinutes()')}`).join(' '))

/** What went wrong at step `w` of addMinutes or removeMinutes, in words. */
function stepMessage(w, refuse) {
  if (w.gave === undefined) return `Check could not read what ${w.fn} gave back.`
  if (!w.ok && w.left !== w.before) return refuse(w)
  if (!w.ok) return `${w.fn}(${w.n}) gave back true, as if it had done it. ${w.n} is outside the rule, so ${w.fn} refuses it: it changes nothing and gives back false.`
  if (w.left === w.before) {
    return w.gave === '1'
      ? `${w.fn}(${w.n}) gave back true and the minutes stayed at ${w.before}. Giving back true says it changed them: look at whether a line changes minutes, and what it changes. A parameter or a variable of the function with the member's name hides the member, and a change to it is lost when the function ends.`
      : `${w.fn} refused ${w.n} on a repair with ${w.before} minutes, and ${w.n} is within the rule there.`
  }
  if (w.left !== w.after) return `After ${w.fn}(${w.n}) on a repair with ${w.before} minutes, getMinutes gives back ${w.left}.`
  return `${w.fn}(${w.n}) changed the minutes as the rule says and gave back false. It gives back true when it changed them.`
}

/** The first step whose answer or minutes differ from the rule, as a message, or null. */
function firstWrong(got, list, start, rule) {
  let minutes = start
  for (const [i, [fn, n]] of list.entries()) {
    const ok = rule(fn, n, minutes)
    const after = ok ? minutes + (fn === 'addMinutes' ? n : -n) : minutes
    const gave = got[`ok${i}`]
    const left = num(got, `m${i}`)
    if (gave !== (ok ? '1' : '0') || left !== after) return { i, fn, n, ok, before: minutes, gave, left, after }
    minutes = after
  }
  return null
}

const shownSteps = (got, list, start) =>
  [`A new repair, ${start} minutes`, ...list.map(([fn, n], i) => `${fn}(${n}) gave back ${said(got, `ok${i}`)}, and the repair has ${got[`m${i}`] ?? '?'} minutes`)].join('\n')

export const checks = {
  item(t) {
    return judgeClass(t, {
      ...base,
      task: 1,
      probes: [privateProbe('item', 1, 'put any text in it')],
      cases: [
        {
          name: 'getItem and setItem take and give back what the task says',
          code: `${memberSig('Repair', 'getItem')} ${memberSig('Repair', 'setItem')}`,
          judge: (got) =>
            ['std::string', 'const std::string&'].includes(got.sig_getItem?.split('\x1f')[0])
              ? sigProblem(got, 'getItem', { params: [] }) ?? sigProblem(got, 'setItem', { returns: 'void', params: [{ type: 'const std::string&', what: 'the new item' }] })
              : sigProblem(got, 'getItem', { returns: 'std::string', params: [] })
        },
        {
          name: 'A new repair has no item yet',
          code: `Repair r; ${put('item', 'r.getItem()')}`,
          judge: (got) => (got.item === '' ? null : `A new repair's getItem gives back "${got.item}". Nothing has been put in it yet, so it gives back an empty text.`),
          output: (got) => `A new repair's item: "${got.item ?? ''}"`
        },
        {
          name: 'setItem changes the item that getItem gives back',
          code: `Repair r; r.setItem("carriage clock"); ${put('first', 'r.getItem()')} r.setItem("lantern clock"); ${put('second', 'r.getItem()')}`,
          judge: (got) =>
            got.first === 'carriage clock' && got.second === 'lantern clock'
              ? null
              : got.first === '' || got.second === 'carriage clock'
                ? 'setItem did not change the repair\'s item. Look at what the line inside it changes: a parameter or a variable of the function with the member\'s name hides the member, and a change to it is lost when the function ends.'
                : `Check put "carriage clock" in with setItem, then "lantern clock", and getItem gave back "${got.first}", then "${got.second}". getItem gives back what the member holds now.`,
          output: (got) => `setItem("carriage clock"), then getItem() gave back "${got.first ?? ''}"\nsetItem("lantern clock"), then getItem() gave back "${got.second ?? ''}"`
        },
        {
          name: 'Two repairs each keep their own item',
          code: `Repair a; Repair b; a.setItem("wall clock"); b.setItem("travel clock"); ${put('a', 'a.getItem()')} ${put('b', 'b.getItem()')}`,
          judge: (got) =>
            got.a === 'wall clock' && got.b === 'travel clock'
              ? null
              : got.a === 'travel clock' && got.b === 'travel clock'
                ? 'Check gave one repair "wall clock" and then another "travel clock", and both give back "travel clock": they share one item. A static member is one value for the whole class; each repair keeps an item of its own, so item is not static.'
                : `Check gave one repair "wall clock" and another "travel clock", and got back "${got.a}" and "${got.b}".`,
          output: (got) => `One repair: "${got.a ?? ''}", the other: "${got.b ?? ''}"`
        },
        {
          name: 'Changing what getItem gives back leaves the repair as it was',
          // A generic lambda, so the change is only compiled when getItem's answer can be changed.
          code: `Repair r; r.setItem("mantel clock"); [](auto& x) { if constexpr (!std::is_const_v<std::remove_reference_t<decltype(x.getItem())>>) x.getItem() = "ship's clock"; }(r); ${put('item', 'r.getItem()')}`,
          judge: (got) =>
            got.item === 'mantel clock'
              ? null
              : got.item === "ship's clock"
                ? 'Check changed the text getItem gave back, and the repair\'s own item changed with it: getItem hands out the member itself, as a reference. Then any line of the program can change the item without setItem. getItem gives back a copy.'
                : `After setItem("mantel clock"), getItem gives back "${got.item}".`,
          output: (got) => `After Check changed what getItem gave back, the repair's item is "${got.item ?? ''}"`
        }
      ]
    })
  },

  minutes(t) {
    const rule = (fn, n) => n >= 1 && n <= 480
    const adds = [
      ['addMinutes', 30],
      ['addMinutes', 45]
    ]
    const refused = [
      ['addMinutes', 50],
      ['addMinutes', -35],
      ['addMinutes', 0],
      ['addMinutes', 481]
    ]
    const edges = [
      ['addMinutes', 1],
      ['addMinutes', 480]
    ]
    const ruleCase = (name, list) => ({
      name,
      code: steps(list),
      judge: (got) => {
        const w = firstWrong(got, list, 0, rule)
        if (!w) return null
        if (w.ok && w.gave === '0' && w.left === w.before) return `addMinutes refused ${w.n}, and ${w.n} is within the rule: from 1 to 480, both included.`
        return stepMessage(w, () =>
          w.n > 480
            ? `addMinutes took ${w.n} minutes at once. The rule allows from 1 to 480 at a time, so ${w.n} changes nothing and gives back false.`
            : `addMinutes took ${w.n} minutes, and the repair went from ${w.before} to ${w.left}. The rule allows from 1 to 480 at a time, so ${w.n} changes nothing and gives back false.`
        )
      },
      output: (got) => shownSteps(got, list, 0)
    })
    return judgeClass(t, {
      ...base,
      task: 2,
      probes: [privateProbe('minutes', 2, 'set the minutes below 0')],
      cases: [
        {
          name: 'getMinutes and addMinutes take and give back what the task says',
          code: `${memberSig('Repair', 'getMinutes')} ${memberSig('Repair', 'addMinutes')}`,
          judge: (got) => sigProblem(got, 'getMinutes', { returns: 'int', params: [] }) ?? sigProblem(got, 'addMinutes', { returns: 'bool', params: [{ type: 'int', what: 'the extra minutes' }] })
        },
        {
          name: 'A new repair starts at 0 minutes',
          code: onLeftovers('Repair', '', 'r', put('m', 'r.getMinutes()')),
          judge: (got) =>
            num(got, 'm') === 0
              ? null
              : num(got, 'm') === LEFTOVER
                ? `A new repair has ${got.m} minutes: whatever was left in that memory. A member with no starting value holds whatever was there, and the task asks minutes to start at 0.`
                : `A new repair has ${got.m} minutes, and the task asks it to start at 0.`,
          output: (got) => `A new repair: ${got.m ?? '?'} minutes`
        },
        ruleCase('addMinutes adds 30, then 45', adds),
        ruleCase('addMinutes refuses -35, 0 and 481, and keeps the minutes', refused),
        ruleCase('addMinutes takes exactly 1 and exactly 480', edges),
        {
          name: 'Two repairs each keep their own minutes',
          code: onLeftovers('Repair', '', 'a', onLeftovers('Repair', '', 'b', `a.addMinutes(20); b.addMinutes(50); ${put('a', 'a.getMinutes()')} ${put('b', 'b.getMinutes()')}`)),
          judge: (got) =>
            num(got, 'a') === 20 && num(got, 'b') === 50
              ? null
              : num(got, 'a') === 70 && num(got, 'b') === 70
                ? 'Check added 20 minutes to one repair and 50 to another, and both have 70: they share the same minutes. A static member is one value for the whole class; each repair keeps minutes of its own, so minutes is not static.'
                : `Check added 20 minutes to one new repair and 50 to another, and got back ${got.a} and ${got.b}.`,
          output: (got) => `One repair: ${got.a ?? '?'} minutes, the other: ${got.b ?? '?'} minutes`
        }
      ]
    })
  },

  remove(t) {
    const rule = (fn, n, minutes) => (fn === 'addMinutes' ? n >= 1 && n <= 480 : n >= 1 && n <= minutes)
    const ruleCase = (name, list) => ({
      name,
      code: steps(list),
      judge: (got) => {
        const w = firstWrong(got, list, 0, rule)
        if (!w) return null
        if (w.ok && w.gave === '0' && w.left === w.before) return `removeMinutes refused to take ${w.n} off a repair with ${w.before} minutes. Up to all of its minutes may come off, so ${w.n} is within the rule.`
        if (!w.ok && w.n < 1 && w.gave === '1' && w.left === w.before) return `removeMinutes(${w.n}) gave back true. Taking off ${w.n} minutes is not taking time off, so the rule refuses anything below 1: it changes nothing and gives back false.`
        return stepMessage(w, () =>
          w.n < 1
            ? `removeMinutes(${w.n}) changed the repair from ${w.before} to ${w.left} minutes. Taking off ${w.n} is not taking time off${w.n < 0 ? ': it adds it' : ''}, so the rule refuses anything below 1.`
            : `removeMinutes took ${w.n} minutes off a repair with only ${w.before}, and left it at ${w.left}. The rule refuses to take off more than the repair has, so its minutes never go below 0.`
        )
      },
      output: (got) => shownSteps(got, list, 0)
    })
    return judgeClass(t, {
      ...base,
      task: 3,
      provides: [minutesOfCheck],
      cases: [
        {
          name: 'removeMinutes takes and gives back what the task says',
          code: memberSig('Repair', 'removeMinutes'),
          judge: (got) => sigProblem(got, 'removeMinutes', { returns: 'bool', params: [{ type: 'int', what: 'the minutes to take off' }] })
        },
        ruleCase('removeMinutes takes 30 off 90, then the other 60', [
          ['addMinutes', 90],
          ['removeMinutes', 30],
          ['removeMinutes', 60]
        ]),
        ruleCase('removeMinutes refuses to take off more than the repair has', [
          ['addMinutes', 50],
          ['removeMinutes', 51],
          ['removeMinutes', 200]
        ]),
        ruleCase('removeMinutes refuses 0 and -10', [
          ['addMinutes', 50],
          ['removeMinutes', 0],
          ['removeMinutes', -10]
        ])
      ]
    })
  }
}
