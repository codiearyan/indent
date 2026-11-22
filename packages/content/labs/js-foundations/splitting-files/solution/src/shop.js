// The shop's site. Run this file with: node src/shop.js
import { catalogue } from './catalogue.js'
import { lowStock } from './stock.js'
import { pageLines } from './page.js'

console.log(pageLines(catalogue))
console.log('Pour next:', lowStock(catalogue))
