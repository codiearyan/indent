import { contactLine, isEmailContact, type Contact } from '../src/contact.ts'

function reach(contact: Contact): string {
  if (isEmailContact(contact)) return contact.email
  return contact.phone
}

const line: string = contactLine({ phone: '0612 448 210', textOk: false })
const viaEmail: string = contactLine({ email: 'a@example.com' })
const checked: boolean = isEmailContact({ email: 'a@example.com' })
