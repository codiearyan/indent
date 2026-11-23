// orders: Ashgrove's own tool for its order files. For now it only shows what it made of the
// words you typed. Try: node orders.js list --paper linen orders/press-1.txt
import { readArgs } from './src/args.js'
import { FLAGS } from './src/flags.js'

try {
  console.log(JSON.stringify(readArgs(process.argv.slice(2), FLAGS), null, 2))
} catch (error) {
  console.log(`orders: ${error.message}`)
}
