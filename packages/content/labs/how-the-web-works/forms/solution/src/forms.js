// Sending a form. Run node run.js to try your functions against the cupboard server.
//
// Task 1: Write a form body
// Task 2: Send the request form
// Task 3: Send a jingle entry with its file
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Write a form body
// formBody(fields) gets an object of names and values, like { song: 'Weather for Ducks' }, and
// gives back the text of the body a form sends for them, with every value arriving as typed.
export function formBody(fields) {
  return new URLSearchParams(fields).toString()
}

// Task 2: Send the request form
// sendRequestForm(base, fields) sends fields to the server at base the way the website's request
// form does: a POST to /forms/request whose body is a form body, with the content-type of a form
// body. It gives back the text of the answer's body.
export async function sendRequestForm(base, fields) {
  const response = await fetch(new URL('/forms/request', base), {
    method: 'POST',
    body: new URLSearchParams(fields)
  })
  return await response.text()
}

// Task 3: Send a jingle entry with its file
// enterJingle(base, entrant, fileName, script) sends a jingle entry to the server at base the way
// the website's jingle form does: a POST to /forms/jingle whose body is multipart/form-data with
// two parts. The part named entrant holds the entrant's name. The part named script is a file
// called fileName whose contents are script. It gives back the text of the answer's body.
export async function enterJingle(base, entrant, fileName, script) {
  const form = new FormData()
  form.append('entrant', entrant)
  form.append('script', new Blob([script], { type: 'text/plain' }), fileName)
  const response = await fetch(new URL('/forms/jingle', base), { method: 'POST', body: form })
  return await response.text()
}
