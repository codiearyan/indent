// Keeping a copy, and asking if it changed. Run node run.js to try your functions against the
// cupboard server.
//
// Task 1: Read how an answer may be kept
// Task 2: Say whether a copy is still fresh
// Task 3: Ask whether a copy has changed
// Task 4: Show the listings, asking only when needed
//
// A copy is an object { body, etag, cacheControl, storedAt }: the body of an answer, its etag and
// cache-control headers (null when it had none), and the time it was stored or last confirmed.
// Times are numbers of milliseconds, the kind Date.now() gives back.
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Read how an answer may be kept
// keepRules(cacheControl) gets the text of a cache-control header, or null when there was none.
// It gives back { store, freshFor }: store is false only when the answer may not be kept at all,
// and freshFor is how many seconds a copy may be used without asking the server first.
export function keepRules(cacheControl) {
  throw new Error('Not implemented')
}

// Task 2: Say whether a copy is still fresh
// isFresh(copy, now) gives back true when the copy may be used at the time now without asking the
// server, and false when it is stale.
export function isFresh(copy, now) {
  throw new Error('Not implemented')
}

// Task 3: Ask whether a copy has changed
// refresh(address, copy, now) sends one GET for address. When copy has an etag, the request asks
// whether it has changed. It gives back the copy to keep from now on, stored at now: the old body
// when the answer is 304 Not Modified, the new body when it is 200. copy may be null when nothing
// is kept yet. Any other status throws an Error.
export async function refresh(address, copy, now) {
  throw new Error('Not implemented')
}

// Task 4: Show the listings, asking only when needed
// listings(address, copy, now) gives back the copy itself, without sending a request, when it is
// still fresh at now. Otherwise, or when copy is null, it gives back what refresh gives back.
export async function listings(address, copy, now) {
  throw new Error('Not implemented')
}
