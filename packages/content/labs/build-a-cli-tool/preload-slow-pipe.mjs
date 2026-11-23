// Copied into the sandbox as .grader/slow-pipe.mjs and loaded before the tool with --import. It
// stands in for a pipe that takes a moment: everything written to standard output or standard
// error is handed over on a later turn of the event loop, one piece at a time, on every system.
// A tool that stops with process.exit() right after printing loses what was not handed over yet,
// as it does on a real pipe; a tool that ends by itself, or exits once its last write is done,
// loses nothing.
for (const stream of [process.stdout, process.stderr]) {
  const write = stream.write.bind(stream)
  const waiting = []
  let busy = false
  const next = () => {
    const piece = waiting.shift()
    if (!piece) {
      busy = false
      return
    }
    const [chunk, encoding, done] = piece
    write(chunk, encoding, (error) => {
      done?.(error)
      setImmediate(next)
    })
  }
  stream.write = (chunk, encoding, done) => {
    if (typeof encoding === 'function') [done, encoding] = [encoding, undefined]
    waiting.push([chunk, encoding, done])
    if (!busy) {
      busy = true
      setImmediate(next)
    }
    return true
  }
}
