// Pages from more than one place. Run node run.js to try your functions against the cupboard
// server.
//
// Task 1: Say whether two addresses share an origin
// Task 2: Read an answer the way a page in a browser may
// Task 3: Let the trusted pages read an answer
// Task 4: Say whether a request needs asking first
// Task 5: Answer the request that asks first
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Say whether two addresses share an origin
// sameOrigin(a, b) gives back true when the addresses a and b have the same origin, and false
// otherwise.
export function sameOrigin(a, b) {
  return new URL(a).origin === new URL(b).origin
}

// Task 2: Read an answer the way a page in a browser may
// readAsPage(page, address, withCookies) asks for address the way a script in the page at the
// address page would, and gives back the body of the answer when a browser would let that script
// read it. When it would not, it throws an Error. withCookies is true when the script asks for
// the request to carry the person's cookies.
export async function readAsPage(page, address, withCookies) {
  if (sameOrigin(page, address)) return (await fetch(address)).text()
  const origin = new URL(page).origin
  const response = await fetch(address, { headers: { origin } })
  const allowed = response.headers.get('access-control-allow-origin')
  const credentials = response.headers.get('access-control-allow-credentials')
  const mayRead = withCookies
    ? allowed === origin && credentials === 'true'
    : allowed === '*' || allowed === origin
  if (!mayRead) throw new Error(`A browser would not let a page on ${origin} read this answer`)
  return response.text()
}

// Task 3: Let the trusted pages read an answer
// allowOrigin(origin, allowed) gets the origin header of a request (null when it had none) and
// the list of origins the cupboard server trusts. It gives back an object of the headers to add
// to the answer: the header that lets the page read it, only for an origin in the list, and
// always a vary header that says the answer depends on the origin.
export function allowOrigin(origin, allowed) {
  if (!allowed.includes(origin)) return { vary: 'Origin' }
  return { 'access-control-allow-origin': origin, vary: 'Origin' }
}

// Task 4: Say whether a request needs asking first
// needsPreflight(method, headers) gets the method of a request a page's script wants to send to
// another origin, and an object of the headers it sets. It gives back true when a browser would
// ask the server first, and false when it would send the request straight away.
export function needsPreflight(method, headers) {
  if (!['GET', 'HEAD', 'POST'].includes(method)) return true
  const formTypes = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain']
  return Object.entries(headers).some(([name, value]) => {
    const lower = name.toLowerCase()
    if (['accept', 'accept-language', 'content-language'].includes(lower)) return false
    if (lower === 'content-type')
      return !formTypes.includes(value.split(';')[0].trim().toLowerCase())
    return true
  })
}

// Task 5: Answer the request that asks first
// answerPreflight(request, rules) gets an OPTIONS request, { method, path, headers }, with its
// header names in small letters, and the cupboard server's rules, { origins, methods, headers }.
// When the origin, the method and every header it asks about are allowed, it gives back
// { status: 204, headers } with the headers that allow them. Otherwise { status: 403, headers }
// with no access-control-allow- header.
export function answerPreflight(request, rules) {
  const origin = request.headers.origin ?? null
  const method = request.headers['access-control-request-method']
  const asked = (request.headers['access-control-request-headers'] ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
  const known = rules.headers.map((name) => name.toLowerCase())
  const allowed =
    rules.origins.includes(origin) &&
    rules.methods.includes(method) &&
    asked.every((name) => known.includes(name))
  if (!allowed) return { status: 403, headers: { vary: 'Origin' } }
  return {
    status: 204,
    headers: {
      ...allowOrigin(origin, rules.origins),
      'access-control-allow-methods': rules.methods.join(', '),
      'access-control-allow-headers': rules.headers.join(', ')
    }
  }
}
