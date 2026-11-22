// Test data for the local copy of the Larkspur Letterpress portal. The passwords and salts are
// for this copy only: the real portal never keeps a password, only its hash.

export const customers = [
  { id: 101, name: 'Greta Oyelaran', email: 'greta@example.com', password: 'blue-heron-17', salt: '5f1c09ab' },
  { id: 102, name: 'Cosmo Dunleavy', email: 'cosmo@example.com', password: 'tin-lantern-4', salt: 'a24e7d30' },
  { id: 103, name: 'Yusra Penhallow', email: 'yusra@example.com', password: 'quiet-orchard-9', salt: '9b03fe12' }
]

export const orders = [
  { id: 2041, customerId: 101, title: 'Wedding invitations, 80', status: 'printing', note: 'Cream card, please.', shipTo: '4 Alder Row, Wexcombe', total: 412 },
  { id: 2042, customerId: 102, title: 'Bakery menu boards', status: 'proof sent', note: 'Prices on the back.', shipTo: '19 Mill Lane, Corrow', total: 96.5 },
  { id: 2043, customerId: 101, title: 'Thank you cards, 80', status: 'ready', note: '', shipTo: '4 Alder Row, Wexcombe', total: 138 },
  { id: 2044, customerId: 103, title: "Mother's Day cards", status: 'printing', note: 'Gold ink on the front.', shipTo: '7 Quarry Close, Hensford', total: 74.25 },
  { id: 2045, customerId: 102, title: 'Business cards, 250', status: 'shipped', note: '', shipTo: '19 Mill Lane, Corrow', total: 58 },
  { id: 2046, customerId: 103, title: 'Gig posters', status: 'proof sent', note: 'Size A2 <not A3>.', shipTo: '7 Quarry Close, Hensford', total: 120 }
]
