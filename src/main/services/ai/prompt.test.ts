import { describe, expect, it } from 'vitest'
import type { ChapterDef } from '@shared/types'
import { cliInvocation } from './cli'
import { cleanCompletion, maskKey, transcript, trimHistory, tutorSystemPrompt } from './prompt'

const chapter: ChapterDef = {
  id: 'ch1',
  title: 'A reply cut short',
  files: ['notice.ts'],
  terminal: { description: 'shell' },
  tasks: [
    {
      id: 'fix',
      title: 'Never send a cut notice',
      file: 'notice.ts',
      description: 'Read finish_reason.',
      nextSteps: ['Log the reply'],
      hints: ['SECRET HINT'],
      points: 10
    }
  ]
}

describe('tutorSystemPrompt', () => {
  it('includes lesson, tasks, open file and checks, but not hints', () => {
    const prompt = tutorSystemPrompt({
      chapter,
      lesson: '## Why replies stop\nThey hit max_tokens.',
      activeFile: { path: 'notice.ts', content: 'export const x = 1' },
      lastCheck: [
        {
          taskId: 'fix',
          passed: false,
          durationMs: 1,
          at: '',
          details: [
            {
              name: 'long notice',
              passed: false,
              message: 'Look at finish_reason',
              output: 'length'
            }
          ]
        }
      ]
    })
    expect(prompt).toContain('Why replies stop')
    expect(prompt).toContain('Never send a cut notice')
    expect(prompt).toContain('export const x = 1')
    expect(prompt).toContain('Look at finish_reason')
    expect(prompt).not.toContain('SECRET HINT')
  })

  it('says when no check ran yet', () => {
    expect(tutorSystemPrompt({ chapter, lesson: '' })).toContain('has not run a check yet')
  })
})

describe('history', () => {
  it('drops empty and leading assistant turns', () => {
    expect(
      trimHistory([
        { role: 'assistant', content: 'hi' },
        { role: 'user', content: 'why?' },
        { role: 'assistant', content: '' }
      ])
    ).toEqual([{ role: 'user', content: 'why?' }])
  })

  it('writes earlier turns as a transcript for CLIs', () => {
    expect(transcript([{ role: 'user', content: 'q' }])).toBe('q')
    const text = transcript([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' }
    ])
    expect(text).toContain('Learner: q1')
    expect(text).toContain('Tutor: a1')
    expect(text.endsWith('q2')).toBe(true)
  })
})

describe('completions', () => {
  it('strips fences and keeps a few lines', () => {
    expect(cleanCompletion('```ts\nconst a = 1\n```')).toBe('const a = 1')
    expect(cleanCompletion('   \n')).toBe('')
    expect(
      cleanCompletion(Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n')).split('\n')
    ).toHaveLength(6)
  })
})

describe('maskKey', () => {
  it('never shows the middle of a key', () => {
    expect(maskKey('sk-ant-api03-abcdefghijklmnop-WXYZ')).toBe('sk-••••WXYZ')
    expect(maskKey('short')).toBe('••••')
  })
})

describe('cliInvocation', () => {
  const run = { model: null, system: 'SYS', prompt: 'hello' }

  it('runs Claude Code with no tools and its own system prompt, prompt on stdin', () => {
    const { args, stdin } = cliInvocation('claude-code', run, '/tmp/x')
    expect(args).toEqual(expect.arrayContaining(['-p', '--tools', '', '--system-prompt', 'SYS']))
    expect(args[args.indexOf('--tools') + 1]).toBe('')
    expect(stdin).toBe('hello')
  })

  it('runs Codex read-only outside a git repo, prompt on stdin', () => {
    const { args, stdin } = cliInvocation('codex', { ...run, model: 'm' }, '/tmp/x')
    expect(args).toEqual(
      expect.arrayContaining([
        'exec',
        '--json',
        'read-only',
        '--skip-git-repo-check',
        '--model',
        'm'
      ])
    )
    expect(args.at(-1)).toBe('-')
    expect(stdin).toContain('SYS')
  })

  it('runs OpenCode with every permission denied', () => {
    const { args, env } = cliInvocation('opencode', run, '/tmp/x')
    expect(args.slice(0, 5)).toEqual(['run', '--format', 'json', '--dir', '/tmp/x'])
    expect(JSON.parse(env!.OPENCODE_CONFIG_CONTENT)).toEqual({ permission: { '*': 'deny' } })
  })
})
