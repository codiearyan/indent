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
      'order-reports/total',
      'order-reports/top',
      'order-reports/revenue'
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
      'object-types/slip'
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
      'status-families/family'
    ]
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
