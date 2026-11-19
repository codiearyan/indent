import { isDeepStrictEqual } from 'node:util'
import { fleet } from '../starter/src/fleet.js'
import { broken, checkApp, errorCode, sandbox } from '../../shared/checks-lib.mjs'

const defaults = { type: null, available: null, sortBy: 'code', order: 'asc', limit: 10, offset: 0 }
const same = (a, b) => isDeepStrictEqual(a, b)
const codes = (data) => (Array.isArray(data) ? data.map((boat) => boat?.code) : data)
const fleetOrder = fleet.map((boat) => boat.code)

function unwrittenCheck(results, fn) {
  const unwritten = results.find((x) => /Not implemented/.test(x.thrown?.message))
  return unwritten
    ? [
        {
          name: `${fn} is implemented`,
          passed: false,
          message: `${fn} still throws 'Not implemented'. Replace that line with your code.`,
          output: unwritten.thrown.message
        }
      ]
    : null
}

const describe = (r) => (r.thrown ? `threw ${JSON.stringify(r.thrown)}` : `returned ${JSON.stringify(r.value)}`)

export const checks = {
  async 'parse-query'(t) {
    const rejects = (fields) => (r) =>
      r.thrown?.status === 400 &&
      r.thrown.code === 'invalid_query' &&
      Array.isArray(r.thrown.details) &&
      fields.every((f) => r.thrown.details.some((d) => d?.field === f))
    const groups = [
      {
        name: 'No parameters gives the defaults',
        queries: ['', 'colour=red'],
        ok: (r) => same(r.value, defaults),
        hint: 'With no parameters (or only unknown ones) the result should be the defaults listed in the task.'
      },
      {
        name: 'Reads type and available',
        queries: ['type=double&available=false', 'available=true'],
        ok: (r, i) =>
          same(r.value, i === 0 ? { ...defaults, type: 'double', available: false } : { ...defaults, available: true }),
        hint: "available arrives as the text 'true' or 'false'. The result should hold a real boolean."
      },
      {
        name: 'Reads sort and its direction',
        queries: ['sort=-hourlyCents', 'sort=name'],
        ok: (r, i) =>
          same(r.value, i === 0 ? { ...defaults, sortBy: 'hourlyCents', order: 'desc' } : { ...defaults, sortBy: 'name' }),
        hint: "A leading '-' means descending. The field name is what comes after it."
      },
      {
        name: 'Reads limit and offset as numbers',
        queries: ['limit=50&offset=20', 'limit=1&offset=0'],
        ok: (r, i) => same(r.value, i === 0 ? { ...defaults, limit: 50, offset: 20 } : { ...defaults, limit: 1 }),
        hint: 'limit and offset should be numbers in the result, and 1 to 50 and 0 are allowed.'
      },
      {
        name: 'Refuses a limit out of range',
        queries: ['limit=0', 'limit=51', 'offset=-1'],
        ok: (r, i) => rejects([i === 2 ? 'offset' : 'limit'])(r),
        hint: "limit outside 1 to 50, or a negative offset, should throw an HttpError 400 'invalid_query' with a detail for that field."
      },
      {
        name: 'Refuses numbers that are not whole',
        queries: ['limit=2.5', 'limit=10abc', 'limit=', 'offset=1e3'],
        ok: (r, i) => rejects([i === 3 ? 'offset' : 'limit'])(r),
        hint: "Number('') is 0 and parseInt('10abc') is 10. Only plain digits count as a whole number here."
      },
      {
        name: 'Refuses unknown values',
        queries: ['type=canoe', 'available=yes', 'sort=price', 'sort=-', 'type=toString'],
        ok: (r, i) => rejects([['type', 'available', 'sort', 'sort', 'type'][i]])(r),
        hint: "type, available and sort only accept the values listed in the task. Anything else is a 400 'invalid_query'."
      },
      {
        name: 'Lists every bad parameter at once',
        queries: ['type=canoe&limit=0&available=maybe'],
        ok: rejects(['type', 'limit', 'available']),
        hint: 'Collect the problems and throw once, with one detail per bad parameter.'
      }
    ]
    const queries = groups.flatMap((g) => g.queries)
    const dir = await sandbox(t, { '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const r = await t.call(dir, '.grader/drive.mjs', 'parseAll', [queries])
    if (!r.ok) return broken('parseListQuery can be called', r)
    const stop = unwrittenCheck(r.value, 'parseListQuery')
    if (stop) return stop
    let at = 0
    return groups.map((g) => {
      const results = r.value.slice(at, (at += g.queries.length))
      const bad = results.findIndex((res, i) => !g.ok(res, i))
      return {
        name: g.name,
        passed: bad === -1,
        message: bad === -1 ? undefined : g.hint,
        output: g.queries.map((q, i) => `?${q}\n  ${describe(results[i])}`).join('\n')
      }
    })
  },

  async 'apply-query'(t) {
    const q = (over) => ({ ...defaults, ...over })
    const cases = [
      {
        name: 'The defaults list every boat by code',
        query: q({}),
        ok: (v) => same(codes(v.data), fleetOrder) && v.total === 8 && v.limit === 10 && v.offset === 0,
        hint: 'With no filters, data should hold every boat sorted by code, and the envelope should repeat limit and offset.'
      },
      {
        name: 'Filters by type',
        query: q({ type: 'double' }),
        ok: (v) => same(codes(v.data), ['TW-02', 'TW-05', 'TW-08']) && v.total === 3,
        hint: 'Only boats of the given type should be in data, and total should count only them.'
      },
      {
        name: 'Filters by available, including false',
        query: q({ available: false }),
        ok: (v) => same(codes(v.data), ['TW-03', 'TW-06']) && v.total === 2,
        hint: 'available: false is a real filter, not the same as no filter. Compare with null, not with a truthy check.'
      },
      {
        name: 'Sorts by price, ties by code',
        query: q({ sortBy: 'hourlyCents' }),
        ok: (v) => same(codes(v.data), ['TW-04', 'TW-06', 'TW-01', 'TW-03', 'TW-07', 'TW-02', 'TW-08', 'TW-05']),
        hint: 'Sort by the field, and when two boats have the same value, put the smaller code first.'
      },
      {
        name: 'Sorts descending, ties still by code ascending',
        query: q({ sortBy: 'hourlyCents', order: 'desc' }),
        ok: (v) => same(codes(v.data), ['TW-05', 'TW-02', 'TW-08', 'TW-07', 'TW-01', 'TW-03', 'TW-04', 'TW-06']),
        hint: 'Descending flips the field order only. Boats with the same price should still go in code order.'
      },
      {
        name: 'Sorts by name',
        query: q({ sortBy: 'name' }),
        ok: (v) => same(v.data?.map((b) => b.name), ['Alder', 'Birch', 'Heron', 'Moss', 'Otter', 'Pike', 'Teal', 'Wren']),
        hint: 'sortBy can be any of the three fields. Read the field name from the query.'
      },
      {
        name: 'Pages with limit and offset',
        query: q({ limit: 3, offset: 3 }),
        ok: (v) => same(codes(v.data), ['TW-04', 'TW-05', 'TW-06']) && v.total === 8 && v.limit === 3 && v.offset === 3,
        hint: 'Skip offset boats, then take up to limit. total is the count before paging.'
      },
      {
        name: 'An offset past the end gives an empty page',
        query: q({ offset: 20 }),
        ok: (v) => same(v.data, []) && v.total === 8,
        hint: 'Asking for a page past the end is not an error. data is empty and total still counts every match.'
      },
      {
        name: 'total counts matches before paging',
        query: q({ type: 'single', limit: 1, offset: 1 }),
        ok: (v) => same(codes(v.data), ['TW-03']) && v.total === 3,
        hint: 'Filter first, sort, then cut the page. total is the number of matching boats, not the size of the page.'
      }
    ]
    const dir = await sandbox(t, { '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const shuffled = [...fleet].reverse()
    const r = await t.call(dir, '.grader/drive.mjs', 'applyAll', [shuffled, cases.map((c) => c.query)])
    if (!r.ok) return broken('applyListQuery can be called', r)
    const stop = unwrittenCheck(r.value, 'applyListQuery')
    if (stop) return stop
    const details = cases.map((c, i) => {
      const res = r.value[i]
      let passed = false
      try {
        passed = !res.thrown && c.ok(res.value)
      } catch {}
      return {
        name: c.name,
        passed,
        message: passed ? undefined : c.hint,
        output: `applyListQuery(boats, ${JSON.stringify(c.query)})\n${describe(res).slice(0, 800)}`
      }
    })
    const moved = r.value.find((res) => !same(res.inputOrder, shuffled.map((b) => b.code)))
    details.push({
      name: 'Leaves the boats array as it was',
      passed: !moved,
      message: moved
        ? 'The array passed in came back in a different order. sort() changes the array it is called on.'
        : undefined,
      output: moved ? `before: ${shuffled.map((b) => b.code).join(', ')}\nafter:  ${moved.inputOrder.join(', ')}` : undefined
    })
    return details
  },

  async 'list-route'(t) {
    const dir = await sandbox(t)
    const envelope = (res) => res.status === 200 && Array.isArray(res.json?.data)
    return checkApp(t, dir, [
      {
        name: 'GET /boats answers the default envelope',
        req: { path: '/boats' },
        ok: (res) => envelope(res) && same(res.json, { data: fleet, total: 8, limit: 10, offset: 0 }),
        hint: 'GET /boats should answer 200 with { data, total, limit, offset }, using the defaults.'
      },
      {
        name: 'Filters and sorts from the query string',
        req: { path: '/boats?type=double&sort=-hourlyCents' },
        ok: (res) => envelope(res) && same(codes(res.json.data), ['TW-05', 'TW-02', 'TW-08']) && res.json.total === 3,
        hint: 'Read the query string of req.url and pass it to parseListQuery.'
      },
      {
        name: 'Pages from the query string',
        req: { path: '/boats?limit=2&offset=2' },
        ok: (res) => envelope(res) && same(codes(res.json.data), ['TW-03', 'TW-04']) && res.json.total === 8,
        hint: 'limit and offset in the URL should pick the page.'
      },
      {
        name: 'A bad parameter answers 400 invalid_query',
        req: { path: '/boats?limit=500' },
        ok: (res) => res.status === 400 && errorCode(res) === 'invalid_query' && Array.isArray(res.json?.error?.details),
        hint: 'Let the HttpError from parseListQuery reach createApp, so the client gets a 400 with details.'
      },
      {
        name: 'POST /boats still works',
        req: {
          method: 'POST',
          path: '/boats',
          json: { code: 'TW-09', name: 'Kestrel', type: 'single', hourlyCents: 1900 }
        },
        ok: (res) => res.status === 201,
        hint: 'POST /boats should still work.'
      },
      {
        name: 'The list reads from the store',
        req: { path: '/boats?type=single' },
        ok: (res) => envelope(res) && res.json.total === 4 && codes(res.json.data).includes('TW-09'),
        hint: 'GET /boats should list what is in the store now, not the fleet file.'
      }
    ], { boats: fleet })
  }
}
