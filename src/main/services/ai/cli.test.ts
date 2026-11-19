import { chmod, mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { runCli, type CliRun } from './cli'

async function fakeCli(script: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'labbench-fake-cli-'))
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
