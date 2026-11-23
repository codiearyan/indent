// Run with: node src/demo.js
import { catalogueOrder } from './catalogue.js'
import { catalogue } from './arrangements.js'

console.log('The catalogue page:')
catalogueOrder(catalogue).forEach((title, i) => console.log(`  ${String(i + 1).padStart(2)}. ${title}`))
