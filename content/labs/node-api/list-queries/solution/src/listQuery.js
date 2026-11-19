// Tasks: Read the query string, Filter, sort and page
//
// parseListQuery(searchParams) turns a URLSearchParams into
//   { type, available, sortBy, order, limit, offset }
// - type: one of BOAT_TYPES, or null when not given
// - available: 'true' or 'false' becomes true or false, null when not given
// - sort: 'code', 'name' or 'hourlyCents', with a leading '-' for descending;
//   becomes sortBy and order ('asc' or 'desc'); default sortBy 'code', order 'asc'
// - limit: whole number from 1 to 50, default 10
// - offset: whole number from 0, default 0
// Unknown parameters are ignored. When any value is bad, throw
//   new HttpError(400, 'invalid_query', message, details)
// with one { field, message } per bad parameter, every problem at once.
//
// applyListQuery(boats, query) returns { data, total, limit, offset }:
// - keep boats that match type and available (null means no filter)
// - sort by sortBy in order; ties are broken by code, ascending
// - total counts the matching boats before paging
// - data is at most `limit` boats, starting at `offset`
// It never changes the `boats` array it is given.
import { BOAT_TYPES } from './boats.js'
import { HttpError } from './errors.js'

const SORT_FIELDS = ['code', 'name', 'hourlyCents']

function wholeNumber(text, min, max) {
  if (!/^\d+$/.test(text)) return null
  const n = Number(text)
  return n >= min && n <= max ? n : null
}

export function parseListQuery(searchParams) {
  const query = { type: null, available: null, sortBy: 'code', order: 'asc', limit: 10, offset: 0 }
  const details = []
  const bad = (field, message) => details.push({ field, message })

  const type = searchParams.get('type')
  if (type !== null) {
    if (BOAT_TYPES.includes(type)) query.type = type
    else bad('type', `must be one of ${BOAT_TYPES.join(', ')}`)
  }

  const available = searchParams.get('available')
  if (available !== null) {
    if (available === 'true' || available === 'false') query.available = available === 'true'
    else bad('available', 'must be true or false')
  }

  const sort = searchParams.get('sort')
  if (sort !== null) {
    const desc = sort.startsWith('-')
    const field = desc ? sort.slice(1) : sort
    if (SORT_FIELDS.includes(field)) {
      query.sortBy = field
      query.order = desc ? 'desc' : 'asc'
    } else {
      bad('sort', `must be one of ${SORT_FIELDS.join(', ')}, optionally starting with -`)
    }
  }

  const limit = searchParams.get('limit')
  if (limit !== null) {
    query.limit = wholeNumber(limit, 1, 50)
    if (query.limit === null) bad('limit', 'must be a whole number from 1 to 50')
  }

  const offset = searchParams.get('offset')
  if (offset !== null) {
    query.offset = wholeNumber(offset, 0, Number.MAX_SAFE_INTEGER)
    if (query.offset === null) bad('offset', 'must be a whole number from 0')
  }

  if (details.length > 0) {
    throw new HttpError(400, 'invalid_query', 'Some query parameters are not valid', details)
  }
  return query
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export function applyListQuery(boats, { type, available, sortBy, order, limit, offset }) {
  const matching = boats.filter(
    (boat) => (type === null || boat.type === type) && (available === null || boat.available === available)
  )
  const direction = order === 'desc' ? -1 : 1
  matching.sort((a, b) => direction * compare(a[sortBy], b[sortBy]) || compare(a.code, b.code))
  return { data: matching.slice(offset, offset + limit), total: matching.length, limit, offset }
}
