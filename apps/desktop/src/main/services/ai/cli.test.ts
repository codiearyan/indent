import { chmod, mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { runCli, type CliRun } from './cli'

async function fakeCli(script: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'indent-fake-cli-'))
  const path = join(dir, 'fake')
  await writeFile(path, `#!/bin/sh\n${script}\n`)
  await chmod(path, 0o755)
  return path
}

function options(
  path: string,
  signal = new AbortController().signal
): { deltas: string[]; run: CliRun } {
  const deltas: string[] = []
  return {
    deltas,
    run: {
      provider: 'codex' as const,
      path,
      model: null,
      system: 'SYS',
      prompt: 'hi',
      env: { PATH: process.env.PATH ?? '' },
      signal,
      onDelta: (text: string) => deltas.push(text)
    }
  }
}

describe.skipIf(process.platform === 'win32')('runCli', () => {
  it('feeds the prompt on stdin and streams parsed text', async () => {
    const path = await fakeCli(
      `read -r first; echo '{"type":"item.completed","item":{"type":"agent_message","text":"got '"$first"'"}}'`
    )
    const { run, deltas } = options(path)
    await runCli(run)
    expect(deltas).toEqual(['got <instructions>'])
  })

  it('reports the last stderr line when the CLI fails without output', async () => {
    const path = await fakeCli(`echo 'noise' >&2; echo 'Not logged in' >&2; exit 1`)
    await expect(runCli(options(path).run)).rejects.toThrow('Not logged in')
  })

  describe('OpenCode', () => {
    const limitLog =
      'timestamp=2026-11-21T20:31:23.857Z level=ERROR message="stream error" small=false agent=build error.error="AI_APICallError: Free usage limit reached."'
    const opencode = (path: string, quietAfterErrorMs: number): CliRun => ({
      ...options(path).run,
      provider: 'opencode',
      quietAfterErrorMs
    })

    it('stops and gives the reason when it logs an error and goes quiet', async () => {
      const path = await fakeCli(`echo '${limitLog}' >&2; sleep 10`)
      const started = Date.now()
      await expect(runCli(opencode(path, 200))).rejects.toThrow(
        'OpenCode could not answer: Free usage limit reached.'
      )
      expect(Date.now() - started).toBeLessThan(5000)
    })

    it('keeps a reply that starts after an error it recovered from', async () => {
      const path = await fakeCli(
        `echo '${limitLog}' >&2; sleep 0.2; echo '{"type":"step_start"}'; sleep 0.8; echo '{"type":"text","part":{"text":"hello"}}'`
      )
      const run = opencode(path, 500)
      const deltas: string[] = []
      await runCli({ ...run, onDelta: (text) => deltas.push(text) })
      expect(deltas).toEqual(['hello'])
    })

    it('gives the logged reason when it exits without a reply and without an error code', async () => {
      const path = await fakeCli(`echo '${limitLog}' >&2`)
      await expect(runCli(opencode(path, 5000))).rejects.toThrow(
        'OpenCode could not answer: Free usage limit reached.'
      )
    })

    it('gives the logged reason, not the log line, when it exits with an error', async () => {
      const path = await fakeCli(`echo '${limitLog}' >&2; exit 1`)
      await expect(runCli(opencode(path, 5000))).rejects.toThrow(
        /^OpenCode could not answer: Free usage limit reached\.$/
      )
    })
  })

  it('kills the child when cancelled', async () => {
    const path = await fakeCli('sleep 10')
    const cancel = new AbortController()
    const started = Date.now()
    const pending = runCli(options(path, cancel.signal).run)
    setTimeout(() => cancel.abort(), 100)
    await expect(pending).rejects.toBeDefined()
    expect(Date.now() - started).toBeLessThan(5000)
  })
})
