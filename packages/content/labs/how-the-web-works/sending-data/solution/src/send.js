// Sending data and saying what kind it is. Run node run.js to try your functions against the
// cupboard server.
//
// Task 1: Add a song request
// Task 2: Read where the new request lives
// Task 3: Say whether it was added, and why not
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Add a song request
// addRequest(base, song, from) asks the server at base to add a song request: a POST to the path
// /api/requests whose body is JSON, an object with song and from and nothing else, and whose
// content-type says it is JSON. The server answers with JSON about the new request. addRequest
// gives back the id in that answer.
export async function addRequest(base, song, from) {
  const response = await fetch(new URL('/api/requests', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ song, from })
  })
  const made = await response.json()
  return made.id
}

// Task 2: Read where the new request lives
// requestAddress(base, song, from) sends the same request as addRequest, and gives back the whole
// address of the new song request, built from the location header of the answer.
export async function requestAddress(base, song, from) {
  const response = await fetch(new URL('/api/requests', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ song, from })
  })
  return new URL(response.headers.get('location'), base).href
}

// Task 3: Say whether it was added, and why not
// tryRequest(base, song, from) sends the same request as addRequest. When the answer is 201, it
// gives back { added: true, id } with the id from the answer. When the answer is a client error,
// it gives back { added: false, reason } where reason is the error the server wrote in its JSON.
export async function tryRequest(base, song, from) {
  const response = await fetch(new URL('/api/requests', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ song, from })
  })
  const answer = await response.json()
  if (response.status === 201) return { added: true, id: answer.id }
  return { added: false, reason: answer.error }
}
