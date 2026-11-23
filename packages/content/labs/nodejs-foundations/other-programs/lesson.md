# Running another program

## What you will be able to do

Not everything a server does has to be written inside it. Often a program already exists that does the job, and the server only has to run it and pass on what it says. In this last issue of the repo your server runs another program, reads what it printed and how it ended, and keeps text that strangers typed from becoming a command. By the end of it you will be able to:

- run another program from Node with an argument list, and wait for it without stopping the server
- read what it printed on each stream and its exit code
- tell a program that failed from one that could not start at all
- say why a command built from typed text is dangerous, and avoid it

## The request from Imran

> **Imran:** I have a little script that makes the water report for a month. I run it on the laptop and read the totals out at the meeting. Could the server run it whenever someone asks for a month, so members can see the report on their phones? But do not let anyone break the laptop with it. I have heard stories.

## Starting another program

`node:child_process` starts other programs, called **child processes**. `execFile` takes the program, a list of its arguments, and a function it calls once the program has ended:

```js
import { execFile } from 'node:child_process'

execFile(process.execPath, ['tools/label.js', 'leeks'], (error, stdout, stderr) => {
  console.log(stdout)
})
```

That runs `node tools/label.js leeks`, the way you would type it. `process.execPath` is the full path of the Node that is running your script, so the child runs on the same Node on every computer, found by path rather than by its name. A path to a script, like one to a file, is best built from your script's own folder with `join(import.meta.dirname, ...)`: the child looks for a relative path from the folder the server was started in.

`stdout` and `stderr` hold everything the child printed on each stream, once it has ended. To use them in a request, wrap the call in a promise and `await` it. While the child runs, the server goes on answering other people. `execFileSync` would wait too, but by stopping the whole server until the child is done: fine in a script, not in a server.

A program often prints in bits, with pauses. `execFile` waits for all of it. With `spawn`, the other way to start a child, you collect the `data` events of `child.stdout` yourself, and use the result in the `close` event, which comes once the child has ended and its streams are done. Answering on the first piece gives half a report.

## How a program ended

A child reports how it went with its **exit code**, as your own scripts do: 0 for success, anything else for a problem. Programs choose their own codes and say what each one means. When the code is not 0, `execFile` passes an `error`, and `error.code` is the exit code, a number. Its reason is usually on its standard error.

Node itself uses exit code 1 when a script stops on an error nobody caught, including a script that is not there: `Error: Cannot find module`.

Sometimes there is no exit code at all, because the program could not be started: the path names nothing. Then `error.code` is text, `'ENOENT'`, "no such file or directory". A child made with `spawn` reports this with an `error` event instead, and with no listener for it, that error stops your server.

## Why not a shell

There is a shorter way: `exec('node tools/label.js ' + kind)` hands one line of text to a **shell**, the same kind of program your terminal runs, which splits it into a program and its arguments. That is exactly the danger. A shell reads `;`, `&`, `|` and `$( )` as the start of more commands. If `kind` comes from an address, someone can type:

```
leeks;del-everything
```

and the shell runs `node tools/label.js leeks`, then whatever came after the `;`. That is **command injection**, and it gives a stranger the laptop. Quotes around the text do not fix it: a quote can be typed too.

`execFile` with an argument list never starts a shell. It hands each item to the program as one argument, whatever signs it holds, so `leeks;del-everything` reaches `label.js` as a strange name, which it can refuse. Keep it that way: no `exec`, no `shell: true` option, no command glued together from text. A shell differs from system to system too, `sh` on macOS and Linux and `cmd.exe` on Windows, while an argument list behaves the same on all of them.

## Your work in this issue

All four tasks are in `server.js`, which already listens and stops on Ctrl+C. Do not change `tools/water-report.js`: its first lines say what its exit codes mean. Run it by itself with `node try.js tools/water-report.js 2026-06` to see both streams and its exit code, then `node ask.js server.js` to send your server the requests in `requests.txt`.
