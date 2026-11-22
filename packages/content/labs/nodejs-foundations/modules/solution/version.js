// Task 3: print the name and the version of the tools, from package.json.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const pkg = JSON.parse(await readFile(join(import.meta.dirname, 'package.json'), 'utf8'))
console.log(`${pkg.name} ${pkg.version}`)
