import { isDeepStrictEqual } from 'node:util'
import { broken, checkApp, errorCode, runProbe, sandbox } from '../../shared/checks-lib.mjs'

const thrown = (res) => res.json?.thrown
const rejectedWith = (status, code) => (res) => thrown(res)?.status === status && thrown(res)?.code === code

// Runs cases through one of the learner's body helpers, each case { name, limit, body, ok, hint }.
async function probeCases(t, kind, cases) {
  const dir = await sandbox(t)
  const r = await runProbe(
    t,
    dir,
    kind,
    cases.map((c) => ({ limit: c.limit })),
    cases.map((c) => ({ method: 'POST', body: c.body }))
  )
  if (!r.ok) return broken(`${kind} can be called`, r)
  const responses = r.value.responses
  const unwritten = responses.find((x) => /Not implemented/.test(thrown(x)?.message))
  if (unwritten) {
    return [
      {
        name: `${kind} is implemented`,
        passed: false,
        message: `${kind} still throws 'Not implemented'. Replace that line with your code.`,
        output: thrown(unwritten).message
      }
    ]
  }
  return cases.map((c, i) => {
    const res = responses[i]
    const passed = Boolean(!res.error && c.ok(res))
    const call = `${kind}(req${c.limit === undefined ? '' : `, ${c.limit}`}) with a body of ${Buffer.byteLength(c.body ?? '')} bytes`
    const got = res.error
      ? res.error
      : thrown(res)
        ? `rejected with ${JSON.stringify(thrown(res))}`
        : `resolved to ${JSON.stringify(res.json).slice(0, 300)}`
    return { name: c.name, passed, message: passed ? undefined : c.hint, output: `${call}\n${got}` }
  })
}

const resolvedText = (text) => (res) => !thrown(res) && res.json?.text === text
const resolvedValue = (value) => (res) => !thrown(res) && isDeepStrictEqual(res.json?.value, value)

export const checks = {
  'read-body'(t) {
    const nordic = 'Søren paddled to the ø. '.repeat(10)
    return probeCases(t, 'readBody', [
      {
        name: 'Resolves to the whole body',
        limit: 1000,
        body: '{"type":"single","hours":2}',
        ok: resolvedText('{"type":"single","hours":2}'),
        hint: 'readBody should resolve to every byte the client sent, as one string.'
      },
      {
        name: 'An empty body gives an empty string',
        limit: 1000,
        body: '',
        ok: resolvedText(''),
        hint: 'A POST with no body should resolve to an empty string, not undefined.'
      },
      {
        name: 'Decodes the body as UTF-8',
        limit: 1000,
        body: nordic,
        ok: resolvedText(nordic),
        hint: 'Letters like ø should come through unchanged. Join the chunks before you turn them into text.'
      },
      {
        name: 'Accepts a body exactly at the limit',
        limit: 1000,
        body: 'a'.repeat(1000),
        ok: resolvedText('a'.repeat(1000)),
        hint: 'A body of exactly limit bytes is allowed. Only bigger bodies are refused.'
      },
      {
        name: 'Rejects a body over the limit with 413',
        limit: 1000,
        body: 'x'.repeat(5000),
        ok: rejectedWith(413, 'payload_too_large'),
        hint: "A body larger than limit should reject with an HttpError with status 413 and code 'payload_too_large'."
      },
      {
        name: 'Counts the limit in bytes',
        limit: 1000,
        body: 'ø'.repeat(600),
        ok: rejectedWith(413, 'payload_too_large'),
        hint: 'This body is 600 characters but 1200 bytes, so it is over a limit of 1000. Measure chunks, not strings.'
      },
      {
        name: 'Uses a default limit of 10000 bytes',
        body: 'x'.repeat(12_000),
        ok: rejectedWith(413, 'payload_too_large'),
        hint: 'When no limit is passed, readBody should still refuse bodies over 10000 bytes.'
      }
    ])
  },

  async 'read-json'(t) {
    const details = await probeCases(t, 'readJson', [
      {
        name: 'Parses a JSON object',
        body: '{"type":"double","hours":3}',
        ok: resolvedValue({ type: 'double', hours: 3 }),
        hint: 'readJson should resolve to the parsed value of the body.'
      },
      {
        name: 'Rejects broken JSON with 400 invalid_json',
        body: '{"type": "double", "hours": ',
        ok: rejectedWith(400, 'invalid_json'),
        hint: "Text that is not valid JSON should reject with an HttpError with status 400 and code 'invalid_json', not a SyntaxError."
      },
      {
        name: 'Rejects an empty body with 400 invalid_json',
        body: '',
        ok: rejectedWith(400, 'invalid_json'),
        hint: 'An empty body is not JSON either. It should get the same 400 invalid_json answer.'
      },
      {
        name: 'Still refuses bodies over the limit',
        limit: 100,
        body: JSON.stringify({ note: 'x'.repeat(200) }),
        ok: rejectedWith(413, 'payload_too_large'),
        hint: 'readJson should pass its limit to readBody, so a large body still gets 413.'
      }
    ])
    if (details.length === 1 && !details[0].passed) return details
    const dir = await sandbox(t)
    const app = await checkApp(t, dir, [
      {
        name: 'POST /quotes with broken JSON answers 400',
        req: { method: 'POST', path: '/quotes', body: '{"type": "double",' },
        ok: (res) => res.status === 400 && errorCode(res) === 'invalid_json',
        hint: 'Through the real app, broken JSON should come back as a 400 with code invalid_json.'
      }
    ])
    return [...details, ...app]
  },

  async validate(t) {
    const cases = [
      {
        name: 'Accepts a valid quote',
        input: { type: 'double', hours: 3 },
        ok: (r) => isDeepStrictEqual(r.value, { type: 'double', hours: 3 }),
        hint: 'A valid request should return { type, hours }.'
      },
      {
        name: 'Returns only type and hours',
        input: { type: 'single', hours: 1, coupon: 'FREE', isAdmin: true },
        ok: (r) => isDeepStrictEqual(r.value, { type: 'single', hours: 1 }),
        hint: 'Fields the API does not know about should not pass through to the rest of the code.'
      },
      ...[
        ['Rejects a boat type that does not exist', { type: 'canoe', hours: 2 }, ['type']],
        ['Rejects a type inherited by every object', { type: 'toString', hours: 2 }, ['type']],
        ['Rejects hours sent as a string', { type: 'single', hours: '3' }, ['hours']],
        ['Rejects hours that are not whole', { type: 'single', hours: 2.5 }, ['hours']],
        ['Rejects 0 hours', { type: 'single', hours: 0 }, ['hours']],
        ['Rejects more than 8 hours', { type: 'single', hours: 9 }, ['hours']],
        ['Lists every problem at once', {}, ['type', 'hours']]
      ].map(([name, input, fields]) => ({
        name,
        input,
        ok: (r) =>
          r.thrown?.status === 400 &&
          r.thrown.code === 'validation_failed' &&
          Array.isArray(r.thrown.details) &&
          fields.every((f) => r.thrown.details.some((d) => d?.field === f)) &&
          r.thrown.details.every((d) => fields.includes(d?.field)),
        hint: `This input should throw an HttpError with status 400, code 'validation_failed' and details naming exactly: ${fields.join(', ')}.`
      })),
      ...[
        ['Rejects null', null],
        ['Rejects an array', [{ type: 'single', hours: 2 }]]
      ].map(([name, input]) => ({
        name,
        input,
        ok: (r) => r.thrown?.status === 400 && r.thrown.code === 'validation_failed',
        hint: "JSON can be any value, not just an object. Anything that is not a plain object should throw 400 'validation_failed', not crash."
      }))
    ]
    const dir = await sandbox(t, { '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const r = await t.call(dir, '.grader/drive.mjs', 'validateAll', [cases.map((c) => c.input)])
    if (!r.ok) return broken('validateQuote can be called', r)
    const unwritten = r.value.find((x) => /Not implemented/.test(x.thrown?.message))
    if (unwritten) {
      return [
        {
          name: 'validateQuote is implemented',
          passed: false,
          message: `validateQuote still throws 'Not implemented'. Replace that line with your code.`,
          output: unwritten.thrown.message
        }
      ]
    }
    return cases.map((c, i) => {
      const result = r.value[i]
      const passed = c.ok(result)
      return {
        name: c.name,
        passed,
        message: passed ? undefined : c.hint,
        output: `validateQuote(${JSON.stringify(c.input)})\n${result.thrown ? `threw ${JSON.stringify(result.thrown)}` : `returned ${JSON.stringify(result.value)}`}`
      }
    })
  }
}
