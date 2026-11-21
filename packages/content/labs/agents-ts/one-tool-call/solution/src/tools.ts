import { orders, type Order } from './data.ts'

export function getOrder(orderId: string): Order | { error: string } {
  return orders.find((o) => o.orderId === orderId) ?? { error: `No order with id ${orderId}` }
}
