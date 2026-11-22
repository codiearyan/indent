// How the stand-in API behaves in the Browser panel. Change a value and save: the page reloads and
// the stand-in starts again from this week's workshops.
export const settings = {
  // How long every answer takes, in milliseconds.
  delayMs: 600,
  // true: every answer takes a different time, from a tenth of a second to two seconds, so answers
  // can arrive in a different order than the requests were sent.
  randomDelay: false,
  // 'none': every request works. 'first': only the first request fails, the rest work.
  // 'always': every request fails.
  failure: 'none',
  // How a request fails. 'server': the server answers with status 503 and a message.
  // 'network': no answer comes at all, as when the studio's internet is down.
  failAs: 'server',
  // true: people at the front desk book places too, so places left can drop between two requests.
  busy: false
}
