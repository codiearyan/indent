// Task 1: answer every request with the free plots, on the port in PORT.
// Task 2: say the answer is plain text, and answer 500 when plots.txt cannot be read.
// Task 3: listen on 3000 when PORT is not set, refuse a bad PORT, and say when the port is in use.
// Task 4: on Ctrl+C, stop listening, say so, and end.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function freePlots() {
  const text = await readFile(join(import.meta.dirname, 'plots.txt'), 'utf8')
  const free = text
    .split(/\r?\n/)
    .map((line) => line.trim().split(','))
    .filter(([plot, holder]) => plot !== '' && holder === '')
    .map(([plot]) => plot)
  return free.length === 0 ? 'No plots are free.' : `Free plots: ${free.join(', ')}.`
}

const text = process.env.PORT
const port = text === undefined || text.trim() === '' ? 3000 : Number(text)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT should be a whole number from 1 to 65535, not "${text}".`)
  process.exitCode = 1
} else {
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    try {
      res.statusCode = 200
      res.end(`${await freePlots()}\n`)
    } catch {
      res.statusCode = 500
      res.end('The plot list cannot be read.\n')
    }
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Stop the other server, or set another PORT.`)
    else console.error(`The server could not start: ${error.message}`)
    process.exitCode = 1
  })

  server.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`)
  })

  process.on('SIGINT', () => {
    server.close(() => console.log('Server stopped.'))
  })
}
