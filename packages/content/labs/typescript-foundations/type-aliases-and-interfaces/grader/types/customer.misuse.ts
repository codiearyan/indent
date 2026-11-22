import { contactLine, firstCustomer, type Customer } from '../src/orders.ts'

// @ts-expect-error: a customer without an email is refused
const noEmail: Customer = { name: 'Fen Okafor' }
// @ts-expect-error: a phone number is text, so a number is refused
contactLine({ name: 'Fen Okafor', email: 'fen@example.com', phone: 1632960771 })
// @ts-expect-error: a contact line is text, so it is not a number
const asNumber: number = contactLine({ name: 'Fen Okafor', email: 'fen@example.com' })
// @ts-expect-error: firstCustomer has no age
firstCustomer.age
