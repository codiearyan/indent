import { describe, expect, it } from 'vitest'
import type { AiConfig, AiProviderInfo } from './types'
import { isFreeOpencodeModel, nextModel, otherProviders } from './aiModels'

const provider = (over: Partial<AiProviderInfo>): AiProviderInfo => ({
  id: 'opencode',
  label: 'OpenCode',
  kind: 'cli',
  available: true,
  models: [],
  ...over
})

describe('isFreeOpencodeModel', () => {
  it("accepts OpenCode's own free models only", () => {
    expect(isFreeOpencodeModel('opencode/glm-5.3-flash-free')).toBe(true)
    expect(isFreeOpencodeModel('opencode/big-pickle')).toBe(false)
    expect(isFreeOpencodeModel('openrouter/some-free')).toBe(false)
  })
})

describe('nextModel', () => {
  it('moves to the next model and wraps around', () => {
    const cli = provider({ models: ['a', 'b', 'c'] })
    expect(nextModel(cli, 'a')).toBe('b')
    expect(nextModel(cli, 'c')).toBe('a')
  })

  it("leaves a CLI's own default for its first listed model", () => {
    expect(nextModel(provider({ models: ['a', 'b'] }), null)).toBe('a')
  })

  it('counts the first model of an API provider as tried when none was picked', () => {
    const api = provider({ id: 'anthropic', kind: 'api', models: ['a', 'b'] })
    expect(nextModel(api, null)).toBe('b')
  })

  it("offers only free models for the app's own OpenCode", () => {
    const own = provider({
      managed: true,
      models: ['opencode/one-free', 'anthropic/claude', 'opencode/two-free']
    })
    expect(nextModel(own, 'opencode/one-free')).toBe('opencode/two-free')
    expect(nextModel(own, 'opencode/two-free')).toBe('opencode/one-free')
  })

  it('returns null when there is nothing else to try', () => {
    expect(nextModel(provider({ models: [] }), null)).toBeNull()
    expect(nextModel(provider({ models: ['a'] }), 'a')).toBeNull()
    expect(
      nextModel(
        provider({ managed: true, models: ['opencode/one-free', 'x'] }),
        'opencode/one-free'
      )
    ).toBeNull()
  })
})

describe('otherProviders', () => {
  it('lists the working providers other than the one in use', () => {
    const config = {
      provider: 'opencode',
      providers: [
        provider({ id: 'opencode' }),
        provider({ id: 'codex', available: false }),
        provider({ id: 'claude-code' }),
        provider({ id: 'anthropic', kind: 'api' })
      ]
    } as AiConfig
    expect(otherProviders(config).map((p) => p.id)).toEqual(['claude-code', 'anthropic'])
    expect(otherProviders(null)).toEqual([])
  })
})
