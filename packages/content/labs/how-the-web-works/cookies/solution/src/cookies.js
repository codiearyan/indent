// Cookies, and what they cannot prove. Run node run.js to try your functions against the cupboard
// server.
//
// Task 1: Sign in and bring the cookies back
// Task 2: Choose the cookies a request carries
// Task 3: Write the cookie that keeps a presenter signed in
// Task 4: Find who is signed in, from the session only
//
// Times are numbers of milliseconds, the kind Date.now() gives back.
//
// Each function throws 'Not implemented' until you write it. Keep the word export in front of
// each one: it lets run.js and Check use them.

// Task 1: Sign in and bring the cookies back
// playlistAs(base, presenter, key) signs in at base with a POST to /studio/sign-in, whose body is
// JSON with presenter and key. When the sign-in is refused, it throws an Error. Otherwise it asks
// for /studio/playlist with every cookie the sign-in set, and gives back the body of that answer.
export async function playlistAs(base, presenter, key) {
  const signIn = await fetch(new URL('/studio/sign-in', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ presenter, key })
  })
  if (!signIn.ok) throw new Error(`The sign-in was refused with ${signIn.status}`)
  const pairs = signIn.headers.getSetCookie().map((line) => line.split(';')[0].trim())
  const playlist = await fetch(new URL('/studio/playlist', base), {
    headers: { cookie: pairs.join('; ') }
  })
  return playlist.text()
}

// Task 2: Choose the cookies a request carries
// cookieHeader(jar, address, now) gets the cookies a browser keeps, each one
// { name, value, domain, hostOnly, path, secure, httpOnly, expires }, and gives back the text of
// the cookie header a request for address carries at the time now: name=value for every cookie
// that goes with it, separated by a semicolon and a space, or '' when none does.
export function cookieHeader(jar, address, now) {
  const url = new URL(address)
  const host = url.hostname
  const path = url.pathname
  const goes = jar.filter((c) => {
    const hostMatches = c.hostOnly
      ? host === c.domain
      : host === c.domain || host.endsWith(`.${c.domain}`)
    const pathMatches =
      path === c.path ||
      (path.startsWith(c.path) && (c.path.endsWith('/') || path[c.path.length] === '/'))
    const secureMatches = !c.secure || url.protocol === 'https:'
    const alive = c.expires === null || c.expires > now
    return hostMatches && pathMatches && secureMatches && alive
  })
  return goes.map((c) => `${c.name}=${c.value}`).join('; ')
}

// Task 3: Write the cookie that keeps a presenter signed in
// sessionCookie(id, path, seconds) gives back the text of the set-cookie header the cupboard
// server sends after a sign-in: a cookie called session whose value is id, sent only to this
// host, only for addresses under path, for seconds seconds, only over https, and never shown to a
// page's scripts or sent with requests that other sites start.
export function sessionCookie(id, path, seconds) {
  return `session=${id}; Path=${path}; Max-Age=${seconds}; Secure; HttpOnly; SameSite=Lax`
}

// Task 4: Find who is signed in, from the session only
// whoIsThis(cookie, sessions, now) gets the text of a request's cookie header (null when the
// request had none) and the sessions the server keeps, an object from session id to
// { presenter, expires }. It gives back the presenter of the request's session at the time now,
// or null when there is no such session or it has expired.
export function whoIsThis(cookie, sessions, now) {
  for (const part of (cookie ?? '').split(';')) {
    const at = part.indexOf('=')
    if (part.slice(0, at).trim() !== 'session') continue
    const session = sessions[part.slice(at + 1).trim()]
    if (session && session.expires > now) return session.presenter
  }
  return null
}
