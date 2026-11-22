import { refLabel } from '../src/packing.ts'

// A ref of either kind gives a label as text
const old: string = refLabel(51)
const recent: string = refLabel(' ok-2210 ')
