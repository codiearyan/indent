# Settings from the environment

## What you will be able to do

The first part of this repo gave the society scripts that read and write its files. Some things a script needs are not in a file and should not be in its code either: a price that changes every year, a limit someone may want to move, a password. In this issue your scripts read them from their **environment**. By the end of it you will be able to:

- read a setting from `process.env`, and say what it holds when the setting is missing
- turn a setting into a number, and refuse one that is not a number
- give a setting a default, and say why an empty setting needs care
- keep a secret out of everything a script prints

## The request from Imran

> **Imran:** The water company puts its price up every April, and every April I open the bill script and change the number inside it. Last year I changed the wrong number, and the bills were wrong for a month. Now the company has given us an account key for sending readings. It is meant to stay secret: it should not sit in a script anyone can open, and it must never show up on the shed screen.

A number that changes, and a secret, are both things the code should be handed when it runs, not things written into it.

## The environment of a program

Every program that runs on a computer is given a list of **environment variables**: names with a text value each, like `HOME=/home/kim` or `LANG=en_GB.UTF-8`. A program gets a copy of the list from whatever started it, usually your terminal, and passes a copy on to the programs it starts. Changing a variable in one program never changes it anywhere else.

In Node the list is the object `process.env`:

```js
const budget = process.env.SEED_BUDGET
console.log(budget)
```

Two facts catch everyone once. The values are always **text**, like arguments: `'40'`, not `40`. And a variable that was not set is simply not there, so reading it gives `undefined`. Call a method on it and the script stops: `TypeError: Cannot read properties of undefined (reading 'trim')`. The fix is to check for `undefined` first and print a plain line that names the setting. Names are written in capitals with underscores by habit; on Windows they do not care about case.

## Setting a variable

Each terminal has its own way to set a variable. In bash and zsh on macOS and Linux, `SEED_BUDGET=40 node order.js` sets it for that one command. In PowerShell on Windows, `$env:SEED_BUDGET = '40'` sets it for every command typed in that window afterwards, until you close it. Node itself can also read variables from a file, with `node --env-file=seeds.env order.js`; such a file is kept on one computer and never shared with the code. Because the terminals differ, this issue's `try.js` sets them for you, the same way everywhere: put `NAME=value` before the script's name, as in `node try.js SEED_BUDGET=40 order.js`.

## A setting is text

To use a setting as a number, turn it into one with `Number()`, then make sure it worked:

```js
const budget = Number(process.env.SEED_BUDGET)
if (!Number.isFinite(budget)) {
  console.error('SEED_BUDGET should be a number.')
}
```

`Number('forty')` gives `NaN`, "not a number", and `Number.isFinite` is false for it. Two cases slip through, though. `Number('')` gives `0`, so a setting that is there but empty turns into a quiet zero. And `parseFloat` reads as far as it can and stops, so `parseFloat('1,80')` is `1`: a comma, which some people write for a decimal point, is not one to JavaScript. Decide what a good value is, such as a number above 0, and refuse everything else with one line that names the setting.

## A default for a setting that is missing

Many settings have a sensible value most of the time. The script uses that **default** unless someone sets the variable:

```js
const shop = process.env.SEED_SHOP ?? 'Hollin Seeds'
```

`??` gives its right side when the left is `undefined` or `null`. An empty setting is neither: it is `''`, so `??` keeps it. People leave a setting empty by mistake far more often than on purpose, so most scripts treat empty like missing. `||` gives its right side for `''` too, but also for `0`, which can be a real value. Saying what you mean, `text === undefined || text.trim() === ''`, is the clearest.

## Keeping a secret

Secrets go in the environment because code gets copied, shared and shown on screens, and the environment of one computer does not. That only helps if the script never prints them. `console.log(process.env)` prints every variable, secrets included. So does an error message that quotes a bad value, and a debugging line left in by accident. A person who needs to know about a secret needs only to know whether it is set. Even its last few letters help someone guess the rest.

## Your work in this issue

Tasks 1 to 3 build `water-bill.js`, one step at a time; task 4 is `settings.js`. Run them through `try.js` with the settings you want, like `node try.js WATER_PRICE=2.10 water-bill.js 2400`, and then without, like `node try.js water-bill.js 2400`, to see both sides. Imran will set the real price and key on the shed laptop himself: nothing in your code holds either.
