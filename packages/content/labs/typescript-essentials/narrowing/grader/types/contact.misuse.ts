import { contactLine, isEmailContact } from '../src/contact.ts'

// @ts-expect-error: contactLine should only accept a Contact
contactLine({ fax: '0612 448 210' })
// @ts-expect-error: contactLine returns a string
const count: number = contactLine({ email: 'a@example.com' })
// @ts-expect-error: isEmailContact should only accept a Contact
isEmailContact('a@example.com')
// @ts-expect-error: isEmailContact answers true or false
const label: string = isEmailContact({ email: 'a@example.com' })
