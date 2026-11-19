import { isDeepStrictEqual } from 'node:util'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const detail = (name, passed, message, output) => ({ name, passed, message: passed ? undefined : message, output })

function notImplemented(fn, r) {
  if (r.ok || !/Not implemented/.test(r.error)) return null
  return [detail(`${fn} is implemented`, false, `${fn} still throws 'Not implemented'. Replace that line with your code.`, r.error)]
}

async function sandbox(t) {
  return t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
}

const readJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// Runs several drive calls and reports them as one check.
function group(name, runs, test, message) {
  const passed = runs.every((r) => r.run.ok && test(r))
  return detail(name, passed, message, runs.map((r) => `${r.label}\n  -> ${show(r.run)}`).join('\n'))
}

export const checks = {
  async 'parse-args'(t) {
    const dir = await sandbox(t)
    const labels = {
      valid: '{"sku":"OAT-1L","quantity":2}',
      optional: '{"sku":"OAT-1L","quantity":2,"gift":true,"weight":1.5}',
      notJson: '{sku: OAT-1L, quantity: 2}',
      array: '["OAT-1L", 2]',
      nul: 'null',
      text: '"OAT-1L"',
      missing: '{"sku":"OAT-1L"}',
      quantityText: '{"sku":"OAT-1L","quantity":"2"}',
      quantityHalf: '{"sku":"OAT-1L","quantity":2.5}',
      giftText: '{"sku":"OAT-1L","quantity":1,"gift":"yes"}',
      unknown: '{"sku":"OAT-1L","quantity":1,"colour":"blue"}'
    }
    const entries = await Promise.all(
      Object.entries(labels).map(async ([key, raw]) => [key, { label: `parseArguments(basket, ${raw})`, run: await t.call(dir, '.grader/drive.mjs', 'parse', [raw]) }])
    )
    const r = Object.fromEntries(entries)
    const early = notImplemented('parseArguments', r.valid.run)
    if (early) return early
    const rejected = (c) => c.run.value?.ok === false && typeof c.run.value.error === 'string' && c.run.value.error.length > 0
    const names = (field) => (c) => rejected(c) && c.run.value.error.includes(field)
    return [
      group(
        'Accepts valid arguments',
        [r.valid, r.optional],
        (c) => c.run.value?.ok === true && isDeepStrictEqual(c.run.value.args, JSON.parse(labels[c === r.valid ? 'valid' : 'optional'])),
        'Arguments that match the schema should give { ok: true, args } with args as the parsed object.'
      ),
      group(
        'Rejects text that is not JSON',
        [r.notJson],
        rejected,
        'Broken JSON should give { ok: false, error } instead of throwing. Wrap JSON.parse.'
      ),
      group(
        'Rejects JSON that is not an object',
        [r.array, r.nul, r.text],
        rejected,
        'An array, null or a plain string is valid JSON but not an arguments object. Remember typeof null.'
      ),
      group(
        'Names a missing required argument',
        [r.missing],
        names('quantity'),
        'Each name in parameters.required must be present. The error should name the one that is missing.'
      ),
      group(
        'Names an argument of the wrong type',
        [r.quantityText, r.quantityHalf, r.giftText],
        (c) => names(c === r.giftText ? 'gift' : 'quantity')(c),
        "Each value must match its property's type, and 'integer' means a whole number. The error should name the argument."
      ),
      group(
        'Names an argument the tool does not take',
        [r.unknown],
        names('colour'),
        'A key that is not in parameters.properties is a mistake the model should hear about. Name it in the error.'
      )
    ]
  },

  async execute(t) {
    const dir = await sandbox(t)
    const cases = {
      ok: ['total', '{"price":2.5,"count":4}'],
      async: ['slow_total', '{"price":3}'],
      unknown: ['subtract', '{"price":1,"count":1}'],
      badArgs: ['total', '{"price":2.5,"count":"4"}'],
      badJson: ['total', 'price=2.5'],
      throws: ['scanner', '{}'],
      rejects: ['late_scanner', '{}']
    }
    const entries = await Promise.all(
      Object.entries(cases).map(async ([key, args]) => [
        key,
        { label: `executeToolCall(registry, ${args.map((a) => JSON.stringify(a)).join(', ')})`, run: await t.call(dir, '.grader/drive.mjs', 'exec', args) }
      ])
    )
    const r = Object.fromEntries(entries)
    const early = notImplemented('executeToolCall', r.ok.run)
    if (early) return early
    const errorWith = (...parts) => (c) => {
      const body = typeof c.run.value === 'string' ? readJson(c.run.value) : undefined
      return typeof body?.error === 'string' && parts.every((p) => body.error.includes(p))
    }
    const neverThrows = 'executeToolCall should never throw. It returns the tool message content, a JSON string, every time.'
    return [
      group(
        'Runs a valid call and returns its result as JSON text',
        [r.ok, r.async],
        (c) => typeof c.run.value === 'string' && isDeepStrictEqual(readJson(c.run.value), c === r.ok ? { total: 10 } : { total: 6 }),
        'For a known tool with valid arguments, return JSON.stringify of what run returned. Await it, since some tools are async.'
      ),
      group(
        'Turns an unknown tool into an error result',
        [r.unknown],
        errorWith('subtract', 'total', 'slow_total'),
        `${neverThrows} For a tool that is not in the registry, the error should name it and list the tools that do exist, so the model can pick again.`
      ),
      group(
        'Turns invalid arguments into an error result',
        [r.badArgs, r.badJson],
        (c) => errorWith()(c) && (c === r.badJson || errorWith('count')(c)),
        `${neverThrows} Use parseArguments and pass its error back as { "error": "..." } without running the tool.`
      ),
      group(
        'Turns a tool that throws into an error result',
        [r.throws, r.rejects],
        (c) => errorWith(c === r.throws ? 'Shelf scanner offline' : 'Scanner timed out at aisle 4')(c),
        `${neverThrows} When run throws or rejects, catch it and put the error's message in the result.`
      )
    ]
  },

  async recover(t) {
    const dir = await sandbox(t)
    const [specs, expected, three, forty, types] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'specs'),
      t.call(dir, '.grader/drive.mjs', 'expectedSpecs'),
      t.call(dir, 'src/agent.ts', 'runAgent', ['Reserve 3 jars of wildflower honey for order PL-2042.']),
      t.call(dir, 'src/agent.ts', 'runAgent', ['Reserve 40 jars of wildflower honey for order PL-2042.']),
      t.typecheck(dir, ['src/agent.ts', 'src/registry.ts'])
    ])
    const early = notImplemented('toolSpecs', specs)
    if (early) return early
    const wanted = (expected.value ?? []).map((fn) => ({ type: 'function', function: fn }))
    const recoverHint =
      'Pip first calls a tool that does not exist, then sends a quantity as text. Answer every call with executeToolCall so those mistakes come back as results instead of crashing the run.'
    const fortyText = forty.value?.answer ?? ''
    return [
      detail(
        'toolSpecs lists every tool in the registry',
        specs.ok && isDeepStrictEqual(specs.value, wanted),
        "Return one { type: 'function', function: { name, description, parameters } } per registry entry, in registry order. The name is the registry key.",
        show(specs)
      ),
      detail(
        'Recovers from a made-up tool and a bad argument',
        three.ok && isDeepStrictEqual(three.value, { answer: 'Reserved 3 of Wildflower honey 250 g for PL-2042. 9 left in stock.', steps: 5 }),
        recoverHint,
        show(three)
      ),
      detail(
        'Reports a tool failure instead of crashing',
        forty.ok && forty.value?.steps === 5 && fortyText.startsWith('I could not reserve 40 of Wildflower honey 250 g for PL-2042:') && fortyText.includes('Only 12 of HNY-250 left'),
        'reserve_stock throws when there is not enough stock. That error should reach the model as a tool result, with the thrown message in it.',
        show(forty)
      ),
      detail('agent.ts and registry.ts type-check', types.passed, 'TypeScript reports errors in src/agent.ts or src/registry.ts.', types.output)
    ]
  }
}
