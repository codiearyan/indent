import { tinLabel } from '../src/pricing.ts'

// A blend and the grams give a label
const label: string = tinLabel('Smoky Lapsang', 50)
// A blend alone gives a label for the usual size
const usual: string = tinLabel('Morning Keemun')
