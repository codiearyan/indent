// Copied into the sandbox as .grader/drive.mjs. Each helper imports only the file it needs.
export const pluck = async (items, key) => (await import('../src/fields.ts')).pluck(items, key)
export const countLevels = async (list) => (await import('../src/changes.ts')).countLevels(list)

// JSON cannot carry undefined, so `undefinedKeys` lists change keys to set to undefined.
export async function applyChange(booking, change, undefinedKeys = []) {
  const { applyChange: apply } = await import('../src/changes.ts')
  const before = JSON.stringify(booking)
  const full = { ...change }
  for (const key of undefinedKeys) full[key] = undefined
  const result = apply(booking, full)
  return { result, originalUnchanged: before === JSON.stringify(booking), sameObject: result === booking }
}

const ruleSets = {
  priceAndNotes: {
    priceCents: (price) => price <= 5000,
    notes: (notes) => notes.length < 20
  },
  notesFirst: {
    notes: (notes) => notes.length === 0,
    level: (level) => level === 'overhaul',
    id: (id) => id.startsWith('SW-')
  },
  none: {},
  nested: {
    customer: (customer) => customer.email.endsWith('@example.com'),
    bike: (bike) => bike.make === 'Norrby'
  }
}

export async function broken(value, ruleSet) {
  return (await import('../src/rules.ts')).brokenRules(value, ruleSets[ruleSet])
}

export async function receivedValues(value) {
  const seen = {}
  const rules = {}
  for (const key of Object.keys(value)) {
    rules[key] = (member) => {
      seen[key] = member
      return true
    }
  }
  const result = (await import('../src/rules.ts')).brokenRules(value, rules)
  return { result, seen }
}
