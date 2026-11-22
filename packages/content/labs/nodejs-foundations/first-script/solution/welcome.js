// Task 1: print a welcome for the name typed after the script's name.
// Task 2: with no name, print one line to standard error and end with exit code 1.
const name = process.argv[2]

if (name === undefined) {
  console.error('Type a name after the script, like: node welcome.js Maud')
  process.exitCode = 1
} else {
  console.log(`Welcome to Marrowfield, ${name}.`)
}
