// Invoices copied from the billing log. Fees are in pounds, the way the old price list keeps them:
// the fee for one singer's copy of an arrangement, and how many copies the choir licensed.

// WH-2291, the invoice in Nadia's ticket.
export const cedarNarrows = {
  number: 'WH-2291',
  choir: 'Cedar Narrows Choir',
  vatPercent: 20,
  lines: [
    { title: 'Psalm 23, SATB', fee: 1.86, copies: 32 },
    { title: 'Evening round', fee: 2.11, copies: 12 }
  ]
}

export const angsoKammarkor = {
  number: 'WH-2297',
  choir: 'Ängsö Kammarkör',
  vatPercent: 20,
  lines: [
    { title: 'Winter carol, SSA', fee: 1.29, copies: 12 },
    { title: 'Psalm 121, SATB', fee: 3.21, copies: 8 }
  ]
}

// Printed copies for a school choir carry the lower rate.
export const surSangam = {
  number: 'WH-2304',
  choir: 'Sur Sangam Singers',
  vatPercent: 5,
  lines: [
    { title: 'Monsoon song, SA', fee: 2.15, copies: 10 },
    { title: 'Evening round', fee: 2.11, copies: 20 }
  ]
}
