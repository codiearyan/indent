import { orderFacts } from '../../model.mjs'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const quiet = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const content = (m) => (typeof m?.content === 'string' ? m.content : '')

const VALID = { plant: 'fern', quantity: 2, potSize: 'small', giftWrap: false }

const PARSE_CASES = [
  { name: 'Parses a bare JSON object', text: '{"plant": "fern", "quantity": 2}', want: { plant: 'fern', quantity: 2 } },
  {
    name: 'Parses JSON inside a code fence',
    text: 'Here you go:\n```json\n{"plant": "orchid", "giftWrap": true}\n```\nAnything else?',
    want: { plant: 'orchid', giftWrap: true }
  },
  {
    name: 'Parses JSON surrounded by prose',
    text: 'Sure! The order is {"plant": "cactus", "quantity": 1} as requested.',
    want: { plant: 'cactus', quantity: 1 }
  }
]

const BAD_JSON = [
  { name: 'Broken JSON is an error', text: '```json\n{"plant": "fern", "quantity": 2,}\n```' },
  { name: 'A reply with no JSON is an error', text: 'Sounds like 2 ferns in small pots.' }
]

const FIELD_CASES = [
  { field: 'quantity', value: { ...VALID, quantity: 'three' } },
  { field: 'quantity', value: { ...VALID, quantity: 0 } },
  { field: 'quantity', value: { ...VALID, quantity: 1.5 } },
  { field: 'potSize', value: { ...VALID, potSize: 'huge' } },
  { field: 'giftWrap', value: { ...VALID, giftWrap: 'yes' } },
  { field: 'plant', value: { ...VALID, plant: '' } },
  { field: 'plant', value: { quantity: 2, potSize: 'small', giftWrap: false } }
]

const EMAILS = {
  clean: 'Hi, please send 3 pothos in large pots to the bakery. Thank you!',
  word: 'I would love five ferns in small pots for the reading room.',
  huge: 'A peace lily in a huge pot for the hotel lobby, 1 please.',
  note: 'Order for 2 snake plants, medium pots. P.S. It is a gift, so no price tag please.'
}

export const checks = {
  async parse(t) {
    const call = (text) => t.call(t.workspace, 'src/orders.ts', 'parseJsonReply', [text])
    const good = await Promise.all(PARSE_CASES.map((c) => call(c.text)))
    const bad = await Promise.all(BAD_JSON.map((c) => call(c.text)))
    return quiet([
      ...PARSE_CASES.map((c, i) => ({
        name: c.name,
        passed: good[i].ok && same(good[i].value, c.want),
        message: good[i].ok
          ? 'parseJsonReply returned something other than the object in the reply. Check how you find where the JSON starts and ends.'
          : 'parseJsonReply threw for a reply that contains valid JSON. Read the error.',
        output: `input: ${JSON.stringify(c.text)}\n${show(good[i])}`
      })),
      ...BAD_JSON.map((c, i) => ({
        name: c.name,
        passed: !bad[i].ok && /not valid JSON/.test(bad[i].error),
        message: bad[i].ok
          ? 'parseJsonReply returned a value for a reply that has no valid JSON. It should throw.'
          : 'parseJsonReply threw, but the error message should contain "not valid JSON".',
        output: `input: ${JSON.stringify(c.text)}\n${show(bad[i])}`
      }))
    ])
  },

  async validate(t) {
    const call = (value) => t.call(t.workspace, 'src/orders.ts', 'validateOrder', [value])
    const [valid, extra, ...rest] = await Promise.all([
      call(VALID),
      call({ ...VALID, note: 'Leave by the door' }),
      ...FIELD_CASES.map((c) => call(c.value)),
      call(null),
      call([VALID]),
      call('fern'),
      call({ plant: 'fern', quantity: 'two', potSize: 'big', giftWrap: true })
    ])
    const fields = rest.slice(0, FIELD_CASES.length)
    const [nul, arr, str, two] = rest.slice(FIELD_CASES.length)
    const list = (r) => (r.ok && Array.isArray(r.value) ? r.value : null)
    return quiet([
      {
        name: 'A valid order has no problems',
        passed: same(list(valid), []) && same(list(extra), []),
        message: list(valid)
          ? 'validateOrder should return an empty array for a valid order, even when it has an extra field.'
          : 'validateOrder threw or did not return an array. Read the output.',
        output: `${show(valid)}\n${show(extra)}`
      },
      ...FIELD_CASES.map((c, i) => {
        const problems = list(fields[i])
        return {
          name: `Reports a bad ${c.field}: ${JSON.stringify(c.value[c.field] ?? 'missing')}`,
          passed: problems?.length === 1 && problems[0].includes(c.field),
          message: `validateOrder should return exactly one problem for this value, and the problem should name the field ${c.field}.`,
          output: `input: ${JSON.stringify(c.value)}\n${show(fields[i])}`
        }
      }),
      {
        name: 'Reports one problem per wrong field',
        passed: list(two)?.length === 2 && list(two).some((p) => p.includes('quantity')) && list(two).some((p) => p.includes('potSize')),
        message: 'An order with a bad quantity and a bad potSize should get two problems, one naming each field.',
        output: show(two)
      },
      {
        name: 'Something that is not an object is a problem',
        passed: [nul, arr, str].every((r) => list(r)?.length > 0),
        message: 'null, an array or a string are not orders. validateOrder should return at least one problem for each, without throwing.',
        output: [nul, arr, str].map(show).join('\n')
      }
    ])
  },

  async extract(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const lab = (email) => t.call(dir, '.grader/drive.mjs', 'viaLabModel', [email])
    const [clean, word, huge, note, stubborn, types] = await Promise.all([
      lab(EMAILS.clean),
      lab(EMAILS.word),
      lab(EMAILS.huge),
      lab(EMAILS.note),
      t.call(dir, '.grader/drive.mjs', 'withReply', [EMAILS.clean, '```json\n{"plant": "fern", "quantity": "lots"}\n```']),
      t.typecheck(dir, ['src/orders.ts'])
    ])
    const want = (key) => orderFacts(EMAILS[key]).order
    const got = (r) => r.value?.result
    const count = (r) => r.value?.requests?.length ?? 0
    const repairOf = (r) => r.value?.requests?.[1]?.messages ?? []
    const repaired = (r, key) => r.ok && same(got(r), want(key)) && count(r) === 2
    const s = stubborn.value ?? {}
    return quiet([
      {
        name: 'A clean reply is returned after one request',
        passed: clean.ok && same(got(clean), want('clean')) && count(clean) === 1,
        message:
          'For an email the model gets right the first time, extractOrder should return the order after a single request.',
        output: show(clean)
      },
      {
        name: 'A wrong quantity is repaired',
        passed: repaired(word, 'word'),
        message:
          'The first reply writes the quantity as a word. extractOrder should notice, send one repair message and return the corrected order after exactly 2 requests.',
        output: show(word)
      },
      {
        name: 'A wrong pot size is repaired',
        passed: repaired(huge, 'huge'),
        message:
          'The first reply uses a pot size that is not allowed. The repair message should say which field was wrong so the model can fix it.',
        output: show(huge)
      },
      {
        name: 'Broken JSON is repaired',
        passed: repaired(note, 'note'),
        message:
          'The first reply is not valid JSON. Treat a parse error like any other problem: tell the model and try once more.',
        output: show(note)
      },
      {
        name: 'The repair keeps the conversation and names the problem',
        passed:
          repairOf(word).length >= 4 &&
          repairOf(word).at(-2)?.role === 'assistant' &&
          repairOf(word).at(-1)?.role === 'user' &&
          /quantity/.test(content(repairOf(word).at(-1))),
        message:
          'The second request should repeat the first messages, add the model\'s bad reply as an assistant message, then a user message that lists the problems.',
        output: JSON.stringify(repairOf(word), null, 2)
      },
      {
        name: 'Gives up after one repair',
        passed: stubborn.ok && count(stubborn) === 2 && /invalid order/i.test(s.error ?? ''),
        message: `With a model that is always wrong, extractOrder made ${count(stubborn)} request(s). It should make 2, then throw an error that mentions "invalid order".`,
        output: show(stubborn)
      },
      {
        name: 'orders.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/orders.ts.',
        output: types.output
      }
    ])
  }
}
