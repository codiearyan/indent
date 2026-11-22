import { randomUUID } from 'node:crypto'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/statuses.js'
const token = () => randomUUID().slice(0, 8)

function familyOf(status) {
  if (status < 100 || status > 599) return 'unknown'
  return ['information', 'success', 'redirect', 'client error', 'server error'][
    Math.floor(status / 100) - 1
  ]
}

const familyCase = (status) => {
  const expected = familyOf(status)
  return {
    name: `Names the family of ${status}`,
    args: [status],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw')
        return `statusFamily stopped with an error for ${status}. Read it below.`
      const v = outcome.value
      if (v.kind !== 'string') {
        return expected === 'unknown'
          ? `statusFamily gave back ${kindText(v)} for ${status}. It is outside every family, and the task says what to give back for those.`
          : `statusFamily gave back ${kindText(v)}, not the name of a family as text.`
      }
      if (v.value === expected) return null
      if (v.value.toLowerCase().replace(/[-_]/g, ' ').trim() === expected) {
        return `statusFamily gave back '${v.value}'. The names must be written exactly as the task gives them, in small letters with a space.`
      }
      const names = [
        'information',
        'success',
        'redirect',
        'client error',
        'server error',
        'unknown'
      ]
      if (!names.includes(v.value)) {
        return `statusFamily gave back '${v.value}', which is not one of the names the task lists. Use the task's exact words.`
      }
      if (expected === 'unknown')
        return `${status} is outside every family, so its family is unknown.`
      return `${status} is not in the family statusFamily named. Look at the edges: each family runs from a number ending in 00 to one ending in 99.`
    }
  }
}

function showCase(name, status, body, expect) {
  const slug = `tea-dance-${token()}`
  const path = `/shows/${slug}`
  return {
    name,
    args: ['$base', slug],
    routes: [{ path, answers: [{ status, headers: { 'content-type': 'text/plain' }, body }] }],
    judge: ({ received, outcome }) => {
      if (received.length === 0) {
        return (
          fetchMistake('showText', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      if (received[0].path !== path)
        return `showText asked for ${received[0].path}, not the page of the show it was handed.`
      if (received.length > 1)
        return `showText sent ${received.length} requests for one show. One is enough.`
      const family = familyOf(status)
      if (expect === 'throw') {
        if (outcome.kind === 'threw' && outcome.notError) {
          return 'showText threw text, not an Error. The task asks for an Error whose message has the status number in it; the lesson shows how to make one.'
        }
        if (outcome.kind === 'threw') {
          if (/is not a function|Body is unusable|Cannot read properties/.test(outcome.message))
            return fetchMistake('showText', outcome)
          return outcome.message.includes(String(status))
            ? null
            : `showText threw, but the message of its error does not have the status number, ${status}, in it.`
        }
        const gave =
          outcome.value?.kind === 'null'
            ? 'null'
            : outcome.value?.kind === 'error'
              ? 'an Error without throwing it'
              : 'a value'
        return `${status} is in the server error family: the show may well be on the schedule, but the server could not answer. showText gave back ${gave}, and for this family it must throw an Error instead.`
      }
      if (outcome.kind === 'threw') {
        const mistake = fetchMistake('showText', outcome)
        if (!/stopped with an error/.test(mistake)) return mistake
        return family === 'success'
          ? `showText threw for a ${status}, but ${status} is in the success family. Give back the body.`
          : `showText threw for a ${status}, but ${status} is in the client error family, where it gives back null.`
      }
      const v = outcome.value
      if (expect === null) {
        if (v.kind === 'null') return null
        return v.kind === 'string' && v.value === body
          ? `${status} is in the client error family, so showText must give back null. It gave back the body of that answer, which only says what went wrong.`
          : `${status} is in the client error family, so showText must give back null.`
      }
      const mistake = fetchMistake('showText', outcome)
      if (mistake) return mistake
      if (v.kind !== 'string' || v.value !== body) {
        return `${status} is in the success family, so showText must give back the text of the body${status === 204 ? ', which is empty for a 204' : ''}.`
      }
      return null
    }
  }
}

function retryCase(name, statuses, tries, expectedSent) {
  const path = `/playlist/${token()}`
  const answers = statuses.map((status, i) => ({
    status,
    headers: { 'content-type': 'text/plain' },
    body: `Answer ${i + 1}: ${status}, check ${token()}`
  }))
  const last = answers[Math.min(expectedSent, answers.length) - 1]
  return {
    name,
    args: [`$base${path}`, tries],
    routes: [{ path, answers }],
    judge: ({ received, outcome }) => {
      const sent = received.length
      if (sent === 0) {
        return (
          fetchMistake('fetchWithRetry', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      if (received.some((r) => r.path !== path))
        return `fetchWithRetry asked for ${received[0].path}, not the address it was handed.`
      const lastSeen = statuses[Math.min(sent, statuses.length) - 1]
      if (sent > expectedSent) {
        if (sent > tries)
          return `fetchWithRetry sent ${sent} requests, but it was handed tries ${tries}, the most it may send in all.`
        return `fetchWithRetry asked again after a ${statuses[expectedSent - 1]}. ${familyOf(statuses[expectedSent - 1]) === 'client error' ? 'That is a client error: asking again the same way only gets the same answer.' : 'That answer is not in the server error family, so it is final.'}`
      }
      if (sent < expectedSent) {
        return `fetchWithRetry stopped after ${sent} ${sent === 1 ? 'request' : 'requests'}, although the last answer was a ${lastSeen}, in the server error family, and tries ${tries} allowed more.`
      }
      if (
        outcome.kind === 'threw' &&
        familyOf(last.status) === 'server error' &&
        /stopped with an error/.test(fetchMistake('fetchWithRetry', outcome))
      ) {
        return 'fetchWithRetry threw when its tries ran out. The task asks it to give back the status and body of the last answer it got, even when that is still a server error.'
      }
      const mistake = fetchMistake('fetchWithRetry', outcome)
      if (mistake) return mistake
      const v = outcome.value
      if (v.kind !== 'object')
        return `fetchWithRetry gave back ${kindText(v)}, not an object with status and body.`
      if (v.value.status !== last.status) {
        return typeof v.value.status === 'number'
          ? 'status is not the status of the last answer fetchWithRetry got.'
          : 'status is not a number. The status of an answer is already a number; keep it as one.'
      }
      if (v.value.body !== last.body)
        return 'body is not the text of the body of the last answer fetchWithRetry got.'
      return null
    }
  }
}

/** Adds a note to failed details when statusFamily, which fn may use, is not right yet. */
async function withFamilyNote(t, fn, details) {
  if (details.every((d) => d.passed) || details.length === 1) return details
  const family = await checks.family(t)
  if (family.every((d) => d.passed)) return details
  const note = ` If ${fn} uses statusFamily, Task 1 is not right yet: get it to pass first.`
  return details.map((d) => (d.passed ? d : { ...d, message: d.message + note }))
}

export const checks = {
  family(t) {
    return cases(t, {
      file: FILE,
      fn: 'statusFamily',
      list: [101, 204, 304, 400, 499, 500, 599, 600, 99, 42].map(familyCase)
    })
  },

  async show(t) {
    return withFamilyNote(
      t,
      'showText',
      await cases(t, {
        file: FILE,
        fn: 'showText',
        list: [
          showCase(
            'Gives the text of a 200',
            200,
            `Tea Dance, friday at 15:00, check ${token()}`,
            'text'
          ),
          showCase('Gives the empty text of a 204', 204, '', 'text'),
          showCase('Gives null for a 404', 404, 'No such show', null),
          showCase('Gives null for a 410', 410, 'That show has ended', null),
          showCase('Throws for a 500', 500, 'The listings broke', 'throw'),
          showCase('Throws for a 503', 503, 'Restarting', 'throw')
        ]
      })
    )
  },

  async retry(t) {
    return withFamilyNote(
      t,
      'fetchWithRetry',
      await cases(t, {
        file: FILE,
        fn: 'fetchWithRetry',
        list: [
          retryCase('Asks again until the server is back', [503, 503, 200], 3, 3),
          retryCase('Stops asking once an answer goes well', [500, 200], 5, 2),
          retryCase('Gives up after tries requests', [502, 500, 503], 3, 3),
          retryCase('Never asks again after a client error', [404], 3, 1),
          retryCase('Sends one request when tries is 1', [503], 1, 1)
        ]
      })
    )
  }
}
