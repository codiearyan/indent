import { firstOrder } from '../src/orders.ts'

// @ts-expect-error: the id of an order can never change
firstOrder.id = 'OK-9999'
// @ts-expect-error: tins are a number, so text is refused
firstOrder.tins = '5'
