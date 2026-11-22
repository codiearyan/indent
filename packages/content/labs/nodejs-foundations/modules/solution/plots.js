// Task 1: export readPlots(file), which reads a plot list and gives back one object per plot.
import { readFile } from 'node:fs/promises'

export async function readPlots(file) {
  const text = await readFile(file, 'utf8')
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [plot, holder] = line.split(',')
      return { plot, holder: holder === '' ? null : holder }
    })
}
