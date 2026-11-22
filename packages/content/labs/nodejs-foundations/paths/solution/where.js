// Task 1: print the folder the command was typed in, and the folder this script is in.
console.log(`Run from: ${process.cwd()}`)
console.log(`Script in: ${import.meta.dirname}`)
