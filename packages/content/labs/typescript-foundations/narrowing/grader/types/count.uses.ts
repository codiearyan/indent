import { lineCount } from '../src/packing.ts'

// A tin line and a sampler line both give a count
const tins: number = lineCount({ blend: 'Frost Sencha', tins: 5 })
const box: number = lineCount({ samples: ['Ember Oolong', 'Hearth Assam'] })
