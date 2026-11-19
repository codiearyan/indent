import { chunk, lastItem } from '../src/lists.ts'

// @ts-expect-error: the last item of a list of strings is not a number
const wrong: number | undefined = lastItem(['a'])
// @ts-expect-error: lastItem finds nothing in an empty list, so its result can be undefined
const sure: string = lastItem(['a'])
// @ts-expect-error: chunk keeps the item type, so numbers stay numbers
const wrongChunks: string[][] = chunk([1, 2], 1)
// @ts-expect-error: the size is a number
chunk([1], '2')
// @ts-expect-error: lastItem takes a list
lastItem('abc')
