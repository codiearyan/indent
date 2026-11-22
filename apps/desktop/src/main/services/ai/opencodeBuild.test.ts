import { describe, expect, it } from 'vitest'
import { freeModel, opencodeBuild } from './opencodeBuild'

describe('opencodeBuild', () => {
  it('picks the release file for each system the app ships for', () => {
    expect(opencodeBuild('darwin', 'arm64')?.name).toBe('opencode-darwin-arm64.zip')
    expect(opencodeBuild('darwin', 'x64')?.name).toBe('opencode-darwin-x64.zip')
    expect(opencodeBuild('win32', 'x64')?.name).toBe('opencode-windows-x64.zip')
    expect(opencodeBuild('linux', 'x64')?.name).toBe('opencode-linux-x64.tar.gz')
  })

  it('gives every file a size and a full sha256', () => {
    for (const [platform, arch] of [
      ['darwin', 'arm64'],
      ['darwin', 'x64'],
      ['linux', 'x64'],
      ['linux', 'arm64'],
      ['win32', 'x64'],
      ['win32', 'arm64']
    ]) {
      const build = opencodeBuild(platform, arch)
      expect(build?.size).toBeGreaterThan(0)
      expect(build?.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('has nothing for a system OpenCode does not build for', () => {
    expect(opencodeBuild('linux', 'ia32')).toBeNull()
    expect(opencodeBuild('freebsd', 'x64')).toBeNull()
  })
})

describe('freeModel', () => {
  it("picks one of OpenCode's own free models", () => {
    const models = ['anthropic/claude', 'opencode/big-pickle', 'opencode/glm-5.3-flash-free']
    expect(freeModel(models)).toBe('opencode/glm-5.3-flash-free')
  })

  it("never picks another provider's model, and keeps the default when none is free", () => {
    expect(freeModel(['openrouter/some-free', 'opencode/big-pickle'])).toBeNull()
    expect(freeModel([])).toBeNull()
  })
})
