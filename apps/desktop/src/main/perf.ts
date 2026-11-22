/** Prints a timing when INDENT_PERF is set. scripts/perf-report.mjs prints the bundle sizes. */
export function perf(label: string, ms: number): void {
  if (process.env.INDENT_PERF) console.log(`[perf] ${label}: ${Math.round(ms)} ms`)
}
