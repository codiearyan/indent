// Task 2: ask the judge.
// judgeDraft(ticket, draft, rubric, client) sends buildJudgeMessages(ticket, draft, rubric) to
// JUDGE_MODEL with temperature 0 and parses the reply with parseVerdict.
// - If the verdict is unknown, ask once more: the same messages, then the judge's reply as an
//   assistant message, then FOLLOW_UP as a user message. Never more than 2 requests.
// - If it is still unknown, return that unknown verdict.
// - If a request throws, return { verdict: 'unknown', reason } where reason starts with
//   "could not judge" and includes the error message.
//
// Task 3: grade every draft.
// evaluateDrafts(cases, rubric, client) drafts a reply for each case with draftReply, judges it,
// and returns { results, pass, fail, unknown, passRate }:
// results holds { id, draft, verdict, reason } in case order, the three counts add up to the
// number of cases, and passRate is pass / (pass + fail), or 0 when nothing was judged.
import OpenAI from 'openai'
import { draftReply } from './draft.ts'
import { FOLLOW_UP, JUDGE_MODEL, buildJudgeMessages } from './judge-prompt.ts'
import type { TicketCase } from './tickets.ts'
import { parseVerdict } from './verdict.ts'
import type { Verdict } from './verdict.ts'

export interface DraftResult extends Verdict {
  id: string
  draft: string
}

export interface DraftReport {
  results: DraftResult[]
  pass: number
  fail: number
  unknown: number
  passRate: number
}

const couldNotJudge = (err: unknown): Verdict => ({
  verdict: 'unknown',
  reason: `could not judge: ${(err as Error).message}`
})

export async function judgeDraft(
  ticket: string,
  draft: string,
  rubric: string[],
  client: OpenAI = new OpenAI()
): Promise<Verdict> {
  const messages = buildJudgeMessages(ticket, draft, rubric)
  const ask = async (msgs: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> => {
    const res = await client.chat.completions.create({ model: JUDGE_MODEL, temperature: 0, messages: msgs })
    return res.choices[0].message.content ?? ''
  }
  try {
    const first = await ask(messages)
    const verdict = parseVerdict(first)
    if (verdict.verdict !== 'unknown') return verdict
    return parseVerdict(
      await ask([...messages, { role: 'assistant', content: first }, { role: 'user', content: FOLLOW_UP }])
    )
  } catch (err) {
    return couldNotJudge(err)
  }
}

export async function evaluateDrafts(
  cases: TicketCase[],
  rubric: string[],
  client: OpenAI = new OpenAI()
): Promise<DraftReport> {
  const results: DraftResult[] = []
  for (const c of cases) {
    const draft = await draftReply(c.ticket, client)
    results.push({ id: c.id, draft, ...(await judgeDraft(c.ticket, draft, rubric, client)) })
  }
  const count = (v: Verdict['verdict']): number => results.filter((r) => r.verdict === v).length
  const pass = count('pass')
  const fail = count('fail')
  return {
    results,
    pass,
    fail,
    unknown: count('unknown'),
    passRate: pass + fail === 0 ? 0 : pass / (pass + fail)
  }
}
