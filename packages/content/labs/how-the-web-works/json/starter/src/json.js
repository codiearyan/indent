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
  throw new Error('Not implemented')
}

// Task 2: Read every show from the server
// showNames(base) asks the server at base for the page /api/shows, whose body is a JSON list of
// shows. It gives back a list of the names of those shows, in the order the server sent them.
export async function showNames(base) {
  throw new Error('Not implemented')
}

// Task 3: Read JSON only when the answer says it is JSON
// readJson(address) asks for the page at address. When the type in the answer's content-type, the
// part before any ;, is application/json in small or capital letters, it gives back the value
// read from the body. For any other type, or no content-type, it gives back null without reading
// the body as JSON. When an answer says it is JSON but its body is not, the error from reading it
// comes out of readJson.
export async function readJson(address) {
  throw new Error('Not implemented')
}
