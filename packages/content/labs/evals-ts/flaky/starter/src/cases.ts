export interface Case {
  id: string
  input: string
  expected: string
}

export const cases: Case[] = [
  { id: 's01', input: 'Where is my order PB-10422? It was meant to arrive Tuesday.', expected: 'shipping' },
  { id: 's02', input: 'The leaves on my monstera arrived broken and torn.', expected: 'refund' },
  { id: 's03', input: 'The pot arrived cracked and soil went everywhere.', expected: 'refund' },
  { id: 's04', input: 'How do I water my fern?', expected: 'plant-care' },
  { id: 's05', input: 'My order PB-20117 is late and the leaves are yellow.', expected: 'shipping' },
  { id: 's06', input: 'I was charged twice and cannot log in to my account.', expected: 'refund' },
  { id: 's07', input: 'The pot is chipped.', expected: 'refund' },
  { id: 's08', input: 'I forgot my password and cannot log in.', expected: 'account' }
]
