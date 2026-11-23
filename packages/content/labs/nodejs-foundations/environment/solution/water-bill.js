// Task 1: print what the litres typed after the script's name cost, at the price in WATER_PRICE.
// Task 2: refuse a WATER_PRICE that is not a number above 0.
// Task 3: warn on standard error when the litres are more than LEAK_LITRES, 5000 when it is not set.
function numberSetting(name, fallback) {
  const text = process.env[name]
  if (text === undefined || text.trim() === '') return fallback
  const value = Number(text)
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`${name} should be a number above 0, not "${text}".`)
    process.exit(1)
  }
  return value
}

const price = numberSetting('WATER_PRICE', undefined)
const leakLitres = numberSetting('LEAK_LITRES', 5000)
const litres = process.argv[2]

if (price === undefined) {
  console.error('WATER_PRICE is not set. Set it to the price of 1000 litres, like: node try.js WATER_PRICE=2.10 water-bill.js 2400')
  process.exitCode = 1
} else if (litres === undefined || !Number.isFinite(Number(litres))) {
  console.error('Type the litres after the script name, like: node water-bill.js 2400')
  process.exitCode = 1
} else {
  const cost = (Number(litres) / 1000) * price
  console.log(`${litres} litres cost ${cost.toFixed(2)}.`)
  if (Number(litres) > leakLitres) {
    console.error(`More than ${leakLitres} litres: check the taps for a leak.`)
  }
}
