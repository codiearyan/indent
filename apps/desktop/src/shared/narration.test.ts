import { describe, expect, it } from 'vitest'
import { lessonParts, narrationKey } from './narration'

describe('lessonParts', () => {
  it('splits at ## headings, strips markdown and skips code blocks', () => {
    const lesson = [
      '# Case 1: a **reply** cut short',
      '',
      'Read `finish_reason` first. See [the docs](https://example.com).',
      '',
      '## The ticket',
      '',
      '- one',
      '- two',
      '',
      '```ts',
      'const secret = 1',
      '```',
      '',
      '## Empty after code',
      '',
      '```',
      'only code',
      '```'
    ].join('\n')

    expect(lessonParts(lesson)).toEqual([
      'Case 1: a reply cut short.\nRead finish reason first. See the docs.',
      'The ticket.\none\ntwo',
      'Empty after code.'
    ])
  })
})

describe('narrationKey', () => {
  it('is stable for the same words and changes when they change', () => {
    expect(narrationKey('Read the reply.')).toBe(narrationKey('Read the reply.'))
    expect(narrationKey('Read the reply.')).not.toBe(narrationKey('Read the reply!'))
    expect(narrationKey('')).toMatch(/^[0-9a-f]{8}$/)
  })
})
