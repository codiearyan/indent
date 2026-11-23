// Copied into the sandbox as .grader/tty.mjs and loaded before the tool with --import. A check
// cannot give the tool a real terminal, so this makes standard output answer as one would: isTTY
// is true and it can say whether it has colours, from the environment like a terminal does.
import tty from 'node:tty'

const out = process.stdout
out.isTTY = true
out.columns = 80
out.getColorDepth = tty.WriteStream.prototype.getColorDepth
out.hasColors = tty.WriteStream.prototype.hasColors
