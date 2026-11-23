import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { codeOnly, fail, judgeRule, num } from '../../grading.mjs'

const HEADER = 'src/caddy.h'
const MAIN = 'src/main.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const said = (got, key) => (got[key] === '1' ? 'true' : got[key] === '0' ? 'false' : '?')

// Check's own type: it can be copied, and offers nothing else: no == or <, and no way to make one from nothing.
const JEWEL = 'namespace check { struct Jewel { explicit Jewel(const char* n) : name(n) {} std::string name; }; }'
const base = {
  className: 'Caddy',
  classTemplate: 'Caddy',
  members: ['items', 'limit'],
  functions: ['add', 'count', 'at'],
  own8: [{ name: 'check::Jewel', offers: 'it can be copied' }],
  helpers: [JEWEL]
}
const CLASS_OF_CHECK = (withAt) => [
  'inline int indent_adds_ = 0;',
  `template <typename T> class Caddy { std::vector<T> items; int limit; public: Caddy(int most) : limit(most) {} bool add(const T& item) { indent_adds_++; if (static_cast<int>(items.size()) >= limit) return false; items.push_back(item); return true; } int count() const { return static_cast<int>(items.size()); } const T& at(int place) const${withAt ? ' { if (place < 0 || place >= count()) throw std::out_of_range("no item at that place"); return items[place]; }' : ';'} };`
]
const HEADER_OF_CHECK = ['#ifndef CADDY_H', '#define CADDY_H', '#include <stdexcept>', '#include <string>', '#include <vector>', ...CLASS_OF_CHECK(true), '#endif', ''].join('\n')

const privateProbe = (member) => ({
  name: `${member} is private`,
  params: 'Caddy<int>& c',
  code: `(void)c.${member};`,
  expect: /private/,
  compiled: `Check read the caddy's ${member} from outside the class, and the compiler let it. The task asks for ${member} to be private, so only the caddy's own functions keep its rule.`,
  other: () => `Check's own line that reads ${member} from outside the class fails, but not because ${member} is private. The task names the member ${member}: write it with exactly that name, under private:.`,
  shown: `Check's line, outside the class: caddy.${member};`
})

export const checks = {
  template(t) {
    return judgeRule(t, {
      ...base,
      files: [HEADER],
      keepGuard: [HEADER],
      task: 1,
      probes: [privateProbe('items'), privateProbe('limit')],
      cases: [
        {
          name: 'A Caddy<int> with a limit of 3 takes three items and refuses a fourth',
          code: `Caddy<int> c(3); ${put('n0', 'c.count()')} ${put('a', 'c.add(5)')} ${put('b', 'c.add(7)')} ${put('c', 'c.add(9)')} ${put('d', 'c.add(11)')} const Caddy<int>& v = c; ${put('n', 'v.count()')}`,
          judge: (got) => {
            if (num(got, 'n0') !== 0) return `A new Caddy<int>(3) says it holds ${got.n0} items. A caddy starts with none.`
            if ([got.a, got.b, got.c].some((x) => x !== '1')) return `Adding 5, 7 and 9 to a Caddy<int> with a limit of 3 gave back ${said(got, 'a')}, ${said(got, 'b')} and ${said(got, 'c')}. Each fits, so each gives back true.`
            if (got.d !== '0') return 'A fourth item, added to a Caddy<int> with a limit of 3 that holds three, gave back true. A full caddy refuses it and gives back false.'
            if (num(got, 'n') !== 3) return `After three items went in and a fourth was refused, count says ${got.n}. A refused item changes nothing.`
            return null
          },
          output: (got) => `Caddy<int>(3): count ${got.n0 ?? '?'}, add(5) ${said(got, 'a')}, add(7) ${said(got, 'b')}, add(9) ${said(got, 'c')}, add(11) ${said(got, 'd')}, count ${got.n ?? '?'}`
        },
        {
          name: "A Caddy of Check's own type, which can only be copied",
          code: `Caddy<check::Jewel> c(2); ${put('a', 'c.add(check::Jewel("ruby"))')} ${put('b', 'c.add(check::Jewel("garnet"))')} ${put('c', 'c.add(check::Jewel("sapphire"))')} ${put('n', 'c.count()')}`,
          judge: (got) =>
            got.a === '1' && got.b === '1' && got.c === '0' && num(got, 'n') === 2
              ? null
              : `A Caddy of Check's own type with a limit of 2 gave back ${said(got, 'a')}, ${said(got, 'b')} and ${said(got, 'c')} for three items, and count says ${got.n}. The same rule holds for every type: two fit, the third is refused.`,
          output: (got) => `Caddy<check::Jewel>(2): three adds gave back ${said(got, 'a')}, ${said(got, 'b')}, ${said(got, 'c')}; count ${got.n ?? '?'}`
        },
        {
          name: 'A caddy with a limit of 0 refuses everything',
          code: `Caddy<int> c(0); ${put('a', 'c.add(4)')} ${put('n', 'c.count()')}`,
          judge: (got) => (got.a === '0' && num(got, 'n') === 0 ? null : `A Caddy<int> with a limit of 0 gave back ${said(got, 'a')} for an item, and count says ${got.n}. It has room for nothing.`),
          output: (got) => `Caddy<int>(0): add(4) ${said(got, 'a')}, count ${got.n ?? '?'}`
        }
      ]
    })
  },

  async at(t) {
    const problem = await whereAtIs(t, await readText(t, HEADER))
    if (problem) return [problem]
    {
      const read = (cls, values, limit) => `Caddy<${cls}> c(${limit}); ${values.map((v) => `c.add(${v});`).join(' ')} const Caddy<${cls}>& v = c;`
      return judgeRule(t, {
        ...base,
        files: [HEADER],
        keepGuard: [HEADER],
        others: [MAIN],
        task: 2,
        provides: [{ name: 'Caddy', task: 1, file: HEADER, lines: CLASS_OF_CHECK(false) }],
        cases: [
          {
            name: 'at reads each item of a Caddy<int> by its place',
            code: `${read('int', [40, 15, 27], 5)} ${put('a', 'v.at(0)')} ${put('b', 'v.at(1)')} ${put('c', 'v.at(2)')} ${put('ref', 'std::is_same_v<decltype(v.at(0)), const int&> ? 1 : 0')}`,
            judge: (got) => {
              if (num(got, 'ref') !== 1) return 'at gives back something other than a reference to a const T. The task asks for const T&: the caller reads the item where it is, without a copy, and cannot change it.'
              if (num(got, 'a') !== 40 || num(got, 'b') !== 15 || num(got, 'c') !== 27) return `A caddy holding 40, 15 and 27 gave back ${got.a}, ${got.b} and ${got.c} for places 0, 1 and 2. Places count from 0, in the order the items went in.`
              return null
            },
            output: (got) => `A caddy holding 40, 15, 27: at(0) ${got.a ?? '?'}, at(1) ${got.b ?? '?'}, at(2) ${got.c ?? '?'}`
          },
          {
            name: "at reads an item of Check's own type",
            code: `${read('check::Jewel', ['check::Jewel("ruby")', 'check::Jewel("garnet")'], 2)} ${put('b', 'v.at(1).name')}`,
            judge: (got) => (got.b === 'garnet' ? null : `A caddy of Check's own type holding ruby and garnet gave back "${got.b}" for place 1.`),
            output: (got) => `A caddy holding ruby, garnet: at(1) is "${got.b ?? '?'}"`
          },
          ...[
            [3, 'the place just past the last item'],
            [-1, 'a place below 0'],
            [7, 'a place far past the end']
          ].map(([place, what]) => ({
            name: `at(${place}), ${what}, throws std::out_of_range`,
            throws: true,
            code: `${read('int', [40, 15, 27], 5)} ${put('r', `v.at(${place})`)}`,
            judge: (got) => {
              if (got.threw === undefined) return `at(${place}) on a caddy of three items gave back ${got.r} instead of throwing. There is no item at ${what}, so at throws a std::out_of_range.`
              if (got.threw !== 'std::out_of_range') return `at(${place}) on a caddy of three items threw ${got.threw.startsWith('a kind of') ? got.threw : `a ${got.threw}`}, and the task asks for a std::out_of_range.`
              return null
            },
            output: (got) => `at(${place}) on a caddy of three items: ${got.threw ? `threw ${got.threw}` : `gave back ${got.r ?? '?'}`}`
          }))
        ],
        crashed: (r, label) =>
          r.signal ? `The program stopped while at ran, under ${label}, for a place where the caddy has no item. Check builds your code with the library's guard on, which stops a program at [] past the end of a vector. The task asks at to throw a std::out_of_range then, before it reads anything.` : null
      })
    }
  },

  fill(t) {
    const repair = ([ticket, item, minutes]) => `Repair{${ticket}, ${JSON.stringify(item)}, ${minutes}}`
    const five = [
      [4417, 'carriage clock', 95],
      [52, 'pocket watch', 20],
      [7, 'cuckoo clock', 480],
      [903, 'wall clock', 30],
      [61, 'lantern clock', 45]
    ]
    const cases = [
      ['Five repairs, a limit of 3', five, 3],
      ['Two repairs, a limit of 4', five.slice(3), 4],
      ['No repairs', [], 2],
      ['A limit of 0', five.slice(0, 2), 0]
    ]
    return judgeRule(t, {
      ...base,
      files: [MAIN],
      task: 3,
      fn: 'fillCaddy',
      own: ['Repair', 'Caddy<Repair>'],
      sig: {
        returns: 'Caddy<Repair>',
        params: [
          { type: 'const std::vector<Repair>&', what: 'the repairs' },
          { type: 'int', what: 'the limit' }
        ]
      },
      callWith: 'const std::vector<Repair>&, int',
      replaced: { [HEADER]: HEADER_OF_CHECK },
      cases: cases.map(([name, list, limit]) => {
        const want = list.slice(0, limit).map((r) => r[0])
        return {
          name,
          code: `Caddy<Repair> c = fillCaddy(std::vector<Repair>{${list.map(repair).join(', ')}}, ${limit}); std::string t; for (int i = 0; i < c.count(); i++) t += (i ? "," : "") + std::to_string(c.at(i).ticket); ${put('t', 't')} ${put('n', 'c.count()')} ${put('adds', 'indent_adds_')}`,
          judge: (got) => {
            const tickets = got.t ? got.t.split(',').map(Number) : []
            if (list.length && num(got, 'adds') === 0) return 'fillCaddy gave back a caddy without calling add. Each repair goes into the caddy through add, which keeps the caddy\'s limit.'
            if (tickets.length === 0 && want.length) return `fillCaddy gave back an empty caddy for ${list.length} repairs and a limit of ${limit}. Make the caddy with the limit it is given, and add the repairs to it.`
            if (tickets.join() !== want.join()) return `With ${list.length} repairs and a limit of ${limit}, the caddy fillCaddy gave back holds the tickets ${tickets.join(', ') || 'nothing'}. It holds the first repairs that fit, in their order, and leaves the rest out.`
            return null
          },
          output: (got) => `fillCaddy with ${list.length} repairs and a limit of ${limit}: the caddy holds ${got.t ? `tickets ${got.t.replaceAll(',', ', ')}` : 'nothing'}`
        }
      })
    })
  }
}

const readText = (t, file) => readFile(join(t.workspace, file), 'utf8').catch(() => '')

// Task 2 asks for at's body below the class. Where else it went says what to look at.
async function whereAtIs(t, header) {
  const text = header.replace(/\r\n/g, '\n')
  const lines = codeOnly(text).split('\n')
  const start = text.split('\n').findIndex((l) => /^\s*(?:\/\/+|\/\*+)\s*task\s*2\b/i.test(l))
  if (start === -1) return null
  const section = lines.slice(start).join('\n')
  if (/::\s*at\s*\(/.test(section)) return null
  const main = codeOnly(await readText(t, MAIN))
  if (/Caddy\s*<[^>]*>\s*::\s*at\s*\(/.test(main)) {
    return fail(
      'at is written in caddy.h',
      "The body of at is written in main.cpp. There it works for main.cpp alone: every other file that includes caddy.h sees only its declaration, so the compiler cannot write a Caddy<int>'s at for that file, and the linker finds none. Check's program is such a file. A class template's bodies live in its header, where every file that uses it can see them: Task 2 asks for it in caddy.h, below the class."
    )
  }
  if (/\bat\s*\(/.test(section)) {
    return fail(
      'at is written as a member of Caddy',
      "Check finds a function called at under // Task 2, but not written as Caddy's own: below the class, a member's name has the class in front of it, Caddy<T> and ::, or it is a function of its own that knows nothing of the caddy's items."
    )
  }
  if (/\bat\s*\([^)]*\)\s*(?:const\s*)?\{/.test(lines.slice(0, start).join('\n'))) {
    return fail('at is written below the class', 'The body of at is written inside the class. Task 2 asks for it below the class, under // Task 2: the class keeps only its declaration, and the body is written there as a member of Caddy<T>, as the lesson shows.')
  }
  return fail('at is written below the class', 'Check cannot find the body of at under // Task 2 in caddy.h. Write it there, below the class, as a member of Caddy<T>, with exactly that name.')
}
