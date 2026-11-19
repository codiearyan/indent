// Run with: node src/demo.ts
// Type-check with: npm run types
import { toCents } from './price.ts'
import { contactLine } from './contact.ts'
import { greeting, type Customer } from './greeting.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (error) {
    console.log(label, `Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const customers: Customer[] = [
  { id: 1, name: 'Petra Lindqvist', nickname: 'Pet' },
  { id: 2, name: 'Omar Haddad', nickname: null },
  { id: 3, name: 'June Ferreira' }
]

show('toCents of 12.5, " 7.25 " and "abc":', () => [toCents(12.5), toCents(' 7.25 '), toCents('abc')])
show('contact lines:', () => [
  contactLine({ email: 'petra@example.com' }),
  contactLine({ phone: '0612 448 210', textOk: true }),
  contactLine({ phone: '0612 448 211', textOk: false })
])
show('greetings for ids 1, 2 and 9:', () => [greeting(customers, 1), greeting(customers, 2), greeting(customers, 9)])
