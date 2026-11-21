import { describe, expect, it } from 'vitest'
import { releaseNoteText, shortNotes } from './updateRelease'

describe('release notes', () => {
  it('keeps the bullets of a markdown body without authors, links or commit prefixes', () => {
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

  it('reads the HTML the updater hands over', () => {
    const html =
      "<h2>What's Changed</h2><ul><li>feat(updates): restart into the update &amp; keep work by " +
      '<a href="https://github.com/a">@a</a> in <a href="https://github.com/x/y/pull/141">#141</a></li></ul>'
    expect(shortNotes(releaseNoteText(html))).toEqual(['Restart into the update & keep work'])
    expect(releaseNoteText([{ note: '<li>one</li>' }, { note: null }])).toBe('\n* one\n')
  })
})
