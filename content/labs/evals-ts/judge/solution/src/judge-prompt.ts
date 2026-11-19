import type OpenAI from 'openai'

export const JUDGE_MODEL = 'evals-judge-1'

export const FOLLOW_UP = 'Answer with exactly one line: VERDICT: PASS or VERDICT: FAIL.'

export function buildJudgeMessages(
  ticket: string,
  draft: string,
  rubric: string[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content:
        'You review reply drafts for the Pebblebrook Plants support team. ' +
        'Check the draft against every rule in the rubric. Answer with a line ' +
        '"VERDICT: PASS" or "VERDICT: FAIL", then a line "REASON: " and one sentence.'
    },
    {
      role: 'user',
      content:
        `Ticket:\n${ticket}\n\nDraft:\n${draft}\n\nRubric:\n` +
        rubric.map((rule, i) => `${i + 1}. ${rule}`).join('\n')
    }
  ]
}
