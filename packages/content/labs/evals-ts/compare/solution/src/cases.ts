export interface Case {
  id: string
  input: string
  expected: string
}

export const cases: Case[] = [
  { id: 't01', input: 'Where is my order PB-10422? It was meant to arrive Tuesday.', expected: 'shipping' },
  { id: 't02', input: 'I was charged twice for the same fern.', expected: 'refund' },
  { id: 't03', input: 'How often should I water a snake plant?', expected: 'plant-care' },
  { id: 't04', input: 'I forgot my password and cannot log in.', expected: 'account' },
  { id: 't05', input: 'Do you sell gift cards?', expected: 'other' },
  { id: 't06', input: 'The leaves on my monstera arrived broken and torn.', expected: 'refund' },
  { id: 't07', input: 'My parcel has not shown up yet.', expected: 'shipping' },
  { id: 't08', input: 'How do I sign in on the new app?', expected: 'account' },
  { id: 't09', input: 'The pot arrived cracked and soil went everywhere.', expected: 'refund' },
  { id: 't10', input: 'Can I change the email address on my account?', expected: 'account' },
  { id: 't11', input: 'My calathea is drooping, what am I doing wrong?', expected: 'plant-care' },
  { id: 't12', input: 'I would like my money back for the cactus.', expected: 'refund' },
  { id: 't13', input: 'Is the courier coming today?', expected: 'shipping' },
  { id: 't14', input: 'The yellow leaf problem is back on my pothos.', expected: 'plant-care' },
  { id: 't15', input: 'Do you deliver to the islands?', expected: 'shipping' },
  { id: 't16', input: 'Please unsubscribe me from the newsletter.', expected: 'account' },
  { id: 't17', input: "What is your shop's phone number?", expected: 'other' },
  { id: 't18', input: 'Tracking says delivered but nothing is here.', expected: 'shipping' }
]
