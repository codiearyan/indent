# A big file a line at a time

## What you will be able to do

So far every script has read its file whole with `readFile`, which is the simplest way and right for a plot list. Some files are too big for it. In this issue your scripts read a file the way a person reads a long book, a line at a time, and remember only what they need. By the end of it you will be able to:

- say why reading a file whole stops working as it grows, and read the error it ends with
- read a file in pieces with a read stream, and turn the pieces into lines with `node:readline`
- count and total as the lines go by, so the memory a script uses stays flat
- try a script with a memory limit, the way a small computer has one

## The request from Imran

> **Imran:** I fitted a logger to the main pipe. Every minute it writes a line for each tap: the time, the tap and the litres. It lives in a little box by the tap that can run a script, but it has hardly any memory, about 16 MB for a script's data. My June totals worked. Now I have a year of readings, and the same script stops with a FATAL ERROR before it prints anything.

## Why reading a file whole stops working

`readFile` gives you the whole file as one text, so all of it is in memory at once. Splitting it into lines makes a second copy, one string per line, each with a little extra that JavaScript keeps beside it. A 26 MB log becomes far more than 26 MB in memory. On a laptop that is slow but works. With a limit, it ends like this:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

There is no stack trace of your code above it: Node itself gave up, and the lines below it point inside Node. "Heap" is the memory JavaScript keeps its values in. Even without a limit there are walls. Node cannot make a text longer than about 512 MB, so `readFile` with `'utf8'` on a bigger file throws `RangeError: Invalid string length`, and it refuses files over 2 GB with `ERR_FS_FILE_TOO_LARGE`. A logger that never stops writing gets there.

## Reading in pieces: a read stream

A **stream** hands you data a piece at a time instead of all at once. `createReadStream` from `node:fs` opens a file as one, and reads it in pieces of 64 KB. Each piece can be forgotten before the next is read, so only one piece needs to be in memory, however big the file is.

Pieces are cut by size, though, not at line breaks: a piece can end in the middle of a line. Putting the halves back together is what `node:readline` does.

## Lines with readline

```js
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const lines = createInterface({ input: createReadStream('gate.log'), crlfDelay: Infinity })
let openings = 0
for await (const line of lines) {
  if (line.startsWith('open')) openings++
}
console.log(`The gate opened ${openings} times.`)
```

`createInterface` reads the stream and gives you one line at a time, without its line break. `crlfDelay: Infinity` makes it treat `\r\n`, the line break of a file saved on Windows, as one break every time. `for await` takes each line as it is ready, and the loop ends when the file does. A file that is not there makes the loop throw `ENOENT`, which you can catch around it like any other.

## Keeping only what you need

The example keeps one number, `openings`, however long the log is. That is the whole trick: keep a count, a total, or one total per name, and let each line go once you have used it. The memory the script uses then stays flat, the same for a day of readings as for ten years.

The trap is to read a line at a time and then push every line into an array "for later". The array grows with the file, and you are back to holding all of it. If you need a total per tap, keep a total per tap: an object or a `Map` with one entry for each name, which stays tiny.

## Trying it with little memory

Your laptop has plenty of memory, so a script that holds a whole file will seem fine on it. `node make-year.js` writes `water/year.txt`, a year of made-up readings of about 26 MB. Then `node try.js --memory=16 count-readings.js water/year.txt` runs your script with at most 16 MB for its data, like the box by the tap. Underneath, `try.js` passes Node the flag `--max-old-space-size=16`. Try it once with a script that reads the year with `readFile`, to see the error for yourself.

## Your work in this issue

Write `count-readings.js` first, then `water-year.js`, then `tap-totals.js`. Each takes the log to read as its argument: `water/june.txt` is a short one you can check by eye, and `water/year.txt` is the big one. A reading is a line like `2026-06-14T07:00,north,0`; blank lines and the logger's notes, which start with `#`, are not readings.
