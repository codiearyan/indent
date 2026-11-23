// Task 1: answer /, /plots and /free each in its own way.
// Task 2: answer 404 for an address that is not there, and 405 for a method other than GET.
// Task 3: read the row from the query, as in /free?row=B.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function readPlots() {
  const text = await readFile(join(import.meta.dirname, 'plots.txt'), 'utf8')
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().split(','))
    .filter(([plot]) => plot !== '')
    .map(([plot, holder]) => ({ plot, holder: holder ?? '' }))
}

function freeLine(plots) {
  const free = plots.filter((p) => p.holder === '').map((p) => p.plot)
  return free.length === 0 ? 'No plots are free.' : `Free plots: ${free.join(', ')}.`
}

function freeInRow(plots, row) {
  const free = plots.filter((p) => p.holder === '' && p.plot.startsWith(row)).map((p) => p.plot)
  return free.length === 0 ? `No free plots in row ${row}.` : `Free plots in row ${row}: ${free.join(', ')}.`
}

const text = process.env.PORT
const port = text === undefined || text.trim() === '' ? 3000 : Number(text)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT should be a whole number from 1 to 65535, not "${text}".`)
  process.exitCode = 1
} else {
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    if (path !== '/' && path !== '/plots' && path !== '/free') {
      res.statusCode = 404
      res.end(`No page at ${path}.\n`)
      return
    }
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET')
      res.end(`Only GET works at ${path}.\n`)
      return
    }
    if (path === '/') {
      res.end('Marrowfield Allotment Society. Try /plots or /free.\n')
      return
    }
    try {
      const plots = await readPlots()
      if (path === '/plots') {
        res.end(plots.map((p) => `${p.plot}: ${p.holder || 'free'}\n`).join(''))
      } else {
        const row = (url.searchParams.get('row') ?? '').trim().toUpperCase()
        res.end(`${row === '' ? freeLine(plots) : freeInRow(plots, row)}\n`)
      }
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
