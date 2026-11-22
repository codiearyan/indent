// The shop's orders, kept in memory while the server runs. Prices are in pence.
export const PRICES = { card: 30, invite: 85, poster: 400 }

const ORDERS = [
  { id: '1873', item: 'invite', quantity: 120, status: 'printing', due: '2026-11-24' },
  { id: '1874', item: 'card', quantity: 250, status: 'waiting', due: '2026-11-27' },
  { id: '1875', item: 'poster', quantity: 40, status: 'ready', due: '2026-11-24' },
  { id: '1876', item: 'card', quantity: 100, status: 'waiting', due: '2026-11-30' }
]

const STATUSES = ['waiting', 'printing', 'ready', 'collected']

/** An error the shop can explain to whoever asked; `status` is the answer's status code. */
export class ShopError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ShopError'
    this.status = status
  }
}

export function createShop({ today = '2026-11-24', orders = ORDERS } = {}) {
  const list = orders.map((order) => ({ ...order }))
  let lastId = Math.max(0, ...list.map((order) => Number(order.id)))

  return {
    prices: () => ({ ...PRICES }),
    list: ({ status, item } = {}) =>
      list.filter((o) => (status === undefined || o.status === status) && (item === undefined || o.item === item)),
    today: () => list.filter((order) => order.due === today),
    find: (id) => list.find((order) => order.id === id),
    queue: () => list.filter((order) => order.status === 'waiting' || order.status === 'printing'),

    add(input) {
      const { item, quantity, due } = input ?? {}
      if (!Object.hasOwn(PRICES, item)) throw new ShopError(400, `We do not print ${item}.`)
      if (!Number.isInteger(quantity) || quantity < 1) throw new ShopError(400, 'The quantity is a whole number from 1.')
      if (typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new ShopError(400, 'The due date looks like 2026-12-01.')
      lastId += 1
      const order = { id: String(lastId), item, quantity, status: 'waiting', due }
      list.push(order)
      return order
    },

    setStatus(id, status) {
      const order = list.find((o) => o.id === id)
      if (!order) throw new ShopError(404, `There is no order ${id}.`)
      if (!STATUSES.includes(status)) throw new ShopError(400, `An order can be ${STATUSES.join(', ')}.`)
      order.status = status
      return order
    }
  }
}
