# Input from files and pipes

## What you will be able to do

A tool earns its place when it joins up with others: `grep` picks some lines, your tool counts them, `head` shows the first few. In this issue `orders` learns to be one link in such a chain, and to cope with a file of any size. By the end of it you can:

- read a file a line at a time, so its size no longer matters
- read standard input when no file is named, or where `-` stands
- stop at once and quietly when whatever reads your output goes away

## The request from Idris

> **Idris:** I keep the whole year in one file now. On the office computer, `orders count` on it stops with a FATAL ERROR before it prints anything. And I want to pick the lines first, like `grep 2026-12 year.txt | orders count`, but `orders` only reads files. When I look at the first few orders with `| head`, it goes on working long after I have seen them.

The office computer is old and has little memory. Run `node make-year.js` to make a year of orders, about 20 MB, and then give the tool 16 MB for its data, about what that computer can spare:

```sh
node --max-old-space-size=16 orders.js count orders/year.txt
```

Delete `orders/year.txt` when you are done with it. Check copies your workspace each time.

## Reading a line at a time

`readOrders` reads each file whole with `readFile`, then splits it into lines: the whole file is in memory once as one text and again as lines. A file that grows every day will one day not fit.

A **stream** hands over a file in pieces, 64 KB at a time, and each piece can be forgotten before the next one is read. Pieces are cut by size, not at line breaks, so a line can be split between two of them. `createInterface` from `node:readline` puts the halves back together and gives you whole lines, without their line breaks:

```js
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const lines = createInterface({ input: createReadStream('visits.log'), crlfDelay: Infinity })
for await (const line of lines) console.log(line.length)
```

`crlfDelay: Infinity` makes it treat `\r\n`, the line break of a file saved on Windows, as one break every time. A file that is not there makes the loop throw, where a `try` or the `catch` at the bottom of `orders.js` can say so.

`readOrders` is an **async generator**, an `async function*`: it can `yield` each line from inside such a loop. The command takes one line, counts it, and asks for the next. Nothing anywhere holds more than one line, so a count of a year uses as little memory as a count of a day. The trap is to collect the lines in an array "to give them on afterwards": that holds the whole file again.

## Standard input

Every program has a third stream, **standard input**. In a terminal it is the keyboard. After a pipe `|`, it is the output of the program before it. Tools by custom read standard input when they are given no file, and treat a file named `-` as "standard input here":

```sh
cat orders/press-2.txt | node orders.js check
cat orders/press-2.txt | node orders.js check orders/press-1.txt -
```

`process.stdin` is a stream like any other, so the same way of reading lines works on it. Two cares. A tool given files must never touch standard input: in a terminal it would sit waiting for someone to type. And with no file and no pipe, the tool does wait for typing, like any such tool; end the typing with Ctrl+D, or Ctrl+Z and Enter on Windows.

## When the reader goes away

`orders list year.txt | head -3` shows three orders, and then `head` is done and closes its end of the pipe. The next time the tool writes, the system answers with an error, `EPIPE`: nobody is reading. On Windows the same failure can come with another code; `EOF` is the one usually seen there.

What happens next depends on how you write. With nobody listening for errors on standard output, the tool usually stops with a stack trace about `EPIPE`, a scary message about nothing; `console.log` does not prevent it. And the common first fix, listening for the error and ignoring it, is worse: the tool reads and works through the rest of the year for nobody, and if its input is a pipe that keeps coming, it never ends at all.

Neither is right. Once the reader is gone, there is no one to work for, and nothing went wrong in the tool's own work. `process.stdout` is a stream, and a stream reports a failure as an `error` event. Listen for it, and when the code says the reader is gone, end the tool at once, with exit code 0. This is the one place where stopping straight away is right: there is nothing left to write and nobody to write it to.

## Your work in this issue

Rewrite `readOrders` in `src/input.js` for the first two tasks, then handle the reader going away in `orders.js`. Try each step:

```sh
node --max-old-space-size=16 orders.js count orders/year.txt
cat orders/press-2.txt | node orders.js check orders/press-1.txt -
node orders.js list orders/year.txt | head -3
```

The last line needs `head`, so try it on Linux or macOS. The check stands in for it on every system: it reads three lines and closes its end of the pipe, on files and input of its own.
