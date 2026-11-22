# Your first line

## What you will be able to do

Today is your first day at Wickhollow Candles, a small shop that pours candles by hand and sells them online. Two people run it: Ines packs the parcels and Theo answers every email. They hired you to look after the shop's code, and you have never written any. That is fine. This issue starts at the very first step. By the end of it you will be able to:

- run a JavaScript file in the terminal with `node`
- make your file print lines of text
- turn a line off without deleting it
- leave notes in your code for the people who read it

## The request from Ines

Ines meets you at the packing table with a laptop.

> **Ines:** Every parcel gets a little printed note. Before you touch the shop's real code, show me the laptop can talk. Print our welcome, then the note. Oh, and the file still prints an old offer we stopped running. Switch that off, but keep it, Theo might want it back.

Everything here happens in one file, `src/first-line.js`.

## A file is a list of instructions

A JavaScript file is plain text. Each line is an instruction, and the computer carries them out one after another, from the top of the file to the bottom. The program that reads and runs the file is called Node.

You run a file by typing a command in the terminal, the panel below the editor:

```
node src/first-line.js
```

`node` starts Node, and `src/first-line.js` tells it which file to run. Press Enter and Node runs every line, then stops. Run it again whenever you change the file. You cannot break anything by running it, so run it often.

## Printing with console.log

To make a file show something in the terminal, you print it:

```js
console.log('The kettle is on')
```

`console.log` means "print this". What goes between the round brackets is printed on its own line. Text has to sit inside quotes, so Node knows where it starts and ends. Single quotes `'like this'` and double quotes `"like this"` both work; this repo uses single quotes. Write the text exactly as you want it to appear, because Node prints it exactly as you wrote it, capital letters and spaces included.

One `console.log` prints one line. To print three lines, write three, one under the other:

```js
console.log('Kettle on')
console.log('Tea poured')
console.log('Back to work')
```

Because Node goes from top to bottom, they print in that order.

## When something goes wrong

Sooner or later Node will refuse to run your file and print an error instead. That is normal, and the error helps you. It names the file and the line number, and often draws a small `^` under the spot it got stuck on. The most common causes on a first day are a missing quote, a missing bracket, or a misspelt `console.log`. Read the line it points at, fix it, and run the file again.

## Comments are notes for people

Sometimes you want to write something in a file that Node should skip. That is a comment. A comment starts with two slashes, and Node ignores everything after them on that line:

```js
// The opening hours, for the sign on the door
console.log('Open from nine')
```

Comments have two everyday uses. The first is leaving a note for whoever reads the file next: what it does, or why a line is there. The second is switching a line off. Put `//` in front of a line of code and Node no longer runs it, but the line stays in the file, ready to be switched back on by removing the slashes:

```js
// console.log('Closed on Mondays')
```

Your starter file is full of comments already: every line that starts with `//` is a note for you, and Node skips all of them.

## Your work in this issue

Open `src/first-line.js`. The comments at the top list the four tasks, and each task has its own `// Task` section below. Run the file first with `node src/first-line.js` to see what it prints today. Then work through the tasks in order, running the file after each change and reading the output. When it looks right, press Check. Check runs your file the same way and reads what it prints.
