// A request has a method, a path and headers. Run node run.js to try your functions against the
// cupboard server.
//
// Task 1: Write the first line of a request
// Task 2: Remove a song request
// Task 3: Say who is asking
// Task 4: Ask for a kind of answer
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Write the first line of a request
// requestLine(method, address) gives back the first line of the request that asks for address
// with method, as text: the method in capital letters, a space, the path with its question mark
// part, a space, and HTTP/1.1. For example 'GET /shows?day=saturday HTTP/1.1'.
export function requestLine(method, address) {
  const url = new URL(address)
  return `${method.toUpperCase()} ${url.pathname}${url.search} HTTP/1.1`
}

// Task 2: Remove a song request
// removeRequest(base, id) asks the server at base to remove song request number id, at the path
// /requests/<id>, with the method that removes. It gives back the text of the answer's body.
export async function removeRequest(base, id) {
  const response = await fetch(new URL(`/requests/${id}`, base), { method: 'DELETE' })
  return await response.text()
}

// Task 3: Say who is asking
// removeAsStudio(base, id, key) sends the same request as removeRequest, with one header more:
// authorization, whose value is the word Bearer, a space and key. It gives back the text of the
// answer's body.
export async function removeAsStudio(base, id, key) {
  const response = await fetch(new URL(`/requests/${id}`, base), {
    method: 'DELETE',
    headers: { authorization: `Bearer ${key}` }
  })
  return await response.text()
}

// Task 4: Ask for a kind of answer
// fetchAs(base, path, type) asks the server at base for the page at path with a GET request whose
// accept header is type, like 'text/html'. It gives back the text of the answer's body.
export async function fetchAs(base, path, type) {
  const response = await fetch(new URL(path, base), { headers: { accept: type } })
  return await response.text()
}
