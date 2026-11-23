// Prints the sizes of the renderer build, for the before and after of a performance change.
// Run `pnpm build` first. Startup and Check timings, and the memory in use once a minute, come
// from INDENT_PERF=1 (apps/desktop/src/main/perf.ts).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL('../apps/desktop/out/renderer/', import.meta.url))
const html = readFileSync(join(out, 'index.html'), 'utf8')
const entry = /<script[^>]+src="\.?\/?(assets\/[^"]+\.js)"/.exec(html)?.[1]
if (!entry) throw new Error('No entry script in out/renderer/index.html. Run pnpm build first.')

const assets = readdirSync(join(out, 'assets')).map((name) => ({
  name,
  size: statSync(join(out, 'assets', name)).size
}))
const total = (test) =>
  assets.filter(({ name }) => test(name)).reduce((sum, { size }) => sum + size, 0)
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`.padStart(10)

console.log(`${kb(statSync(join(out, entry)).size)}  entry (${entry})`)
console.log(`${kb(total((name) => name.endsWith('.js')))}  all JavaScript`)
console.log(`${kb(total((name) => name.endsWith('.css')))}  all CSS`)
console.log(`${kb(total(() => true))}  all assets`)
console.log('\nLargest files')
for (const { name, size } of assets.sort((a, b) => b.size - a.size).slice(0, 8)) {
  console.log(`${kb(size)}  ${name}`)
}
