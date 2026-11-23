# Two streams and an exit code

## What you will be able to do

A tool is used by people and by other programs, often in the same line: `orders check | wc -l`, or a script that runs `orders check` and stops if it fails. In this issue `orders` learns to speak to both. By the end of it you can:

- send results and messages to the two streams they belong on
- end with an exit code that another program can act on
- end without losing what was printed
- give a program JSON it can read a line at a time

## The request from Sefton

> **Sefton:** I wrote a script that runs before each print run: it calls `orders check`, and if anything is wrong it should stop and ring the counter. It never stops. `orders check` ends with "all went well" whatever it found. And when I count the problems with `| wc -l`, the summary line and every error count as problems too. I would rather read JSON than cut your text apart anyway.

Run `node orders.js check orders/press-2.txt` and then `echo $?` (in PowerShell, `$LASTEXITCODE`). Two problems, and the code says nothing went wrong.

## Two streams

Every program starts with two streams to write to. **Standard output** is for what the program was asked for: the count, the list, the problems found. **Standard error** is for what it says to the person running it: a summary, a warning, what went wrong. In a terminal the two look the same, which is why mixing them up goes unnoticed until someone redirects one of them.

A pipe `|` and a redirection `>` take only standard output. Standard error stays on the screen:

```sh
node backup.js > list.txt      # the list goes to the file, messages still show
node backup.js 2> /dev/null    # hides messages, keeps the list (PowerShell: 2> $null)
```

In Node, `console.log` writes to standard output and `console.error` to standard error. The shop's functions already say which is which: `out.result` for a result and `out.note` for a message. Today `orders.js` prints both with `console.log`, and its errors too. A message never belongs where a program reads results, and an error for a person is one plain line, not a stack trace: the trace is for whoever writes the code.

## Exit codes

When a program ends it gives a number back to whoever started it: its **exit code**. `0` means all went well; anything else means something did not. The shell keeps it in `$?` (in PowerShell, `$LASTEXITCODE`), and `&&` runs the next command only after a `0`. That number is how one program acts on another without reading its words.

Tools that check things usually say more than "not zero". A check that ran and found problems is not the same as a tool that could not run: a typo in a flag, a file that is not there. `orders` follows a common split: `1` when `check` found a problem, `2` when it could not do what it was asked. Sefton's script can then stop the press on a `1` and ring someone about a `2`.

## Ending without losing output

The quick way to end with a code is `process.exit(1)`. It also stops the program at once, and that is the trap. When standard output is a pipe on Linux or macOS, Node hands what you print over a piece at a time, after `console.log` has already returned. `process.exit` does not wait for the rest. Print a long list, call `process.exit(0)`, and the reader of the pipe gets the first part of it and nothing more. It happens only with a pipe and only with enough output, so it hides until the day it matters. On Linux or macOS, try it:

```sh
node -e "console.log('x'.repeat(200000)); process.exit(0)" | wc -c
```

`process.exitCode = 1` says which code to end with, and lets the program end by itself once everything is written. Prefer it. If you must stop early, stop after the last write has finished.

Check stands in for such a pipe on every system, so a tool that stops too early loses output there in the same way.

## Output for programs

Text like `cotton 4` is easy for a person and fragile for a program: it has to split on spaces and hope nobody ever adds a word. With `--json`, a tool prints the values themselves as JSON, which every language can read.

Print **one JSON value on each line**, as each result comes. A program can then read the output a line at a time and start on the first result before the last one is made, and a long list never has to sit in memory as one array. `JSON.stringify(value)` gives exactly one line. Messages and errors stay plain text on standard error: they are for the person, with or without `--json`.

A new flag is also the test of last issue's help. Add `json` to `FLAGS` and to each command's flags, and `orders list --help` shows it without another line of code.

## Your work in this issue

All three tasks are in `orders.js`, with the flag added in `src/flags.js` and `src/commands.js` for the third. Try your work as you go:

```sh
node orders.js check orders/press-1.txt orders/press-2.txt 2> /dev/null
node orders.js check orders/press-2.txt; echo $?
node orders.js list --json orders/press-1.txt
```

The check runs your tool on order files of its own and reads standard output, standard error and the exit code apart, so a right answer on the wrong stream fails on that.
