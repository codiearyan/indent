import { describeOrderFailure, errorMessage } from '../src/errors.ts'

// @ts-expect-error: errorMessage returns a string
const code: number = errorMessage('timeout')
// @ts-expect-error: describeOrderFailure returns a string
const flag: boolean = describeOrderFailure(null)
// @ts-expect-error: errorMessage returns a string, not a list
const list: string[] = errorMessage(new Error('x'))
