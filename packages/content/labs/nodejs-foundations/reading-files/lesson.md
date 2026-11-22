# Reading a file

## What you will be able to do

Your scripts can now take what Rhiannon types and answer on the right stream. Everything they know, though, is in their own code. The society's real information is in files: the plot list, `plots.txt`, has one line per plot. In this issue your scripts read files. By the end of it you will be able to:

- import one of Node's own modules, and read the error when the name is wrong
- read a file's text with `readFile`, and say why it needs `await` and an encoding
- read the error Node gives for a file that is not there, and catch it
- split a file into lines whichever system saved it

## The request from Rhiannon

> **Rhiannon:** People ring me to ask who has plot B3, or how many plots are free, and I scroll through the list and count with my finger. I lose my place every time. Could a script do the looking?

## Bringing in a module

Reading files is not part of the JavaScript language; Node gives it to you in a **built-in module**, one that comes with Node. You bring it in with `import`, as you would one of your own files:

```js
import { readFile } from 'node:fs/promises'
```

`fs` is the file system module, and `fs/promises` is its version whose functions give back promises. The `node:` at the front says "this is one of Node's own", so nobody can mistake it for a package. An `import` like this only works because `package.json` in your workspace says `"type": "module"`. The last issue of this part is about that file.

A misspelt name stops the script before its first line runs. `'node:fs/promise'`, without the s, gives `Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:fs/promise`. Leave out the `node:` as well and the error changes to `Cannot find package 'fs'`, because Node then goes looking for a package someone installed. Both mean the same thing: compare the name letter by letter.

## Reading with readFile

```js
const text = await readFile('seeds.txt', 'utf8')
console.log(text)
```

Reading from the disk takes a moment, so `readFile` does not hand you the text straight away. It gives back a **promise**, and `await` waits until it has the text. Forget the `await` and you print the promise itself: `Promise { <pending> }`. In a module like yours, `await` works on the top level of the file, outside any function.

The second argument, `'utf8'`, is the **encoding**: how the bytes in the file turn into letters. Leave it out and you get the raw bytes, which Node prints as `<Buffer 62 65 61 6e 73 ...>`, each pair a byte in hexadecimal. Text files today are almost always UTF-8.

A file name like `'seeds.txt'` is looked for in the folder the command was typed in. Your terminal starts in the workspace, where the files are, so that works for now. The next issue is about what happens when it is not.

Node also has `readFileSync` in `node:fs`, which waits by itself and needs no `await`. It is fine for small scripts like these; this repo uses the promise version because a server, later on, cannot afford to sit and wait.

## When the file is not there

```
node:internal/fs/promises:640
  return new FileHandle(await PromisePrototypeThen(
                        ^

Error: ENOENT: no such file or directory, open 'sedes.txt'
    at async open (node:internal/fs/promises:640:25)
    at async readFile (node:internal/fs/promises:1287:14)
    at async file:///home/kim/garden/list.js:2:14 {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: 'sedes.txt'
}
```

Skip the first lines: they point inside Node. The line that starts with `Error:` is what went wrong. `ENOENT` is short for "error, no entry": there is no file by that name. The path in quotes is the one Node tried, here a typo. In the stack trace, the line with `file:///` and your script's name is the place in your code, line 2. The block at the end gives the same facts as properties of the error object.

Those properties are how you catch one kind of error and not the others. A missing file is a mistake in what was typed, so the person should get a plain line, not a stack trace:

```js
try {
  const text = await readFile(name, 'utf8')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  console.error(`No seed list called ${name}.`)
}
```

Any other error is thrown on, because it is not one you know how to explain.

## Lines and line endings

A text file is one long string with line breaks in it, so `text.split(...)` turns it into lines. Which break? On macOS and Linux a line ends with `\n`. Many Windows programs end each line with two characters, `\r\n`. Split a Windows file on `'\n'` alone and every line keeps an invisible `\r` at its end, so `'A3,\r'` no longer looks empty after its comma. Splitting on the pattern `/\r?\n/` handles both. A file usually ends with a line break too, which leaves one empty string at the end of the list.

## Your work in this issue

`show.js` first, then `count-plots.js`, then `holder.js`. Run each on `plots.txt`, and use `node try.js show.js nope.txt` to see the streams for a file that is not there. Check runs your scripts on lists of its own, one of them saved on Windows.
