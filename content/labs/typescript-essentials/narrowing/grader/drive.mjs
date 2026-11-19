// Copied into the sandbox as .grader/drive.mjs. Each helper imports only the file it needs.
export const toCents = async (amount) => (await import('../src/price.ts')).toCents(amount)
export const isEmailContact = async (c) => (await import('../src/contact.ts')).isEmailContact(c)
export const contactLine = async (c) => (await import('../src/contact.ts')).contactLine(c)
export const greeting = async (list, id) => (await import('../src/greeting.ts')).greeting(list, id)

export async function find(customers, id) {
  const found = (await import('../src/greeting.ts')).findCustomer(customers, id)
  return found === undefined ? 'undefined' : found
}
