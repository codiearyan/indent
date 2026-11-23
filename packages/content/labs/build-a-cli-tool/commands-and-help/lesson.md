# Commands and help

## What you will be able to do

Your tool can read what was typed. Now it has to do something with it. In this issue `orders` gets its three commands, the help that tells a newcomer what they are, and a kind answer to a typo. By the end of it you can:

- run commands from a table instead of a chain of `if` statements
- write help from that same table, so it can never disagree with the tool
- read the tool's version from `package.json`, from whatever folder it runs in
- answer a mistyped command with the nearest real one

## The request from Hesper

> **Hesper:** When Idris is out, I am the one who checks the orders, and I will not open a file of code to find out what a tool can do. I want to type `orders --help` and read it. And Sefton types `lsit` twice a day. A tool that knows what he meant should say so.

`src/shop.js` already holds the shop's work: counting orders, listing them, checking each line. Sefton wrote it, and you do not need to change it. What is missing is the part that turns `orders count` into a call of the right function.

## A table instead of a chain

The obvious way to pick a command is a chain: `if (command === 'count') ... else if (command === 'list') ...`. It works for three commands, and it hides them. Nothing else in the program can ask "which commands are there?", so the help has to repeat them by hand, and the next person to add a command will forget one of the places.

A table puts each command in one place, as data:

```js
const SOUNDS = {
  bell: { summary: 'Ring once', run: ring },
  horn: { summary: 'Sound the horn', run: honk }
}
```

Functions are values in JavaScript, so `run` can hold one, and `SOUNDS[word].run()` calls it. Picking a command becomes looking a word up. The same table can now answer every other question: which commands exist, what each one does, which flags it takes.

Looking a word up in an object has the trap you met in the last issue: `SOUNDS['constructor']` finds a function every object has. Ask `Object.hasOwn` first.

## What a command is given

Each of the shop's functions takes the same three things. First the order lines, which `readOrders(values)` in `src/input.js` reads from the files named. Then the flags, as your reader made them. Then `out`, an object with two ways to speak: `out.result` for each result, and `out.note` for a message to the person at the terminal. For now both print the same way. Issue 3 is about why they should not.

## Help written from the table

Help that someone types in by hand is right on the day it is written. Then a flag is added, a summary changes, and the help keeps saying the old thing, with nothing to tell anyone it is wrong. Help written by code from the table cannot drift: change the table and the help follows.

Tools give help at two levels. `orders --help` shows how to run the tool and lists every command with its summary. `orders list --help` shows one command and every flag it takes, with its short form, the kind of value it takes and what it does. Both come from the same two tables, `COMMANDS` and `FLAGS`. People also type a tool's name alone to see what it can do, so `orders` with no command shows the same help as `--help`.

## The version

`orders --version` prints the version, and there should be one place it is written: `package.json`. Reading it has a trap. `readFile('package.json')` looks in the folder the person is in when they run the tool, which can be any folder at all. A file that belongs to the tool is found from where the tool's code is: `new URL('package.json', import.meta.url)` names the file beside the module that says it.

## The nearest command

To guess what `lsit` meant, the tool needs a measure of how far apart two words are. Count the changes it takes to turn one into the other, where a change is one letter added, removed or replaced. `lamp` to `camp` is one change. `lam` to `lamp` is one. `plam` to `lamp` is two.

Comparing the letters place by place fails as soon as one letter is missing, because everything after it is out of step. The way through is a table. Put one word down the side and the other across the top, each with an empty start. A cell holds the number of changes between the letters up to its row and the letters up to its column, and it comes from the three cells next to it: the one above plus one (a letter removed), the one to the left plus one (a letter added), or the one up and left, plus one only when the two letters differ. The bottom right cell is the answer. Fill one by hand for `plam` and `lamp` before you write it.

A tool should only offer a word that is close. More than two changes away, it is a guess, so say where to find the commands instead.

## Your work in this issue

Start in `src/commands.js` with `COMMANDS`, and write `main` in `orders.js` to run what the table names. Then the help and the version, then `nearest`. Try it as you go:

```sh
node orders.js count orders/press-1.txt orders/press-2.txt
node orders.js list --help
node orders.js lsit
```

The check reads your table and runs the tool on order files of its own. For the help it hands your functions a table of commands it made up, so only help written from the table can pass.
