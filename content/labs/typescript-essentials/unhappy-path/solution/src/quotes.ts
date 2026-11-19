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
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

export async function getQuote(
  partId: string,
  fetchPrice: (partId: string) => Promise<number>
): Promise<Result<number>> {
  try {
    const price = await fetchPrice(partId)
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Invalid price' }
    return { ok: true, value: price }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Supplier error' }
  }
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}
