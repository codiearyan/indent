// Task: Finish the list even when some fail
//
// mapLimitSettled(items, limit, fn) works like mapLimit, with the same limit and order, but it
// never rejects and never stops early. It resolves with one entry per item, in order:
// - { ok: true, value } when fn(item, index) resolved
// - { ok: false, error } when it rejected, where error is the rejection itself
// fn is whatever slow work you pass in. The check passes a fake it settles by hand.
import { mapLimit } from './mapLimit.js'

export function mapLimitSettled(items, limit, fn) {
  throw new Error('Not implemented')
}
