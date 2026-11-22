// The question mark part. Run node run.js to try your functions against the cupboard server.
//
// Task 1: Read a value from the question mark part
// Task 2: Build a search address
// Task 3: Search the cupboard server
// Task 4: Ask for the next page
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Read a value from the question mark part
// queryValue(address, name) gives back the value called name in the question mark part of address,
// as the server would read it: 'Mabli & the Moths', not 'Mabli+%26+the+Moths'. When the address
// has no value with that name, it gives back null.
export function queryValue(address, name) {
  throw new Error('Not implemented')
}

// Task 2: Build a search address
// searchAddress(base, artist, title) gives back, as text, the address of /songs/search on the
// server at base, with artist and title in the question mark part. They must reach the server
// exactly as they were typed, whatever characters they have. When title is not given, the
// address has no title in it at all.
export function searchAddress(base, artist, title) {
  throw new Error('Not implemented')
}

// Task 3: Search the cupboard server
// searchSongs(base, artist, title) sends a request for that search to the server at base, waits
// for the answer, and gives back the text of its body. title may be left out here too.
export async function searchSongs(base, artist, title) {
  throw new Error('Not implemented')
}

// Task 4: Ask for the next page
// The server shows two songs at a time. nextPage(address) gives back, as text, the same address
// with page one higher. An address with no page is on page 1, so its next page is 2. Every other
// value in the question mark part stays as it was.
export function nextPage(address) {
  throw new Error('Not implemented')
}
