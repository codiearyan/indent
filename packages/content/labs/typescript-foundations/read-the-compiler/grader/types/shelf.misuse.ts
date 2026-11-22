import { tinsOnShelf } from '../src/order-sheet.ts'

// @ts-expect-error: tinsOnShelf is a count, so it is not text
const asText: string = tinsOnShelf
