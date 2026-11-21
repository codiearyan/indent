import { findCustomer, greeting, type Customer } from '../src/greeting.ts'

const people: Customer[] = [{ id: 1, name: 'Petra' }, { id: 2, name: 'Omar', nickname: null }]
const found: Customer | undefined = findCustomer(people, 1)
const name: string | undefined = findCustomer(people, 1)?.name
const hello: string = greeting(people, 2)
