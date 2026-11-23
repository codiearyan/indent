import { execFileSync, spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { compareTrace } from './trace'
import type { Flow, LabMeta, TraceResult } from './types'

const content = fileURLToPath(new URL('../../../../packages/content/', import.meta.url))
const openai = fileURLToPath(new URL('../../node_modules/openai', import.meta.url))
const repos: { labId: string; expected: string[] }[] = [
  {
    labId: 'js-foundations',
    expected: [
      'reusable-rules/label',
      'reusable-rules/shipping',
      'reusable-rules/price',
      'reusable-rules/total',
      'doing-it-again/batch',
      'doing-it-again/weeks',
      'doing-it-again/engraving',
      'doing-it-again/digit',
      'where-names-live/label',
      'where-names-live/sale',
      'where-names-live/zone',
      'where-names-live/note',
      'passing-functions/rule',
      'shelf-list/last',
      'shelf-list/restock',
      'shelf-list/sell',
      'shelf-list/spot',
      'shelf-list/takings',
      'without-breaking/with',
      'without-breaking/featured',
      'without-breaking/without',
      'without-breaking/labels',
      'new-from-old/round',
      'new-from-old/cheap',
      'new-from-old/find',
      'new-from-old/tags',
      'sort-and-search/byname',
      'sort-and-search/cheapest',
      'sort-and-search/dearest',
      'sort-and-search/pour',
      'sort-and-search/ready',
      'order-reports/total',
      'order-reports/top',
      'order-reports/revenue',
      'candle-cards/make',
      'candle-cards/line',
      'candle-cards/sell',
      'candle-cards/restock',
      'going-through-cards/total',
      'going-through-cards/soldout',
      'going-through-cards/prices',
      'going-through-cards/value',
      'taking-cards-apart/tag',
      'taking-cards-apart/pick',
      'taking-cards-apart/copy',
      'taking-cards-apart/hide',
      'copies-and-originals/sale',
      'copies-and-originals/same',
      'copies-and-originals/copy',
      'copies-and-originals/on-sale',
      'maps-and-sets/count',
      'maps-and-sets/unique',
      'maps-and-sets/customers',
      'saving-the-catalogue/save',
      'saving-the-catalogue/load',
      'saving-the-catalogue/settings',
      'export-and-import/import',
      'export-and-import/sale',
      'throwing-errors/quantity',
      'throwing-errors/candle',
      'throwing-errors/cart',
      'throwing-errors/order',
      'classes/card',
      'timers-and-callbacks/remind',
      'promises-and-then/status',
      'promises-and-then/set',
      'promises-and-then/count',
      'promises-and-then/order',
      'async-and-await/paid',
      'async-and-await/noted',
      'async-and-await/restock',
      'async-and-await/close',
      'when-waiting-fails/pay',
      'when-waiting-fails/parcel',
      'when-waiting-fails/retry',
      'when-waiting-fails/screen',
      'several-at-once/one-by-one',
      'several-at-once/all',
      'several-at-once/board',
      'several-at-once/report'
    ]
  },
  {
    labId: 'typescript-essentials',
    expected: [
      'narrowing/to-cents',
      'narrowing/contact',
      'narrowing/greeting',
      'modelling-data/levels',
      'modelling-data/booking',
      'modelling-data/status',
      'generics/lists',
      'generics/latest',
      'types-from-types/fields',
      'types-from-types/changes',
      'unhappy-path/import',
      'unhappy-path/errors',
      'unhappy-path/quotes'
    ]
  },
  {
    labId: 'typescript-foundations',
    expected: [
      'types-for-functions/price',
      'types-for-functions/label',
      'types-for-functions/packed',
      'arrays-and-tuples/parcel',
      'arrays-and-tuples/code',
      'object-types/line',
      'object-types/slip',
      'type-aliases-and-interfaces/line',
      'type-aliases-and-interfaces/customer',
      'type-aliases-and-interfaces/parcel',
      'unions-and-literals/refs',
      'unions-and-literals/zone',
      'unions-and-literals/status',
      'narrowing/refs',
      'narrowing/count',
      'narrowing/shelf',
      'unknown-any-and-never/tin',
      'unknown-any-and-never/tins',
      'unknown-any-and-never/order',
      'unknown-any-and-never/status',
      'functions-as-values/rules',
      'generics/first',
      'generics/result',
      'generics/plain',
      'types-from-types/fields',
      'types-from-types/size',
      'types-from-types/parts',
      'types-across-files/packing',
      'types-across-files/shipping',
      'strict-settings/params',
      'strict-settings/nulls',
      'strict-settings/strict',
      'strict-settings/index'
    ]
  },
  {
    labId: 'async-js',
    expected: [
      'promises/wrap',
      'promises/chain',
      'promises/flatten',
      'async-await/rewrite',
      'async-await/parallel',
      'async-await/finally',
      'many-at-once/all',
      'many-at-once/settled',
      'retries-and-cancellation/sleep'
    ]
  },
  {
    labId: 'node-api',
    expected: ['json-bodies/validate', 'list-queries/apply-query', 'auth-and-errors/request-ids']
  },
  {
    labId: 'express-crud-api',
    expected: ['creating-workshops/validate', 'changing-workshops/patch']
  },
  {
    labId: 'sign-in-and-sessions',
    expected: ['keeping-passwords/hash', 'staying-signed-in/token']
  },
  {
    labId: 'js-bug-hunts',
    expected: [
      'cent-off-totals/reproduce',
      'cent-off-totals/fix',
      'reordered-departures/reproduce',
      'reordered-departures/fix',
      'same-reminder/reproduce',
      'lost-this/reproduce',
      'unawaited-saves/reproduce'
    ]
  },
  {
    labId: 'data-bug-hunts',
    expected: [
      'penny-over-invoices/fix',
      'due-a-day-early/fix',
      'renewal-skips-february/fix',
      'catalogue-out-of-order/fix',
      'names-cut-in-half/fix'
    ]
  },
  {
    labId: 'browser-js',
    expected: ['find-a-route/search-names', 'find-a-route/grade-band']
  },
  {
    labId: 'rag-ts',
    expected: [
      'chunking/split',
      'chunking/overlap',
      'chunking/docs',
      'embeddings/batch',
      'embeddings/cosine',
      'embeddings/rank',
      'grounded-answers/prompt',
      'grounded-answers/answer',
      'grounded-answers/not-found',
      'measuring-retrieval/metrics',
      'measuring-retrieval/evaluate',
      'vector-store/index',
      'vector-store/search',
      'vector-store/cutoff'
    ]
  },
  {
    labId: 'evals-ts',
    expected: [
      'compare/compare',
      'compare/decide',
      'exact-match/load',
      'exact-match/normalize',
      'exact-match/report',
      'flaky/repeat',
      'flaky/flag',
      'flaky/report',
      'graders/suite',
      'judge/parse',
      'judge/judge',
      'judge/report'
    ]
  },
  {
    labId: 'agents-ts',
    expected: [
      'agent-loop/run-tools',
      'agent-loop/loop',
      'agent-loop/step-limit',
      'bad-arguments/parse-args',
      'bad-arguments/execute',
      'bad-arguments/recover',
      'guardrails/trace',
      'one-tool-call/describe-tool',
      'one-tool-call/read-call',
      'one-tool-call/round-trip',
      'parallel-calls/agent'
    ]
  },
  {
    labId: 'llm-apps-ts',
    expected: [
      'first-call/messages',
      'first-call/ask',
      'first-call/details',
      'streaming/assemble',
      'streaming/stream-answer',
      'structured-output/parse',
      'structured-output/validate',
      'structured-output/extract',
      'system-prompts/label-only',
      'system-prompts/examples',
      'system-prompts/triage',
      'token-budget/fit'
    ]
  },
  {
    labId: 'llm-bug-hunts-ts',
    expected: ['cut-off-replies/reproduce', 'cut-off-replies/fix', 'untrusted-json/fix']
  },
  {
    labId: 'how-the-web-works',
    expected: [
      'addresses/parts',
      'addresses/join',
      'query-strings/read',
      'query-strings/build',
      'query-strings/next',
      'requests/line',
      'status-families/family',
      'json/line',
      'forms/body',
      'redirects/kind',
      'caching/keep',
      'caching/fresh',
      'cookies/header',
      'cookies/session',
      'cookies/trust',
      'origins/same',
      'origins/allow',
      'origins/preflight',
      'origins/answer'
    ]
  },
  {
    labId: 'build-a-json-parser',
    expected: [
      'cutting-into-tokens/marks',
      'numbers-and-text/numbers',
      'numbers-and-text/texts',
      'values-inside-values/arrays',
      'values-inside-values/objects',
      'errors-you-can-act-on/where',
      'writing-it-back/write',
      'writing-it-back/trip'
    ]
  },
  {
    labId: 'build-a-router',
    expected: ['parts-that-vary/match', 'query-and-body/query']
  },
  {
    labId: 'build-a-state-store',
    expected: ['one-place-for-state/create', 'selectors/shallow']
  },
  {
    labId: 'build-a-key-value-database',
    expected: ['a-log-on-disk/replay', 'records-that-hold-anything/anything']
  },
  {
    labId: 'testing-foundations',
    expected: ['choosing-cases/fix', 'test-first/free-code', 'test-first/large-code']
  },
  {
    labId: 'security-bug-hunts',
    expected: [
      'search-leak/reproduce',
      'notes-as-html/reproduce',
      'notes-as-html/fix',
      'peeking-orders/reproduce',
      'proof-escape/reproduce',
      'leaky-log/reproduce'
    ]
  }
]

let model: ReturnType<typeof spawn>
let modelUrl: string

beforeAll(async () => {
  model = spawn(process.execPath, [join(content, 'kit/lab-model.mjs')], {
    stdio: ['ignore', 'pipe', 'inherit']
  })
  const lines = createInterface({ input: model.stdout! })
  try {
    modelUrl = await new Promise<string>((resolve, reject) => {
      model.once('error', reject)
      model.once('exit', (code) => reject(new Error(`Local model exited with code ${code}`)))
      lines.once('line', (line) => {
        try {
          const { port } = JSON.parse(line)
          resolve(`http://127.0.0.1:${port}/v1`)
        } catch (error) {
          reject(error)
        }
      })
    })
  } finally {
    lines.close()
  }
})

afterAll(() => {
  model?.kill()
})

it.each(repos)(
  'follows every $labId trace example on its solution',
  async ({ labId, expected }) => {
    const repo = join(content, 'labs', labId)
    const scratch = await mkdtemp(join(tmpdir(), 'indent-trace-examples-'))
    try {
      const modules = join(scratch, 'node_modules')
      await mkdir(modules)
      await symlink(openai, join(modules, 'openai'), 'junction')
      const examples: string[] = []
      // Only the issues lab.json lists: a repo can hold other folders, such as shared code.
      const lab: LabMeta = JSON.parse(await readFile(join(repo, 'lab.json'), 'utf8'))
      for (const name of lab.parts.flatMap((part) => part.chapters)) {
        const chapter = join(repo, name)
        const flow: Flow = JSON.parse(await readFile(join(chapter, 'flow.json'), 'utf8'))
        const workspace = join(scratch, name)
        for (const [taskId, task] of Object.entries(flow.tasks ?? {})) {
          if (!task.trace) continue
          examples.push(`${name}/${taskId}`)
          await cp(join(chapter, 'starter'), workspace, { recursive: true })
          await cp(join(chapter, 'solution'), workspace, { recursive: true })
          const stdout = execFileSync(
            process.execPath,
            [
              join(content, 'kit/run-trace.mjs'),
              '--chapter',
              chapter,
              '--workspace',
              workspace,
              '--sandbox-root',
              scratch,
              '--task',
              taskId
            ],
            {
              encoding: 'utf8',
              timeout: 10_000,
              env: {
                ...process.env,
                LAB_MODEL_URL: modelUrl,
                OPENAI_BASE_URL: modelUrl,
                OPENAI_API_KEY: 'lab-model'
              }
            }
          )
          const { trace }: { trace: TraceResult } = JSON.parse(
            stdout.trim().split('\n').at(-1) ?? ''
          )
          expect(trace.ok, taskId + ' ' + trace.error).toBe(true)
          const comparison = compareTrace(flow.scene, task.steps, trace)
          expect(comparison.divergence, taskId).toBeUndefined()
          expect(
            comparison.steps.some((step) => step.status === 'reached'),
            taskId
          ).toBe(true)
        }
      }
      expect(examples).toEqual(expect.arrayContaining(expected))
    } finally {
      await rm(scratch, { recursive: true, force: true })
    }
  },
  30_000
)
