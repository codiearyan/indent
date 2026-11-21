// Piped output is written asynchronously on Linux, so a process that exits at once loses what is
// still queued. Both streams are flushed before the exit.
export function exitAfterOutput() {
  process.stdout.write('', () => process.stderr.write('', () => process.exit(0)))
}
