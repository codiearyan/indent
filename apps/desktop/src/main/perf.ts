import { app } from 'electron'

const MEMORY_EVERY_MS = 60_000

/** Prints a timing when INDENT_PERF is set. scripts/perf-report.mjs prints the bundle sizes. */
export function perf(label: string, ms: number): void {
  if (process.env.INDENT_PERF) console.log(`[perf] ${label}: ${Math.round(ms)} ms`)
}

/** Memory in use, in MB, by the main process, the pages and all the app's processes together. */
export function memory(): { main: number; pages: number; total: number } {
  const mb = (kb: number): number => Math.round(kb / 1024)
  const metrics = app.getAppMetrics()
  const sum = (type?: string): number =>
    metrics
      .filter((m) => !type || m.type === type)
      .reduce((total, m) => total + m.memory.workingSetSize, 0)
  return { main: mb(sum('Browser')), pages: mb(sum('Tab')), total: mb(sum()) }
}

/** With INDENT_PERF set, prints the memory in use once a minute, to follow a long session. */
export function watchMemory(): void {
  if (!process.env.INDENT_PERF) return
  const started = Date.now()
  setInterval(() => {
    const { main, pages, total } = memory()
    const minutes = Math.round((Date.now() - started) / 60_000)
    console.log(
      `[perf] memory at ${minutes} min: main ${main} MB, pages ${pages} MB, total ${total} MB`
    )
  }, MEMORY_EVERY_MS).unref()
}
