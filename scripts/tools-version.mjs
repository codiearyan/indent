// Prints the version of the repo tools; their release is tools-js-<version>.
// The app computes the same in apps/desktop/src/main/repoTools.ts (toolsVersion).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const lock = readFileSync(
  new URL('../packages/content/runtime/package-lock.json', import.meta.url),
  'utf8'
)
console.log(createHash('sha256').update(lock.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12))
