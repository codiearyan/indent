import { isDeepStrictEqual } from 'node:util'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const detail = (name, passed, message, output) => ({ name, passed, message: passed ? undefined : message, output })

function notImplemented(fn, r) {
  if (r.ok || !/Not implemented/.test(r.error)) return null
  return [detail(`${fn} is implemented`, false, `${fn} still throws 'Not implemented'. Replace that line with your code.`, r.error)]
}

async function sandbox(t) {
  return t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
}

export const checks = {
  async 'describe-tool'(t) {
    const dir = await sandbox(t)
    const r = await t.call(dir, 'src/assistant.ts', 'describeOrderTool')
    const early = notImplemented('describeOrderTool', r)
    if (early) return early
    if (!r.ok) return [detail('describeOrderTool returns a tool', false, 'describeOrderTool threw an error. Read it below.', r.error)]
    const fn = r.value?.function ?? {}
    const params = fn.parameters ?? {}
    const out = show(r)
    return [
      detail(
        'It is a function tool named get_order',
        r.value?.type === 'function' && fn.name === 'get_order',
        "The tool needs type 'function' and a function.name the model will call it by: get_order.",
        out
      ),
      detail(
        'It has a description',
        typeof fn.description === 'string' && fn.description.trim().length > 0,
        'Give the function a description. It is the only place the model learns what the tool does.',
        out
      ),
      detail(
        'Its parameters are an object schema',
        params.type === 'object' && typeof params.properties === 'object' && params.properties !== null,
        "function.parameters should be a JSON schema with type 'object' and a properties map.",
        out
      ),
      detail(
        'orderId is a string property',
        params.properties?.orderId?.type === 'string',
        'Declare an orderId property inside parameters.properties and say what type it has.',
        out
      ),
      detail(
        'orderId is required',
        Array.isArray(params.required) && params.required.includes('orderId'),
        'Without a required list the model may leave orderId out. Look at the required field of the schema.',
        out
      )
    ]
  },

  async 'read-call'(t) {
    const dir = await sandbox(t)
    const [lab, fake] = await Promise.all([
      t.call(dir, 'src/assistant.ts', 'requestToolCall', ['Where is order PL-2042?']),
      t.call(dir, '.grader/drive.mjs', 'readCall')
    ])
    const early = notImplemented('requestToolCall', lab)
    if (early) return early
    const v = lab.value ?? {}
    const f = fake.value ?? {}
    return [
      detail(
        'Returns the tool name the model asked for',
        lab.ok && v.name === 'get_order',
        'name should be the function name from the first tool call in the reply. Check that you send the tool in the tools option.',
        show(lab)
      ),
      detail(
        'Returns the arguments as an object',
        lab.ok && isDeepStrictEqual(v.args, { orderId: 'PL-2042' }),
        'The model sends arguments as a JSON string. args should be that string parsed into an object.',
        show(lab)
      ),
      detail(
        'Returns the id of the tool call',
        lab.ok && v.id === 'call_lab_1',
        'id should be the id of the tool call itself. You need it later to answer the call.',
        show(lab)
      ),
      detail(
        'Works with any model, not just this one',
        fake.ok && isDeepStrictEqual(f.result, { id: 'call_q9', name: 'get_order', args: { orderId: 'PL-2043' } }) && f.toolsSent?.includes('get_order'),
        'With a different model the id and arguments change. Read them from the reply instead of writing them in, and send describeOrderTool() in tools.',
        show(fake)
      )
    ]
  },

  async 'round-trip'(t) {
    const dir = await sandbox(t)
    const ask = (q) => t.call(dir, 'src/assistant.ts', 'askAboutOrder', [q])
    const [a, b, missing, fake, types] = await Promise.all([
      ask('Where is order PL-2041?'),
      ask('Is order PL-2043 here yet?'),
      ask('Where is order PL-9999?'),
      t.call(dir, '.grader/drive.mjs', 'roundTrip'),
      t.typecheck(dir, ['src/assistant.ts'])
    ])
    const early = notImplemented('askAboutOrder', a)
    if (early) return early
    const f = fake.value ?? {}
    let toolContent = null
    try {
      toolContent = JSON.parse(f.toolMessage?.content)
    } catch {}
    const answerHint =
      'Send the assistant message with the tool call, then a tool message with the result, and return the content of the next reply. Read any API error below.'
    return [
      detail('Answers a question about an order', a.ok && a.value === 'Order PL-2041 is out for delivery, expected by 14:30.', answerHint, show(a)),
      detail('Answers about a delivered order', b.ok && b.value === 'Order PL-2043 is delivered.', answerHint, show(b)),
      detail(
        'Passes on a missing order',
        missing.ok && missing.value === 'I could not find order PL-9999: No order with id PL-9999',
        'getOrder returns an error object for an unknown id. Send that back to the model like any other result.',
        show(missing)
      ),
      detail(
        'Answers the call by its id',
        fake.ok && !f.error && f.toolMessage?.tool_call_id === 'call_7Hx' && f.assistantBefore,
        'With a model that uses different ids, the tool message must carry the id from the tool call, right after the assistant message that made the call.',
        show(fake)
      ),
      detail(
        'Sends the tool result as JSON text',
        fake.ok && toolContent?.orderId === 'PL-2042',
        'The tool message content should be the result of getOrder for the arguments the model sent, as a JSON string.',
        show(fake)
      ),
      detail(
        'Makes exactly two requests and returns the final reply',
        fake.ok && f.requests === 2 && f.answer === 'All done.',
        'One request to get the tool call, one with the result. Return the content of the second reply.',
        show(fake)
      ),
      detail('assistant.ts type-checks', types.passed, 'TypeScript reports errors in src/assistant.ts.', types.output)
    ]
  }
}
