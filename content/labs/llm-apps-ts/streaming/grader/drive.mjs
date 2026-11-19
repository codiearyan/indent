// Copied into the sandbox as .grader/drive.mjs. Feeds stream.ts chunk lists and records every
// onPartial call.
import { collectStream, streamAnswer } from '../src/stream.ts'

async function* fromList(chunks) {
  for (const chunk of chunks) yield chunk
}

async function record(run) {
  const partials = []
  try {
    const result = await run((textSoFar) => partials.push(textSoFar))
    return { result, partials }
  } catch (err) {
    return { error: String(err?.message ?? err), partials }
  }
}

export function collect(chunks, withCallback) {
  return record((onPartial) =>
    withCallback ? collectStream(fromList(chunks), onPartial) : collectStream(fromList(chunks))
  )
}

export function answer(question, maxTokens) {
  return record((onPartial) => streamAnswer(question, onPartial, maxTokens))
}

export async function answerWithFakeClient(question, chunks) {
  const requests = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          requests.push(params)
          return fromList(chunks)
        }
      }
    }
  }
  return { requests, ...(await record((onPartial) => streamAnswer(question, onPartial, 50, client))) }
}
