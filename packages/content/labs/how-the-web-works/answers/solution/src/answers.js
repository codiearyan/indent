// An answer has a status, headers and a body. Run node run.js to try your functions against the
// cupboard server.
//
// Task 1: Read the status line
// Task 2: Read a header
// Task 3: Read the whole answer once
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Read the status line
// statusLine(address) asks for the page at address and gives back the status of the answer as
// text: its number, a space, and the reason the server wrote beside it, like '404 Not Found'.
export async function statusLine(address) {
  const response = await fetch(address)
  return `${response.status} ${response.statusText}`
}

// Task 2: Read a header
// contentType(address) asks for the page at address and gives back the value of the answer's
// content-type header, like 'text/plain; charset=utf-8', or null when the answer has none.
export async function contentType(address) {
  const response = await fetch(address)
  return response.headers.get('content-type')
}

// Task 3: Read the whole answer once
// readAnswer(address) sends one request for the page at address and gives back an object with
// four properties, all read from that one answer:
// ok (true when the status is from 200 to 299), status (a number), type (the content-type
// header, or null) and body (the text of the body).
export async function readAnswer(address) {
  const response = await fetch(address)
  return {
    ok: response.ok,
    status: response.status,
    type: response.headers.get('content-type'),
    body: await response.text()
  }
}
