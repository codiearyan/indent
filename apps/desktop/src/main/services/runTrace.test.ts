import { execFile } from 'child_process'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'
import { promisify } from 'util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { compareTrace } from '../../shared/trace'
import type { Flow, TraceResult } from '../../shared/types'

const content = resolve(__dirname, '../../../../../packages/content')
const runTrace = join(content, 'kit', 'run-trace.mjs')
const orderReports = join(content, 'labs', 'js-foundations', 'order-reports')

let root: string
const sandboxRoot = (): string => join(root, 'sandbox')

function write(dir: string, files: Record<string, string>): string {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true })
    writeFileSync(join(dir, rel), text)
  }
  return dir
}

const examples: Record<string, { file: string; call: string; args: unknown[] }> = {
  nested: { file: 'src/shop.js', call: 'checkout', args: [[2, 3]] },
  throws: { file: 'src/shop.js', call: 'refund', args: [] },
  async: { file: 'src/shop.js', call: 'loadLater', args: ['sage'] },
  forever: { file: 'src/shop.js', call: 'spin', args: [] },
  noisy: { file: 'src/shop.js', call: 'chatty', args: [] },
  typed: { file: 'src/prices.ts', call: 'withTax', args: [100] },
  many: { file: 'src/shop.js', call: 'countdown', args: [400] },
  shapes: { file: 'src/shop.js', call: 'shapes', args: [] },
  missing: { file: 'src/shop.js', call: 'nowhere', args: [] },
  arrow: { file: 'src/shop.js', call: 'viaArrow', args: [1] },
  long: { file: 'src/shop.js', call: 'checkout', args: [Array(200).fill(1)] }
}

const shop = `import { price } from './prices.js'

export function checkout(items) {
  return items.reduce((sum, qty) => sum + lineTotal(qty), 0)
}

function lineTotal(qty) {
  return qty * price()
}

export function refund() {
  return audit()
}

function audit() {
  throw new Error('No refunds today')
}

export async function loadLater(sku) {
  await new Promise((done) => setTimeout(done, 20))
  return label(sku)
}

function label(sku) {
  return sku.toUpperCase()
}

export function spin() {
  while (true) {}
}

export function chatty() {
  for (let i = 0; i < 2000; i++) console.log('line', i)
  return 'done'
}

export function countdown(n) {
  return n === 0 ? 0 : countdown(n - 1)
}

export function shapes() {
  const card = { stamps: new Set([1, 2]), seen: new Map([['a', undefined]]), cb: label }
  card.self = card
  return card
}

const double = (n) => n * 2

export function viaArrow(n) {
  return double(n)
}
`

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'indent-trace-'))
  write(join(root, 'workspace'), {
    'package.json': '{ "type": "module" }',
    'src/shop.js': shop,
    'src/prices.js': 'export function price() {\n  return 5\n}\n',
    'src/prices.ts': [
      'type Cents = number',
      'export function withTax(cents: Cents): Cents {',
      '  return cents + tax(cents)',
      '}',
      'function tax(cents: Cents): Cents {',
      '  return Math.round(cents / 5)',
      '}',
      ''
    ].join('\n'),
    '.indent/starter/src/shop.js': 'export function checkout() {}',
    'node_modules/dep/index.js': 'export function dep() {}'
  })
  const tasks = Object.fromEntries(
    Object.entries(examples).map(([id, trace]) => [id, { steps: [], trace }])
  )
  write(join(root, 'chapter'), {
    'flow.json': JSON.stringify({ scene: { nodes: [], edges: [], note: 'x' }, tasks }),
    'grader/checks.mjs': "throw new Error('the tracer imported the grader')",
    'solution/src/shop.js': "throw new Error('the tracer read the solution')"
  })
  if (process.platform !== 'win32') {
    chmodSync(join(root, 'chapter', 'grader'), 0)
    chmodSync(join(root, 'chapter', 'solution'), 0)
  }
})

afterAll(() => {
  if (process.platform !== 'win32') {
    chmodSync(join(root, 'chapter', 'grader'), 0o755)
    chmodSync(join(root, 'chapter', 'solution'), 0o755)
  }
  rmSync(root, { recursive: true, force: true })
})

async function trace(
  task: string,
  { chapter = join(root, 'chapter'), workspace = join(root, 'workspace') } = {}
): Promise<TraceResult> {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      runTrace,
      ...['--chapter', chapter],
      ...['--workspace', workspace],
      ...['--sandbox-root', sandboxRoot()],
      ...['--task', task]
    ],
    { maxBuffer: 8 * 1024 * 1024 }
  )
  const last = stdout.trim().split('\n').pop() ?? ''
  expect(readdirSync(sandboxRoot())).toEqual([])
  return (JSON.parse(last) as { trace: TraceResult }).trace
}

const path = (result: TraceResult): string[] =>
  result.calls.map((call) => `${'  '.repeat(call.depth)}${call.fn}`)

describe('run-trace.mjs', () => {
  it('records calls in the same file and through an import, with their depth', async () => {
    const result = await trace('nested')
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
    expect(path(result)).toEqual([
      'checkout',
      '  lineTotal',
      '    price',
      '  lineTotal',
      '    price'
    ])
    expect(result.calls[0]).toEqual({
      fn: 'checkout',
      file: 'src/shop.js',
      depth: 0,
      args: ['[2, 3]'],
      returned: '25'
    })
    expect(result.calls[2]).toMatchObject({ file: 'src/prices.js', returned: '5' })
  })

  it('records a call that threw and the error of the example', async () => {
    const result = await trace('throws')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Error: No refunds today')
    expect(result.calls).toEqual([
      { fn: 'refund', file: 'src/shop.js', depth: 0, args: [], threw: 'No refunds today' },
      { fn: 'audit', file: 'src/shop.js', depth: 1, args: [], threw: 'No refunds today' }
    ])
  })

  it('records an async function once its promise settles, keeping depth across await', async () => {
    const result = await trace('async')
    expect(result.ok).toBe(true)
    expect(path(result)).toEqual(['loadLater', '  label'])
    expect(result.calls[0].returned).toBe('"SAGE"')
  })

  it('stops a call that never ends and still prints the path so far', async () => {
    const result = await trace('forever')
    expect(result).toMatchObject({ ok: false, timedOut: true, error: 'Timed out' })
    expect(result.calls).toEqual([{ fn: 'spin', file: 'src/shop.js', depth: 0, args: [] }])
  }, 30_000)

  it("keeps the learner's own output apart from the result, and cuts it", async () => {
    // Several at once: on Linux a child that exits before its output is written loses the tail.
    const results = await Promise.all(Array.from({ length: 6 }, () => trace('noisy')))
    for (const result of results) {
      expect(result.ok).toBe(true)
      expect(result.calls[0].returned).toBe('"done"')
      expect(result.stdout.startsWith('line 0\nline 1\n')).toBe(true)
      expect(result.stdout.endsWith('... (output cut)')).toBe(true)
      expect(result.stdout.length).toBeLessThan(4100)
    }
  })

  it('traces a .ts file', async () => {
    const result = await trace('typed')
    expect(result.ok).toBe(true)
    expect(path(result)).toEqual(['withTax', '  tax'])
    expect(result.calls.map((call) => call.file)).toEqual(['src/prices.ts', 'src/prices.ts'])
    expect(result.calls[0].returned).toBe('120')
  })

  it('stops recording after 300 calls', async () => {
    const result = await trace('many')
    expect(result.ok).toBe(true)
    expect(result.truncated).toBe(true)
    expect(result.calls).toHaveLength(300)
  })

  it('shows sets, maps, functions, undefined and cycles, cut to 160 characters', async () => {
    const result = await trace('shapes')
    const shown = result.calls[0].returned ?? ''
    expect(shown).toBe(
      '{"stamps": Set [1, 2], "seen": Map {"a" => undefined}, "cb": [Function label], "self": [Circular]}'
    )
    const long = (await trace('long')).calls[0].args[0]
    expect(long).toHaveLength(160)
    expect(long).toMatch(/^\[1, 1, .*…$/)
  })

  it('says when the call is not an exported function', async () => {
    const result = await trace('missing')
    expect(result).toMatchObject({
      ok: false,
      calls: [],
      error: 'nowhere is not an exported function of src/shop.js'
    })
  })

  it('does not trace a function written as an arrow', async () => {
    const result = await trace('arrow')
    expect(path(result)).toEqual(['viaArrow'])
  })

  it('runs the order-reports starter and its solution', async () => {
    const workspace = join(root, 'order-reports')
    cpSync(join(orderReports, 'starter'), workspace, { recursive: true })
    const starter = await trace('total', { chapter: orderReports, workspace })
    expect(starter.ok).toBe(false)
    expect(starter.error).toBe('Error: Not implemented')
    expect(starter.calls).toMatchObject([{ fn: 'orderTotal', threw: 'Not implemented' }])

    cpSync(join(orderReports, 'solution'), workspace, { recursive: true })
    const solution = await trace('total', { chapter: orderReports, workspace })
    expect(solution.ok).toBe(true)
    expect(path(solution)).toEqual(['orderTotal'])
    expect(solution.calls[0].returned).toMatch(/^\d+$/)

    const flow = JSON.parse(readFileSync(join(orderReports, 'flow.json'), 'utf8')) as Flow
    const steps = flow.tasks?.total.steps ?? []
    const intended = compareTrace(flow.scene, steps, solution)
    expect(intended.divergence).toBeUndefined()
    expect(intended.steps.map((step) => step.status)).toEqual([
      'not-checked',
      'reached',
      'reached',
      'reached'
    ])
    expect(compareTrace(flow.scene, steps, starter).divergence?.message).toBe(
      'orderTotal() threw: Not implemented'
    )
  })
})
