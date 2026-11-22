import { blendName, caffeineFree, gramsInTin } from '../src/order-form.ts'

// @ts-expect-error: the blend name is text, so it is not a number
const asNumber: number = blendName
// @ts-expect-error: the grams in a tin are a number, so they are not text
const asText: string = gramsInTin
// @ts-expect-error: caffeine free is true or false, so it is not text
const asWord: string = caffeineFree
