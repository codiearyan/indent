import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { cases, fetchMistake, kindText } from '../../shared/checks-lib.mjs'

const FILE = 'src/redirects.js'
const token = () => randomUUID().slice(0, 8)

const KINDS = {
  301: { permanent: true, keepsPost: false },
  302: { permanent: false, keepsPost: false },
  303: { permanent: false, keepsPost: false },
  307: { permanent: false, keepsPost: true },
  308: { permanent: true, keepsPost: true }
}

function kindCase(status) {
  const expected = KINDS[status] ?? null
  return {
    name: expected ? `Says what kind of redirect ${status} is` : `Gives null for ${status}`,
    args: [status],
    network: false,
    judge: ({ outcome }) => {
      if (outcome.kind === 'threw') return 'redirectKind stopped with an error. Read it below.'
      const v = outcome.value
      if (expected === null) {
        if (v.kind === 'null') return null
        return `${status} is not one of the five redirects, so redirectKind must give back null. It gave back ${kindText(v)}.`
      }
      if (v.kind !== 'object')
        return `redirectKind gave back ${kindText(v)} for ${status}, not an object with permanent and keepsPost.`
      const got = v.value
      if (isDeepStrictEqual(got, expected)) return null
      const keys = Object.keys(got).sort()
      if (!isDeepStrictEqual(keys, ['keepsPost', 'permanent']))
        return `The object has ${keys.join(', ') || 'nothing in it'}. It needs permanent and keepsPost, spelt as the task gives them, and nothing else.`
      if (typeof got.permanent !== 'boolean' || typeof got.keepsPost !== 'boolean')
        return 'permanent and keepsPost are true or false, not text.'
      if (got.permanent !== expected.permanent)
        return `permanent is wrong for ${status}. The lesson says which redirects are for good and which are for now.`
      return `keepsPost is wrong for ${status}. The lesson says which redirects send a POST on as it was, and which turn it into a GET.`
    }
  }
}

/** One request for the address, not followed, or a message. */
function oneRequest(fn, { received, outcome }, path) {
  if (received.length === 0) {
    return (
      fetchMistake(fn, outcome) ??
      "The check's server never received a request. Send it with fetch and wait for the answer."
    )
  }
  if (received[0].path !== path)
    return `${fn} asked for ${received[0].path}, not the address it was handed.`
  if (received.length > 1)
    return `${fn} sent ${received.length} requests. fetch follows a redirect by itself unless it is told not to: the lesson shows how to look without following.`
  return null
}

function whereCase(name, status, location) {
  const dir = `/w-${token()}`
  const path = `${dir}/old/page`
  const isRedirect = status >= 300 && status <= 399 && location !== null
  const headers = location === null ? {} : { location }
  const answer = isRedirect
    ? { status, headers }
    : { status, headers: { 'content-type': 'text/plain' }, body: `A page, check ${token()}` }
  return {
    name,
    args: [`$base${path}`],
    routes: [
      { path, answers: [answer] },
      { path: `${dir}/old/listings`, answers: [{ status: 200, body: 'You followed it.' }] },
      { path: `${dir}/new`, answers: [{ status: 200, body: 'You followed it.' }] }
    ],
    judge: (r) => {
      const problem = oneRequest('whereTo', r, path) ?? fetchMistake('whereTo', r.outcome)
      if (problem) return problem
      const v = r.outcome.value
      if (!isRedirect) {
        if (v.kind === 'null') return null
        return `The answer was a ${status}${location === null ? ' with no location header' : ''}, which is not a redirect, so whereTo must give back null.`
      }
      const loc = location.replaceAll('$base', r.base)
      const expected = new URL(loc, `${r.base}${path}`).href
      if (v.kind === 'null')
        return `The answer was a ${status} with a location header, a redirect, but whereTo gave back null.`
      if (v.kind === 'url')
        return 'whereTo gave back a URL object. The task asks for the whole address as text, which a URL keeps in href.'
      if (v.kind !== 'string') return `whereTo gave back ${kindText(v)}, not an address as text.`
      if (v.value === expected) return null
      if (v.value === loc)
        return 'whereTo gave back the location exactly as it came. It is only part of an address: read it against the address that was asked for.'
      if (v.value === `${r.base}${path}`)
        return 'whereTo gave back the address it was asked for, not the one the location points to.'
      return `The address is not the one this location points to, read against the address that was asked for.${/^[a-z]+:|^\//.test(loc) ? '' : ' A path without a slash at the start replaces only the last part of the path.'}`
    }
  }
}

function trailCase(name, steps, most, tooLong) {
  const dir = `/t-${token()}`
  const routes = steps.map(([status, location], i) => ({
    path: `${dir}/${i}`,
    answers: [
      status >= 300
        ? { status, headers: { location: location.replaceAll('@', dir) } }
        : { status, headers: { 'content-type': 'text/plain' }, body: `The end, check ${token()}` }
    ]
  }))
  const allowed = most + 1
  return {
    name,
    args: [`$base${dir}/0`, most],
    routes,
    judge: ({ received, receivedCount, outcome, base }) => {
      if (outcome.kind === 'threw' && /redirect count/.test(outcome.cause ?? '')) {
        return 'fetch followed the redirects by itself until it gave up. Ask without following, one step at a time, and count the redirects yourself.'
      }
      if (received.length === 0) {
        return (
          fetchMistake('trail', outcome) ??
          "The check's server never received a request. Send it with fetch and wait for the answer."
        )
      }
      const ownError =
        outcome.kind === 'threw' &&
        /stopped with an error/.test(fetchMistake('trail', outcome) ?? '')
      if (tooLong) {
        if (received.length > allowed) {
          return `trail sent ${receivedCount ?? received.length} requests, but with most ${most} it may ask at most ${allowed} ${allowed === 1 ? 'time' : 'times'}: the address, and one for each redirect it may follow. Stop as soon as the redirects are used up.`
        }
        if (outcome.kind === 'threw' && outcome.notError)
          return 'trail threw text, not an Error. The task asks for an Error.'
        if (ownError && received.length < allowed)
          return `trail threw after ${received.length} ${received.length === 1 ? 'request' : 'requests'}, but most ${most} allows ${most} redirects to be followed first.`
        if (ownError) return null
        if (outcome.kind === 'threw') return fetchMistake('trail', outcome)
        return `The answer was still a redirect after ${most} ${most === 1 ? 'redirect' : 'redirects'}, so trail must throw an Error. It gave back ${kindText(outcome.value)}.`
      }
      const expected = steps.map((_, i) => `${base}${dir}/${i}`)
      if (received.length > steps.length)
        return `trail sent ${received.length} requests for a trail of ${steps.length} ${steps.length === 1 ? 'address' : 'addresses'}. Ask each address once.`
      if (ownError) {
        return `trail threw, but this trail takes ${steps.length - 1} ${steps.length === 2 ? 'redirect' : 'redirects'}, and most ${most} allows that many.`
      }
      const mistake = fetchMistake('trail', outcome)
      if (mistake) return mistake
      const v = outcome.value
      if (v.kind !== 'array') return `trail gave back ${kindText(v)}, not a list of addresses.`
      if (isDeepStrictEqual(v.value, expected)) return null
      if (received.length === 1 && steps.length > 1)
        return 'trail sent one request, so fetch followed the redirects by itself. Ask without following, one step at a time, to see each address.'
      if (v.value[0] !== expected[0])
        return 'The list does not start with the address trail was handed.'
      if (v.value.length < expected.length && v.value.at(-1) === expected.at(-1))
        return 'The list skips the addresses in between, so fetch followed the redirects by itself. Ask without following, one step at a time, to see each address.'
      if (v.value.length !== expected.length)
        return `The list has ${v.value.length} ${v.value.length === 1 ? 'address' : 'addresses'}, but this trail went through ${expected.length}: the address it was handed, then each one a redirect pointed to.`
      return 'The addresses in the list are not the ones each redirect pointed to, as whole addresses.'
    }
  }
}

/** Adds a note to failed details when whereTo, which trail may use, is not right yet. */
async function withWhereNote(t, details) {
  if (details.every((d) => d.passed) || details.length === 1) return details
  const where = await checks.where(t)
  if (where.every((d) => d.passed)) return details
  const note = ' If trail uses whereTo, Task 2 is not right yet: get it to pass first.'
  return details.map((d) => (d.passed || d.message.includes('Task 2') ? d : { ...d, message: d.message + note }))
}

export const checks = {
  kind(t) {
    return cases(t, {
      file: FILE,
      fn: 'redirectKind',
      list: [301, 302, 303, 307, 308, 300, 304, 200, 404].map(kindCase)
    })
  },

  where(t) {
    return cases(t, {
      file: FILE,
      fn: 'whereTo',
      list: [
        whereCase('Gives the whole address for a location that is a path', 301, `/moved/${token()}`),
        whereCase('Keeps a location that is a whole address', 308, '$base/new'),
        whereCase('Reads a path without a slash against the address', 307, 'listings'),
        whereCase('Gives null for a page that is there', 200, null),
        whereCase('Gives null for a 304 with no location', 304, null),
        whereCase('Gives null for a 404', 404, null)
      ]
    })
  },

  async trail(t) {
    return withWhereNote(
      t,
      await cases(t, {
        file: FILE,
        fn: 'trail',
        list: [
          trailCase(
            'Lists every address of a trail',
            [[301, '@/1'], [302, '$base@/2'], [307, '3'], [200]],
            5,
            false
          ),
          trailCase('Lists one address when there is no redirect', [[200]], 3, false),
          trailCase('Follows exactly most redirects', [[308, '@/1'], [303, '@/2'], [200]], 2, false),
          trailCase('Throws in a loop, after most redirects', [[301, '@/1'], [308, '@/0']], 4, true),
          trailCase('Throws when most is 0 and there is a redirect', [[302, '@/1'], [200]], 0, true)
        ]
      })
    )
  }
}
