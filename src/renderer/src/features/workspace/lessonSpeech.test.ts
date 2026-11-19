import { describe, expect, it } from 'vitest'
import { lessonParts } from './lessonSpeech'

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
