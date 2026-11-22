import { zoneFee, type Zone } from '../src/delivery.ts'

// Each of the three zones is a Zone, and has a fee
const near: Zone = 'local'
const far: Zone = 'national'
const abroad: Zone = 'europe'
const fee: number = zoneFee('europe')
