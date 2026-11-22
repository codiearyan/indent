// Prints every test by name, and fails a test that has no expect in it.
export default { test: { reporters: ['verbose'], expect: { requireAssertions: true } } }
