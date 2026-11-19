// Pebble Lane Pantry, this morning. Everything lives in memory, so every run starts from here.

export interface OrderItem {
  sku: string
  qty: number
}

export interface Order {
  orderId: string
  customer: string
  status: 'packing' | 'out_for_delivery' | 'delivered'
  eta: string | null
  total: number
  items: OrderItem[]
}

export interface Product {
  sku: string
  name: string
  stock: number
}

export const orders: Order[] = [
  {
    orderId: 'PL-2041',
    customer: 'Ana Ruiz',
    status: 'out_for_delivery',
    eta: '14:30',
    total: 11.4,
    items: [
      { sku: 'OAT-1L', qty: 2 },
      { sku: 'RYE-800', qty: 1 }
    ]
  },
  {
    orderId: 'PL-2042',
    customer: 'Ben Cole',
    status: 'packing',
    eta: '17:00',
    total: 16.9,
    items: [
      { sku: 'EGG-12', qty: 1 },
      { sku: 'HNY-250', qty: 2 }
    ]
  },
  {
    orderId: 'PL-2043',
    customer: 'Chloe Park',
    status: 'delivered',
    eta: null,
    total: 7.2,
    items: [{ sku: 'EGG-12', qty: 2 }]
  },
  {
    orderId: 'PL-2047',
    customer: 'Dev Shah',
    status: 'packing',
    eta: '18:30',
    total: 5.6,
    items: [{ sku: 'OAT-1L', qty: 1 }]
  }
]

export const products: Product[] = [
  { sku: 'OAT-1L', name: 'Oat milk 1 L', stock: 14 },
  { sku: 'RYE-800', name: 'Rye loaf 800 g', stock: 0 },
  { sku: 'EGG-12', name: 'Eggs (box of 12)', stock: 6 },
  { sku: 'HNY-250', name: 'Wildflower honey 250 g', stock: 12 }
]

export const refunds: { orderId: string; amount: number; reason: string }[] = []
