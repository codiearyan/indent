// Copied into the sandbox as .grader/closed-pipe.mjs and loaded before the tool with --import, in
// the runs where Check closes its end of standard output. Node hands a child its standard output as
// a socket on some systems, and a socket closed by its reader can answer ENOTCONN where a real
// pipe, as after | head, always answers EPIPE. This makes it answer as the real pipe does.
const emit = process.stdout.emit
process.stdout.emit = function (event, error, ...rest) {
  if (event === 'error' && error?.code === 'ENOTCONN') {
    error.code = 'EPIPE'
    error.message = error.message.replace('ENOTCONN', 'EPIPE')
  }
  return emit.call(this, event, error, ...rest)
}
