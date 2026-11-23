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
  throw new Error('Not implemented')
}

// Task 2: Read an answer the way a page in a browser may
// readAsPage(page, address, withCookies) asks for address the way a script in the page at the
// address page would, and gives back the body of the answer when a browser would let that script
// read it. When it would not, it throws an Error. withCookies is true when the script asks for
// the request to carry the person's cookies.
export async function readAsPage(page, address, withCookies) {
  throw new Error('Not implemented')
}

// Task 3: Let the trusted pages read an answer
// allowOrigin(origin, allowed) gets the origin header of a request (null when it had none) and
// the list of origins the cupboard server trusts. It gives back an object of the headers to add
// to the answer: the header that lets the page read it, only for an origin in the list, and
// always a vary header that says the answer depends on the origin.
export function allowOrigin(origin, allowed) {
  throw new Error('Not implemented')
}

// Task 4: Say whether a request needs asking first
// needsPreflight(method, headers) gets the method of a request a page's script wants to send to
// another origin, and an object of the headers it sets. It gives back true when a browser would
// ask the server first, and false when it would send the request straight away.
export function needsPreflight(method, headers) {
  throw new Error('Not implemented')
}

// Task 5: Answer the request that asks first
// answerPreflight(request, rules) gets an OPTIONS request, { method, path, headers }, with its
// header names in small letters, and the cupboard server's rules, { origins, methods, headers }.
// When the origin, the method and every header it asks about are allowed, it gives back
// { status: 204, headers } with the headers that allow them. Otherwise { status: 403, headers }
// with no access-control-allow- header.
export function answerPreflight(request, rules) {
  throw new Error('Not implemented')
}
