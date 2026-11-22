// The families of statuses. Run node run.js to try your functions against the cupboard server.
//
// Task 1: Name the family of a status
// Task 2: Read a show, or say why not
// Task 3: Ask again when the server is in trouble
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Name the family of a status
// statusFamily(status) gets a status number and gives back the name of its family as text:
// 'information' for 100 to 199, 'success' for 200 to 299, 'redirect' for 300 to 399,
// 'client error' for 400 to 499, 'server error' for 500 to 599, and 'unknown' for anything else.
export function statusFamily(status) {
  const families = ['information', 'success', 'redirect', 'client error', 'server error']
  if (status < 100 || status > 599) {
    return 'unknown'
  }
  return families[Math.floor(status / 100) - 1]
}

// Task 2: Read a show, or say why not
// showText(base, slug) asks the server at base for the page /shows/<slug>. When the answer is in
// the success family, it gives back the text of its body. When it is in the client error family,
// it gives back null. When it is in the server error family, it throws an Error whose message has
// the status number in it.
export async function showText(base, slug) {
  const response = await fetch(new URL(`/shows/${slug}`, base))
  const family = statusFamily(response.status)
  if (family === 'success') {
    return await response.text()
  }
  if (family === 'client error') {
    return null
  }
  throw new Error(`The server answered ${response.status} for ${slug}`)
}

// Task 3: Ask again when the server is in trouble
// fetchWithRetry(address, tries) asks for the page at address. While the answer is in the server
// error family, it asks again, sending at most tries requests in all. Any other answer is final at
// once. It gives back { status, body } of the last answer it got.
export async function fetchWithRetry(address, tries) {
  let response = await fetch(address)
  let sent = 1
  while (statusFamily(response.status) === 'server error' && sent < tries) {
    response = await fetch(address)
    sent += 1
  }
  return { status: response.status, body: await response.text() }
}
