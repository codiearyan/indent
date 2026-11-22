# What Node gives a script

## What you will be able to do

Marrowfield Allotment Society rents out plots on a strip of land beside the railway, and every job on it is done by volunteers. Rhiannon Hesketh is the secretary. The plot list, the waiting list and the water readings live in text files on the society's laptop in the shed, and she edits them by hand. You know JavaScript: functions, arrays, objects, `import` and `async`. So far you have run a file with `node file.js` and little more. In this repo you learn what Node gives a script beyond the language, from the first line. By the end of this issue you will be able to:

- say what Node is, and what a script has in Node that it does not have in a browser
- read what was typed after the script's name from `process.argv`
- send a line to standard output or to standard error, and say which one a line belongs on
- end a script with an exit code that says whether it did its job

## The request from Rhiannon

> **Rhiannon:** Every new member gets the same welcome from me, and at the gate people ask what a plot costs before they put their name down. I work it out on the back of an envelope each time. Could the laptop do both if I type a name or a size?

## Node runs JavaScript outside the browser

Node is a program that runs JavaScript on your computer, the way a browser runs it in a page. The language is the same. What is around it is different. A script in Node has no page, so there is no `window` and no `document`. Instead it has what a program on a computer needs: it can read and write files, find out where it was started, and talk to the terminal that started it. Most of that lives in modules you import, and you meet them in the next issues. One thing is there in every script without an import: the object `process`, which is this running program.

Everything in this repo works the same on macOS, Linux and Windows, where the terminal is PowerShell. Every command you type is `node`, a file, and sometimes a few words after it.

## What you type reaches process.argv

When you run `node sow.js beans 3`, Node hands your script everything on that line as an array of strings, `process.argv`:

```js
console.log(process.argv)
```

```
[ '/usr/local/bin/node', '/home/kim/garden/sow.js', 'beans', '3' ]
```

The first entry is the path of the node program and the second the path of the script, written out in full. The words you typed after the script's name come after them, in order. On Windows the paths start with a drive letter, like `C:\`. The words after the script are called **arguments**, and they are always strings: `'3'` is text until you turn it into a number with `Number('3')`. When fewer words were typed than you read, the missing places hold `undefined`.

## Two streams and an exit code

A program in a terminal has two ways to write. **Standard output** is for the result, what the person asked for. **Standard error** is for messages about what went wrong. `console.log()` writes to standard output and `console.error()` to standard error. In the terminal both show up in the same place, so they look alike, but they are separate: another program, or a person saving the result to a file, gets only standard output. A message about a mistake on standard output ends up mixed in with the results.

When a script ends, it hands back one number, its **exit code**. `0` means it did its job; any other number means it did not, and `1` is the usual one. A script that runs to its last line ends with `0`. A script that stops with an error you did not catch ends with `1`, after Node prints the error and its **stack trace**, the list of lines starting with `at` that shows where it happened. A stack trace is for the developer. A person who typed something wrong should get one plain line instead.

## Choosing the exit code

There are two ways to choose it. `process.exit(1)` stops the script there and then, with exit code 1, whatever lines were still to run. `process.exitCode = 1` only sets the number: the script carries on, and when it ends, it ends with 1.

```js
const crop = process.argv[2]
if (crop === undefined) {
  console.error('Type a crop after the script, like: node sow.js beans')
  process.exitCode = 1
} else {
  console.log(`Sow ${crop} in March.`)
}
```

Each shell shows the exit code its own way, so this repo gives you a small helper. `node try.js sow.js` runs `sow.js` for you and shows what went to standard output, what went to standard error, and the exit code. You do not need to read how it works yet.

## Your work in this issue

Write `welcome.js` first, then `fee.js`. Each opens with a comment that lists its tasks; write the script under it. Run `node welcome.js Maud` to see the welcome and `node try.js welcome.js` to see the streams and the exit code with no name. When `node try.js fee.js 125 lots 87.5` shows two fees on standard output, one line on standard error and exit code 1, you are done.
