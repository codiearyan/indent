export const hiddenCases = [
  { id: 'h1', input: 'My order PB-55123 still says out for delivery.', expected: 'shipping' },
  { id: 'h2', input: 'The terracotta pot arrived broken.', expected: 'refund' },
  { id: 'h3', input: 'Should I repot my fiddle leaf fig in spring?', expected: 'plant-care' },
  { id: 'h4', input: 'I cannot log in after changing my email address.', expected: 'account' },
  { id: 'h5', input: 'Can I pick up from your greenhouse?', expected: 'other' },
  { id: 'h6', input: 'The leaves were damaged in the box.', expected: 'refund' },
  { id: 'h7', input: 'The courier never came.', expected: 'shipping' },
  { id: 'h8', input: 'My aloe has brown tips, is it getting too much sunlight?', expected: 'plant-care' }
]
