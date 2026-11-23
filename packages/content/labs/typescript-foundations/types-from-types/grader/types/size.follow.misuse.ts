import { type Size } from '../src/catalogue.ts'

// @ts-expect-error: Size is still only the sizes a tin can have, and 300 is not one
const odd: Size = 300
