// Ashgrove's own database. Plain JavaScript on Node's own file functions, and nothing else.
//
// Task 1: Keep keys and values (open, get, set)
// Task 2: Tell a missing key from an empty value (has, delete)
// Task 3: Take any text as a key, and only text (every function)

function mustBeText(what, value) {
  if (typeof value !== 'string') throw new TypeError(`${what} must be text, not ${typeof value}`)
}

export async function open(dir) {
  const values = new Map()
  return {
    get(key) {
      mustBeText('A key', key)
      return values.get(key)
    },
    set(key, value) {
      mustBeText('A key', key)
      mustBeText('A value', value)
      values.set(key, value)
    },
    has(key) {
      mustBeText('A key', key)
      return values.has(key)
    },
    delete(key) {
      mustBeText('A key', key)
      values.delete(key)
    }
  }
}
