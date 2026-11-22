import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, NOT_A_BACKUP, readManifest } from './backupLogic'
import { emptyProgress } from './progressLogic'

const manifest = (change: object = {}): string =>
  JSON.stringify({
    format: BACKUP_FORMAT,
    progress: emptyProgress(),
    app: { codeTheme: 'x' },
    ai: { provider: 'claude-code' },
    ...change
  })

describe('readManifest', () => {
  it('reads a backup the app wrote', () => {
    expect(readManifest(manifest())).toEqual({
      format: BACKUP_FORMAT,
      progress: emptyProgress(),
      app: { codeTheme: 'x' },
      ai: { provider: 'claude-code' }
    })
  })

  it('reads a backup without settings', () => {
    const read = readManifest(manifest({ app: undefined, ai: [] }))
    expect(read.app).toBeNull()
    expect(read.ai).toBeNull()
  })

  it.each([
    ['text that is not JSON', 'backup'],
    ['a newer format', manifest({ format: BACKUP_FORMAT + 1 })],
    ['a bare progress file', JSON.stringify(emptyProgress())],
    ['broken progress', manifest({ progress: { totalPoints: -1 } })]
  ])('refuses %s', (_, text) => {
    expect(() => readManifest(text)).toThrow(NOT_A_BACKUP)
  })
})
