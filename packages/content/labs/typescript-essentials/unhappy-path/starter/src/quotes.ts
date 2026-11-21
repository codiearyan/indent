// Task: Quotes that can fail
//
// - Export a type Result<T, E = string>: either { ok: true, value: T } or
//   { ok: false, error: E }.
// - getQuote(partId, fetchPrice) is async. fetchPrice(partId) returns a Promise of a price in
//   cents. getQuote resolves to:
//     { ok: true, value: price }           for a finite price of 0 or more
//     { ok: false, error: 'Invalid price' } for a negative or non-finite price
//     { ok: false, error: <message> }       when fetchPrice throws or rejects with an Error
//     { ok: false, error: 'Supplier error' } when it throws or rejects with anything else
//   getQuote itself never rejects. Its return type is Promise<Result<number>>.
// - unwrapOr(result, fallback) returns the value of a successful result, or the fallback.
//   The fallback has the same type as the value.
export async function getQuote(partId, fetchPrice) {
  throw new Error('Not implemented')
}

export function unwrapOr(result, fallback) {
  throw new Error('Not implemented')
}
