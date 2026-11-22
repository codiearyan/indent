// Task 4: show the settings the water scripts use, and whether the key is set, never the key.
function shown(name, fallback) {
  const text = process.env[name]
  if (text === undefined || text.trim() === '') {
    return fallback === undefined ? 'not set' : `${fallback} (default)`
  }
  return text
}

console.log(`WATER_PRICE: ${shown('WATER_PRICE')}`)
console.log(`LEAK_LITRES: ${shown('LEAK_LITRES', 5000)}`)
console.log(`WATER_KEY: ${process.env.WATER_KEY ? 'set' : 'not set'}`)
