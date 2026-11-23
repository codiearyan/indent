import { judgeRule, num } from '../../grading.mjs'

const FILE = 'src/quotes.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (v) => (typeof v === 'string' ? JSON.stringify(v) : Number.isInteger(v) ? String(v) : String(v))
const dbl = (v) => (Number.isInteger(v) ? `${v}.0` : String(v))
const parse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
const listed = (list) => `{${list.map((v) => (typeof v === 'string' ? JSON.stringify(v) : v)).join(', ')}}`

// Check's own type: it can be copied and compared with <, and offers nothing else.
const SPRING = 'namespace check { struct Spring { explicit Spring(int t) : turns(t) {} int turns; }; inline bool operator<(const Spring& a, const Spring& b) { return a.turns < b.turns; } }'
const own8 = [{ name: 'check::Spring', offers: 'it can be copied, and two of them compared with <' }]
const base = { files: [FILE], own8, helpers: [SPRING] }
const same = (a, b) => (typeof b === 'number' ? Math.abs(Number(a) - b) < 1e-9 : a === b)

export const checks = {
  largest(t) {
    const lists = [
      ['whole numbers', 'int', [3104, 3190, 3101]],
      ['prices', 'double', [12.5, 0.75, 140.25]],
      ['one price', 'double', [7.25]],
      ['texts', 'std::string', ['pinion', 'regulator', 'crystal']]
    ]
    const springs = [4, 11, 7]
    const typed = (v) => [3072, 140.25].includes(Number(v))
    return judgeRule(t, {
      ...base,
      task: 1,
      templates: ['largestOf'],
      cases: [
        ...lists.map(([what, type, list]) => {
          const want = type === 'std::string' ? [...list].sort().at(-1) : Math.max(...list)
          const ctor = `std::vector<${type}>{${list.map((v) => (type === 'double' ? dbl(v) : cpp(v))).join(', ')}}`
          return {
            name: `largestOf with ${what}, ${listed(list)}`,
            code: `auto r = largestOf(${ctor}); ${put('r', 'r')} ${put('isT', `std::is_same_v<decltype(r), ${type}> ? 1 : 0`)}`,
            judge: (got) => {
              if (num(got, 'isT') !== 1) return `For a std::vector<${type}>, largestOf gives back something other than ${article(type)} ${type}. It gives back a T, the type of the items it is given: the type in front of its name says what it gives back.`
              if (same(got.r, want)) return null
              if (typed(got.r)) return `largestOf gave back ${got.r}, a value from the story, for a list that does not hold it. Find the largest of the items it is given.`
              if (list.length > 1 && same(got.r, type === 'std::string' ? [...list].sort()[0] : Math.min(...list))) return `largestOf gave back the smallest item of ${listed(list)}. Look at which way the comparison keeps the item it found.`
              if (list.length > 1 && same(got.r, list[0])) return `largestOf gave back the first item of ${listed(list)}. Every item is looked at, and the largest kept.`
              if (list.length > 1 && same(got.r, list.at(-1))) return `largestOf gave back the last item of ${listed(list)}, which is not the largest.`
              return `largestOf gave back ${got.r ?? 'nothing Check could read'} for ${listed(list)}, which is not its largest item.`
            },
            output: (got) => `largestOf(${listed(list)}) gave back ${got.r === undefined ? 'nothing' : type === 'std::string' ? JSON.stringify(got.r) : got.r}`
          }
        }),
        {
          name: `largestOf with Check's own type, which offers only copies and <`,
          code: `auto r = largestOf(std::vector<check::Spring>{${springs.map((n) => `check::Spring(${n})`).join(', ')}}); ${put('r', 'r.turns')}`,
          judge: (got) => (num(got, 'r') === 11 ? null : `For Check's own type, with values ${springs.join(', ')} in that order, largestOf gave back the one with ${got.r}, not the largest. The same lines work for every type: look at how the largest is kept.`),
          output: (got) => `largestOf of check::Spring values ${springs.join(', ')} gave back the one with ${got.r ?? '?'}`
        },
        {
          name: 'largestOf<double> with the type said in angle brackets',
          code: `auto r = largestOf<double>({2, 7.5, 3}); ${put('r', 'r')}`,
          judge: (got) => (same(got.r, 7.5) ? null : `largestOf<double>({2, 7.5, 3}) gave back ${got.r}. With T said as double, the three values are doubles, and the largest is 7.5.`),
          output: (got) => `largestOf<double>({2, 7.5, 3}) gave back ${got.r ?? '?'}`
        }
      ]
    })
  },

  clamp(t) {
    const cases = [
      ['int', 3, 10, 20, 10, 'below the low end'],
      ['int', 35, 10, 20, 20, 'above the high end'],
      ['int', 14, 10, 20, 14, 'between the two'],
      ['int', 10, 10, 20, 10, 'equal to the low end'],
      ['double', 0.25, 0.5, 9.75, 0.5, 'below the low end'],
      ['double', 12.5, 0.5, 9.75, 9.75, 'above the high end'],
      ['std::string', 'oiler', 'loupe', 'tweezers', 'oiler', 'between the two'],
      ['std::string', 'awl', 'loupe', 'tweezers', 'loupe', 'below the low end']
    ]
    const lit = (type, v) => (type === 'double' ? dbl(v) : type === 'std::string' ? `std::string(${cpp(v)})` : cpp(v))
    const show = (type, v) => (type === 'std::string' ? JSON.stringify(v) : String(v))
    return judgeRule(t, {
      ...base,
      task: 2,
      templates: ['clampTo'],
      cases: [
        ...cases.map(([type, v, lo, hi, want, what]) => ({
          name: `clampTo for ${article(type)} ${type} ${what}`,
          code: `auto r = clampTo(${lit(type, v)}, ${lit(type, lo)}, ${lit(type, hi)}); ${put('r', 'r')} ${put('isT', `std::is_same_v<decltype(r), ${type}> ? 1 : 0`)}`,
          judge: (got) => {
            if (num(got, 'isT') !== 1) return `For ${type} values, clampTo gives back something other than ${article(type)} ${type}. It gives back a T: the type in front of its name says what it gives back.`
            if (same(got.r, want)) return null
            const call = `clampTo(${show(type, v)}, ${show(type, lo)}, ${show(type, hi)})`
            if (same(got.r, v)) return `${call} gave back the value itself, which is ${what}.`
            if (same(got.r, lo)) return `${call} gave back the low end, and the value is ${what}.`
            if (same(got.r, hi)) return `${call} gave back the high end, and the value is ${what}.`
            return `${call} gave back ${show(type, got.r)}, which is none of the three values it was given.`
          },
          output: (got) => `clampTo(${show(type, v)}, ${show(type, lo)}, ${show(type, hi)}) gave back ${got.r === undefined ? 'nothing' : show(type, got.r)}`
        })),
        {
          name: 'clampTo<double> with the type said, for a whole number between two prices',
          code: `auto r = clampTo<double>(7, 2.5, 9); ${put('r', 'r')}`,
          judge: (got) => (same(got.r, 7) ? null : `clampTo<double>(7, 2.5, 9) gave back ${got.r}. With T said as double, all three are doubles, and 7 is between the two.`),
          output: (got) => `clampTo<double>(7, 2.5, 9) gave back ${got.r ?? '?'}`
        },
        ...[
          [2, 5, 9, 5, 'below the low end'],
          [12, 5, 9, 9, 'above the high end'],
          [7, 5, 9, 7, 'between the two']
        ].map(([v, lo, hi, want, what]) => ({
          name: `clampTo for Check's own type, ${what}`,
          code: `auto r = clampTo(check::Spring(${v}), check::Spring(${lo}), check::Spring(${hi})); ${put('r', 'r.turns')}`,
          judge: (got) => (num(got, 'r') === want ? null : `For Check's own type, a value of ${v} between ${lo} and ${hi} came back as ${got.r}. The value is ${what}.`),
          output: (got) => `clampTo of check::Spring values ${v}, ${lo}, ${hi} gave back the one with ${got.r ?? '?'}`
        }))
      ]
    })
  },

  fair(t) {
    const CLAMP = [
      'inline int indent_clamps_ = 0; inline const char* indent_clampT_ = "";',
      'template <typename T> T clampTo(const T& value, const T& low, const T& high) { indent_clamps_++; indent_clampT_ = std::is_same_v<T, double> ? "double" : std::is_same_v<T, int> ? "int" : std::is_same_v<T, float> ? "float" : "another type"; if (value < low) return low; if (high < value) return high; return value; }'
    ]
    const cases = [
      [[5, 60, 400, 13], 12.75, 99.5],
      [[0, 21, 20], 0.5, 20.25],
      [[150], 12.5, 249.99],
      [[], 12.5, 249.99]
    ]
    return judgeRule(t, {
      ...base,
      task: 3,
      fn: 'fairPrices',
      sig: {
        returns: 'std::vector<double>',
        params: [
          { type: 'const std::vector<int>&', what: 'the quotes' },
          { type: 'double', what: 'the floor' },
          { type: 'double', what: 'the ceiling' }
        ]
      },
      callWith: 'const std::vector<int>&, double, double',
      provides: [{ name: 'clampTo', task: 2, file: FILE, lines: CLAMP }],
      cases: cases.map(([quotes, floor, ceiling]) => {
        const want = quotes.map((q) => Math.min(Math.max(q, floor), ceiling))
        const call = `fairPrices(${listed(quotes)}, ${floor}, ${ceiling})`
        return {
          name: quotes.length ? call : 'fairPrices with no quotes',
          code: `std::vector<double> p = fairPrices(std::vector<int>{${quotes.join(', ')}}, ${dbl(floor)}, ${dbl(ceiling)}); ${put('p', 'p')} ${put('n', 'indent_clamps_')} ${put('T', 'indent_clampT_')}`,
          judge: (got) => {
            const p = parse(got.p)
            const n = num(got, 'n')
            if (quotes.length && n === 0) return 'fairPrices does not call clampTo. The task asks it to keep each quote between the floor and the ceiling with clampTo, the template of Task 2, so the rule is written once.'
            if (n > 0 && got.T !== 'double') return `fairPrices called clampTo with T as ${got.T === 'int' ? 'int, for whole numbers' : got.T}, so the floor and the ceiling lost their pence before they were compared. The task asks for the price worked out as a double.`
            if (n !== quotes.length) return `fairPrices called clampTo ${n} times for ${quotes.length} quotes. Each quote is kept between the floor and the ceiling once.`
            if (!Array.isArray(p)) return `Check could not read the list fairPrices gave back.`
            if (p.length !== quotes.length) return `fairPrices gave back ${p.length} prices for ${quotes.length} quotes. It gives back one price for each quote.`
            if (!want.every((w, i) => Math.abs(p[i] - w) < 1e-9)) return `${call} gave back ${listed(p)}. Each price is its quote kept between the floor and the ceiling, in the order of the quotes.`
            return null
          },
          output: (got) => `${call} gave back ${parse(got.p) ? listed(parse(got.p)) : '?'}\nclampTo was called ${got.n ?? '?'} times${got.T ? `, with T as ${got.T}` : ''}`
        }
      })
    })
  }
}

const article = (type) => (/^[aeiou]/.test(type) ? 'an' : 'a')
