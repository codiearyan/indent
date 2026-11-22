// Run with: node src/demo.js
import { PROOFS_DIR } from './folders.js'
import { readProof } from './proofs.js'
import { reproduceProofEscape } from './reproduce.js'

console.log('The proofs folder:', PROOFS_DIR)
for (const name of ['2041/front.txt', '2042/menu.txt', '2041/missing.txt']) {
  console.log(`\nDownload ${name}:`)
  console.log(readProof(PROOFS_DIR, name))
}

console.log('\nreproduceProofEscape():')
try {
  console.log(reproduceProofEscape())
} catch (err) {
  console.log(`Error: ${err.message}`)
}
