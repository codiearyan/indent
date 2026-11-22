// Task 3: print the yearly fee for the plot size typed after the script's name.
// Task 4: price every size typed, and refuse the ones that are not a number above 0.
const PER_SQUARE_METRE = 0.4
const WATER = 15

const sizes = process.argv.slice(2)

if (sizes.length === 0) {
  console.error('Type one or more plot sizes in square metres, like: node fee.js 125')
  process.exitCode = 1
}

for (const size of sizes) {
  const metres = Number(size)
  if (Number.isFinite(metres) && metres > 0) {
    const fee = metres * PER_SQUARE_METRE + WATER
    console.log(`A ${size} square metre plot costs ${fee.toFixed(2)} a year.`)
  } else {
    console.error(`Not a plot size: ${size}`)
    process.exitCode = 1
  }
}
