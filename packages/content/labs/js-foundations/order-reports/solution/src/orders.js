// Last week's orders, exported by the shop's checkout. Prices are in cents.
export const orders = [
  {
    id: 'WC-1001',
    placedAt: '2026-11-02T08:15:00Z',
    status: 'paid',
    items: [
      { sku: 'cedar', qty: 2, priceCents: 1250 },
      { sku: 'smoked-fig', qty: 1, priceCents: 900 }
    ]
  },
  {
    id: 'WC-1002',
    placedAt: '2026-11-02T17:40:00Z',
    status: 'paid',
    discountCents: 500,
    items: [{ sku: 'sage', qty: 1, priceCents: 1800 }]
  },
  {
    id: 'WC-1003',
    placedAt: '2026-11-03T09:05:00Z',
    status: 'cancelled',
    items: [{ sku: 'cedar', qty: 5, priceCents: 1250 }]
  },
  {
    id: 'WC-1004',
    placedAt: '2026-11-03T12:30:00Z',
    status: 'paid',
    items: [
      { sku: 'smoked-fig', qty: 3, priceCents: 900 },
      { sku: 'lavender', qty: 1, priceCents: 1100 }
    ]
  },
  {
    id: 'WC-1005',
    placedAt: '2026-11-04T19:55:00Z',
    status: 'pending',
    items: [{ sku: 'sage', qty: 2, priceCents: 1800 }]
  }
]
