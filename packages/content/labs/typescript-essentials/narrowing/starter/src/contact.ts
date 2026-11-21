// Task: Email or phone
//
// A customer leaves either an email address or a phone number. These types are ready.
//
// - isEmailContact(contact) is a type guard: it returns true for an EmailContact and its
//   return type tells TypeScript that, so callers can read contact.email after the check.
// - contactLine(contact) returns 'Email <email>', 'Text <phone>' when textOk is true, or
//   'Call <phone>' when it is false.
// - Annotate both functions. Narrow with `in` or your type guard, not with casts.
export type EmailContact = { email: string }
export type PhoneContact = { phone: string; textOk: boolean }
export type Contact = EmailContact | PhoneContact

export function isEmailContact(contact) {
  throw new Error('Not implemented')
}

export function contactLine(contact) {
  throw new Error('Not implemented')
}
