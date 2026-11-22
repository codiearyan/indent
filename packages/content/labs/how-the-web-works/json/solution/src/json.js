// JSON going out and coming back. Run node run.js to try your functions against the cupboard
// server.
//
// Task 1: Read one show from JSON
// Task 2: Read every show from the server
// Task 3: Read JSON only when the answer says it is JSON
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Read one show from JSON
// showLine(text) gets the JSON text of one show: an object with name, day, time and presenter,
// and sometimes more. It gives back one line about the show, like
// 'Brass on Sunday, sunday at 11:00, with Gethin'.
export function showLine(text) {
  const show = JSON.parse(text)
  return `${show.name}, ${show.day} at ${show.time}, with ${show.presenter}`
}

// Task 2: Read every show from the server
// showNames(base) asks the server at base for the page /api/shows, whose body is a JSON list of
// shows. It gives back a list of the names of those shows, in the order the server sent them.
export async function showNames(base) {
  const response = await fetch(new URL('/api/shows', base))
  const shows = await response.json()
  return shows.map((show) => show.name)
}

// Task 3: Read JSON only when the answer says it is JSON
// readJson(address) asks for the page at address. When the answer's content-type says the body
// is JSON, with or without a charset after it, it gives back the value read from the body. For
// any other content-type, or none, it gives back null without reading the body as JSON. When an
// answer says it is JSON but its body is not, the error from reading it comes out of readJson.
export async function readJson(address) {
  const response = await fetch(address)
  const type = response.headers.get('content-type') ?? ''
  if (!type.startsWith('application/json')) return null
  return await response.json()
}
