import { zoneFee, type Zone } from '../src/delivery.ts'

// @ts-expect-error: 'Local' with a capital is not one of the three zones
zoneFee('Local')
// @ts-expect-error: a zone the courier does not know is refused
const moon: Zone = 'moon'
const typed: string = 'local'
// @ts-expect-error: any text at all is too wide to be a Zone
zoneFee(typed)
