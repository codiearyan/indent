import { tinsFrom } from '../src/cafe.ts'

// @ts-expect-error: the tins are a number, so they are not text
const asText: string = tinsFrom('5')
