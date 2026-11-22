import { refLine, todaysRefs } from '../src/delivery.ts'

// @ts-expect-error: true or false is not a ref
refLine(true)
// @ts-expect-error: a list of refs is not one ref
refLine([977])
// @ts-expect-error: a ref line is text, so it is not a number
const asNumber: number = refLine(977)
// @ts-expect-error: the list holds refs, so true or false is refused
todaysRefs.push(false)
