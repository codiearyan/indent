import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { compareTrace } from './trace'
import type { Flow, LabMeta, TraceResult } from './types'

const content = fileURLToPath(new URL('../../../../packages/content/', import.meta.url))
const repos: { labId: string; expected: string[] }[] = [
  {
    labId: 'js-foundations',
    expected: ['order-reports/total', 'order-reports/top', 'order-reports/revenue']
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
    expected: ['chunking/split', 'chunking/overlap', 'chunking/docs', 'measuring-retrieval/metrics']
  },
  {
    labId: 'evals-ts',
    expected: ['exact-match/load', 'judge/parse', 'compare/compare']
  }
]

it.each(repos)(
  'follows every $labId trace example on its solution',
  async ({ labId, expected }) => {
    const repo = join(content, 'labs', labId)
    const scratch = await mkdtemp(join(tmpdir(), 'indent-trace-examples-'))
    try {
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
            { encoding: 'utf8', timeout: 10_000 }
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
