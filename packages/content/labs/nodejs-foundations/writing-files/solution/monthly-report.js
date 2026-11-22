// Task 3: write the report for the month typed after the script's name into the reports folder.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const month = process.argv[2]

async function linesOf(name) {
  const text = await readFile(join(import.meta.dirname, name), 'utf8')
  return text.split(/\r?\n/).filter((line) => line.trim() !== '')
}

if (month === undefined) {
  console.error('Type the month after the script name, like: node monthly-report.js 2026-06')
  process.exitCode = 1
} else {
  const plots = await linesOf('plots.txt')
  const waiting = await linesOf('waiting-list.txt')
  const free = plots.filter((line) => line.split(',')[1].trim() === '')

  const folder = join(import.meta.dirname, 'reports')
  await mkdir(folder, { recursive: true })
  const report = join(folder, `${month}.txt`)
  await writeFile(report, `Plots: ${plots.length}\nFree: ${free.length}\nWaiting: ${waiting.length}\n`)
  console.log(`Wrote ${report}`)
}
