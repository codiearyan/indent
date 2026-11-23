# A tool with a name

## What you will be able to do

`orders` reads its words, runs its commands, speaks on the right streams and joins pipes. What is left is what makes a tool feel at home on a computer: it takes settings from the place it runs, it colours its output only for people, and it has a name. By the end of this issue you can:

- take a setting from the environment and let a typed flag win over it
- colour output for a person at a terminal, and never for a file or a program
- give a Node script a name with its first line and `package.json`
- replace a page of shell commands with your own tool

## The request from Hesper

> **Hesper:** Idris is away next week, and the press-room computer has a small screen: I want `orders list` to stop at twenty there, unless I ask for more. When `check` finds a broken order, I want it to jump out at me. And Idris's note of commands goes. I want a note I can read: `orders` this, `orders` that.

## Settings from the environment

Every program starts with an **environment**: names and values the shell hands down, such as `PATH`, `HOME` or `LANG`. Node puts them in `process.env`, every value as text. A setting set once for a computer, `ORDERS_LIMIT=20` in the press room's shell, then reaches every run without anyone typing it:

```sh
LAMP_LEVEL=3 node lamp.js on     # PowerShell: $env:LAMP_LEVEL=3; node lamp.js on
```

The order of who wins is a custom every tool keeps: what the person typed beats what the computer has set, which beats the tool's own default. A setting is what this computer usually wants; a flag is what this person wants this once. So the setting only fills a gap the flags left, and when a flag was typed, the setting is not even looked at.

A setting is input like any other, and it can be wrong. When it is, say so by its name: the person typed no `--limit`, so a message about `--limit` would send them looking in the wrong place.

`withSettings(flags, env)` takes the environment as an argument instead of reading `process.env` itself. `orders.js` hands it `process.env`; the check hands it environments of its own. A function that is given what it needs is one you can try in every case without touching the computer it runs on.

## Colour, but only for people

A terminal shows colour when it meets special characters: `\x1b[31m` starts red and `\x1b[39m` ends it. To a terminal they are instructions. To a file, or to a program reading a pipe, they are junk in the middle of the text: a problem line that starts with `\x1b[31m` no longer starts with the file name, and a program looking for it misses it.

So a tool asks where its output is going. `process.stdout.isTTY` is `true` when standard output is a terminal, and `undefined` when it is a file or a pipe. And people who never want colour set `NO_COLOR` in their environment: when it is set to anything but the empty text, a tool leaves colour out everywhere. Ask both in one place, `useColour`, and ask it once.

Node also has `styleText` in `node:util`, which writes the codes for a colour by name and can check the stream for you. Either way, the decision comes from the stream and the environment, never from habit.

## A name of its own

Today you type `node orders.js`. A tool people use is just `orders`. Two things make that possible.

The first line of the file, `#!/usr/bin/env node`, tells a Unix system which program runs this file: `/usr/bin/env` finds `node` wherever it is installed. Node itself skips that line, so `node orders.js` works as before. It must be the very first two characters of the file.

The `bin` entry in `package.json` maps a command name to a file: `"bin": { "orders": "orders.js" }`. When the shop installs the tool with `npm install --global`, npm puts `orders` in a folder on the PATH and points it at that file. Windows ignores the `#!` line, so there npm reads it at install time and makes a small `orders.cmd` that starts the file with `node`. You do not install anything in this repo: `node orders.js` does exactly what `orders` will do.

## The morning

Open `morning.txt` one last time. Three commands of `grep`, `cut`, `sort`, `uniq` and `awk`, which only a Unix shell runs and only Idris could read. Each question they answer is now one short command of your tool, in plain words that mean the same in every shell. Replace each of the three with its `orders` command, in the same order, naming both files.

## Your work in this issue

Write `withSettings` and `useColour` in `src/settings.js` and use them in `orders.js`. Then give the tool its first line, its `bin` entry, and the new `morning.txt`. Try it as you go:

```sh
ORDERS_LIMIT=2 node orders.js list orders/press-1.txt
node orders.js check orders/press-2.txt
node orders.js check orders/press-2.txt > out.txt
```

The check cannot give your tool a real terminal, so it stands in for one: it sets `process.stdout.isTTY` before your tool starts, and `TERM` in its environment, as a terminal does. It runs each command of `morning.txt` with order files of its own at those two paths.
