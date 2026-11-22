// What an address is made of. Run node run.js to try your functions against the cupboard server.
//
// Task 1: Take an address apart
// Task 2: Put an address together
// Task 3: Ask for a page and read it
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Take an address apart
// addressParts(address) gets a whole address as text, like
// 'https://listen.heronsgate.example/shows/dawn-chorus', and gives back an object with four parts:
// scheme (without the colon), host (the name only), port (a number, even when the address does
// not write one) and path.
export function addressParts(address) {
  throw new Error('Not implemented')
}

// Task 2: Put an address together
// pageAddress(base, path) gets the address of a server, like 'http://localhost:5133', and the path
// of one page on it, like '/shows'. It gives back the whole address of that page as text, with
// exactly one slash between the host and the path.
export function pageAddress(base, path) {
  throw new Error('Not implemented')
}

// Task 3: Ask for a page and read it
// fetchText(address) sends a request for the page at address, waits for the answer, and gives
// back the text of the answer's body.
export async function fetchText(address) {
  throw new Error('Not implemented')
}
