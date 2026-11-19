// Lab model behavior for Pebblebrook Plants: ticket triage, reply drafts and a judge.
// Replies depend only on the request.

export function hash(text) {
  let h = 2166136261
  for (const ch of text) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

// FNV alone keeps the low bit tied to the seed's parity; mixing spreads it.
function mix(h) {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

const lastUser = (request) =>
  String([...(request.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? '')

const RULES_V1 = [
  ['refund', /refund|money back|charged twice|damaged|broken|cracked/i],
  ['shipping', /track|deliver|shipping|\blate\b|where is/i],
  ['plant-care', /water|leaves|soil|repot|sunlight|\bpests?\b/i],
  ['account', /password|log ?in|account/i]
]

// v2 knows more phrasings, but checks plant words before damage words.
const RULES_V2 = [
  ['plant-care', /water|leaves|\bleaf\b|soil|repot|sunlight|\blight\b|\bpests?\b|droop|yellow/i],
  ['refund', /refund|money back|charged twice|damaged|broken|cracked/i],
  [
    'shipping',
    /track|deliver|shipping|\blate\b|where is|never (came|arrived)|not (arrived|shown up)|courier|parcel/i
  ],
  ['account', /password|log ?in|sign in|account|email address|unsubscribe/i]
]

const firstMatch = (rules, text) => rules.find(([, re]) => re.test(text))?.[0] ?? 'other'

export const triageV1 = (text) => firstMatch(RULES_V1, text)
export const triageV2 = (text) => firstMatch(RULES_V2, text)

const RULES_V3 = [RULES_V2[1], RULES_V2[0], RULES_V2[2], RULES_V2[3]]

export function triageV3(text, seed) {
  const matches = RULES_V3.filter(([, re]) => re.test(text)).map(([label]) => label)
  if (matches.length === 0) return 'other'
  if (seed == null || matches.length === 1) return matches[0]
  return matches[mix(hash(`${seed}|${text}`)) % matches.length]
}

const cap = (s) => s[0].toUpperCase() + s.slice(1)
const STYLES = [
  (l) => l,
  (l) => cap(l),
  (l) => `${l}.`,
  (l) => `Category: ${cap(l)}`,
  (l) => `"${l}"`,
  (l) => `  ${l.replace('-', ' ')}\n`,
  (l) => l.toUpperCase().replace('-', '_')
]

export const styled = (label, text) => STYLES[hash(text) % STYLES.length](label)

const ORDER = /\bPB-\d{5}\b/

export function triageJson(text) {
  const category = triageV2(text)
  const orderId = text.match(ORDER)?.[0] ?? null
  let urgency = 1
  if (/urgent|asap|today|dead|dying/i.test(text)) urgency += 2
  if (orderId) urgency += 1
  if (text.includes('!')) urgency += 1
  const first = text.split(/\s+/).filter(Boolean).slice(0, 6).join(' ').replace(/[.,!?;:]+$/, '')
  const json = JSON.stringify({
    category,
    urgency: Math.min(urgency, 5),
    orderId,
    summary: `Customer writes about ${category}: ${first}.`
  })
  return /thanks!?\s*$/i.test(text) ? '```json\n' + json + '\n```' : json
}

const PROBLEM = /late|damaged|dead|wrong|never|missing|broken|cracked|charged twice|yellow|droop/i

export function draftReply(ticket) {
  const orderId = ticket.match(ORDER)?.[0]
  const category = triageV2(ticket)
  const lines = ['Hi there,']
  if (PROBLEM.test(ticket)) lines.push('I am sorry about this.')
  if (category === 'refund') lines.push('A full refund has been issued to your card.')
  if (category === 'shipping') lines.push('Your parcel is with the courier and should arrive soon.')
  if (category === 'plant-care') lines.push('Most plants recover with less water and bright, indirect light.')
  if (category === 'account') lines.push('You can reset your password from the sign in page.')
  if (category === 'other') lines.push('Thanks for getting in touch, we will look into it.')
  if (orderId && ticket.length % 2 === 0) lines.push(`I have added a note to order ${orderId}.`)
  lines.push('The Pebblebrook team')
  return lines.join('\n')
}

export const JUDGE_FOLLOW_UP = 'Answer with exactly one line: VERDICT: PASS or VERDICT: FAIL.'

const section = (text, name, next) => {
  const re = new RegExp(`${name}:\\n([\\s\\S]*?)${next ? `\\n\\n${next}:` : '$'}`)
  return text.match(re)?.[1]?.trim() ?? ''
}

// Returns { verdict: 'pass' | 'fail', reason } or { unjudgeable: rule }.
export function judgeRubric(ticket, draft, rubric) {
  const failures = []
  for (const rule of rubric) {
    if (/order (number|id)/i.test(rule)) {
      const id = ticket.match(ORDER)?.[0]
      if (id && !draft.includes(id)) failures.push('the draft does not mention the order number')
    } else if (/apolog/i.test(rule)) {
      if (PROBLEM.test(ticket) && !/sorry|apolog/i.test(draft)) failures.push('the draft does not apologize')
    } else if (/refund/i.test(rule)) {
      if (/refund has been issued|will refund/i.test(draft)) failures.push('the draft promises a refund')
    } else if (/(\d+) words/i.test(rule)) {
      const limit = Number(rule.match(/(\d+) words/i)[1])
      if (draft.split(/\s+/).filter(Boolean).length > limit) failures.push('the draft is too long')
    } else {
      return { unjudgeable: rule }
    }
  }
  return failures.length
    ? { verdict: 'fail', reason: failures.join('; ') }
    : { verdict: 'pass', reason: 'the draft meets every rule' }
}

export function judgeOutcome(ticket, draft, rubric) {
  const r = judgeRubric(ticket, draft, rubric)
  return r.unjudgeable ? 'unknown' : r.verdict
}

function judge(request) {
  const messages = request.messages ?? []
  const prompt = String(messages.find((m) => m.role === 'user')?.content ?? '')
  const ticket = section(prompt, 'Ticket', 'Draft')
  const draft = section(prompt, 'Draft', 'Rubric')
  const rubric = section(prompt, 'Rubric')
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
  const r = judgeRubric(ticket, draft, rubric)
  if (r.unjudgeable) {
    return `I cannot pass judgment on the rule "${r.unjudgeable}" because I have no way to check it.`
  }
  const followUp = lastUser(request).includes(JUDGE_FOLLOW_UP) && messages.length > 2
  const word = r.verdict.toUpperCase()
  if (followUp) return `VERDICT: ${word}`
  switch (hash(draft + rubric.join('|')) % 4) {
    case 0:
      return `VERDICT: ${word}\nREASON: ${r.reason}`
    case 1:
      return `Sure, here is my assessment.\nVERDICT: ${word}\nREASON: ${r.reason}`
    case 2:
      return `**Verdict:** ${r.verdict}\n**Reason:** ${r.reason}`
    default:
      return 'Having read the draft against each rule, I would say it is close to what the team wants, though I weighed some rules more than others.'
  }
}

export const models = {
  'evals-triage-v1': (request) => {
    const text = lastUser(request)
    return styled(triageV1(text), text)
  },
  'evals-triage-v2': (request) => {
    const text = lastUser(request)
    return styled(triageV2(text), text)
  },
  'evals-triage-v3': (request) => triageV3(lastUser(request), request.seed),
  'evals-triage-json': (request) => triageJson(lastUser(request)),
  'evals-draft-1': (request) => draftReply(lastUser(request)),
  'evals-judge-1': judge
}
