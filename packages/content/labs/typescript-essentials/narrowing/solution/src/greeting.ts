// Task: Customers who might not be there
//
// - findCustomer(customers, id) returns the customer with that id, or undefined when there
//   is none. Its return type must say so.
// - greeting(customers, id) returns 'Hi <nickname>' when the customer has a nickname with
//   at least one non-space character, 'Hi <name>' otherwise, and 'Hi there' when no
//   customer has that id. A nickname can be missing, null or an empty string.
// - Annotate both functions using the Customer type below.
export type Customer = { id: number; name: string; nickname?: string | null }

export function findCustomer(customers: readonly Customer[], id: number): Customer | undefined {
  return customers.find((customer) => customer.id === id)
}

export function greeting(customers: readonly Customer[], id: number): string {
  const customer = findCustomer(customers, id)
  if (customer === undefined) return 'Hi there'
  const nickname = customer.nickname?.trim()
  return `Hi ${nickname ? nickname : customer.name}`
}
