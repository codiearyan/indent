import { describe, expect, it } from 'vitest'
import { assetName, isNewer, shortNotes } from './updateRelease'

describe('isNewer', () => {
  it('compares versions part by part', () => {
    expect(isNewer('v0.1.1', '0.1.0')).toBe(true)
    expect(isNewer('v0.10.0', '0.9.9')).toBe(true)
    expect(isNewer('v0.1.0', '0.1.0')).toBe(false)
    expect(isNewer('v0.0.9', '0.1.0')).toBe(false)
  })
})

describe('assetName', () => {
  it('picks the file for this computer', () => {
    expect(assetName('darwin', 'arm64', false)).toBe('Indent-mac-arm64.dmg')
    expect(assetName('darwin', 'x64', false)).toBe('Indent-mac-x64.dmg')
    expect(assetName('win32', 'x64', false)).toBe('Indent-windows-x64-setup.exe')
    expect(assetName('linux', 'x64', true)).toBe('Indent-linux-x86_64.AppImage')
    expect(assetName('linux', 'x64', false)).toBeNull()
  })
})

describe('shortNotes', () => {
  it('keeps the bullets without authors, links or commit prefixes', () => {
    const body = [
      "## What's Changed",
      '* feat(tools): install any missing tool by @a in https://github.com/x/y/pull/137',
      '* fix(terminal): keep the terminal inside its box by @b in https://github.com/x/y/pull/130',
      '',
      '**Full Changelog**: https://github.com/x/y/compare/v0.1.0...v0.1.1'
    ].join('\n')
    expect(shortNotes(body)).toEqual([
      'Install any missing tool',
      'Keep the terminal inside its box'
    ])
  })
})
