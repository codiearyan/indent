export interface TicketCase {
  id: string
  ticket: string
}

export const RUBRIC = [
  'Mentions the order number when the customer gave one.',
  'Apologizes when the customer reports a problem.',
  'Does not promise a refund; refunds need a human to approve them.',
  'Stays under 60 words.'
]

export const tickets: TicketCase[] = [
  { id: 'd01', ticket: 'Where is order PB-10422? It was due Tuesday.' },
  { id: 'd02', ticket: 'I was charged twice for the same fern.' },
  { id: 'd03', ticket: 'The pot for order PB-20981 arrived cracked.' },
  { id: 'd04', ticket: 'How often should I water a snake plant?' },
  { id: 'd05', ticket: 'Is the courier coming today for order PB-43210?' },
  { id: 'd06', ticket: 'My calathea is drooping.' },
  { id: 'd07', ticket: 'I forgot my password.' }
]
