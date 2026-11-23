import { labelAll } from '../src/offers.ts'

// @ts-expect-error: a function that gives back a number is not a way to write a label
labelAll(['Smoky Lapsang'], (blend) => blend.length)
// @ts-expect-error: a function that takes a number does not fit a blend
labelAll(['Smoky Lapsang'], (grams: number) => `${grams} g`)
// @ts-expect-error: text is not a function
labelAll(['Smoky Lapsang'], 'upper')
