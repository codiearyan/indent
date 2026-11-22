// The code that talks to the studio's API. It moved here from App.jsx so the booking form can use
// it too.
const UNREACHABLE = 'The studio could not be reached. Check the connection and try again.'

// Sends a request to the API and resolves with the JSON of the answer. When no answer comes, or
// the answer has an error status, it rejects with an Error whose message a visitor can read: the
// server's own message when it sent one. `options` are the same as fetch's.
export async function request(path, options) {
  let response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error(UNREACHABLE)
  }
  if (!response.ok) {
    // Not every error answer is the API's JSON: something in between may answer with a web page.
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error?.message ??
        `The studio's server had a problem (status ${response.status}). Try again in a minute.`
    )
  }
  return response.json()
}

export function getWorkshops() {
  return request('/api/workshops')
}
