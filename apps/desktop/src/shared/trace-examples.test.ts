import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { compareTrace } from './trace'
import type { Flow, TraceResult } from './types'

const content = fileURLToPath(new URL('../../../../packages/content/', import.meta.url))
const repo = join(content, 'labs/js-foundations')

it('follows every JavaScript foundations trace example on its solution', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'indent-trace-examples-'))
  try {
    const examples: string[] = []
    for (const issue of await readdir(repo, { withFileTypes: true })) {
      if (!issue.isDirectory()) continue
      const chapter = join(repo, issue.name)
      const flow: Flow = JSON.parse(await readFile(join(chapter, 'flow.json'), 'utf8'))
      const workspace = join(scratch, issue.name)
      for (const [taskId, task] of Object.entries(flow.tasks ?? {})) {
        if (!task.trace) continue
        examples.push(`${issue.name}/${taskId}`)
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
        const { trace }: { trace: TraceResult } = JSON.parse(stdout.trim().split('\n').at(-1) ?? '')
        expect(trace.ok, taskId + ' ' + trace.error).toBe(true)
        const comparison = compareTrace(flow.scene, task.steps, trace)
        expect(comparison.divergence, taskId).toBeUndefined()
        expect(
          comparison.steps.some((step) => step.status === 'reached'),
          taskId
        ).toBe(true)
      }
    }
    expect(examples).toEqual(
      expect.arrayContaining(['order-reports/total', 'order-reports/top', 'order-reports/revenue'])
    )
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
