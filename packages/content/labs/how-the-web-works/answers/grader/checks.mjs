import { randomUUID } from 'node:crypto'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/answers.js'
const token = () => randomUUID().slice(0, 8)

/** The page a case asks for, and what the check's server answers there. */
function page(answer) {
  const path = `/page/${token()}`
  return { path, routes: [{ path, answers: [answer] }] }
}

/** What is wrong with the request side of a case: one GET for the page, or null. */
function requestProblem(fn, { received, outcome }, path) {
  if (received.length === 0) {
    return (
      fetchMistake(fn, outcome) ??
      "The check's server never received a request. Send it with fetch and wait for the answer."
    )
  }
  if (received.some((r) => r.path !== path))
    return `${fn} asked for ${received[0].target}, not the address it was handed.`
  if (received.length > 1) {
    return `${fn} sent ${received.length} requests for one page. Everything it needs is in one answer, so send one request and read it all from there.`
  }
  return null
}

function statusCase(name, status, reason, body) {
  const { path, routes } = page({ status, reason, headers: { 'content-type': 'text/plain' }, body })
  const expected = `${status} ${reason}`
  return {
    name,
    args: [`$base${path}`],
    routes,
    judge: (r) => {
      const problem = requestProblem('statusLine', r, path)
      if (problem) return problem
      const mistake = fetchMistake('statusLine', r.outcome)
      if (mistake) return mistake
      const v = r.outcome.value
      if (v.kind === 'number')
        return 'statusLine gave back a number. The task asks for text: the number, a space and the reason.'
      if (v.kind !== 'string')
        return `statusLine gave back ${kindText(v)}, not the status line as text.`
      if (v.value === expected) return null
      if (v.value === String(status))
        return 'statusLine gave back only the number. The task asks for the number, a space and the reason the server wrote beside it.'
      if (v.value.startsWith('undefined')) {
        return 'The status came out as undefined: it was read before the answer arrived. fetch gives back a promise, so wait for it with await before you read from it.'
      }
      if (!v.value.startsWith(`${status} `))
        return 'The text does not start with the status number of the answer and a space.'
      return 'The reason is not the one this server wrote beside the number. Servers may write any reason they like, so read it from the answer instead of working it out from the number.'
    }
  }
}

function typeCase(name, type) {
  const headers = type === null ? {} : { 'content-type': type }
  const { path, routes } = page({ status: 200, headers, body: `A page, check ${token()}` })
  return {
    name,
    args: [`$base${path}`],
    routes,
    judge: (r) => {
      const problem = requestProblem('contentType', r, path)
      if (problem) return problem
      const v = r.outcome.value
      if (r.outcome.kind === 'returned' && v.kind === 'undefined') {
        return 'contentType gave back undefined. Either nothing was handed back with return, or the header was read like a property of a plain object. The headers of an answer are not one: look at how the lesson reads a header.'
      }
      const mistake = fetchMistake('contentType', r.outcome)
      if (mistake) return mistake
      if (type === null) {
        return v.kind === 'null'
          ? null
          : `This answer has no content-type header, so contentType must give back null. It gave back ${v.kind === 'string' ? `'${v.value}'` : kindText(v)}.`
      }
      if (v.kind === 'null') {
        return 'contentType gave back null, but this answer has a content-type header. Either the name is not spelt as the task gives it, or the header was read like a property of a plain object, which the headers of an answer are not: look at how the lesson reads a header.'
      }
      if (v.kind !== 'string' || v.value !== type)
        return 'contentType gave back something other than the whole value of the content-type header.'
      return null
    }
  }
}

function wholeProblem(v, answer) {
  if (v.kind !== 'object') return `readAnswer gave back ${kindText(v)}, not an object.`
  const got = v.value
  const missing = ['ok', 'status', 'type', 'body'].filter((k) => !(k in got))
  if (missing.length)
    return `The object has no ${missing.join(', no ')}. It needs ok, status, type and body.`
  const okExpected = answer.status >= 200 && answer.status <= 299
  if (typeof got.status !== 'number')
    return 'status is not a number. The status of an answer is already a number; keep it as one.'
  if (got.status !== answer.status) return 'status is not the status of the answer.'
  if (got.ok !== okExpected) {
    if (typeof got.ok !== 'boolean') return 'ok is not true or false.'
    if (answer.status === 200) {
      return "ok is false for a 200. If ok compares the status with something, remember that the status is a number, and '200' in quotes is text."
    }
    return okExpected
      ? `ok is false, but ${answer.status} is from 200 to 299, so this answer is ok.`
      : `ok is true, but ${answer.status} is not from 200 to 299. An answer that came back is not always an answer that went well.`
  }
  const typeExpected = answer.headers?.['content-type'] ?? null
  if (got.type !== typeExpected) {
    return typeExpected === null
      ? 'This answer has no content-type header, so type must be null.'
      : 'type is not the value of the content-type header of the answer.'
  }
  if (got.body !== answer.body) {
    return okExpected
      ? 'body is not the text of the body of the answer.'
      : 'body is not the text of the body of the answer. An answer that did not go well still has a body, and it usually says why.'
  }
  return null
}

function wholeCase(name, answer) {
  const { path, routes } = page(answer)
  return {
    name,
    args: [`$base${path}`],
    routes,
    judge: (r) =>
      requestProblem('readAnswer', r, path) ??
      fetchMistake('readAnswer', r.outcome) ??
      wholeProblem(r.outcome.value, answer)
  }
}

export const checks = {
  status(t) {
    return cases(t, {
      file: FILE,
      fn: 'statusLine',
      list: [
        statusCase(
          'Reads a status with a reason of its own',
          404,
          'Not On The Schedule',
          'No such show'
        ),
        statusCase(
          'Reads another status and reason',
          202,
          'Queued For Tonight',
          'Your request is in the queue'
        ),
        statusCase('Reads an ordinary 200', 200, 'OK', 'Hello from the check')
      ]
    })
  },

  header(t) {
    return cases(t, {
      file: FILE,
      fn: 'contentType',
      list: [
        typeCase('Reads the content-type header', 'text/csv; charset=utf-8'),
        typeCase('Reads a content-type of another kind', 'application/x-heron-cue'),
        typeCase('Gives null when the answer has no content-type', null)
      ]
    })
  },

  whole(t) {
    return cases(t, {
      file: FILE,
      fn: 'readAnswer',
      list: [
        wholeCase('Reads an answer that went well', {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: `Allotment Hour moves to Thursday, check ${token()}`
        }),
        wholeCase('Counts a 201 as ok', {
          status: 201,
          headers: { 'content-type': 'text/plain' },
          body: `Added to the schedule, check ${token()}`
        }),
        wholeCase('Reads an answer that did not go well', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
          body: `No show called quiz-night, check ${token()}`
        }),
        wholeCase('Gives a null type when there is no content-type', {
          status: 503,
          body: `Restarting, check ${token()}`
        })
      ]
    })
  }
}
