// Anjali's shelves in the gift shop. Members of the museum get MEMBER_DISCOUNT percent off,
// except on shelves marked fullPrice.
export const MEMBER_DISCOUNT = 10

export const shelves = [
  {
    id: 'gifts',
    name: 'Gifts',
    items: [
      { id: 'pin-14', name: 'Enamel pin, tram 14', pricePence: 350 },
      { id: 'mug-belle', name: 'Foundry Belle mug', pricePence: 900 },
      { id: 'whistle', name: "Conductor's whistle", pricePence: 500 }
    ]
  },
  {
    id: 'books',
    name: 'Books',
    items: [
      { id: 'book-lines', name: 'The lines of Coalbrook', pricePence: 1499 },
      { id: 'cards-6', name: 'Postcards, set of six', pricePence: 400 }
    ]
  },
  {
    id: 'vouchers',
    name: 'Gift vouchers',
    fullPrice: true,
    items: [
      { id: 'voucher-5', name: 'Gift voucher, £5', pricePence: 500 },
      { id: 'voucher-10', name: 'Gift voucher, £10', pricePence: 1000 }
    ]
  }
]
