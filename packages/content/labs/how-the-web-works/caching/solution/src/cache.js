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
  const directives = new Map()
  for (const part of (cacheControl ?? '').split(',')) {
    const [name, value = ''] = part.split('=')
    if (name.trim()) directives.set(name.trim().toLowerCase(), value.trim().replaceAll('"', ''))
  }
  if (directives.has('no-store')) return { store: false, freshFor: 0 }
  if (directives.has('no-cache') || !directives.has('max-age')) return { store: true, freshFor: 0 }
  return { store: true, freshFor: Number(directives.get('max-age')) }
}

// Task 2: Say whether a copy is still fresh
// isFresh(copy, now) gives back true when the copy may be used at the time now without asking the
// server, and false when it is stale.
export function isFresh(copy, now) {
  const { store, freshFor } = keepRules(copy.cacheControl)
  return store && now - copy.storedAt < freshFor * 1000
}

// Task 3: Ask whether a copy has changed
// refresh(address, copy, now) sends one GET for address. When copy has an etag, the request asks
// whether it has changed. It gives back the copy to keep from now on, stored at now: the old body
// when the answer is 304 Not Modified, the new body when it is 200. copy may be null when nothing
// is kept yet. Any other status throws an Error.
export async function refresh(address, copy, now) {
  const headers = copy?.etag ? { 'if-none-match': copy.etag } : {}
  const response = await fetch(address, { headers })
  if (response.status !== 200 && response.status !== 304) {
    throw new Error(`The server answered ${response.status}`)
  }
  return {
    body: response.status === 304 ? copy.body : await response.text(),
    etag: response.headers.get('etag'),
    cacheControl: response.headers.get('cache-control'),
    storedAt: now
  }
}

// Task 4: Show the listings, asking only when needed
// listings(address, copy, now) gives back the copy itself, without sending a request, when it is
// still fresh at now. Otherwise, or when copy is null, it gives back what refresh gives back.
export async function listings(address, copy, now) {
  if (copy !== null && isFresh(copy, now)) return copy
  return refresh(address, copy, now)
}
