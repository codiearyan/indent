import { code } from '../../grading.mjs'
import { evaluate, readSource, shape } from '../../rules-grading.mjs'
import { explainObject, same, show } from '../../catalogue-grading.mjs'

const FILE = 'src/candles.js'

const UNCHANGED =
  "sell did not change the card's stock property. Change the property on the object, through this, not a variable of its own."

const NO_STOCK =
  'A new candle has no stock yet. Give every property its first value in the constructor, stock included, so a candle is complete the moment it is made.'

const plain = (v) => `Object.fromEntries(Object.entries(${v}).filter(([, x]) => typeof x !== 'function'))`

/** Runs each case's expression in the learner's file. Returns, per case, { value } or { threw }. */
async function run(t, list) {
  const { results, problem } = await evaluate(t, FILE, list.map((c) => c.expr))
  if (problem) return { problem }
  return { runs: results.map((r) => (r.threw ? { threw: r.threw } : { value: r.result.value })) }
}

/** The details for `list`; a case is { name, expr, expected, hint, explain?(r) }. */
function details(list, runs, why = () => undefined) {
  return list.map((c, i) => {
    const r = runs[i]
    const passed = !r.threw && same(r.value, c.expected)
    const output = `${c.shown}\n${r.threw ? `stopped with ${r.threw}` : `gave ${show(r.value)}`}`
    if (passed) return { name: c.name, passed, output }
    return { name: c.name, passed, output, message: c.explain?.(r) ?? why(r) ?? c.hint }
  })
}

const missingClass = (name, task) => (r) =>
  r.threw && new RegExp(`ReferenceError: ${name} is not defined`).test(r.threw)
    ? `Check cannot find a class called ${name}. Write it under // ${task}, starting with the word class, capital letters as in the task.`
    : undefined

const withoutNew = (r) =>
  r.threw && /cannot be invoked without 'new'/.test(r.threw)
    ? 'A class is called with new in front of it. Look for a call to the class without new in your file.'
    : undefined

const exportsClass = (text, name) =>
  new RegExp(`^export\\s+(?:class|function)\\s+${name}\\b|^export\\s*\\{[^}]*\\b${name}\\b`, 'm').test(text)

export const checks = {
  async card(t) {
    const list = [
      {
        name: 'A card that sells',
        expr: `(() => { const c = makeCard('Pine', 6); c.sell(2); return ${plain('c')} })()`,
        shown: "makeCard('Pine', 6), then sell(2)",
        expected: { name: 'Pine', stock: 4 },
        hint: 'The card has the properties name and stock, and sell takes count off its stock.',
        explain: (r) =>
          r.value && typeof r.value === 'object' && r.value.stock === 6
            ? UNCHANGED
            : r.value && typeof r.value === 'object'
              ? explainObject('the card', r.value, { name: 'Pine', stock: 4 })
              : undefined
      },
      {
        name: 'sell uses the stock property',
        expr: `(() => { const c = makeCard('Pine', 6); c.stock = 10; c.sell(3); return c.stock })()`,
        shown: "makeCard('Pine', 6), stock set to 10, then sell(3)",
        expected: 7,
        hint: "sell did not start from the card's stock property as it is now. Read and change this.stock, the property, so a change to the card is seen by sell."
      },
      {
        name: 'sell works on the object it is called on',
        expr: `(() => { const a = makeCard('Pine', 6); const b = { stock: 4, sell: a.sell }; b.sell(1); return [a.stock, b.stock] })()`,
        shown: "a = makeCard('Pine', 6), b = { stock: 4, sell: a.sell }, then b.sell(1), the stock of a and of b",
        expected: [6, 3],
        hint: 'sell changed the card makeCard made, though it was called on another object. Use this: it is the object before the dot when sell is called.',
        explain: (r) => (same(r.value, [6, 4]) ? UNCHANGED : undefined)
      },
      {
        name: 'Each card keeps its own stock',
        expr: `(() => { const a = makeCard('Pine', 5); const b = makeCard('Moss', 5); a.sell(2); return [a.stock, b.stock] })()`,
        shown: "a = makeCard('Pine', 5), b = makeCard('Moss', 5), then a.sell(2)",
        expected: [3, 5],
        hint: 'Selling from one card changed the other. Each call to makeCard should make a new object.',
        explain: (r) => (Array.isArray(r.value) && r.value[0] === 5 ? UNCHANGED : undefined)
      }
    ]
    const { runs, problem } = await run(t, [...list, { expr: `makeCard('Pine', 6) === undefined` }])
    if (problem) return [problem]
    if (runs.pop().value === true) {
      return [{ name: 'makeCard gives back a card', passed: false, message: 'makeCard gives nothing back yet. A function hands its answer back with return.' }]
    }
    return details(list, runs, (r) => {
      if (!r.threw) return undefined
      if (/\.sell is not a function/.test(r.threw)) {
        return 'The card makeCard gives has no sell method. Add it to the object, written as a method: its name, its parameters in round brackets, then its body.'
      }
      if (/Cannot (read|set) properties of undefined \(\w+ 'stock'\)/.test(r.threw)) {
        return 'sell stops because this is undefined inside it. An arrow function has no this of its own, so write sell as a method, the way the lesson does: its name, its parameters, then its body.'
      }
      return undefined
    })
  },

  async candle(t) {
    const text = code(await readSource(t, FILE))
    const list = [
      {
        name: 'A new candle',
        expr: `(() => { const c = new Candle('Fig', 2400); return ${plain('c')} })()`,
        shown: "new Candle('Fig', 2400)",
        expected: { name: 'Fig', priceCents: 2400, stock: 0 },
        hint: 'A new candle has name and priceCents from its parameters, and stock set to 0, all given in the constructor.',
        explain: (r) =>
          r.value && typeof r.value === 'object'
            ? (!('stock' in r.value)
                ? NO_STOCK
                : explainObject('the new candle', r.value, { name: 'Fig', priceCents: 2400, stock: 0 }))
            : undefined
      },
      {
        name: 'Restock, then sell',
        expr: `(() => { const c = new Candle('Fig', 2400); c.restock(5); c.sell(2); return [c.stock, c.label()] })()`,
        shown: "new Candle('Fig', 2400), restock(5), sell(2), then stock and label()",
        expected: [3, 'Fig: 3 left'],
        hint: "restock adds to this.stock and sell takes off it. label gives the name, a colon, a space, the stock and 'left'."
      },
      {
        name: 'A candle that sold out',
        expr: `(() => { const c = new Candle('Moss', 1500); c.restock(2); c.sell(2); return c.label() })()`,
        shown: "new Candle('Moss', 1500), restock(2), sell(2), then label()",
        expected: 'Moss: sold out',
        hint: "When its stock is 0, label gives the name, a colon, a space and 'sold out'."
      },
      {
        name: 'Each candle keeps its own stock',
        expr: `(() => { const a = new Candle('Fig', 2400); const b = new Candle('Moss', 1500); a.restock(4); return [a.stock, b.stock] })()`,
        shown: 'two new candles, then restock(4) on the first',
        expected: [4, 0],
        hint: 'Restocking one candle changed the other. Keep the stock on this, the candle the method was called on.',
        explain: (r) => (Array.isArray(r.value) && r.value[1] == null ? NO_STOCK : undefined)
      }
    ]
    const { runs, problem } = await run(t, list)
    if (problem) return [problem]
    const absent = missingClass('Candle', 'Task 2')(runs[0])
    if (absent) return [{ name: 'Candle is there', passed: false, message: absent }]
    return [
      ...details(list, runs, (r) => withoutNew(r) ?? (r.threw && /is not a function/.test(r.threw) ? 'A candle is missing one of its methods. Read the error below: it names the one that was called.' : undefined)),
      shape('Candle is a class', /\bclass\s+Candle\b/.test(text), 'The task asks for a class: write Candle starting with the word class.'),
      shape('Candle is exported', exportsClass(text, 'Candle'), 'Candle is not exported, so no other file can use it. Export it, with export in front of the word class or on an export line.')
    ]
  },

  async limited(t) {
    const text = code(await readSource(t, FILE))
    const list = [
      {
        name: 'A new limited candle',
        expr: `(() => { const c = new LimitedCandle('Snow', 2600, 20); return ${plain('c')} })()`,
        shown: "new LimitedCandle('Snow', 2600, 20)",
        expected: { name: 'Snow', priceCents: 2600, stock: 0, edition: 20 },
        hint: 'A limited candle has everything a Candle has, made by Candle, and edition from its third parameter.',
        explain: (r) =>
          r.value && typeof r.value === 'object' && 'name' in r.value && !('priceCents' in r.value)
            ? "The limited candle has no priceCents. super(...) hands Candle's constructor what it needs to make a candle: the name and the price."
            : r.value && typeof r.value === 'object'
            ? explainObject('the limited candle', r.value, { name: 'Snow', priceCents: 2600, stock: 0, edition: 20 })
            : undefined
      },
      {
        name: 'Its label',
        expr: `(() => { const c = new LimitedCandle('Snow', 2600, 20); c.restock(3); return c.label() })()`,
        shown: "new LimitedCandle('Snow', 2600, 20), restock(3), then label()",
        expected: 'Snow: 3 left, limited to 20',
        hint: "The label is Candle's label, then a comma, a space, 'limited to' and the edition."
      },
      {
        name: 'Its label when sold out',
        expr: `(() => { const c = new LimitedCandle('Rime', 2800, 12); return c.label() })()`,
        shown: "new LimitedCandle('Rime', 2800, 12), then label()",
        expected: 'Rime: sold out, limited to 12',
        hint: "The label is Candle's label, then a comma, a space, 'limited to' and the edition."
      },
      {
        name: 'Sells the way Candle does',
        expr: `(() => { const c = new LimitedCandle('Snow', 2600, 20); c.restock(5); c.sell(2); return c.stock })()`,
        shown: "new LimitedCandle('Snow', 2600, 20), restock(5), sell(2), then stock",
        expected: 3,
        hint: 'restock and sell come from Candle. LimitedCandle does not need its own.'
      },
      {
        name: 'Uses the label of Candle',
        expr: `(() => { Candle.prototype.label = function () { return 'label of ' + this.name }; return new LimitedCandle('Snow', 2600, 20).label() })()`,
        shown: "Candle's label changed by Check, then new LimitedCandle('Snow', 2600, 20).label()",
        expected: 'label of Snow, limited to 20',
        hint: "Check changed Candle's label, and the limited label did not follow: LimitedCandle writes that part again by itself. Use Candle's own label through super, so a change to Candle reaches both."
      },
      {
        name: 'Built on Candle',
        expr: `new LimitedCandle('Snow', 2600, 20) instanceof Candle`,
        shown: "new LimitedCandle('Snow', 2600, 20) instanceof Candle",
        expected: true,
        hint: 'LimitedCandle is not built on Candle. Write extends Candle after its name.'
      }
    ]
    const { runs, problem } = await run(t, list)
    if (problem) return [problem]
    const absent = missingClass('Candle', 'Task 2')(runs[0])
      ? 'LimitedCandle is built on Candle, which is not there yet. Write Candle in Task 2 first.'
      : missingClass('LimitedCandle', 'Task 3')(runs[0])
    if (absent) return [{ name: 'LimitedCandle is there', passed: false, message: absent }]
    const base = await run(t, [
      {
        expr: `(() => { const c = new Candle('Fig', 2400); const fresh = ${plain('c')}; const empty = c.label(); c.restock(3); c.sell(1); return [fresh, empty, c.stock, c.label()] })()`
      }
    ])
    const baseRight =
      base.runs &&
      !base.runs[0].threw &&
      same(base.runs[0].value, [{ name: 'Fig', priceCents: 2400, stock: 0 }, 'Fig: sold out', 2, 'Fig: 2 left'])
    const noSuper =
      "LimitedCandle's constructor uses this before Candle's constructor has run. In a class built on another, the constructor calls super first, with what Candle's constructor needs, and only then sets edition."
    if (runs.every((r) => r.threw && /Must call super constructor/.test(r.threw))) {
      return [{ name: 'LimitedCandle can be made', passed: false, message: noSuper, output: runs[0].threw }]
    }
    const own = details(list, runs, (r) =>
      r.threw && /Must call super constructor/.test(r.threw) ? noSuper : withoutNew(r)
    )
    return [
      ...own.map((d, i) =>
        d.passed || baseRight || i === own.length - 1
          ? d
          : { ...d, message: 'LimitedCandle is built on Candle, which is not right yet. Get Task 2 passing first, then check again.' }
      ),
      shape('LimitedCandle is exported', exportsClass(text, 'LimitedCandle'), 'LimitedCandle is not exported, so no other file can use it. Export it, with export in front of the word class or on an export line.')
    ]
  },

  async payment(t) {
    // A candle of the grader's own, so this task does not depend on Candle.
    const jar = `class Jar { constructor() { this.stock = 5 } sell(count) { this.stock = this.stock - count } }`
    const list = [
      {
        name: 'Sells what was bought',
        expr: `(() => { ${jar}; const j = new Jar(); sellOnPayment(j, { qty: 2 }); return j.stock })()`,
        shown: 'a candle with 5 in stock, sellOnPayment(candle, { qty: 2 }), then its stock',
        expected: 3,
        hint: 'Once whenPaid calls the handler, the candle should have the candles bought taken off its stock.'
      },
      {
        name: 'Sells another order',
        expr: `(() => { ${jar}; const j = new Jar(); sellOnPayment(j, { qty: 4 }); return j.stock })()`,
        shown: 'a candle with 5 in stock, sellOnPayment(candle, { qty: 4 }), then its stock',
        expected: 1,
        hint: 'Sell the number of candles the order bought, the number whenPaid hands to the handler.'
      },
      {
        name: 'Waits for the payment',
        expr: `(() => { ${jar}; let later; whenPaid = (order, handler) => { later = () => handler(order.qty) }; const j = new Jar(); sellOnPayment(j, { qty: 2 }); const before = j.stock; if (later) later(); return [before, j.stock] })()`,
        shown: 'a till that is paid later: the stock before the payment, and after',
        expected: [5, 3],
        hint: 'The candles are taken off the stock when whenPaid calls the handler, not before. Hand the selling to whenPaid.',
        explain: (r) =>
          Array.isArray(r.value) && r.value[0] === 3
            ? 'sellOnPayment sells straight away, before the order is paid. Hand whenPaid a handler that sells, and let the till call it.'
            : undefined
      }
    ]
    const { runs, problem } = await run(t, list)
    if (problem) return [problem]
    if (runs[0].value === 5 && runs[1].value === 5 && same(runs[2].value, [5, 5])) {
      return [{ name: 'sellOnPayment sells', passed: false, message: 'sellOnPayment does nothing yet: the candle keeps all its stock. Hand whenPaid the order and a handler that sells.' }]
    }
    return details(list, runs, (r) => {
      if (r.threw && /Cannot (read|set) properties of undefined \(\w+ 'stock'\)/.test(r.threw)) {
        return "sell stops because this is undefined inside it. whenPaid was handed the sell method on its own, without the candle, and calls it with nothing before the dot. The lesson's part on passing a method shows how to keep the candle."
      }
      if (r.threw && /Assignment to constant/.test(r.threw)) {
        return 'Check could not stand in for whenPaid. Leave whenPaid as it was, written with the word function.'
      }
      return undefined
    })
  }
}
