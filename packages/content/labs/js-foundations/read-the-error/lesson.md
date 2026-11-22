# Read the error

## What you will be able to do

Your first day went well. On the second morning you find Ines frowning at the shop laptop: the morning report, which tells her what to pour and pack, prints a block of red text and nothing else. Theo tried to change it himself last night. Nothing is lost. The red text is Node telling you exactly where it got stuck, and in this issue you learn to read it. By the end of it you will be able to:

- find the file and the line an error points at
- read the marks under the copy of the line
- name the kind of error and what it usually means
- fix the errors Node meets before it can run anything

## The request from Ines

> **Ines:** Theo says he only changed a few words. Now the report is all red and I cannot read any of it. Can you make it print again? And maybe show Theo what the red text says, so he can fix his own mistakes next time.

All four tasks are in `src/morning.js`.

## An error is a message

When Node meets something it cannot do, it stops and prints an error instead of carrying on with a wrong guess. That is good: a program that stops tells you where to look. Take this small file for a tea room:

```js
const cupsPoured = 12
console.log('Cups poured:', cupsPoured)
console.log('Kettle on)
```

Running it prints this, in red:

```
file:///Users/you/workspace/src/kettle.js:3
console.log('Kettle on)
            ^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at compileSourceTextModule (node:internal/modules/esm/utils:318:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:90:18)

Node.js v24.16.0
```

There are eight more lines that start with `at` before the last one; they are left out here. The exact words can differ a little from one version of Node to the next, but the parts are always the same.

## Reading it part by part

**The first line says where.** It is the path to the file, then a colon and a line number. The start of the path is the folder on your computer, so skip to the end: `src/kettle.js:3` means line 3 of `src/kettle.js`. The editor shows line numbers down its left edge.

**The second line is a copy of that line** of your code, so you can see it without opening the file.

**The marks under it show where Node got lost.** A row of `^` sits under the part it could not make sense of. Here the marks start at the quote and run to the end of the line: Node began reading text and never found where it ends.

**The line after the blank one is the kind of error, and a message.** `SyntaxError` means Node could not read the code at all, the way a sentence with a missing word cannot be read. `Invalid or unexpected token` means it met a character it did not expect. A token is any small piece of code: a name, a number, a quote, a bracket.

**The rest you can skip for now.** The lines that start with `at` say where Node was inside its own code when it stopped, and the last line is the version of Node. Later, when your own code calls other code, the `at` lines become useful.

## Node reads the whole file first

Before Node runs a single line, it reads the whole file. If one line cannot be read, nothing runs, not even the lines above it. That is why the tea room file printed no cups count, although line 2 was fine.

It also means Node shows one error at a time. Fix it, run the file again, and the next error appears, if there is one. Each new error is progress, not a step back.

Other errors happen while the file is already running. Then the lines above have already printed, and the error stops the rest:

```
Teatime
file:///Users/you/workspace/src/ref.js:2
console.log('Scones:', scones)
                       ^

ReferenceError: scones is not defined
    at file:///Users/you/workspace/src/ref.js:2:24
```

The next issue is about those. Here the first `at` line points at your own file: line 2, column 24.

## When the message guesses wrong

The kind of error is a fact, but the message is Node's best guess at the cause, and sometimes it guesses wrong. Look at this one:

```
file:///Users/you/workspace/src/start.js:2
console.log(Kettle on')
            ^^^^^^

SyntaxError: missing ) after argument list
```

Node says a bracket is missing, but the brackets are fine. The text has lost its opening quote, so Node read `Kettle` as a name, then met `on` right after it and could not see how the two belong together. The marks are more honest than the words: they sit right where the trouble starts.

So read an error in this order: the line number, then the marks, then the kind, then the message. Compare the line with a similar line that works. When the message makes no sense, trust the marks.

## Your work in this issue

Open `src/morning.js`. Each task has one broken line, and the comment above it says what Theo meant it to print. Run `node src/morning.js`, read the error, fix the line it names, and run it again. Change only the broken lines: the lines that make the values are fine, and Check runs each task with values of its own.
