// Questions from last summer's front desk log, each labelled with the handbook articles that answer it.

export interface Labelled {
  question: string
  expected: string[]
}

export const labelled: Labelled[] = [
  { question: 'What deposit does a boat need when I book?', expected: ['booking'] },
  { question: 'Can I get a refund if I cancel 48 hours before launch?', expected: ['cancellations'] },
  { question: 'Are trips paused when the wind is strong?', expected: ['weather'] },
  { question: 'What sizes do buoyancy aids come in?', expected: ['safety'] },
  { question: 'Are children aged 5 old enough to paddle?', expected: ['children'] },
  { question: 'Are dogs welcome in kayaks or canoes?', expected: ['dogs'] },
  { question: 'Do groups of 8 paddlers get a discount on the hire fee?', expected: ['groups'] },
  { question: 'How many months is a gift voucher valid?', expected: ['vouchers'] },
  { question: 'Can lost items be posted abroad?', expected: ['lost-property'] },
  { question: 'How much does a lost paddle cost to replace?', expected: ['damage'] },
  { question: 'What does the car park by the quay cost per day?', expected: ['parking'] },
  { question: 'Do I get a full refund when a trip is paused for weather?', expected: ['weather', 'cancellations'] },
  { question: 'Can gift vouchers pay for a guided sunset tour?', expected: ['vouchers', 'groups'] },
  { question: 'How long are lost items kept at the dock hut?', expected: ['lost-property'] },
  { question: 'Does light rain stop trips?', expected: ['weather'] },
  { question: 'Which bus stops at the quay?', expected: ['parking'] },
  { question: 'Do scratches on the hull cost anything?', expected: ['damage'] },
  { question: 'Can young people aged 12 to 15 paddle a single kayak?', expected: ['children'] },
  { question: 'Does every dog need a life vest?', expected: ['dogs'] },
  { question: 'Can a booking move to another date for free?', expected: ['cancellations'] },
  { question: 'Are child buoyancy aids included in the hire fee?', expected: ['safety', 'children'] }
]
