import { createQueue, type Queue } from '../src/queue.ts'

const numbers = createQueue([1, 2])
// @ts-expect-error: a queue made from numbers takes only numbers
numbers.add('3')
// @ts-expect-error: next returns undefined when the queue is empty
const sure: number = numbers.next()
// @ts-expect-error: a queue of numbers is not a queue of strings
const words: Queue<string> = numbers
// @ts-expect-error: size is a number
const label: string = numbers.size()
