import { judgeFault, num, thrownText } from '../../grading.mjs'

const FILE = 'src/fitting.cpp'
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const strings = (list) => `std::vector<std::string>{${list.map(cpp).join(', ')}}`
const drawerCpp = (entries) => `std::map<std::string, int>{${entries.map(([k, v]) => `{${cpp(k)}, ${v}}`).join(', ')}}`
const parse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
const asMap = (got, key) => Object.fromEntries(parse(got[key]) ?? [])
const loupes = (n) => (n === 1 ? '1 loupe' : `${n ?? 'no'} loupes`)

// Check's fitPart throws for its own parts, those with "cracked" in their name, and writes down
// for every call whether the loupe was held at that moment.
const FIT_PART = `inline int indent_held_ = 0; inline int indent_unheld_ = 0; inline int indent_fits_ = 0; void fitPart(Repair& repair, const std::string& part) { indent_fits_++; if (indent_held_ == 0) indent_unheld_++; if (part.find("cracked") != std::string::npos) throw std::runtime_error("the " + part + " does not fit repair " + std::to_string(repair.getTicket())); repair.addMinutes(15); }`
const RIGHT_BORROWED = [
  'inline int indent_borrows_ = 0;',
  'class Borrowed { std::map<std::string, int>& d_; std::string t_; public: Borrowed(std::map<std::string, int>& d, const std::string& t) : d_(d), t_(t) { auto at = d_.find(t_); if (at == d_.end() || at->second <= 0) throw std::runtime_error("no " + t_ + " left"); at->second--; indent_held_++; indent_borrows_++; } ~Borrowed() { d_[t_]++; indent_held_--; } Borrowed(const Borrowed&) = delete; Borrowed& operator=(const Borrowed&) = delete; };'
]
const base = { files: [FILE], counted: true, own: ['Repair'], swaps: [{ name: 'fitPart', lines: FIT_PART }] }

export const checks = {
  open(t) {
    const fits = [
      ['Two parts that fit', 7302, 'desk clock', ['mainspring', 'pinion']],
      ['No parts at all', 61, 'lantern clock', []]
    ]
    const throws = [
      ['The second part does not fit', 9132, 'ship clock', ['mainspring', 'cracked crystal', 'pinion']],
      ['The first part does not fit', 88, 'wall clock', ['cracked dial']]
    ]
    return judgeFault(t, {
      ...base,
      task: 1,
      fn: 'openWithParts',
      sig: {
        returns: 'std::unique_ptr<Repair>',
        params: [
          { type: 'int', what: 'the ticket' },
          { type: 'const std::string&', what: 'the item' },
          { type: 'const std::vector<std::string>&', what: 'the parts' }
        ]
      },
      callWith: 'int, const std::string&, const std::vector<std::string>&',
      say: {
        left: 'When a part did not fit, the repair openWithParts made was still in memory after the exception went on, and nothing can delete it: the only pointer to it was a variable of openWithParts, gone with the function. The delete, or the owner, came after the line that threw, so it never ran. Give the repair its owner on the line that makes it.',
        twice: 'openWithParts ended the same repair twice: a delete by hand of a repair an owner holds, or two owners. One owner ends it, once.',
        dead: 'The repair openWithParts gave back had already ended when Check used it.'
      },
      cases: [
        ...fits.map(([name, tk, item, parts]) => ({
          name,
          code: `std::unique_ptr<Repair> r = openWithParts(${tk}, ${cpp(item)}, ${strings(parts)}); ${put('null', 'r ? 0 : 1')} if (r) { ${put('tk', 'r->getTicket()')} ${put('m', 'r->getMinutes()')} }`,
          judge: (got) => {
            if (num(got, 'null') === 1) return `openWithParts gave back an empty owner for parts that all fit. It gives back the owner of the repair it made.`
            if (num(got, 'tk') !== tk) return `openWithParts(${tk}, ...) gave back repair ${got.tk}. It makes the repair from the ticket and item it is given.`
            if (num(got, 'm') !== 15 * parts.length) return `The repair openWithParts gave back has ${got.m} minutes, and fitPart logs 15 for each part it fits: each of the ${parts.length} parts goes through fitPart once.`
            return null
          },
          output: (got) => `openWithParts(${tk}, "${item}", ${JSON.stringify(parts)}) gave back ${num(got, 'null') === 1 ? 'an empty owner' : `repair ${got.tk ?? '?'} with ${got.m ?? '?'} minutes`}`
        })),
        ...throws.map(([name, tk, item, parts]) => ({
          name,
          throws: true,
          code: `std::unique_ptr<Repair> r = openWithParts(${tk}, ${cpp(item)}, ${strings(parts)}); ${put('null', 'r ? 0 : 1')}`,
          judge: (got) => {
            if (got.threw === undefined) return `A part did not fit, fitPart threw, and openWithParts gave back ${num(got, 'null') === 1 ? 'an empty owner' : 'a repair'} instead of letting the exception go on. Its caller must know the repair could not be opened: clean up, and let the exception go on.`
            if (got.threw !== 'std::runtime_error' || !/does not fit/.test(got.what ?? '')) return `When a part did not fit, fitPart's std::runtime_error reached Check as ${thrownText(got)}. Let the exception itself go on.`
            if (num(got, 'made') !== 1) return `openWithParts made ${got.made} repairs for one ticket. It makes one.`
            return null
          },
          output: (got) => `openWithParts(${tk}, "${item}", ${JSON.stringify(parts)}): ${got.threw ? `${thrownText(got)} reached Check` : 'no exception reached Check'}`
        }))
      ]
    })
  },

  borrow(t) {
    const probes = [
      {
        name: 'A Borrowed cannot be copied',
        params: 'Borrowed& b',
        code: 'Borrowed c(b); (void)c;',
        expect: /deleted|delete/,
        compiled: 'Check made a copy of a Borrowed, and the compiler let it. The copy would put the tool back a second time when it ends. Forbid the copy, as std::unique_ptr does: the lesson shows the two lines.',
        other: () => 'Check\'s line that copies a Borrowed fails, but for another reason than a forbidden copy. A Borrowed is made from a drawer and a tool\'s name, and copying it is forbidden.',
        shown: 'Check\'s line: Borrowed copy(borrowed);'
      },
      {
        name: 'A Borrowed cannot be copied over another',
        params: 'Borrowed& a, Borrowed& b',
        code: 'a = b;',
        expect: /deleted|delete|reference/,
        compiled: 'Check copied one Borrowed over another, and the compiler let it. Then two of them would put the same tool back. Forbid that too: the lesson shows the line.',
        other: () => 'Check\'s line that copies one Borrowed over another fails, but for another reason than a forbidden copy.',
        shown: 'Check\'s line: first = second;'
      }
    ]
    const code = (entries, body) => `std::map<std::string, int> d = ${drawerCpp(entries)}; try { ${body} } catch (...) { ${put('after', 'd')} throw; } ${put('after', 'd')}`
    return judgeFault(t, {
      files: [FILE],
      task: 2,
      className: 'Borrowed',
      functions: [],
      probes,
      cases: [
        {
          name: 'A loupe is taken out, then put back',
          code: code([['loupe', 2], ['tweezers', 1]], `{ Borrowed b(d, "loupe"); ${put('during', 'd')} }`),
          judge: (got) => {
            const during = asMap(got, 'during')
            const after = asMap(got, 'after')
            if (during.loupe !== 1) return `While a Borrowed of the loupe lives, the drawer holds ${loupes(during.loupe)}, and it held 2. The constructor takes one out.`
            if (during.tweezers !== 1) return 'Borrowing the loupe changed the tweezers in the drawer. A Borrowed takes out only the tool it is given.'
            if (after.loupe !== 2) return `Once the Borrowed had ended, the drawer held ${loupes(after.loupe)}, and before it held 2. The destructor puts the tool back, once.`
            return null
          },
          output: (got) => `The drawer: {loupe: 2, tweezers: 1}\nwhile Borrowed(drawer, "loupe") lives: ${got.during ?? '?'}\nafter it ended: ${got.after ?? '?'}`
        },
        {
          name: 'The tool goes back when an exception leaves the block',
          throws: true,
          code: code([['loupe', 1]], `Borrowed b(d, "loupe"); ${put('during', 'd')} throw std::runtime_error("a part did not fit");`),
          judge: (got) => {
            const after = asMap(got, 'after')
            if (got.what !== 'a part did not fit') return `Check threw an exception of its own while a Borrowed lived, and what reached Check was ${got.threw ? thrownText(got) : 'nothing'}.`
            if (after.loupe !== 1) return `Check threw an exception while a Borrowed of the loupe lived, and afterwards the drawer held ${loupes(after.loupe)}, not the 1 it held before. The destructor of a local runs as the exception leaves its block, so that is where the tool goes back.`
            return null
          },
          output: (got) => `The drawer: {loupe: 1}\nCheck borrowed the loupe and threw; afterwards: ${got.after ?? '?'}`
        },
        ...[
          ['No loupe left in the drawer', [['loupe', 0], ['tweezers', 3]], 'loupe'],
          ['A tool that was never in the drawer', [['tweezers', 3]], 'oiler']
        ].map(([name, entries, tool]) => ({
          name,
          throws: true,
          code: code(entries, `Borrowed b(d, ${cpp(tool)}); ${put('made', 1)}`),
          judge: (got) => {
            const after = asMap(got, 'after')
            const before = Object.fromEntries(entries)
            if (got.threw === undefined) return `Check borrowed the ${tool}, and the drawer had none, and the constructor made a Borrowed anyway. It throws a std::runtime_error then, so no Borrowed is made and nothing is put back that was never taken.`
            if (got.threw !== 'std::runtime_error') return `With no ${tool} in the drawer, the constructor threw ${thrownText(got)}, and the task asks for a std::runtime_error.`
            if (!(got.what ?? '').includes(tool)) return `With no ${tool} in the drawer, the constructor threw a std::runtime_error whose what() is "${got.what}". It names the tool, so whoever reads it knows what is missing.`
            if ((after[tool] ?? 0) !== (before[tool] ?? 0) || after.tweezers !== before.tweezers) return `The constructor threw, and the drawer had changed: it holds ${got.after}. A constructor that throws leaves no object, so its destructor never runs and nothing is put back. Throw before anything is taken out.`
            return null
          },
          output: (got) => `The drawer: ${JSON.stringify(Object.fromEntries(entries))}\nBorrowed(drawer, "${tool}"): ${got.threw ? `${thrownText(got)} reached Check` : 'made a Borrowed'}\nthe drawer afterwards: ${got.after ?? '?'}`
        }))
      ]
    })
  },

  loupe(t) {
    const fits = [
      ['Three parts that fit', [['loupe', 1], ['tweezers', 2]], ['mainspring', 'pinion', 'crystal'], 3],
      ['No parts at all', [['loupe', 2]], [], 0]
    ]
    const throws = [
      ['The second part does not fit', [['loupe', 1]], ['mainspring', 'cracked pinion', 'crystal'], 'std::runtime_error', 'does not fit'],
      ['No loupe in the drawer', [['loupe', 0], ['tweezers', 2]], ['mainspring'], 'std::runtime_error', 'no loupe left']
    ]
    const call = (entries, parts) => `std::map<std::string, int> d = ${drawerCpp(entries)}; Repair indent_r_(7302, "desk clock"); try { ${put('n', `fitWithLoupe(d, indent_r_, ${strings(parts)})`)} } catch (...) { ${put('after', 'd')} ${put('m', 'indent_r_.getMinutes()')} ${put('unheld', 'indent_unheld_')} ${put('borrows', 'indent_borrows_')} throw; } ${put('after', 'd')} ${put('m', 'indent_r_.getMinutes()')} ${put('unheld', 'indent_unheld_')} ${put('borrows', 'indent_borrows_')}`
    const common = (got, entries) => {
      const after = asMap(got, 'after')
      const before = Object.fromEntries(entries)
      if (num(got, 'borrows') === 0 && before.loupe > 0) return 'fitWithLoupe never made a Borrowed. The task asks it to borrow the loupe with one, so the loupe goes back by itself whatever happens.'
      if (num(got, 'unheld') > 0) return 'fitWithLoupe fitted a part while no Borrowed of the loupe was alive. A Borrowed made without a name ends at the end of its own line, and one made after the fitting holds nothing during it: give it a name, before the loop.'
      if (after.loupe !== before.loupe) return `Afterwards the drawer holds ${loupes(after.loupe)}, and before it held ${before.loupe}. The loupe goes back once, whatever happened: a Borrowed made with new is never ended, so its destructor never runs.`
      if (after.tweezers !== before.tweezers) return 'fitWithLoupe changed the tweezers in the drawer. It borrows only the loupe.'
      return null
    }
    return judgeFault(t, {
      ...base,
      task: 3,
      fn: 'fitWithLoupe',
      sig: {
        returns: 'int',
        params: [
          { type: 'std::map<std::string, int>&', what: 'the drawer' },
          { type: 'Repair&', what: 'the repair' },
          { type: 'const std::vector<std::string>&', what: 'the parts' }
        ]
      },
      callWith: 'std::map<std::string, int>&, Repair&, const std::vector<std::string>&',
      provides: [{ name: 'Borrowed', task: 2, file: FILE, lines: RIGHT_BORROWED }],
      cases: [
        ...fits.map(([name, entries, parts, n]) => ({
          name,
          code: call(entries, parts),
          judge: (got) => {
            const problem = common(got, entries)
            if (problem) return problem
            if (num(got, 'n') !== n) return `fitWithLoupe fitted ${parts.length} parts and gave back ${got.n}. It gives back how many parts it fitted.`
            if (num(got, 'm') !== 15 * parts.length) return `Check's repair has ${got.m} minutes after fitWithLoupe, and fitPart logs 15 for each part: each part goes through fitPart once.`
            return null
          },
          output: (got) => `The drawer: ${JSON.stringify(Object.fromEntries(entries))}\nfitWithLoupe(drawer, repair, ${JSON.stringify(parts)}) gave back ${got.n ?? '?'}\nthe drawer afterwards: ${got.after ?? '?'}`
        })),
        ...throws.map(([name, entries, parts, kind, what]) => ({
          name,
          throws: true,
          code: call(entries, parts),
          judge: (got) => {
            if (got.threw === undefined && num(got, 'borrows') === 0) return 'fitWithLoupe never made a Borrowed. The task asks it to borrow the loupe with one, so the loupe goes back by itself whatever happens.'
            if (got.threw === undefined) return `${what === 'no loupe left' ? 'There was no loupe in the drawer, so Borrowed threw' : 'A part did not fit, so fitPart threw'}, and fitWithLoupe gave back ${got.n ?? 'a number'} instead of letting the exception go on. Its caller must know: put the loupe back, and let the exception go on.`
            if (got.threw !== kind || !(got.what ?? '').includes(what)) return `The exception reached Check as ${thrownText(got)}, not as the one that was thrown. Let the exception itself go on.`
            const problem = common(got, entries)
            if (problem) return problem
            if (what === 'does not fit' && num(got, 'm') !== 15) return `Check's repair has ${got.m} minutes, and only the first part fitted before the second threw.`
            return null
          },
          output: (got) => `The drawer: ${JSON.stringify(Object.fromEntries(entries))}\nfitWithLoupe(drawer, repair, ${JSON.stringify(parts)}): ${got.threw ? `${thrownText(got)} reached Check` : `gave back ${got.n ?? '?'}`}\nthe drawer afterwards: ${got.after ?? '?'}`
        }))
      ]
    })
  }
}
