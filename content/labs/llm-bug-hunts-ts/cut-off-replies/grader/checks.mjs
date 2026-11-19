import { summarize } from '../../model.mjs'
import { truncateTokens } from '../../../../kit/tokens.mjs'
import { endlessComplaint, longComplaint, shortComplaint } from '../starter/src/complaints.ts'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/summarize.ts': t.chapterPath('starter/src/summarize.ts') })
    const r = await t.call(dir, 'src/reproduce.ts', 'reproduceCutoff')
    if (!r.ok) {
      return [
        {
          name: 'reproduceCutoff returns a result',
          passed: false,
          message: 'reproduceCutoff threw instead of returning { text, finishReason }. Read the error.',
          output: r.error
        }
      ]
    }
    const { text, finishReason } = r.value ?? {}
    const full = summarize(longComplaint)
    return [
      {
        name: 'finishReason shows the reply was cut',
        passed: finishReason === 'length',
        message:
          finishReason === 'length'
            ? undefined
            : 'finishReason should be the value the model sends when it runs out of tokens. Check you use MAX_TOKENS, the long complaint, and return finish_reason from the choice.',
        output: show(r)
      },
      {
        name: 'text is the reply the model sent',
        passed: text === truncateTokens(full, 48),
        message:
          text === truncateTokens(full, 48)
            ? undefined
            : 'text should be the message content of the same reply, unchanged. Check you send buildMessages(longComplaint) to MODEL.',
        output: show(r)
      }
    ]
  },

  async fix(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const call = (text) => t.call(dir, 'src/summarize.ts', 'summarizeComplaint', [text])
    const [short, long, endless, cutTwice, alwaysCut, types] = await Promise.all([
      call(shortComplaint),
      call(longComplaint),
      call(endlessComplaint),
      t.call(dir, '.grader/drive.mjs', 'attempts', [['length', 'length', 'stop']]),
      t.call(dir, '.grader/drive.mjs', 'attempts', [['length', 'length', 'length', 'length', 'length']]),
      t.typecheck(dir, ['src/summarize.ts'])
    ])
    const budgets = alwaysCut.value?.budgets ?? []
    const growing = budgets.every((b, i) => i === 0 || b > budgets[i - 1])
    return [
      {
        name: 'A short complaint is summarized in full',
        passed: short.ok && short.value === summarize(shortComplaint),
        message: 'summarizeComplaint should still return short summaries as they are.',
        output: show(short)
      },
      {
        name: 'A long complaint is summarized in full',
        passed: long.ok && long.value === summarize(longComplaint),
        message:
          'The summary of longComplaint is still not the complete reply. Look at finish_reason and what you do when it says the reply was cut.',
        output: show(long)
      },
      {
        name: 'A summary that never fits is an error',
        passed: !endless.ok && /truncated/i.test(endless.error),
        message: endless.ok
          ? 'summarizeComplaint returned text for endlessComplaint, but that summary never fits. It should throw an error that mentions "truncated".'
          : 'summarizeComplaint threw for endlessComplaint, but the error message should mention "truncated".',
        output: show(endless)
      },
      {
        name: 'Retries until the reply fits',
        passed: cutTwice.ok && cutTwice.value.result === 'Reply 3.',
        message:
          'With a model that cuts the first two replies, summarizeComplaint should return the third reply.',
        output: show(cutTwice)
      },
      {
        name: 'Stops after 3 requests with a growing budget',
        passed: budgets.length === 3 && growing && Boolean(alwaysCut.value?.error),
        message: `With a model that cuts every reply, summarizeComplaint made ${budgets.length} request(s) with max_tokens ${JSON.stringify(budgets)}. It should make 3, each with a larger budget, then throw.`,
        output: show(alwaysCut)
      },
      {
        name: 'summarize.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/summarize.ts.',
        output: types.output
      }
    ].map((d) => (d.passed ? { ...d, message: undefined } : d))
  },

  test(t) {
    return t.judgeTest({
      test: 'src/summarize.test.ts',
      target: 'src/summarize.ts',
      wrong: 'grader/variants/raise-limit.ts',
      wrongLabel: 'a fix that only raises max_tokens'
    })
  }
}
