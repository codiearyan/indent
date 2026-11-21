const SYSTEM_PROMPT =
  'You are Kes, the support assistant for Kestrel Parcels. Answer briefly and kindly.'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/chat.ts': t.chapterPath('starter/src/chat.ts') })
    const r = await t.call(dir, 'src/reproduce.ts', 'reproduceOverflow')
    if (!r.ok) {
      return [
        {
          name: 'reproduceOverflow returns a result',
          passed: false,
          message:
            'reproduceOverflow threw instead of returning { turns, error }. Make sure you catch the error from send.',
          output: r.error
        }
      ]
    }
    const { turns, error } = r.value ?? {}
    return [
      {
        name: 'error is the error the model sent',
        passed: typeof error === 'string' && /context length/i.test(error),
        message:
          'error should be the message of the error that send threw. It comes from the local model and explains why it refused.',
        output: show(r)
      },
      {
        name: 'turns is the send that failed',
        passed: Number.isInteger(turns) && turns > 1 && turns <= 30,
        message: 'turns should count sends from 1 and point at the one that threw.',
        output: show(r)
      }
    ].map((d) => (d.passed ? { ...d, message: undefined } : d))
  },

  async fix(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [short, long, types] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'converse', [2]),
      t.call(dir, '.grader/drive.mjs', 'converse', [30]),
      t.typecheck(dir, ['src/chat.ts'])
    ])
    const s = short.value ?? {}
    const l = long.value ?? {}
    return [
      {
        name: 'A short conversation keeps every message',
        passed: short.ok && !s.error && s.historyLength === 5,
        message:
          'After 2 sends, history should hold the system prompt and all 4 messages. Trim only when there are more than the policy allows.',
        output: show(short)
      },
      {
        name: 'A 30-question conversation keeps working',
        passed: long.ok && !l.error,
        message:
          'send still fails partway through a long conversation. Look at how many messages are sent to the model on each turn.',
        output: show(long)
      },
      {
        name: 'The system prompt stays first',
        passed:
          long.ok &&
          l.first?.role === 'system' &&
          l.first?.content === SYSTEM_PROMPT &&
          /^Kes here\./.test(l.reply ?? ''),
        message:
          'After many turns, history[0] should still be the system prompt, and replies should still start with "Kes here.".',
        output: show(long)
      },
      {
        name: 'Only the most recent messages are kept',
        passed: long.ok && l.historyLength <= 9 && l.historyLength >= 3 && l.lastQuestionKept && l.lastReplyKept,
        message:
          'After send returns, history should be the system prompt plus at most MAX_RECENT_MESSAGES messages, ending with the latest question and reply.',
        output: show(long)
      },
      {
        name: 'chat.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/chat.ts.',
        output: types.output
      }
    ].map((d) => (d.passed ? { ...d, message: undefined } : d))
  },

  test(t) {
    return t.judgeTest({
      test: 'src/chat.test.ts',
      target: 'src/chat.ts',
      wrong: 'grader/variants/drop-oldest.ts',
      wrongLabel: 'a fix that simply drops the oldest messages'
    })
  }
}
