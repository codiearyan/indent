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

export function parseListQuery(searchParams) {
  throw new Error('Not implemented')
}

export function applyListQuery(boats, { type, available, sortBy, order, limit, offset }) {
  throw new Error('Not implemented')
}
