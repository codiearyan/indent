import { LABELS, sortReply, triageFields } from '../../model.mjs'

const TRIAGE_LINE = /^label: (watering|light|pests|order|other) \| plant: ([a-z ]+) \| urgency: (high|normal)$/

const INBOX = [
  'Tiny white bugs are crawling all over my orchid.',
  'My order arrived with a cracked pot and the cactus is bent!',
  'My pothos has gone leggy next to the north window.',
  'Help, the soil in my peace lily is soggy and it smells.',
  'Do you sell gift cards for the shop?'
]

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const quiet = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const content = (m) => (typeof m?.content === 'string' ? m.content : '')

export const checks = {
  async 'label-only'(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const drive = (reply) => t.call(dir, '.grader/drive.mjs', 'withReply', ['labelMessage', INBOX[0], reply])
    const [labels, prose, padded, types] = await Promise.all([
      Promise.all(INBOX.map((text) => t.call(dir, 'src/inbox.ts', 'labelMessage', [text]))),
      drive('This sounds like a question about pests.'),
      drive('  Pests\n'),
      t.typecheck(dir, ['src/inbox.ts'])
    ])
    const system = prose.value?.requests?.[0]?.messages?.[0]
    const wanted = INBOX.map((text) => triageFields(text).label)
    const got = labels.map((r) => (r.ok ? r.value : `Error: ${r.error}`))
    return quiet([
      {
        name: 'The system prompt names every label and asks for only the label',
        passed:
          system?.role === 'system' &&
          LABELS.every((label) => content(system).toLowerCase().includes(label)) &&
          /\bonly\b/i.test(content(system)),
        message:
          'The first message labelMessage sends should be a system message that lists all five labels and tells the model to reply with only the label.',
        output: show(prose)
      },
      {
        name: 'Labels the sample inbox correctly',
        passed: got.every((label, i) => label === wanted[i]),
        message:
          'Some messages did not come back as a bare label. If the reply is a full sentence, the model did not get the instructions it needs.',
        output: JSON.stringify(INBOX.map((text, i) => ({ text, got: got[i] })), null, 2)
      },
      {
        name: 'Trims and lowercases the reply',
        passed: padded.ok && padded.value?.result === 'pests',
        message: 'A reply of "  Pests\\n" should come back as the label pests.',
        output: show(padded)
      },
      {
        name: 'A reply that is not a label is an error',
        passed: prose.ok && Boolean(prose.value?.error),
        message: 'When the model answers with a sentence instead of a label, labelMessage should throw rather than return it.',
        output: show(prose)
      },
      {
        name: 'inbox.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/inbox.ts.',
        output: types.output
      }
    ])
  },

  async examples(t) {
    const text = 'Help, the soil in my peace lily is soggy and it smells.'
    const r = await t.call(t.workspace, 'src/inbox.ts', 'buildTriageMessages', [text])
    const m = r.ok && Array.isArray(r.value) ? r.value : []
    const middle = m.slice(1, -1)
    const pairs = middle.length / 2
    const alternates = middle.every((msg, i) => msg.role === (i % 2 === 0 ? 'user' : 'assistant'))
    const answers = middle.filter((msg) => msg.role === 'assistant').map(content)
    const replies = INBOX.map((msg) => {
      const messages = [...m.slice(0, -1), { role: 'user', content: msg }]
      return { text: msg, reply: m.length ? sortReply(messages) : '' }
    })
    return quiet([
      {
        name: 'Starts with a system message',
        passed: r.ok && m[0]?.role === 'system' && content(m[0]).trim().length > 0,
        message: r.ok
          ? 'The first message should be a system message that says who the model is and what it should reply with.'
          : 'buildTriageMessages threw. Read the error.',
        output: show(r)
      },
      {
        name: 'Has at least two worked examples',
        passed: Number.isInteger(pairs) && pairs >= 2 && alternates,
        message:
          'Between the system message and the last message there should be at least two examples, each a user message followed by an assistant reply.',
        output: show(r)
      },
      {
        name: 'Every example reply is a triage line',
        passed: answers.length > 0 && answers.every((a) => TRIAGE_LINE.test(a)),
        message:
          'Each example assistant reply should be one line like the format in the task: lowercase keys label, plant and urgency, separated by " | ".',
        output: JSON.stringify(answers, null, 2)
      },
      {
        name: 'Ends with the customer text',
        passed: m.at(-1)?.role === 'user' && content(m.at(-1)) === text,
        message: 'The last message should be a user message with the text, unchanged.',
        output: show(r)
      },
      {
        name: 'The model replies with triage lines',
        passed: replies.every(({ reply }) => TRIAGE_LINE.test(reply)),
        message: 'With your messages, the lab model does not answer every sample in the triage line format.',
        output: JSON.stringify(replies, null, 2)
      }
    ])
  },

  async triage(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const drive = (reply) => t.call(dir, '.grader/drive.mjs', 'withReply', ['triage', INBOX[0], reply])
    const [results, prose, loose, exact] = await Promise.all([
      Promise.all(INBOX.map((text) => t.call(dir, 'src/inbox.ts', 'triage', [text]))),
      drive('This sounds like a question about pests.'),
      drive('Label: Pests, Plant: Orchid, Urgency: Normal.'),
      drive('label: light | plant: snake plant | urgency: high')
    ])
    const got = results.map((r) => (r.ok ? r.value : `Error: ${r.error}`))
    return quiet([
      {
        name: 'Triages the sample inbox',
        passed: got.every((value, i) => JSON.stringify(value) === JSON.stringify(triageFields(INBOX[i]))),
        message:
          'Each result should be { label, plant, urgency } read from the reply line, with nothing else in the object.',
        output: JSON.stringify(INBOX.map((text, i) => ({ text, got: got[i] })), null, 2)
      },
      {
        name: 'Parses a line with a two-word plant',
        passed: exact.ok && JSON.stringify(exact.value?.result) === JSON.stringify({ label: 'light', plant: 'snake plant', urgency: 'high' }),
        message: 'A plant name can contain a space. Make sure your parsing keeps the whole name.',
        output: show(exact)
      },
      {
        name: 'A sentence instead of a line is an error',
        passed: prose.ok && Boolean(prose.value?.error),
        message: 'When the reply is not a triage line, triage should throw instead of guessing.',
        output: show(prose)
      },
      {
        name: 'A line in the wrong shape is an error',
        passed: loose.ok && Boolean(loose.value?.error),
        message:
          'A reply with capital letters and commas is close but not the format your code relies on. triage should throw for it.',
        output: show(loose)
      }
    ])
  }
}
