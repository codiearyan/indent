// Writes water/year.txt: a year of the logger's readings, one line a minute for each tap, about
// 26 MB. The readings are made up, but the same every time. Run it once: node make-year.js
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

let seed = 2026
const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
const pad = (n) => String(n).padStart(2, '0')

const days = []
for (let day = new Date(Date.UTC(2026, 0, 1)); day.getUTCFullYear() === 2026; day.setUTCDate(day.getUTCDate() + 1)) {
  const date = day.toISOString().slice(0, 10)
  const lines = []
  if (date === '2026-03-02') lines.push(`# restarted ${date}T04:11 after a power cut`)
  for (let minute = 0; minute < 24 * 60; minute++) {
    const time = `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`
    const daytime = minute >= 6 * 60 && minute < 20 * 60
    for (const tap of ['north', 'south']) {
      const litres = daytime && random() < 0.08 ? 1 + Math.floor(random() * 12) : 0
      lines.push(`${time},${tap},${litres}`)
    }
  }
  days.push(lines.join('\n') + '\n')
}

const file = join(import.meta.dirname, 'water', 'year.txt')
await writeFile(file, days.join(''))
console.log(`Wrote ${file}, a year of readings.`)
