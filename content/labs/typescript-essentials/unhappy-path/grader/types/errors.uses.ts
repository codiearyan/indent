import { describeOrderFailure, errorMessage, PartNotFoundError } from '../src/errors.ts'

const fromError: string = errorMessage(new Error('Disk full'))
const fromText: string = errorMessage('timeout')
const fromNumber: string = errorMessage(42)
const fromNothing: string = errorMessage(undefined)
const notFound: string = describeOrderFailure(new PartNotFoundError('a rim'))
const other: string = describeOrderFailure({ message: 'Rate limited' })
try {
  JSON.parse('{')
} catch (error) {
  const text: string = errorMessage(error)
}
