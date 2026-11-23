// Task 1: read the whole body of POST /readings, keep the reading, and answer with it as JSON.
// Task 2: answer GET /readings with the litres of each tap as JSON.
// Task 3: refuse a body that is not JSON, or not a reading, with 400.
// Task 4: refuse a body of more than 1024 bytes with 413.
import { createServer } from 'node:http'

const text = process.env.PORT
const port = text === undefined || text.trim() === '' ? 3000 : Number(text)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT should be a whole number from 1 to 65535, not "${text}".`)
  process.exitCode = 1
} else {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== '/readings') {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(`No page at ${url.pathname}.\n`)
      return
    }
    if (req.method === 'POST' || req.method === 'GET') {
      // Your code goes here: POST keeps a reading, GET answers the totals.
      res.statusCode = 501
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Not written yet.\n')
      return
    }
    res.statusCode = 405
    res.setHeader('Allow', 'GET, POST')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(`Only GET and POST work at ${url.pathname}.\n`)
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
