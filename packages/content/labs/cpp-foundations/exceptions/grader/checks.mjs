import { judgeFault, kindWords, num, thrownText } from '../../grading.mjs'

const FILE = 'src/billing.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const list = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
const braces = (values) => `{${values.map((v) => (typeof v === 'string' ? cpp(v) : v)).join(', ')}}`
const numbersIn = (text) => (text ?? '').match(/-?\d+/g)?.map(Number) ?? []

// Check's price book: other parts and prices than the starter's, so no total can be typed in.
const BOOK = { mainspring: 1310, crystal: 365, pinion: 840, 'dial feet': 95 }
const PRICE_BOOK = [
  `int priceOf(const std::string& part) { const std::map<std::string, int> book = {${Object.entries(BOOK).map(([k, v]) => `{${cpp(k)}, ${v}}`).join(', ')}}; if (part.empty()) throw std::invalid_argument("the price book was given an empty part name"); if (part == "?") throw std::runtime_error("the price book is locked for the stocktake"); auto at = book.find(part); if (at == book.end()) throw std::out_of_range("no price for " + part); return at->second; }`
].join(' ')
const TILL = `inline bool indent_till_off_ = false; inline int indent_till_ = 0; inline int indent_tills_ = 0; void sendToTill(int cents) { if (indent_till_off_) throw std::runtime_error("the till is switched off"); indent_till_ = cents; indent_tills_++; }`
// Check's addCharge also throws another kind, which chargeLine must let go on.
const RIGHT_ADD = ['void addCharge(std::vector<int>& bill, int cents) { if (cents <= 0) throw std::invalid_argument("charge refused: " + std::to_string(cents) + " cents is not above 0"); if (bill.size() >= 40) throw std::length_error("the bill is full at 40 charges"); bill.push_back(cents); }']
const swaps = [
  { name: 'priceOf', lines: PRICE_BOOK },
  { name: 'sendToTill', lines: TILL }
]

const WHAT_IS_THROWN = {
  pointer: 'It makes the exception on the heap and throws the pointer, which no catch for std::invalid_argument takes, and which nobody deletes. Throw the exception itself, without new.',
  text: 'A catch for std::invalid_argument never takes a text. Throw a std::invalid_argument made from the text.',
  string: 'A catch for std::invalid_argument never takes a std::string. Throw a std::invalid_argument made from the text.',
  number: 'A catch for std::invalid_argument never takes a number. Throw a std::invalid_argument whose message names the number.'
}

export const checks = {
  refuse(t) {
    const good = [
      ['A charge of 250 on a bill that has one', [500], 250],
      ['A charge of 1 on an empty bill', [], 1]
    ]
    const bad = [
      ['A charge of -275 is refused', [500, 75], -275],
      ['A charge of 0 is refused', [1200], 0],
      ['A charge of -9 on an empty bill is refused', [], -9]
    ]
    return judgeFault(t, {
      ...base,
      task: 1,
      fn: 'addCharge',
      sig: {
        returns: 'void',
        params: [
          { type: 'std::vector<int>&', what: 'the bill' },
          { type: 'int', what: 'the charge' }
        ]
      },
      callWith: 'std::vector<int>&, int',
      swaps,
      cases: [
        ...good.map(([name, bill, cents]) => ({
          name,
          code: `std::vector<int> b = ${braces(bill)}; addCharge(b, ${cents}); ${put('after', 'b')}`,
          judge: (got) => {
            const after = list(got.after)
            return JSON.stringify(after) === JSON.stringify([...bill, cents]) ? null : `After addCharge(bill, ${cents}), the bill holds ${JSON.stringify(after)}. A charge above 0 goes at the end of the bill, and the charges already there stay.`
          },
          output: (got) => `Check's bill: ${JSON.stringify(bill)}\nafter addCharge(bill, ${cents}): ${got.after ?? '?'}`
        })),
        ...bad.map(([name, bill, cents]) => ({
          name,
          throws: true,
          code: `std::vector<int> b = ${braces(bill)}; try { addCharge(b, ${cents}); } catch (...) { ${put('after', 'b')} throw; } ${put('after', 'b')}`,
          judge: (got, stdout) => {
            if (got.threw === undefined) return `addCharge(bill, ${cents}) went back to Check without throwing. A charge of 0 or less is refused with a throw, so the caller cannot carry on as if it was added.${stdout.trim() ? ' Printing a message is not refusing: the caller never sees it.' : ''}`
            if (WHAT_IS_THROWN[got.threw]) return `addCharge(bill, ${cents}) threw ${kindWords(got.threw)}. ${WHAT_IS_THROWN[got.threw]}`
            if (got.threw !== 'std::invalid_argument') return `addCharge(bill, ${cents}) threw ${kindWords(got.threw)}, and the task asks for a std::invalid_argument: the kind is what a caller catches, so it says what went wrong. A charge that makes no sense is an invalid argument.`
            if (!numbersIn(got.what).includes(cents)) return `addCharge(bill, ${cents}) threw a std::invalid_argument whose what() is "${got.what}". It names the charge it was given, ${cents}, so whoever reads it knows what to put right.`
            if (JSON.stringify(list(got.after)) !== JSON.stringify(bill)) return `addCharge(bill, ${cents}) threw, and the bill had changed already: it holds ${got.after}. Check first and throw before anything changes, so a refused charge leaves the bill as it was.`
            return null
          },
          output: (got) => `Check's bill: ${JSON.stringify(bill)}\naddCharge(bill, ${cents}) ${got.threw ? `threw ${thrownText(got)}` : 'threw nothing'}\nthe bill afterwards: ${got.after ?? '?'}`
        }))
      ]
    })
  },

  quote(t) {
    const handled = [
      ['Parts all in the book', ['mainspring', 'crystal', 'dial feet'], []],
      ['Two parts not in the book, between others', ['pinion', 'gear 12', 'crystal', 'gear 40', 'dial feet'], ['gear 12', 'gear 40']],
      ['Only parts not in the book', ['cannon pinion'], ['cannon pinion']],
      ['No parts at all', [], []]
    ]
    const passOn = [
      ['An empty part name goes on to the caller', ['crystal', '', 'pinion'], 'std::invalid_argument', 'the price book was given an empty part name', 'priceOf throws std::invalid_argument for an empty part name: the list itself is broken, which is not a part missing from the book'],
      ['A locked price book goes on to the caller', ['pinion', '?'], 'std::runtime_error', 'the price book is locked for the stocktake', 'priceOf throws std::runtime_error when the price book is locked: nothing quoteParts can mend']
    ]
    return judgeFault(t, {
      ...base,
      task: 2,
      fn: 'quoteParts',
      sig: {
        returns: 'int',
        params: [
          { type: 'const std::vector<std::string>&', what: 'the parts' },
          { type: 'std::vector<std::string>&', what: 'the missing parts' }
        ]
      },
      callWith: 'const std::vector<std::string>&, std::vector<std::string>&',
      swaps,
      cases: [
        ...handled.map(([name, parts, missing]) => {
          const total = parts.reduce((sum, p) => sum + (BOOK[p] ?? 0), 0)
          return {
            name,
            code: `std::vector<std::string> m = {"seconds hand"}; int indent_r_ = quoteParts(${braces(parts)}, m); ${put('total', 'indent_r_')} ${put('missing', 'm')}`,
            judge: (got) => {
              const m = list(got.missing) ?? []
              const want = ['seconds hand', ...missing]
              if (num(got, 'total') !== total) {
                if (missing.length && num(got, 'total') < total) return `For ${JSON.stringify(parts)}, quoteParts gave back ${got.total}, less than the parts in Check's book add up to. It stopped at the first part not in the book: the try that catches it holds only what may throw for one part, so the loop goes on with the next.`
                return `For ${JSON.stringify(parts)}, quoteParts gave back ${got.total}. It adds up what priceOf gives for each part that is in the book.`
              }
              if (JSON.stringify(m) !== JSON.stringify(want)) {
                if (m.length === 1 && missing.length) return `quoteParts caught the std::out_of_range for ${JSON.stringify(missing)} and did not put the names at the end of missing. A catch that only goes on, or only prints, hides the part from whoever reads the list.`
                return `After quoteParts, missing holds ${JSON.stringify(m)}. Check's list already held "seconds hand", and the parts not in the book go at its end, in their order, each once.`
              }
              return null
            },
            output: (got) => `missing before: ["seconds hand"]\nquoteParts(${JSON.stringify(parts)}, missing) gave back ${got.total ?? '?'}\nmissing afterwards: ${got.missing ?? '?'}`
          }
        }),
        ...passOn.map(([name, parts, kind, what, why]) => ({
          name,
          throws: true,
          code: `std::vector<std::string> m; ${put('total', `quoteParts(${braces(parts)}, m)`)}`,
          judge: (got) => {
            if (got.threw === undefined) return `${why}, so quoteParts lets it go on to its caller. It never reached Check: a catch in quoteParts took it. Catch only std::out_of_range, by its name.`
            if (got.threw !== kind || got.what !== what) return `${why}. It reached Check as ${thrownText(got)}, not as the ${kind} priceOf threw. Let the exception itself go on: a catch that throws a new one loses what the first one said.`
            return null
          },
          output: (got) => `quoteParts(${JSON.stringify(parts)}, missing): ${got.threw ? `${thrownText(got)} reached Check` : `gave back ${got.total ?? '?'}`}`
        }))
      ]
    })
  },

  line(t) {
    const cases = [
      ['A charge of 250', [400], 250, false],
      ['A charge of 1', [], 1, false],
      ['A charge of -40 is refused', [400], -40, false],
      ['A charge of 0 is refused', [], 0, false],
      ['The till is switched off', [400], 300, 'till'],
      ['A full bill', Array(40).fill(10), 300, 'full']
    ]
    return judgeFault(t, {
      ...base,
      task: 3,
      fn: 'chargeLine',
      sig: {
        returns: 'std::string',
        params: [
          { type: 'std::vector<int>&', what: 'the bill' },
          { type: 'int', what: 'the charge' }
        ]
      },
      callWith: 'std::vector<int>&, int',
      swaps,
      provides: [{ name: 'addCharge', task: 1, file: FILE, lines: RIGHT_ADD }],
      cases: cases.map(([name, bill, cents, off]) => ({
        name,
        throws: off,
        code: `std::vector<int> b = ${braces(bill)}; ${off === 'till' ? 'indent_till_off_ = true; ' : ''}std::string indent_l_ = chargeLine(b, ${cents}); ${put('line', 'indent_l_')} ${put('after', 'b')} ${put('tills', 'indent_tills_')} ${put('till', 'indent_till_')}`,
        judge: (got) => {
          if (off) {
            const [kind, what, why] =
              off === 'till'
                ? ['std::runtime_error', 'the till is switched off', 'When the till is switched off, sendToTill throws std::runtime_error']
                : ['std::length_error', 'the bill is full at 40 charges', "Check's addCharge throws std::length_error for a bill that already holds 40 charges"]
            if (got.threw === undefined) return `${why}, and chargeLine gave back "${got.line}". That is not something the person at the counter can put right: chargeLine lets it go on to its caller. Catch only std::invalid_argument, by its name.`
            if (got.threw !== kind || got.what !== what) return `${why}, and it reached Check as ${thrownText(got)}. Let the exception itself go on: a catch that throws a new one loses what the first one said.`
            return null
          }
          if (cents > 0) {
            if (got.line !== `Added ${cents} cents`) return `chargeLine(bill, ${cents}) gave back "${got.line}". For a charge that went on the bill, it gives back the line the task shows.`
            if (JSON.stringify(list(got.after)) !== JSON.stringify([...bill, cents])) return `After chargeLine(bill, ${cents}), the bill holds ${got.after}. chargeLine adds the charge with addCharge.`
            if (num(got, 'tills') !== 1 || num(got, 'till') !== cents) return `chargeLine(bill, ${cents}) sent ${num(got, 'tills') ? `${got.tills} charges` : 'nothing'} to the till. It sends each charge that was added to the till once, with sendToTill.`
            return null
          }
          const refusal = `charge refused: ${cents} cents is not above 0`
          if (num(got, 'tills') > 0) return `chargeLine(bill, ${cents}) sent ${got.till} to the till, and addCharge refuses that charge. A refused charge never reaches the till: add it first, and send it only once that worked.`
          if (got.line === `Not added: ${refusal}`) return null
          if (got.line?.startsWith('Not added: ')) return `chargeLine(bill, ${cents}) gave back "${got.line}". After "Not added: " comes the what() of the exception addCharge threw, word for word: Check's addCharge says its own words, so the line must take them from the exception.`
          return `chargeLine(bill, ${cents}) gave back "${got.line}". When addCharge refuses a charge, chargeLine gives back "Not added: " followed by what() of the exception it caught.`
        },
        escaped: (got) =>
          got.threw === 'std::invalid_argument'
            ? `chargeLine let addCharge's std::invalid_argument out for a charge of ${cents}. Catch it in chargeLine, by const reference, and give back the not-added line.`
            : `chargeLine let ${thrownText(got)} out for a charge of ${cents}, with the till switched on.`,
        output: (got) => `Check's bill: ${bill.length > 8 ? `${bill.length} charges` : JSON.stringify(bill)}${off === 'till' ? ', the till switched off' : ''}\nchargeLine(bill, ${cents}) ${got.threw ? `let ${thrownText(got)} out` : `gave back "${got.line ?? '?'}"`}\nsent to the till: ${num(got, 'tills') ? got.till : 'nothing'}`
      }))
    })
  }
}
