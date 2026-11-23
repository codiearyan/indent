// Being sent somewhere else. Run node run.js to try your functions against the cupboard server.
//
// Task 1: Say what kind of redirect a status is
// Task 2: See where an address leads, without going there
// Task 3: Follow an address step by step
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Say what kind of redirect a status is
// redirectKind(status) gets a status number. For the five redirects, 301, 302, 303, 307 and 308,
// it gives back { permanent, keepsPost }: permanent is true when the move is for good, and
// keepsPost is true when a POST arrives at the new address still a POST, with its body. For any
// other status it gives back null.
export function redirectKind(status) {
  throw new Error('Not implemented')
}

// Task 2: See where an address leads, without going there
// whereTo(address) sends one request for address and does not follow a redirect. When the answer
// is a redirect, a status from 300 to 399 with a location header, it gives back the whole address
// that location points to, as text. Otherwise it gives back null.
export async function whereTo(address) {
  throw new Error('Not implemented')
}

// Task 3: Follow an address step by step
// trail(address, most) follows the redirects from address one at a time, and gives back the list
// of every whole address it asked for, in order: address first, and last the one whose answer is
// not a redirect. When the answer is still a redirect after most redirects, it throws an Error
// instead, without asking any further.
export async function trail(address, most) {
  throw new Error('Not implemented')
}
