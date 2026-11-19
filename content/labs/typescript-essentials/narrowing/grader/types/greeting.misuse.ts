import { findCustomer, greeting, type Customer } from '../src/greeting.ts'

const people: Customer[] = [{ id: 1, name: 'Petra' }]
// @ts-expect-error: findCustomer can find nobody, so its result is not always a Customer
const sure: Customer = findCustomer(people, 1)
// @ts-expect-error: customer ids are numbers
findCustomer(people, '1')
// @ts-expect-error: findCustomer takes a list of customers
findCustomer([{ id: 1 }], 1)
// @ts-expect-error: greeting returns a string
const flag: boolean = greeting(people, 1)
