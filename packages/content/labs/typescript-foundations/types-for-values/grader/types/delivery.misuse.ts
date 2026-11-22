import { tinsAfterDelivery } from '../src/order-form.ts'

// @ts-expect-error: the tins after a delivery are a number, so they are not text
const asText: string = tinsAfterDelivery
