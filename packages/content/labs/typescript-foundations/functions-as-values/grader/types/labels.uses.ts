import { labelAll } from '../src/offers.ts'

// A function from a blend to its label may be passed, its parameter typed or not
const shouted: string[] = labelAll(['Smoky Lapsang'], (blend) => blend.toUpperCase())
const sampled: string[] = labelAll(['Smoky Lapsang'], (blend: string) => `${blend} (sample)`)
