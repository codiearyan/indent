// Run with: node src/demo.js
import { fitName, nameLength, sameName } from './names.js'
import { LABEL_WIDTH, choirs, onFile, pasted } from './contacts.js'

console.log(`Labels, at most ${LABEL_WIDTH} characters:`)
for (const name of choirs) {
  console.log(`  [${fitName(name, LABEL_WIDTH)}]  (${nameLength(name)} characters)`)
}
console.log()
console.log(`Is "${pasted}" the same name as "${onFile}"? ${sameName(pasted, onFile)}`)
