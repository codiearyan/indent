import { assertText, judgeFault, num, thrownText } from '../../grading.mjs'

const FILE = 'src/report.cpp'
const base = { files: [FILE], asserts: true }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const list = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
const braces = (values) => `std::vector<int>{${values.join(', ')}}`
const numbersIn = (text) => (text ?? '').match(/-?\d+/g)?.map(Number) ?? []

// longestOf as the starter gives it, and what it should give.
const givenLongest = (v) => (v.length ? Math.max(v[0], ...v.slice(1, -1)) : 0)
const rightLongest = (v) => (v.length ? Math.max(...v) : 0)
const fails = (v) => givenLongest(v) !== rightLongest(v)
const FEWEST = 2

const RIGHT_BAD_MINUTES = [
  'class BadMinutes : public std::invalid_argument { int m_; public: explicit BadMinutes(int m) : std::invalid_argument("not a number of minutes: " + std::to_string(m)), m_(m) {} int getMinutes() const { return m_; } };'
]

export const checks = {
  smallest(t) {
    return judgeFault(t, {
      ...base,
      task: 1,
      fn: 'smallestFailing',
      sig: { returns: 'std::vector<int>', params: [] },
      callWith: '',
      cases: [
        {
          name: 'A week that breaks longestOf, with as few values as can',
          code: put('week', 'smallestFailing()'),
          judge: (got) => {
            const week = list(got.week)
            if (!Array.isArray(week)) return 'Check could not read the week smallestFailing gave back.'
            const shown = `{${week.join(', ')}}`
            if (!fails(week)) return `For ${shown}, longestOf gives ${givenLongest(week)}, and that is right: this week does not break it. Find a week where it gives a wrong answer first, then cut it down while it stays wrong.`
            if (week.length > FEWEST) return `longestOf is wrong for ${shown}, and a week with fewer values breaks it too. Take one value out at a time and keep the cut only when the answer is still wrong, until no single value can go.`
            return null
          },
          output: (got) => {
            const week = list(got.week) ?? []
            return `smallestFailing() gave back {${week.join(', ')}}\nlongestOf gives ${givenLongest(week)} for it; the longest is ${rightLongest(week)}`
          }
        }
      ]
    })
  },

  longest(t) {
    const weeks = [
      [[30, 95], 95],
      [[210, 40, 95], 210],
      [[5], 5],
      [[60, 600, 15, 600], 600],
      [[0, 0], 0]
    ]
    const EMPTY = 'Check called longestRepair with an empty list, as no caller ever should, and it did not stop at an assert.'
    return judgeFault(t, {
      ...base,
      task: 2,
      fn: 'longestRepair',
      sig: { returns: 'int', params: [{ type: 'const std::vector<int>&', what: 'the minutes' }] },
      callWith: 'const std::vector<int>&',
      crashed: (r, label) =>
        (r.stderr ?? '').includes('\x1eempty\x1f1')
          ? `The program stopped at a guard of the standard library while the code of ${label} ran with an empty list: a line read the first value of a list that has none. ${EMPTY.replace('Check called longestRepair with an empty list, as no caller ever should, and it', 'An assert as the first line would have stopped it there first, with the promise it broke. longestRepair')}`
          : null,
      cases: [
        {
          name: 'The longest of lists Check gives',
          code: weeks.map(([w], k) => put(`l${k}`, `longestRepair(${braces(w)})`)).join(' '),
          judge: (got, stdout) => {
            for (const [k, [w, want]] of weeks.entries()) {
              if (num(got, `l${k}`) !== want) return `longestRepair({${w.join(', ')}}) gave back ${got[`l${k}`]}. It gives back the longest of all the minutes, the first and the last included.`
            }
            if (stdout.trim()) return `longestRepair printed "${stdout.trim().split('\n')[0]}" on standard output, where the report's lines go and where Check looks. Prints that look inside a function go to std::cerr; take this one out, or send it there.`
            return null
          },
          output: (got) => weeks.map(([w], k) => `longestRepair({${w.join(', ')}}) gave back ${got[`l${k}`] ?? '?'}`).join('\n')
        },
        {
          name: 'An empty list stops at the assert',
          asserts: true,
          code: `${put('empty', 1)} ${put('l', `longestRepair(${braces([])})`)}`,
          judge: (got) => {
            if (got.asserted === undefined) return `${EMPTY} It gave back ${got.l}. Its first line is an assert that the list is not empty, so a caller that breaks the promise is stopped at once, at a line that says what was promised.`
            return null
          },
          output: (got) => (got.asserted !== undefined ? `Check called longestRepair({}): it stopped at ${assertText(got)}` : `Check called longestRepair({}): it gave back ${got.l ?? '?'}`)
        },
        {
          name: 'The answer is the same with asserts switched off',
          noAsserts: true,
          code: put('l', `longestRepair(${braces([45, 300, 20])})`),
          judge: (got) =>
            num(got, 'l') === 300 ? null : `With every assert switched off, as a shop build does, longestRepair({45, 300, 20}) gave back ${got.l}. Then the code inside an assert does not run at all: an assert only looks, and the work the function needs goes on lines of their own.`,
          output: (got) => `With asserts switched off, longestRepair({45, 300, 20}) gave back ${got.l ?? '?'}`
        }
      ]
    })
  },

  carry(t) {
    const values = [-30, 725]
    return judgeFault(t, {
      ...base,
      task: 3,
      className: 'BadMinutes',
      functions: ['getMinutes'],
      own: ['BadMinutes'],
      cases: [
        ...values.map((m) => ({
          name: `A BadMinutes for ${m} is caught as a std::invalid_argument`,
          throws: true,
          code: `try { throw BadMinutes(${m}); } catch (const std::invalid_argument& indent_e_) { ${put('what', 'indent_e_.what()')} ${put('caught', 1)} }`,
          judge: (got) => {
            if (num(got, 'caught') !== 1) {
              return `Check threw a BadMinutes, and its catch for const std::invalid_argument& let it pass, so a BadMinutes is not a kind of std::invalid_argument. Build it on that kind, with : public std::invalid_argument after its name, so every catch for std::invalid_argument, or for std::exception, catches it too.`
            }
            if (!numbersIn(got.what).includes(m)) return `A BadMinutes made for ${m} minutes has what() "${got.what}". Its message names the minutes it was made with, so whoever reads it knows what to put right.`
            return null
          },
          output: (got) => `Check threw BadMinutes(${m}): ${num(got, 'caught') === 1 ? `caught as std::invalid_argument, what() "${got.what}"` : 'not caught as a std::invalid_argument'}`
        })),
        {
          name: 'getMinutes gives back the minutes it was made with',
          code: `try { throw BadMinutes(612); } catch (const BadMinutes& indent_b_) { ${put('m', 'indent_b_.getMinutes()')} } const BadMinutes indent_c_(-1); ${put('m2', 'indent_c_.getMinutes()')}`,
          judge: (got) => {
            if (num(got, 'm') !== 612) return `A BadMinutes made for 612 gave back ${got.m} from getMinutes. It gives back the minutes it was made with, kept in a member.`
            if (num(got, 'm2') !== -1) return `A BadMinutes made for -1 gave back ${got.m2} from getMinutes. It gives back the minutes it was made with.`
            return null
          },
          output: (got) => `BadMinutes(612).getMinutes() gave back ${got.m ?? '?'}\nBadMinutes(-1).getMinutes() gave back ${got.m2 ?? '?'}`
        }
      ]
    })
  },

  refuse(t) {
    const good = [
      ['Minutes of 45 go on the week', [95, 40], 45],
      ['0 minutes go on the week', [], 0],
      ['600 minutes go on the week', [30], 600]
    ]
    const bad = [
      ['Minutes of 725 are refused', [95, 40], 725],
      ['Minutes of -30 are refused', [120], -30],
      ['Minutes of 601 are refused', [], 601]
    ]
    const ASSERT = (m) => `logMinutes stopped at an assert for ${m} minutes. An assert is for what your own code promises, never for what a person types at the counter: in a shop build asserts are switched off, and ${m} would go on the week. Throw a BadMinutes instead, so the counter can say what was wrong.`
    const refusal = (m, before, got, offRun) => {
      if (got.asserted !== undefined) return ASSERT(m)
      if (got.threw === undefined) return offRun ? `With asserts switched off, as a shop build does, logMinutes(week, ${m}) threw nothing, and the week holds ${got.after}. An assert is for what your own code promises, never for what a person types: throw a BadMinutes.` : `logMinutes(week, ${m}) went back to Check without throwing. Minutes below 0 or above 600 are refused with a throw of a BadMinutes.`
      if (got.threw !== 'BadMinutes') return `logMinutes(week, ${m}) threw ${thrownText(got)}, and the task asks for a BadMinutes: the kind that carries the minutes, so the caller can read them back with getMinutes.`
      if (num(got, 'carried') !== m) return `logMinutes(week, ${m}) threw a BadMinutes that carries ${got.carried}. It carries the minutes that were wrong, ${m}.`
      if (JSON.stringify(list(got.after)) !== JSON.stringify(before)) return `logMinutes(week, ${m}) threw, and the week had changed already: it holds ${got.after}. Check first and throw before anything changes.`
      return null
    }
    const badCode = (week, m) => `std::vector<int> w = ${braces(week)}; try { logMinutes(w, ${m}); } catch (const BadMinutes& indent_b_) { ${put('carried', 'indent_b_.getMinutes()')} ${put('after', 'w')} throw; } catch (...) { ${put('after', 'w')} throw; } ${put('after', 'w')}`
    return judgeFault(t, {
      ...base,
      task: 4,
      fn: 'logMinutes',
      own: ['BadMinutes'],
      sig: {
        returns: 'void',
        params: [
          { type: 'std::vector<int>&', what: 'the week' },
          { type: 'int', what: 'the minutes' }
        ]
      },
      callWith: 'std::vector<int>&, int',
      provides: [{ name: 'BadMinutes', task: 3, file: FILE, lines: RIGHT_BAD_MINUTES }],
      cases: [
        ...good.map(([name, week, m]) => ({
          name,
          code: `std::vector<int> w = ${braces(week)}; logMinutes(w, ${m}); ${put('after', 'w')}`,
          judge: (got) => (JSON.stringify(list(got.after)) === JSON.stringify([...week, m]) ? null : `After logMinutes(week, ${m}), the week holds ${got.after}. Minutes from 0 to 600 go at the end of the week, and the minutes already there stay.`),
          output: (got) => `Check's week: ${JSON.stringify(week)}\nafter logMinutes(week, ${m}): ${got.after ?? '?'}`
        })),
        ...bad.map(([name, week, m]) => ({
          name,
          throws: true,
          asserts: true,
          code: badCode(week, m),
          judge: (got) => refusal(m, week, got, false),
          output: (got) => `Check's week: ${JSON.stringify(week)}\nlogMinutes(week, ${m}) ${got.asserted !== undefined ? `stopped at ${assertText(got)}` : got.threw ? `threw ${thrownText(got)}` : 'threw nothing'}\nthe week afterwards: ${got.after ?? '?'}`
        })),
        {
          name: 'Minutes of 725 are refused with asserts switched off',
          throws: true,
          noAsserts: true,
          code: badCode([95], 725),
          judge: (got) => refusal(725, [95], got, true),
          output: (got) => `With asserts switched off: logMinutes(week, 725) ${got.threw ? `threw ${thrownText(got)}` : 'threw nothing'}\nthe week afterwards: ${got.after ?? '?'}`
        }
      ]
    })
  }
}
