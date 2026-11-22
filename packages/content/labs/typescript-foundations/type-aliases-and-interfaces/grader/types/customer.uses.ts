import { contactLine, firstCustomer, type Customer } from '../src/orders.ts'

// A customer with a phone number, and one without
const withPhone: Customer = { name: 'Juniper Vale', email: 'juniper@example.com', phone: '01632 960771' }
const without: Customer = { name: 'Fen Okafor', email: 'fen@example.com' }
const line: string = contactLine(withPhone)
const other: string = contactLine(without)
// firstCustomer is a Customer, so it can be passed on as one
const first: Customer = firstCustomer
