// Task 1: answer GET /report?month=2026-06 with what the water report prints.
// Task 2: answer 400 or 404 with the report's own reason when its exit code says so.
// Task 3: answer 500 when the report cannot be made at all.
// Task 4: keep the month one argument, never part of a command for a shell.
import { createServer } from 'node:http'

function sendText(res, status, text) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(text)
}

const text = process.env.PORT
const port = text === undefined || text.trim() === '' ? 3000 : Number(text)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT should be a whole number from 1 to 65535, not "${text}".`)
  process.exitCode = 1
} else {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== '/report') return sendText(res, 404, `No page at ${url.pathname}.\n`)
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return sendText(res, 405, `Only GET works at ${url.pathname}.\n`)
    }
    // Your code goes here: run the water report for the month asked, and answer with it.
    sendText(res, 501, 'Not written yet.\n')
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
